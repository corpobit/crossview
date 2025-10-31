export class GetManagedResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, namespace = null) {
    try {
      const managedResources = [];
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      const xrdsResult = await this.kubernetesRepository.getResources(apiVersion, xrdKind, null, context);
      const xrds = xrdsResult.items || xrdsResult; // Support both new format and legacy array format
      const xrdsArray = Array.isArray(xrds) ? xrds : [];
      const namespaces = namespace ? [{ name: namespace }] : await this.kubernetesRepository.getNamespaces(context);
      
      const providerApiGroups = new Set();
      
      for (const xrd of xrdsArray) {
        const resources = xrd.spec?.resources || [];
        for (const resource of resources) {
          if (resource.base && resource.base.apiVersion) {
            const group = resource.base.apiVersion.split('/')[0];
            if (group && !group.includes('crossplane.io') && !group.includes('apiextensions')) {
              providerApiGroups.add(group);
            }
          }
        }
      }
      
      for (const group of providerApiGroups) {
        try {
          const crdsResult = await this.kubernetesRepository.getResources(
            'apiextensions.k8s.io/v1',
            'CustomResourceDefinition',
            null,
            context
          );
          const crds = crdsResult.items || crdsResult; // Support both formats
          const crdsArray = Array.isArray(crds) ? crds : [];
          
          const managedCrds = crdsArray.filter(crd => {
            const crdGroup = crd.spec?.group || '';
            return crdGroup === group && 
                   crd.spec?.names?.kind &&
                   !crd.spec.names.kind.includes('Claim') &&
                   !crd.spec.names.kind.includes('Composition') &&
                   !crd.spec.names.kind.includes('Provider') &&
                   !crd.spec.names.kind.includes('ProviderConfig');
          });
          
          for (const crd of managedCrds) {
            const kind = crd.spec?.names?.kind;
            const version = crd.spec?.versions?.[0]?.name || crd.spec?.version || 'v1';
            const apiVersion = `${group}/${version}`;
            
            for (const ns of namespaces) {
              try {
                const resourcesResult = await this.kubernetesRepository.getResources(
                  apiVersion,
                  kind,
                  ns.name,
                  context
                );
                const resources = resourcesResult.items || resourcesResult; // Support both formats
                const resourcesArray = Array.isArray(resources) ? resources : [];
                
                for (const resource of resourcesArray) {
                  if (resource.metadata?.labels?.['crossplane.io/managed'] === 'true' ||
                      resource.metadata?.annotations?.['crossplane.io/external-name']) {
                    managedResources.push({
                      name: resource.metadata?.name || 'unknown',
                      namespace: resource.metadata?.namespace || ns.name,
                      uid: resource.metadata?.uid || '',
                      kind: kind,
                      apiVersion: apiVersion,
                      creationTimestamp: resource.metadata?.creationTimestamp || '',
                      labels: resource.metadata?.labels || {},
                      annotations: resource.metadata?.annotations || {},
                      externalName: resource.metadata?.annotations?.['crossplane.io/external-name'] || null,
                      provider: resource.metadata?.labels?.['crossplane.io/provider'] || null,
                      status: resource.status || {},
                      conditions: resource.status?.conditions || [],
                    });
                  }
                }
              } catch (error) {
              }
            }
          }
        } catch (error) {
        }
      }
      
      return managedResources;
    } catch (error) {
      throw new Error(`Failed to get managed resources: ${error.message}`);
    }
  }
}

