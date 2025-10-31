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

  getContexts() {
    try {
      const kubeConfigPath = path.join(homedir(), '.kube', 'config');
      if (!fs.existsSync(kubeConfigPath)) {
        return [];
      }
      this.kubeConfig.loadFromFile(kubeConfigPath);
      return this.kubeConfig.getContexts().map(ctx => ({
        name: ctx.name,
        cluster: ctx.cluster,
        user: ctx.user,
        namespace: ctx.namespace || 'default',
      }));
    } catch (error) {
      throw new Error(`Failed to get contexts: ${error.message}`);
    }
  }

  getCurrentContext() {
    try {
      const kubeConfigPath = path.join(homedir(), '.kube', 'config');
      if (!fs.existsSync(kubeConfigPath)) {
        return null;
      }
      this.kubeConfig.loadFromFile(kubeConfigPath);
      return this.kubeConfig.getCurrentContext();
    } catch (error) {
      return null;
    }
  }

  setContext(contextName) {
    try {
      const kubeConfigPath = path.join(homedir(), '.kube', 'config');
      if (!fs.existsSync(kubeConfigPath)) {
        throw new Error('Kubernetes config file not found');
      }
      this.kubeConfig.loadFromFile(kubeConfigPath);
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
      const kubeConfigPath = path.join(homedir(), '.kube', 'config');
      
      if (!fs.existsSync(kubeConfigPath)) {
        throw new Error('Kubernetes config file not found at ~/.kube/config');
      }

      if (!this.kubeConfig.getCurrentContext()) {
        this.kubeConfig.loadFromFile(kubeConfigPath);
      }
      this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
      this.customObjectsApi = this.kubeConfig.makeApiClient(CustomObjectsApi);
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

      return resources;
    } catch (error) {
      throw new Error(`Failed to get Crossplane resources: ${error.message}`);
    }
  }
}

