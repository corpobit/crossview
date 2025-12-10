import { KubeConfig } from '@kubernetes/client-node';
import { CoreV1Api, CustomObjectsApi, AppsV1Api } from '@kubernetes/client-node';
import { CrossplaneResource } from '../../domain/entities/CrossplaneResource.js';
import { IKubernetesRepository } from '../../domain/repositories/IKubernetesRepository.js';
import { GetCompositeResourcesUseCase } from '../../domain/usecases/GetCompositeResourcesUseCase.js';
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
    this.mrdCache = new Map();
    this.mrCache = new Map();
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
      
      const currentContext = this.kubeConfig.getCurrentContext();
      if (!currentContext) {
        const contexts = this.kubeConfig.getContexts();
        if (contexts.length === 0) {
          throw new Error('No active cluster! No contexts found in kubeconfig. Please configure a Kubernetes context.');
        } else {
          throw new Error(`No active cluster! Found ${contexts.length} context(s) but no current context is set. Use 'kubectl config use-context <context-name>' to set a current context.`);
        }
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

  async ensureContext(context = null) {
    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();
  }

  handleNotFoundError(error, kind, name, namespace = null) {
    const statusCode = error.statusCode || error.code || error.response?.statusCode || error.body?.code;
    const errorBody = error.body || error.response?.body || {};
    const errorMessage = error.message || '';
    
    if (statusCode === 404 || 
        errorBody.code === 404 || 
        errorBody.reason === 'NotFound' ||
        errorMessage.includes('404') || 
        errorMessage.includes('NotFound') || 
        errorMessage.includes('does not exist') || 
        errorMessage.includes('not found')) {
      return true;
    }
    return false;
  }

  normalizeNamespace(namespace) {
    if (namespace === 'undefined' || namespace === 'null' || namespace === undefined) {
      return null;
    }
    return namespace;
  }

  async resolvePlural(apiVersion, kind, context, plural) {
    if (plural) return plural;
    
    let resourcePlural = await this.getPluralName(apiVersion, kind, context);
    if (resourcePlural) return resourcePlural;
    
    resourcePlural = await this.lookupPluralFromCRD(apiVersion, kind, context);
    if (resourcePlural) return resourcePlural;
    
    const lowerKind = kind.toLowerCase();
    if (lowerKind.startsWith('x') && lowerKind.length > 1) {
      return lowerKind;
    }
    return lowerKind + 's';
  }

  async getPluralName(apiVersion, kind, context = null) {
    const cacheKey = `${apiVersion}:${kind}`;
    
    if (this.pluralCache.has(cacheKey)) {
      return this.pluralCache.get(cacheKey);
    }

    await this.ensureContext(context);

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
      await this.ensureContext(context);
      await this.coreApi.getAPIResources();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getNamespaces(context = null) {
    await this.ensureContext(context);
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
    await this.ensureContext(context);
    if (!this.customObjectsApi) {
      throw new Error('Kubernetes CustomObjectsApi is not initialized');
    }
    try {
      if (!apiVersion) {
        throw new Error('apiVersion is required');
      }
      const apiVersionParts = apiVersion.split('/');
      let group = apiVersionParts[0];
      let version = apiVersionParts[1] || 'v1';
      
      if (group) {
        group = group.trim();
      }
      if (version) {
        version = version.trim();
      }
      
      if (!group || group === '' || typeof group !== 'string') {
        throw new Error(`Invalid apiVersion format: ${apiVersion}. Expected format: group/version. Got group: ${JSON.stringify(group)}`);
      }
      
      if (!version || version === '' || typeof version !== 'string') {
        throw new Error(`Invalid apiVersion format: ${apiVersion}. Version is required. Got version: ${JSON.stringify(version)}`);
      }
      
      logger.debug('Getting resources', { apiVersion, kind, group, version, namespace, context, groupType: typeof group, versionType: typeof version });
      
      let resourcePlural = plural;
      if (!resourcePlural) {
        resourcePlural = await this.getPluralName(apiVersion, kind, context);
        if (!resourcePlural) {
          resourcePlural = kind.toLowerCase() + 's';
        }
      }
      
      if (namespace && namespace !== 'undefined' && namespace !== 'null') {
        if (!group || !version || !resourcePlural || !namespace) {
          throw new Error(`Missing required parameters: group=${group}, version=${version}, resourcePlural=${resourcePlural}, namespace=${namespace}`);
        }
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
        if (!group || !version || !resourcePlural) {
          throw new Error(`Missing required parameters: group=${group}, version=${version}, resourcePlural=${resourcePlural}`);
        }
        logger.debug('Calling listClusterCustomObject', { 
          group: group, 
          version: version, 
          resourcePlural: resourcePlural,
          groupType: typeof group,
          groupLength: group?.length,
          hasCustomObjectsApi: !!this.customObjectsApi
        });
        
        if (typeof group !== 'string' || group.length === 0) {
          throw new Error(`Invalid group parameter: ${JSON.stringify(group)} (type: ${typeof group})`);
        }
        if (typeof version !== 'string' || version.length === 0) {
          throw new Error(`Invalid version parameter: ${JSON.stringify(version)} (type: ${typeof version})`);
        }
        if (typeof resourcePlural !== 'string' || resourcePlural.length === 0) {
          throw new Error(`Invalid resourcePlural parameter: ${JSON.stringify(resourcePlural)} (type: ${typeof resourcePlural})`);
        }
        
        const response = await this.customObjectsApi.listClusterCustomObject(
          String(group),
          String(version),
          String(resourcePlural),
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
      if (this.handleNotFoundError(error)) {
        return { items: [], continueToken: null, remainingItemCount: null };
      }
      throw new Error(`Failed to get resources: ${error.message}`);
    }
  }

  async lookupPluralFromCRD(apiVersion, kind, context = null) {
    try {
      await this.ensureContext(context);

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
    await this.ensureContext(context);
    namespace = this.normalizeNamespace(namespace);
    
    try {
      if (kind === 'Event') {
        throw new Error(`Events should be fetched using getEvents method`);
      }

      const coreV1Namespaced = {
        'Service': (n, ns) => this.coreApi.readNamespacedService(n, ns),
        'Pod': (n, ns) => this.coreApi.readNamespacedPod(n, ns),
        'ConfigMap': (n, ns) => this.coreApi.readNamespacedConfigMap(n, ns),
        'Secret': (n, ns) => this.coreApi.readNamespacedSecret(n, ns),
      };

      const coreV1Cluster = {
        'Namespace': (n) => this.coreApi.readNamespace(n),
        'Node': (n) => this.coreApi.readNode(n),
        'PersistentVolume': (n) => this.coreApi.readPersistentVolume(n),
      };

      const appsV1Namespaced = {
        'Deployment': (n, ns) => this.appsApi.readNamespacedDeployment(n, ns),
        'StatefulSet': (n, ns) => this.appsApi.readNamespacedStatefulSet(n, ns),
        'DaemonSet': (n, ns) => this.appsApi.readNamespacedDaemonSet(n, ns),
        'ReplicaSet': (n, ns) => this.appsApi.readNamespacedReplicaSet(n, ns),
      };

      if (apiVersion === 'v1') {
        if (namespace && coreV1Namespaced[kind]) {
          const response = await coreV1Namespaced[kind](name, namespace);
          return response.body;
        }
        if (!namespace && coreV1Cluster[kind]) {
          const response = await coreV1Cluster[kind](name);
          return response.body;
        }
      }

      if (apiVersion === 'apps/v1' && namespace && appsV1Namespaced[kind]) {
        const response = await appsV1Namespaced[kind](name, namespace);
        return response.body;
      }
      
      const group = apiVersion.split('/')[0];
      const version = apiVersion.split('/')[1] || 'v1';
      const resourcePlural = await this.resolvePlural(apiVersion, kind, context, plural);
      
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
      if (this.handleNotFoundError(error)) {
        throw new Error(`Resource not found: ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ''}`);
      }
      throw new Error(`Failed to get resource: ${error.message}`);
    }
  }

  async getCrossplaneResources(namespace = null, context = null, limit = null, continueToken = null) {
    await this.ensureContext(context);
    try {
      const resources = [];
      let lastContinueToken = null;

      const apiextensionsApiVersion = 'apiextensions.crossplane.io/v1';
      const apiextensionsKinds = ['Composition', 'CompositeResourceDefinition', 'ProviderConfig', 'StoreConfig', 'EnvironmentConfig'];
      
      for (const kind of apiextensionsKinds) {
        try {
          const result = await this.getResources(apiextensionsApiVersion, kind, namespace, context, limit, continueToken);
          const items = result.items || result;
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => new CrossplaneResource({
            ...item,
            kind,
            apiVersion: apiextensionsApiVersion,
          })));
          if (result.continueToken) {
            lastContinueToken = result.continueToken;
          }
          if (limit && resources.length >= limit) {
            break;
          }
        } catch (error) {
        }
      }

      if (limit && resources.length >= limit) {
        return {
          items: resources.slice(0, limit),
          continueToken: lastContinueToken
        };
      }

      const pkgApiVersion = 'pkg.crossplane.io/v1';
      const pkgKinds = ['Provider', 'Function', 'Configuration'];
      
      for (const kind of pkgKinds) {
        try {
          const result = await this.getResources(pkgApiVersion, kind, namespace, context, limit ? (limit - resources.length) : null, continueToken);
          const items = result.items || result;
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => new CrossplaneResource({
            ...item,
            kind,
            apiVersion: pkgApiVersion,
          })));
          if (result.continueToken) {
            lastContinueToken = result.continueToken;
          }
          if (limit && resources.length >= limit) {
            break;
          }
        } catch (error) {
        }
      }

      if (limit && resources.length >= limit) {
        return {
          items: resources.slice(0, limit),
          continueToken: lastContinueToken
        };
      }

      const managedApiVersions = [
        'kubernetes.crossplane.io/v1alpha2',
        'kubernetes.crossplane.io/v1alpha1',
      ];
      const managedKinds = ['Object'];
      
      for (const apiVersion of managedApiVersions) {
        for (const kind of managedKinds) {
          try {
            const result = await this.getResources(apiVersion, kind, namespace, context, limit ? (limit - resources.length) : null, continueToken);
            const items = result.items || result;
            const itemsArray = Array.isArray(items) ? items : [];
            resources.push(...itemsArray.map(item => new CrossplaneResource({
              ...item,
              kind,
              apiVersion,
            })));
            if (result.continueToken) {
              lastContinueToken = result.continueToken;
            }
            if (limit && resources.length >= limit) {
              break;
            }
          } catch (error) {
          }
        }
        if (limit && resources.length >= limit) {
          break;
        }
      }

      if (limit && resources.length > limit) {
        return {
          items: resources.slice(0, limit),
          continueToken: lastContinueToken
        };
      }

      return {
        items: resources,
        continueToken: lastContinueToken
      };
    } catch (error) {
      throw new Error(`Failed to get Crossplane resources: ${error.message}`);
    }
  }

  async getCompositeResources(context = null, limit = null, continueToken = null) {
    try {
      const useCase = new GetCompositeResourcesUseCase(this);
      return await useCase.execute(context, limit, continueToken, null);
    } catch (error) {
      throw new Error(`Failed to get composite resources: ${error.message}`);
    }
  }

  async getEvents(kind, name, namespace = null, context = null) {
    await this.ensureContext(context);
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

  async getAllManagedResourceDefinitions(context = null) {
    await this.ensureContext(context);
    const cacheKey = `mrds_${context || 'default'}`;
    const cached = this.mrdCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      logger.debug('MRD cache hit', { context });
      return cached.data;
    }

    try {
      const providersResult = await this.getResources('pkg.crossplane.io/v1', 'Provider', null, context);
      const providers = providersResult.items || providersResult;
      const providersArray = Array.isArray(providers) ? providers : [];

      const allCRDsResult = await this.customObjectsApi.listClusterCustomObject(
        'apiextensions.k8s.io',
        'v1',
        'customresourcedefinitions'
      );
      const allCRDs = allCRDsResult.body.items || [];

      const providerCRDs = new Map();
      for (const crd of allCRDs) {
        const ownerRefs = crd.metadata?.ownerReferences || [];
        for (const ownerRef of ownerRefs) {
          if (ownerRef.kind === 'Provider' && ownerRef.apiVersion === 'pkg.crossplane.io/v1') {
            const providerName = ownerRef.name;
            if (providersArray.some(p => p.metadata?.name === providerName)) {
              if (!providerCRDs.has(providerName)) {
                providerCRDs.set(providerName, []);
              }
              providerCRDs.get(providerName).push(crd);
            }
          }
        }
      }

      const mrdList = [];
      for (const crds of providerCRDs.values()) {
        for (const crd of crds) {
          const kind = crd.spec?.names?.kind;
          if (kind === 'ProviderConfig' || kind === 'ProviderConfigUsage') {
            continue;
          }
          mrdList.push(crd);
        }
      }

      this.mrdCache.set(cacheKey, { data: mrdList, timestamp: Date.now() });
      logger.debug('MRDs loaded and cached', { context, count: mrdList.length });
      return mrdList;
    } catch (error) {
      logger.error('Failed to get managed resource definitions', { error: error.message, context });
      throw new Error(`Failed to get managed resource definitions: ${error.message}`);
    }
  }

  async getAllManagedResources(context = null, forceRefresh = false) {
    await this.ensureContext(context);
    const cacheKey = `mrs_${context || 'default'}`;
    
    if (!forceRefresh) {
      const cached = this.mrCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
        logger.debug('MR cache hit', { context, age: Math.round((Date.now() - cached.timestamp) / 1000) + 's' });
        return { items: cached.data, fromCache: true };
      }
      if (cached) {
        logger.debug('MR cache expired', { context, age: Math.round((Date.now() - cached.timestamp) / 1000) + 's' });
      }
    }

    try {
      const mrdList = await this.getAllManagedResourceDefinitions(context);
      const allResources = [];

      const resourcePromises = mrdList.map(async (mrd) => {
        try {
          const group = mrd.spec?.group;
          const version = mrd.spec?.versions?.[0]?.name || mrd.spec?.version || 'v1';
          const plural = mrd.spec?.names?.plural;
          const kind = mrd.spec?.names?.kind;
          const apiVersion = `${group}/${version}`;

          if (!plural || !kind) {
            return [];
          }

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 5000)
          );

          const queryPromise = this.getResources(apiVersion, kind, null, context, null, null, plural);
          const result = await Promise.race([queryPromise, timeoutPromise]);
          const items = result.items || result;
          return Array.isArray(items) ? items : [];
        } catch (error) {
          if (error.message !== 'Query timeout') {
            logger.debug('Failed to list MRD resources', { 
              mrd: mrd.metadata?.name, 
              error: error.message 
            });
          }
          return [];
        }
      });

      const results = await Promise.allSettled(resourcePromises);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allResources.push(...result.value);
        }
      }

      this.mrCache.set(cacheKey, { data: allResources, timestamp: Date.now() });
      logger.debug('Managed resources loaded and cached', { context, count: allResources.length });
      return { items: allResources, fromCache: false };
    } catch (error) {
      logger.error('Failed to get managed resources', { error: error.message, context });
      throw new Error(`Failed to get managed resources: ${error.message}`);
    }
  }
}

