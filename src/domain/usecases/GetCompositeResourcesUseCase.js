export class GetCompositeResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, limit = null, continueToken = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      let xrdsResult;
      try {
        xrdsResult = await this.kubernetesRepository.getResources(apiVersion, xrdKind, null, context);
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
      
      let allResources = [];
      let lastContinueToken = null;
      
      for (const { xrKind, xrApiVersion, xrPlural } of resourceTypes) {
        try {
          const xrsResult = await this.kubernetesRepository.getResources(
            xrApiVersion,
            xrKind,
            null,
            context,
            limit,
            continueToken,
            xrPlural
          );
          
          const xrs = xrsResult.items || xrsResult;
          const xrsArray = Array.isArray(xrs) ? xrs : [];
          
          allResources.push(...xrsArray.map(xr => ({
            name: xr.metadata?.name || 'unknown',
            namespace: xr.metadata?.namespace || null,
            uid: xr.metadata?.uid || '',
            kind: xrKind,
            apiVersion: xrApiVersion,
            plural: xrPlural,
            creationTimestamp: xr.metadata?.creationTimestamp || '',
            labels: xr.metadata?.labels || {},
            compositionRef: xr.spec?.compositionRef || null,
            claimRef: xr.spec?.claimRef || null,
            writeConnectionSecretsTo: xr.spec?.writeConnectionSecretsTo || null,
            resourceRefs: xr.spec?.resourceRefs || [],
            status: xr.status || {},
            conditions: xr.status?.conditions || [],
            spec: xr.spec || {},
          })));
          
          if (xrsResult.continueToken) {
            lastContinueToken = xrsResult.continueToken;
          }
          
          if (limit && allResources.length >= limit) {
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (limit && allResources.length > limit) {
        allResources = allResources.slice(0, limit);
      }
      
      return {
        items: allResources,
        continueToken: lastContinueToken
      };
    } catch (error) {
      if (error.message?.includes('500')) {
        return { items: [], continueToken: null };
      }
      throw new Error(`Failed to get composite resources: ${error.message}`);
    }
  }
}

