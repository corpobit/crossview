export class GetCompositeResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      let xrdsResult;
      try {
        xrdsResult = await this.kubernetesRepository.getResources(apiVersion, xrdKind, null, context);
      } catch (error) {
        // If we can't fetch XRDs, return empty array instead of throwing
        // This can happen if the API is not available or if there's a permission issue
        if (error.message && (error.message.includes('500') || error.message.includes('Failed to get'))) {
          return [];
        }
        throw error;
      }
      
      const xrds = xrdsResult.items || xrdsResult; // Support both new format and legacy array format
      const xrdsArray = Array.isArray(xrds) ? xrds : [];
      
      // Build list of resource types to fetch in parallel
      const resourceTypes = [];
      for (const xrd of xrdsArray) {
        const resourceNames = xrd.spec?.names;
        if (resourceNames?.kind) {
          const xrKind = resourceNames.kind;
          const xrGroup = xrd.spec?.group || 'apiextensions.crossplane.io';
          const xrVersion = xrd.spec?.versions?.[0]?.name || xrd.spec?.version || 'v1';
          const xrApiVersion = `${xrGroup}/${xrVersion}`;
          resourceTypes.push({ xrKind, xrApiVersion });
        }
      }
      
      // Fetch all resource types in parallel
      const resourcePromises = resourceTypes.map(async ({ xrKind, xrApiVersion }) => {
        try {
          // Fetch cluster-scoped CompositeResources (namespace = null)
          const xrsResult = await this.kubernetesRepository.getResources(xrApiVersion, xrKind, null, context);
          const xrs = xrsResult.items || xrsResult; // Support both formats
          const xrsArray = Array.isArray(xrs) ? xrs : [];
          
          return xrsArray.map(xr => ({
            name: xr.metadata?.name || 'unknown',
            namespace: xr.metadata?.namespace || null,
            uid: xr.metadata?.uid || '',
            kind: xrKind,
            apiVersion: xrApiVersion,
            creationTimestamp: xr.metadata?.creationTimestamp || '',
            labels: xr.metadata?.labels || {},
            compositionRef: xr.spec?.compositionRef || null,
            claimRef: xr.spec?.claimRef || null,
            writeConnectionSecretsTo: xr.spec?.writeConnectionSecretsTo || null,
            resourceRefs: xr.spec?.resourceRefs || [],
            status: xr.status || {},
            conditions: xr.status?.conditions || [],
          }));
        } catch (error) {
          // Ignore errors for resources that don't exist or can't be accessed
          // This is expected for some resource types
          // Silently continue - some resource types may not exist or may not be accessible
          // eslint-disable-next-line no-unused-vars
          return [];
        }
      });
      
      const resourceResults = await Promise.all(resourcePromises);
      const compositeResources = resourceResults.flat();
      
      return compositeResources;
    } catch (error) {
      // If it's a server error (500), return empty array instead of throwing
      // This prevents the app from breaking when the API is temporarily unavailable
      if (error.message?.includes('500')) {
        return [];
      }
      throw new Error(`Failed to get composite resources: ${error.message}`);
    }
  }
}

