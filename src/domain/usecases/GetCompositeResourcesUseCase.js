export class GetCompositeResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, limit = null, continueToken = null, resourceType = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      let xrdsResult;
      try {
        xrdsResult = await this.kubernetesRepository.getResources(
          apiVersion, 
          xrdKind, 
          null, 
          context,
          null,
          null
        );
      } catch (error) {
        if (error.message && (error.message.includes('500') || error.message.includes('Failed to get'))) {
          return { items: [], continueToken: null };
        }
        throw error;
      }
      
      const xrds = xrdsResult.items || xrdsResult;
      const xrdsArray = Array.isArray(xrds) ? xrds : [];
      
      const resourceTypes = [];
      for (const xrd of xrdsArray) {
        const resourceNames = xrd.spec?.names;
        if (resourceNames?.kind) {
          const xrKind = resourceNames.kind;
          const xrGroup = xrd.spec?.group || 'apiextensions.crossplane.io';
          const xrVersion = xrd.spec?.versions?.[0]?.name || xrd.spec?.version || 'v1';
          const xrApiVersion = `${xrGroup}/${xrVersion}`;
          const xrPlural = resourceNames.plural || xrKind.toLowerCase() + 's';
          resourceTypes.push({ xrKind, xrApiVersion, xrPlural });
        }
      }
      
      if (resourceTypes.length === 0) {
        return { items: [], continueToken: null };
      }
      
      if (resourceType) {
        const resType = resourceTypes.find(rt => 
          rt.xrKind === resourceType || 
          rt.xrPlural === resourceType ||
          rt.xrApiVersion.includes(resourceType)
        );
        
        if (!resType) {
          return { items: [], continueToken: null };
        }
        
        const xrsResult = await this.kubernetesRepository.getResources(
          resType.xrApiVersion,
          resType.xrKind,
          null,
          context,
          limit,
          continueToken,
          resType.xrPlural
        );
        
        const xrs = xrsResult.items || xrsResult;
        const xrsArray = Array.isArray(xrs) ? xrs : [];
        
        return {
          items: xrsArray.map(xr => ({
            name: xr.metadata?.name || 'unknown',
            namespace: xr.metadata?.namespace || null,
            uid: xr.metadata?.uid || '',
            kind: resType.xrKind,
            apiVersion: resType.xrApiVersion,
            plural: resType.xrPlural,
            creationTimestamp: xr.metadata?.creationTimestamp || '',
            labels: xr.metadata?.labels || {},
            compositionRef: xr.spec?.compositionRef || null,
            claimRef: xr.spec?.claimRef || null,
            writeConnectionSecretsTo: xr.spec?.writeConnectionSecretsTo || null,
            resourceRefs: xr.spec?.resourceRefs || [],
            status: xr.status || {},
            conditions: xr.status?.conditions || [],
            spec: xr.spec || {},
          })),
          continueToken: xrsResult.continueToken || null
        };
      }
      
      const numTypes = resourceTypes.length;
      const perTypeLimit = limit ? Math.min(limit * 2, 50) : 50;
      
      const resourcePromises = resourceTypes.map(async (resType) => {
        try {
          const xrsResult = await this.kubernetesRepository.getResources(
            resType.xrApiVersion,
            resType.xrKind,
            null,
            context,
            perTypeLimit,
            null,
            resType.xrPlural
          );
          
          const xrs = xrsResult.items || xrsResult;
          const xrsArray = Array.isArray(xrs) ? xrs : [];
          
          return xrsArray.map(xr => ({
            name: xr.metadata?.name || 'unknown',
            namespace: xr.metadata?.namespace || null,
            uid: xr.metadata?.uid || '',
            kind: resType.xrKind,
            apiVersion: resType.xrApiVersion,
            plural: resType.xrPlural,
            creationTimestamp: xr.metadata?.creationTimestamp || '',
            labels: xr.metadata?.labels || {},
            compositionRef: xr.spec?.compositionRef || null,
            claimRef: xr.spec?.claimRef || null,
            writeConnectionSecretsTo: xr.spec?.writeConnectionSecretsTo || null,
            resourceRefs: xr.spec?.resourceRefs || [],
            status: xr.status || {},
            conditions: xr.status?.conditions || [],
            spec: xr.spec || {},
          }));
        } catch (error) {
          return [];
        }
      });
      
      const resourceArrays = await Promise.all(resourcePromises);
      const allResources = resourceArrays.flat();
      
      allResources.sort((a, b) => {
        const timeA = a.creationTimestamp || '';
        const timeB = b.creationTimestamp || '';
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        return timeB.localeCompare(timeA);
      });
      
      const limitedResources = limit ? allResources.slice(0, limit) : allResources;
      
      return {
        items: limitedResources,
        continueToken: null
      };
    } catch (error) {
      if (error.message?.includes('500')) {
        return { items: [], continueToken: null };
      }
      throw new Error(`Failed to get composite resources: ${error.message}`);
    }
  }
}

