export class GetResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, namespace = null, limit = null, continueToken = null) {
    try {
      const resources = [];
      let lastContinueToken = null;

      const apiextensionsApiVersion = 'apiextensions.crossplane.io/v1';
      const apiextensionsKinds = ['Composition', 'CompositeResourceDefinition', 'ProviderConfig', 'StoreConfig', 'EnvironmentConfig'];
      
      for (const kind of apiextensionsKinds) {
        try {
          const result = await this.kubernetesRepository.getResources(apiextensionsApiVersion, kind, namespace, context, limit, continueToken);
          const items = result.items || result;
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => ({
            name: item.metadata?.name || 'unknown',
            namespace: item.metadata?.namespace || null,
            uid: item.metadata?.uid || '',
            kind: kind,
            apiVersion: apiextensionsApiVersion,
            creationTimestamp: item.metadata?.creationTimestamp || '',
            labels: item.metadata?.labels || {},
            annotations: item.metadata?.annotations || {},
            spec: item.spec || {},
            status: item.status || {},
            conditions: item.status?.conditions || [],
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
          const result = await this.kubernetesRepository.getResources(pkgApiVersion, kind, namespace, context, limit ? (limit - resources.length) : null, continueToken);
          const items = result.items || result;
          const itemsArray = Array.isArray(items) ? items : [];
          resources.push(...itemsArray.map(item => ({
            name: item.metadata?.name || 'unknown',
            namespace: item.metadata?.namespace || null,
            uid: item.metadata?.uid || '',
            kind: kind,
            apiVersion: pkgApiVersion,
            creationTimestamp: item.metadata?.creationTimestamp || '',
            labels: item.metadata?.labels || {},
            annotations: item.metadata?.annotations || {},
            spec: item.spec || {},
            status: item.status || {},
            conditions: item.status?.conditions || [],
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
            const result = await this.kubernetesRepository.getResources(apiVersion, kind, namespace, context, limit ? (limit - resources.length) : null, continueToken);
            const items = result.items || result;
            const itemsArray = Array.isArray(items) ? items : [];
            resources.push(...itemsArray.map(item => ({
              name: item.metadata?.name || 'unknown',
              namespace: item.metadata?.namespace || null,
              uid: item.metadata?.uid || '',
              kind: kind,
              apiVersion: apiVersion,
              creationTimestamp: item.metadata?.creationTimestamp || '',
              labels: item.metadata?.labels || {},
              annotations: item.metadata?.annotations || {},
              spec: item.spec || {},
              status: item.status || {},
              conditions: item.status?.conditions || [],
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

      return {
        items: resources,
        continueToken: lastContinueToken
      };
    } catch (error) {
      throw new Error(`Failed to get resources: ${error.message}`);
    }
  }
}

