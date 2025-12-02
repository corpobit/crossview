import { KubeConfig } from '@kubernetes/client-node';
import { CoreV1Api, CustomObjectsApi, AppsV1Api } from '@kubernetes/client-node';
import { CrossplaneResource } from '../../domain/entities/CrossplaneResource.js';
import { IKubernetesRepository } from '../../domain/repositories/IKubernetesRepository.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import logger from '../../../server/utils/logger.js';

export class KubernetesRepository extends IKubernetesRepository {
  constructor() {
    super();
    this.kubeConfig = new KubeConfig();
    this.coreApi = null;
    this.customObjectsApi = null;
    this.appsApi = null;
    this.initialized = false;
    this.pluralCache = new Map();
  }

  getKubeConfigPath() {
    if (process.env.KUBECONFIG) {
      return process.env.KUBECONFIG;
    }
    if (process.env.KUBE_CONFIG_PATH) {
      return process.env.KUBE_CONFIG_PATH;
    }
    const defaultPath = path.join(homedir(), '.kube', 'config');
    return defaultPath;
  }

  loadKubeConfig() {
    const serviceAccountPath = '/var/run/secrets/kubernetes.io/serviceaccount';
    const hasServiceAccount = fs.existsSync(serviceAccountPath) && 
                              fs.existsSync(`${serviceAccountPath}/token`) &&
                              fs.existsSync(`${serviceAccountPath}/ca.crt`);
    
    if (hasServiceAccount) {
      this.kubeConfig.loadFromCluster();
      logger.info('Loaded Kubernetes config from cluster (service account)');
      return;
    }
    
    const kubeConfigPath = this.getKubeConfigPath();
    
    if (!fs.existsSync(kubeConfigPath)) {
      throw new Error(`Kubernetes config file not found at ${kubeConfigPath}. Set KUBECONFIG or KUBE_CONFIG_PATH environment variable, or ensure ~/.kube/config exists.`);
    }
    
    this.kubeConfig.loadFromFile(kubeConfigPath);
    logger.info('Loaded Kubernetes config from file', { path: kubeConfigPath });
  }

  getContexts() {
    try {
      this.loadKubeConfig();
      return this.kubeConfig.getContexts().map(ctx => ({
        name: ctx.name,
        cluster: ctx.cluster,
        user: ctx.user,
        namespace: ctx.namespace || 'default',
      }));
    } catch (error) {
      if (error.message.includes('not found')) {
        return [];
      }
      throw new Error(`Failed to get contexts: ${error.message}`);
    }
  }

  getCurrentContext() {
    try {
      this.loadKubeConfig();
      return this.kubeConfig.getCurrentContext();
    } catch (error) {
      return null;
    }
  }

  setContext(contextName) {
    try {
      this.loadKubeConfig();
      this.kubeConfig.setCurrentContext(contextName);
      this.initialized = false;
    } catch (error) {
      throw new Error(`Failed to set context: ${error.message}`);
    }
  }

