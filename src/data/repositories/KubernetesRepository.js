import { KubeConfig } from '@kubernetes/client-node';
import { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import { CrossplaneResource } from '../../domain/entities/CrossplaneResource.js';
import { IKubernetesRepository } from '../../domain/repositories/IKubernetesRepository.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export class KubernetesRepository extends IKubernetesRepository {
  constructor() {
    super();
    this.kubeConfig = new KubeConfig();
    this.coreApi = null;
    this.customObjectsApi = null;
    this.initialized = false;
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
    // First, try to load from cluster (when running in a Kubernetes pod)
    // This uses the service account token at /var/run/secrets/kubernetes.io/serviceaccount/
    try {
      this.kubeConfig.loadFromCluster();
      console.log('Loaded Kubernetes config from cluster (service account)');
      return;
    } catch (clusterError) {
      // Not running in a pod, fall back to file-based config
      console.log('Not running in cluster, trying file-based config...');
    }
    
    // Fall back to file-based config (for local development or mounted kubeconfig)
    const kubeConfigPath = this.getKubeConfigPath();
    
    if (!fs.existsSync(kubeConfigPath)) {
      throw new Error(`Kubernetes config file not found at ${kubeConfigPath}. Set KUBECONFIG or KUBE_CONFIG_PATH environment variable, or ensure ~/.kube/config exists. When running in a Kubernetes pod, ensure service account has proper permissions.`);
    }
    
    this.kubeConfig.loadFromFile(kubeConfigPath);
    console.log('Loaded Kubernetes config from file:', kubeConfigPath);
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
    if (this.initialized && this.coreApi && this.customObjectsApi) {
      return;
    }

    try {
      if (!this.kubeConfig.getCurrentContext()) {
        this.loadKubeConfig();
      }
      this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
      this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
      this.initialized = true;
      console.log('Kubernetes client initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize Kubernetes client: ${error.message}`);
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
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

  async getResources(apiVersion, kind, namespace = null, context = null, limit = null, continueToken = null) {
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
      const plural = kind.toLowerCase() + 's';
      
      if (namespace) {
        const response = await this.customObjectsApi.listNamespacedCustomObject(
          group,
          version,
          namespace,
          plural,
          undefined, // pretty
          undefined, // allowWatchBookmarks
          continueToken || undefined, // _continue
          undefined, // fieldSelector
          undefined, // labelSelector
          limit || undefined // limit
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
          plural,
          undefined, // pretty
          undefined, // allowWatchBookmarks
          continueToken || undefined, // _continue
          undefined, // fieldSelector
          undefined, // labelSelector
          limit || undefined // limit
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

  async getResource(apiVersion, kind, name, namespace = null, context = null) {
    if (context && this.kubeConfig) {
      const currentContext = this.kubeConfig.getCurrentContext();
      if (currentContext !== context) {
        this.kubeConfig.setCurrentContext(context);
        this.initialized = false;
      }
    }
    await this.ensureInitialized();
    try {
      if (namespace) {
        const response = await this.customObjectsApi.getNamespacedCustomObject(
          apiVersion.split('/')[0],
          apiVersion.split('/')[1] || 'v1',
          namespace,
          kind.toLowerCase() + 's',
          name
        );
        return response.body;
      } else {
        const response = await this.customObjectsApi.getClusterCustomObject(
          apiVersion.split('/')[0],
          apiVersion.split('/')[1] || 'v1',
          kind.toLowerCase() + 's',
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

      // Resources from apiextensions.crossplane.io/v1
      const apiextensionsApiVersion = 'apiextensions.crossplane.io/v1';
      const apiextensionsKinds = ['Composition', 'CompositeResourceDefinition', 'ProviderConfig', 'StoreConfig', 'EnvironmentConfig'];
      
      for (const kind of apiextensionsKinds) {
        try {
          const result = await this.getResources(apiextensionsApiVersion, kind, namespace, context);
          const items = result.items || result; // Support both new format and legacy array format
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => new CrossplaneResource({
            ...item,
            kind,
            apiVersion: apiextensionsApiVersion,
          })));
        } catch (error) {
          // Silently ignore errors for resources that don't exist
        }
      }

      // Resources from pkg.crossplane.io/v1
      const pkgApiVersion = 'pkg.crossplane.io/v1';
      const pkgKinds = ['Provider', 'Function', 'Configuration'];
      
      for (const kind of pkgKinds) {
        try {
          const result = await this.getResources(pkgApiVersion, kind, namespace, context);
          const items = result.items || result; // Support both new format and legacy array format
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => new CrossplaneResource({
            ...item,
            kind,
            apiVersion: pkgApiVersion,
          })));
        } catch (error) {
          // Silently ignore errors for resources that don't exist
        }
      }

      // Managed resources from provider API groups (e.g., kubernetes.crossplane.io)
      // Query for Object resources (common managed resource type)
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
            // Silently ignore errors for resources that don't exist
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
      // Events are always namespaced, so we need a namespace
      // If the resource is cluster-scoped, we can't get events for it
      if (!namespace) {
        return [];
      }

      // Build field selector to filter events by involvedObject
      // Include namespace in the selector to ensure we match correctly
      const fieldSelector = `involvedObject.kind=${kind},involvedObject.name=${name},involvedObject.namespace=${namespace}`;
      
      console.log('[KubernetesRepository] Fetching events with:', { kind, name, namespace, fieldSelector });
      
      let response;
      try {
        response = await this.coreApi.listNamespacedEvent(
          namespace,
          undefined, // pretty
          undefined, // allowWatchBookmarks
          undefined, // _continue
          fieldSelector, // fieldSelector
          undefined, // labelSelector
          undefined, // limit
          undefined, // resourceVersion
          undefined, // resourceVersionMatch
          undefined, // timeoutSeconds
          undefined // watch
        );
        console.log('[KubernetesRepository] Events API response:', response.body.items?.length || 0, 'events');
      } catch (fieldSelectorError) {
        // If field selector fails, try without namespace in selector (some clusters might not support it)
        console.warn('[KubernetesRepository] Field selector with namespace failed, trying without:', fieldSelectorError.message);
        const fallbackSelector = `involvedObject.kind=${kind},involvedObject.name=${name}`;
        response = await this.coreApi.listNamespacedEvent(
          namespace,
          undefined, // pretty
          undefined, // allowWatchBookmarks
          undefined, // _continue
          fallbackSelector, // fieldSelector
          undefined, // labelSelector
          undefined, // limit
          undefined, // resourceVersion
          undefined, // resourceVersionMatch
          undefined, // timeoutSeconds
          undefined // watch
        );
        console.log('[KubernetesRepository] Fallback events API response:', response.body.items?.length || 0, 'events');
      }

      // Get all events and filter manually to ensure we match correctly
      // This handles cases where field selector might not work perfectly
      let allEvents = response.body.items || [];
      
      console.log('[KubernetesRepository] Total events before filtering:', allEvents.length);
      
      // Filter events to match the resource exactly
      const filteredEvents = allEvents.filter(event => {
        const involvedObject = event.involvedObject || {};
        const matches = involvedObject.kind === kind && 
               involvedObject.name === name &&
               (involvedObject.namespace === namespace || !involvedObject.namespace);
        if (!matches && involvedObject.kind === kind && involvedObject.name === name) {
          console.log('[KubernetesRepository] Event filtered out due to namespace mismatch:', {
            eventNamespace: involvedObject.namespace,
            expectedNamespace: namespace
          });
        }
        return matches;
      });
      
      console.log('[KubernetesRepository] Events after filtering:', filteredEvents.length);

      // Sort by lastTimestamp (most recent first)
      const sortedEvents = [...filteredEvents].sort((a, b) => {
        const timeA = a.lastTimestamp || a.eventTime || a.firstTimestamp || '';
        const timeB = b.lastTimestamp || b.eventTime || b.firstTimestamp || '';
        return timeB.localeCompare(timeA);
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
      // If events can't be fetched, return empty array (don't break the UI)
      console.warn('Failed to get events:', error.message);
      return [];
    }
  }
}

