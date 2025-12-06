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
          null, // No limit on XRDs
          null  // No continue token for XRDs
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
      
      // If specific resource type requested, only query that type with proper pagination
      if (resourceType) {
        const resType = resourceTypes.find(rt => 
          rt.xrKind === resourceType || 
          rt.xrPlural === resourceType ||
          rt.xrApiVersion.includes(resourceType)
        );
        
        if (!resType) {
          return { items: [], continueToken: null };
        }
        
        // Direct pagination to Kubernetes API - no client-side aggregation
        const xrsResult = await this.kubernetesRepository.getResources(
          resType.xrApiVersion,
          resType.xrKind,
          null,
          context,
          limit, // Pass limit directly to Kubernetes API
          continueToken, // Pass continue token directly to Kubernetes API
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
      
      // Multiple resource types: query first type with pagination, return its results
      // This ensures proper Kubernetes pagination instead of client-side aggregation
      const firstResType = resourceTypes[0];
      const xrsResult = await this.kubernetesRepository.getResources(
        firstResType.xrApiVersion,
        firstResType.xrKind,
        null,
        context,
        limit, // Pass limit directly to Kubernetes API
        continueToken, // Pass continue token directly to Kubernetes API
        firstResType.xrPlural
      );
      
      const xrs = xrsResult.items || xrsResult;
      const xrsArray = Array.isArray(xrs) ? xrs : [];
      
      return {
        items: xrsArray.map(xr => ({
          name: xr.metadata?.name || 'unknown',
          namespace: xr.metadata?.namespace || null,
          uid: xr.metadata?.uid || '',
          kind: firstResType.xrKind,
          apiVersion: firstResType.xrApiVersion,
          plural: firstResType.xrPlural,
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
    } catch (error) {
      if (error.message?.includes('500')) {
        return { items: [], continueToken: null };
      }
      throw new Error(`Failed to get composite resources: ${error.message}`);
    }
  }
}