  async initialize() {
    if (this.initialized && this.coreApi && this.customObjectsApi && this.appsApi) {
      return;
    }

    try {
      if (!this.kubeConfig.getCurrentContext()) {
        this.loadKubeConfig();
      }
      this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
      this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
      this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Kubernetes client: ${error.message}`);
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async getPluralName(apiVersion, kind, context = null) {
    const cacheKey = `${apiVersion}:${kind}`;
    
    if (this.pluralCache.has(cacheKey)) {
      return this.pluralCache.get(cacheKey);
    }

    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();

    try {
      const group = apiVersion.split('/')[0];
      const version = apiVersion.split('/')[1] || 'v1';

      if (apiVersion === 'v1' || group === '') {
        try {
          const apiResources = await this.coreApi.getAPIResources();
          const resource = apiResources.body.resources?.find(
            r => r.kind === kind && (r.group === '' || !r.group)
          );
          if (resource && resource.name) {
            const plural = resource.name.split('/')[0];
            this.pluralCache.set(cacheKey, plural);
            return plural;
          }
        } catch (error) {
          logger.debug('Failed to get plural from core API', { apiVersion, kind, error: error.message });
        }
      }

      const cluster = this.kubeConfig.getCurrentCluster();
      if (!cluster || !cluster.server) {
        logger.warn('No cluster server URL found for API discovery', { apiVersion, kind });
        return null;
      }

      let discoveryPath;
      if (apiVersion === 'v1' || group === '') {
        discoveryPath = '/api/v1';
      } else {
        discoveryPath = `/apis/${group}/${version}`;
      }

      try {
        const clusterUrl = new URL(cluster.server);
        const isHttps = clusterUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        
        const requestOptions = {
          hostname: clusterUrl.hostname,
          port: clusterUrl.port || (isHttps ? 443 : 80),
          path: discoveryPath,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        };
        
        await this.kubeConfig.applyToRequest(requestOptions);
        
        const result = await new Promise((resolve, reject) => {
          const req = httpModule.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const body = JSON.parse(data);
                  resolve(body);
                } catch (parseError) {
                  reject(new Error(`Failed to parse discovery response: ${parseError.message}`));
                }
              } else {
                reject(new Error(`API discovery request failed with status ${res.statusCode}`));
              }
            });
          });
          
          req.on('error', (err) => {
            reject(err);
          });
          
          req.end();
        });

        if (result && result.resources) {
          const resource = result.resources.find(
            r => r.kind === kind
          );
          if (resource && resource.name) {
            const plural = resource.name.split('/')[0];
            this.pluralCache.set(cacheKey, plural);
            logger.debug('Found plural name from API discovery', { apiVersion, kind, plural });
            return plural;
          }
        }
      } catch (discoveryError) {
        logger.debug('Failed to query API discovery endpoint', { 
          apiVersion, 
          kind, 
          discoveryPath,
          error: discoveryError.message 
        });
      }

      logger.debug('Could not determine plural name from API discovery', { apiVersion, kind });
      return null;
    } catch (error) {
      logger.warn('Error getting plural name from API discovery', { 
        apiVersion, 
        kind, 
        error: error.message 
      });
      return null;
    }
  }

  async isConnected(context = null) {
    try {
      if (context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
      await this.ensureInitialized();
      await this.coreApi.getAPIResources();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getNamespaces(context = null) {
    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();
    try {
      const response = await this.coreApi.listNamespace();
      return response.body.items.map(item => ({
        name: item.metadata.name,
        uid: item.metadata.uid,
        creationTimestamp: item.metadata.creationTimestamp,
        labels: item.metadata.labels || {},
      }));
    } catch (error) {
      throw new Error(`Failed to get namespaces: ${error.message}`);
    }
  }

  async getResources(apiVersion, kind, namespace = null, context = null, limit = null, continueToken = null, plural = null) {
    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();
    try {
      const group = apiVersion.split('/')[0];
      const version = apiVersion.split('/')[1] || 'v1';
      let resourcePlural = plural;
      if (!resourcePlural) {
        resourcePlural = await this.getPluralName(apiVersion, kind, context);
        if (!resourcePlural) {
          resourcePlural = kind.toLowerCase() + 's';
        }
      }
      
      if (namespace) {
        const response = await this.customObjectsApi.listNamespacedCustomObject(
          group,
          version,
          namespace,
          resourcePlural,
          undefined,
          undefined,
          continueToken || undefined,
          undefined,
          undefined,
          limit || undefined
        );
        return {
          items: response.body.items || [],
          continueToken: response.body.metadata?.continue || null,
          remainingItemCount: response.body.metadata?.remainingItemCount || null
        };
      } else {
        const response = await this.customObjectsApi.listClusterCustomObject(
          group,
          version,
          resourcePlural,
          undefined,
          undefined,
          continueToken || undefined,
          undefined,
          undefined,
          limit || undefined
        );
        return {
          items: response.body.items || [],
          continueToken: response.body.metadata?.continue || null,
          remainingItemCount: response.body.metadata?.remainingItemCount || null
        };
      }
    } catch (error) {
      const statusCode = error.statusCode || error.code || error.response?.statusCode || error.body?.code;
      if (statusCode === 404) {
        return { items: [], continueToken: null, remainingItemCount: null };
      }
      if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist') || error.message.includes('not found'))) {
        return { items: [], continueToken: null, remainingItemCount: null };
      }
      const errorBody = error.body || error.response?.body || {};
      if (errorBody.code === 404 || errorBody.reason === 'NotFound') {
        return { items: [], continueToken: null, remainingItemCount: null };
      }
      throw new Error(`Failed to get resources: ${error.message}`);
    }
  }

  async lookupPluralFromCRD(apiVersion, kind, context = null) {
    try {
      await this.ensureInitialized();
      
      if (context && this.kubeConfig) {
        const currentContext = this.kubeConfig.getCurrentContext();
        if (currentContext !== context) {
          this.kubeConfig.setCurrentContext(context);
          this.initialized = false;
          await this.ensureInitialized();
        }
      }

      const group = apiVersion.split('/')[0];
      const version = apiVersion.split('/')[1] || 'v1';

      try {
        const xrdsResponse = await this.customObjectsApi.listClusterCustomObject(
          'apiextensions.crossplane.io',
          'v1',
          'compositeresourcedefinitions'
        );
        const xrds = xrdsResponse.body.items || [];
        for (const xrd of xrds) {
          const spec = xrd.spec;
          if (spec?.group === group) {
            if (spec?.names?.kind === kind && spec?.names?.plural) {
              return spec.names.plural;
            }
            if (spec?.claimNames?.kind === kind && spec?.claimNames?.plural) {
              return spec.claimNames.plural;
            }
          }
        }
      } catch (xrdError) {
      }

      const possiblePlurals = [
        kind.toLowerCase() + 's',
        kind.toLowerCase() + 'es',
        kind.toLowerCase(),
      ];

      for (const possiblePlural of possiblePlurals) {
        try {
          const crdName = `${possiblePlural}.${group}`;
          const crdResponse = await this.customObjectsApi.getClusterCustomObject(
            'apiextensions.k8s.io',
            'v1',
            'customresourcedefinitions',
            crdName
          );
          const crd = crdResponse.body;
          const specNames = crd.spec?.names;
          if (specNames?.kind === kind && specNames?.plural) {
            return specNames.plural;
          }
        } catch (crdError) {
          continue;
        }
      }

      try {
        const crdsResponse = await this.customObjectsApi.listClusterCustomObject(
          'apiextensions.k8s.io',
          'v1',
          'customresourcedefinitions'
        );
        const crds = crdsResponse.body.items || [];
        for (const crd of crds) {
          const spec = crd.spec;
          if (spec?.group === group && spec?.names?.kind === kind) {
            if (spec.names?.plural) {
              return spec.names.plural;
            }
          }
        }
      } catch (listError) {
      }

      return null;
    } catch (error) {
      logger.debug('Failed to lookup plural from CRD', { apiVersion, kind, error: error.message });
      return null;
    }
  }

  async getResource(apiVersion, kind, name, namespace = null, context = null, plural = null) {
    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();
    
    if (namespace === 'undefined' || namespace === 'null' || namespace === undefined) {
      namespace = null;
    }
    
    try {
      if (apiVersion === 'v1') {
        if (namespace) {
          if (kind === 'Service') {
            const response = await this.coreApi.readNamespacedService(name, namespace);
            return response.body;
          } else if (kind === 'Pod') {
            const response = await this.coreApi.readNamespacedPod(name, namespace);
            return response.body;
          } else if (kind === 'ConfigMap') {
            const response = await this.coreApi.readNamespacedConfigMap(name, namespace);
            return response.body;
          } else if (kind === 'Secret') {
            const response = await this.coreApi.readNamespacedSecret(name, namespace);
            return response.body;
          } else if (kind === 'Event') {
            throw new Error(`Events should be fetched using getEvents method`);
          }
          let resourcePlural = plural;
          if (!resourcePlural) {
            resourcePlural = await this.getPluralName(apiVersion, kind, context);
            if (!resourcePlural) {
              resourcePlural = kind.toLowerCase() + 's';
            }
          }
          const response = await this.customObjectsApi.getNamespacedCustomObject('', 'v1', namespace, resourcePlural, name);
          return response.body;
        } else {
          if (kind === 'Namespace') {
            const response = await this.coreApi.readNamespace(name);
            return response.body;
          } else if (kind === 'Node') {
            const response = await this.coreApi.readNode(name);
            return response.body;
          } else if (kind === 'PersistentVolume') {
            const response = await this.coreApi.readPersistentVolume(name);
            return response.body;
          }
          let resourcePlural = plural;
          if (!resourcePlural) {
            resourcePlural = await this.getPluralName(apiVersion, kind, context);
            if (!resourcePlural) {
              resourcePlural = kind.toLowerCase() + 's';
            }
          }
          const response = await this.customObjectsApi.getClusterCustomObject('', 'v1', resourcePlural, name);
          return response.body;
        }
      }
      
      if (apiVersion === 'apps/v1') {
        if (namespace) {
          if (kind === 'Deployment') {
            const response = await this.appsApi.readNamespacedDeployment(name, namespace);
            return response.body;
          } else if (kind === 'StatefulSet') {
            const response = await this.appsApi.readNamespacedStatefulSet(name, namespace);
            return response.body;
          } else if (kind === 'DaemonSet') {
            const response = await this.appsApi.readNamespacedDaemonSet(name, namespace);
            return response.body;
          } else if (kind === 'ReplicaSet') {
            const response = await this.appsApi.readNamespacedReplicaSet(name, namespace);
            return response.body;
          }
        }
      }
      
      const group = apiVersion.split('/')[0];
      const version = apiVersion.split('/')[1] || 'v1';
      let resourcePlural = plural;
      if (!resourcePlural) {
        resourcePlural = await this.getPluralName(apiVersion, kind, context);
        
        if (!resourcePlural) {
          resourcePlural = await this.lookupPluralFromCRD(apiVersion, kind, context);
        }
        
        if (!resourcePlural) {
          const lowerKind = kind.toLowerCase();
          if (lowerKind.startsWith('x') && lowerKind.length > 1) {
            resourcePlural = lowerKind;
          } else {
            resourcePlural = lowerKind + 's';
          }
        }
      }
      
      if (namespace) {
        const response = await this.customObjectsApi.getNamespacedCustomObject(
          group,
          version,
          namespace,
          resourcePlural,
          name
        );
        return response.body;
      } else {
        const response = await this.customObjectsApi.getClusterCustomObject(
          group,
          version,
          resourcePlural,
          name
        );
        return response.body;
      }
    } catch (error) {
      const statusCode = error.statusCode || error.code || error.response?.statusCode || error.body?.code;
      if (statusCode === 404) {
        throw new Error(`Resource not found: ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ''}`);
      }
      if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist') || error.message.includes('not found'))) {
        throw new Error(`Resource not found: ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ''}`);
      }
      const errorBody = error.body || error.response?.body || {};
      if (errorBody.code === 404 || errorBody.reason === 'NotFound') {
        throw new Error(`Resource not found: ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ''}`);
      }
      throw new Error(`Failed to get resource: ${error.message}`);
    }
  }

  async getCrossplaneResources(namespace = null, context = null) {
    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();
    try {
      const resources = [];

      const apiextensionsApiVersion = 'apiextensions.crossplane.io/v1';
      const apiextensionsKinds = ['Composition', 'CompositeResourceDefinition', 'ProviderConfig', 'StoreConfig', 'EnvironmentConfig'];
      
      for (const kind of apiextensionsKinds) {
        try {
          const result = await this.getResources(apiextensionsApiVersion, kind, namespace, context);
          const items = result.items || result;
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => new CrossplaneResource({
            ...item,
            kind,
            apiVersion: apiextensionsApiVersion,
          })));
        } catch (error) {
        }
      }

      const pkgApiVersion = 'pkg.crossplane.io/v1';
      const pkgKinds = ['Provider', 'Function', 'Configuration'];
      
      for (const kind of pkgKinds) {
        try {
          const result = await this.getResources(pkgApiVersion, kind, namespace, context);
          const items = result.items || result;
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => new CrossplaneResource({
            ...item,
            kind,
            apiVersion: pkgApiVersion,
          })));
        } catch (error) {
        }
      }

      const managedApiVersions = [
        'kubernetes.crossplane.io/v1alpha2',
        'kubernetes.crossplane.io/v1alpha1',
      ];
      const managedKinds = ['Object'];
      
      for (const apiVersion of managedApiVersions) {
        for (const kind of managedKinds) {
          try {
            const result = await this.getResources(apiVersion, kind, namespace, context);
            const items = result.items || result;
            const itemsArray = Array.isArray(items) ? items : [];
            resources.push(...itemsArray.map(item => new CrossplaneResource({
              ...item,
              kind,
              apiVersion,
            })));
          } catch (error) {
          }
        }
      }

      return resources;
    } catch (error) {
      throw new Error(`Failed to get Crossplane resources: ${error.message}`);
    }
  }

  async getEvents(kind, name, namespace = null, context = null) {
    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();
    try {
      if (!namespace) {
        logger.debug('Skipping events fetch - no namespace provided', { kind, name });
        return [];
      }

      const fieldSelector = `involvedObject.kind=${kind},involvedObject.name=${name},involvedObject.namespace=${namespace}`;
      
      logger.debug('Fetching Kubernetes events', { kind, name, namespace, fieldSelector });
      
      let response;
      try {
        response = await this.coreApi.listNamespacedEvent(
          namespace,
          undefined,
          undefined,
          undefined,
          fieldSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        logger.debug('Events API response received', { kind, name, namespace, count: response.body.items?.length || 0 });
      } catch (fieldSelectorError) {
        logger.warn('Field selector with namespace failed, trying without', { 
          error: fieldSelectorError.message, 
          kind, 
          name, 
          namespace 
        });
        const fallbackSelector = `involvedObject.kind=${kind},involvedObject.name=${name}`;
        response = await this.coreApi.listNamespacedEvent(
          namespace,
          undefined,
          undefined,
          undefined,
          fallbackSelector,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );
        logger.debug('Fallback events API response received', { kind, name, namespace, count: response.body.items?.length || 0 });
      }

      let allEvents = response.body.items || [];
      
      logger.debug('Total events before filtering', { kind, name, namespace, count: allEvents.length });
      
      const filteredEvents = allEvents.filter(event => {
        const involvedObject = event.involvedObject || {};
        const kindMatches = involvedObject.kind === kind;
        const nameMatches = involvedObject.name === name;
        const namespaceMatches = involvedObject.namespace === namespace || (!involvedObject.namespace && !namespace);
        
        const matches = kindMatches && nameMatches && namespaceMatches;
        
        if (!matches && kindMatches && nameMatches) {
          logger.debug('Event filtered out', {
            kind,
            name,
            eventKind: involvedObject.kind,
            eventName: involvedObject.name,
            eventNamespace: involvedObject.namespace,
            expectedNamespace: namespace,
            kindMatches,
            nameMatches,
            namespaceMatches
          });
        }
        return matches;
      });
      
      logger.debug('Events after filtering', { kind, name, namespace, count: filteredEvents.length });

      const sortedEvents = [...filteredEvents].sort((a, b) => {
        const timeA = a.lastTimestamp || a.eventTime || a.firstTimestamp || '';
        const timeB = b.lastTimestamp || b.eventTime || b.firstTimestamp || '';
        const timeAStr = String(timeA || '');
        const timeBStr = String(timeB || '');
        if (!timeAStr && !timeBStr) return 0;
        if (!timeAStr) return 1;
        if (!timeBStr) return -1;
        return timeBStr.localeCompare(timeAStr);
      });
      const events = sortedEvents;

      return events.map(event => ({
        type: event.type || 'Normal',
        reason: event.reason || '',
        message: event.message || '',
        count: event.count || 1,
        firstTimestamp: event.firstTimestamp || '',
        lastTimestamp: event.lastTimestamp || event.eventTime || event.firstTimestamp || '',
        involvedObject: {
          kind: event.involvedObject?.kind || kind,
          name: event.involvedObject?.name || name,
          namespace: event.involvedObject?.namespace || namespace,
        },
        source: event.source || {},
        reportingController: event.reportingController || '',
        reportingInstance: event.reportingInstance || '',
      }));
    } catch (error) {
      logger.warn('Failed to get events', { error: error.message, stack: error.stack, kind, name, namespace });
      return [];
    }
  }
}

