export class GetClaimsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, limit = null, continueToken = null) {
    try {
      const claims = [];
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      const xrdsResult = await this.kubernetesRepository.getResources(apiVersion, xrdKind, null, context);
      const xrds = xrdsResult.items || xrdsResult;
      const xrdsArray = Array.isArray(xrds) ? xrds : [];
      
      const claimDefinitions = [];
      for (const xrd of xrdsArray) {
        const claimNames = xrd.spec?.claimNames;
        if (claimNames?.kind) {
          const claimKind = claimNames.kind;
          const claimGroup = xrd.spec?.group || 'apiextensions.crossplane.io';
          const claimVersion = xrd.spec?.versions?.[0]?.name || xrd.spec?.version || 'v1';
          const claimApiVersion = `${claimGroup}/${claimVersion}`;
          
          claimDefinitions.push({
            kind: claimKind,
            apiVersion: claimApiVersion,
            plural: claimNames.plural || claimKind.toLowerCase() + 's',
          });
        }
      }
      
      if (claimDefinitions.length === 0) {
        return { items: [], continueToken: null };
      }
      
      const claimPromises = claimDefinitions.map(async (claimDef) => {
        try {
          const result = await this.kubernetesRepository.getResources(
            claimDef.apiVersion,
            claimDef.kind,
            null,
            context,
            limit ? Math.ceil(limit / claimDefinitions.length) + 10 : null,
            continueToken,
            claimDef.plural
          );
          
          const claimResources = result.items || [];
          const claimsArray = Array.isArray(claimResources) ? claimResources : [];
          
          return {
            claims: claimsArray.map(claim => ({
              name: claim.metadata?.name || 'unknown',
              namespace: claim.metadata?.namespace || null,
              uid: claim.metadata?.uid || '',
              kind: claimDef.kind,
              apiVersion: claimDef.apiVersion,
              plural: claimDef.plural,
              creationTimestamp: claim.metadata?.creationTimestamp || '',
              labels: claim.metadata?.labels || {},
              resourceRef: claim.spec?.resourceRef || null,
              compositionRef: claim.spec?.compositionRef || null,
              writeConnectionSecretToRef: claim.spec?.writeConnectionSecretToRef || null,
              status: claim.status || {},
              conditions: claim.status?.conditions || [],
              spec: claim.spec || {},
            })),
            continueToken: result.continueToken || null
          };
        } catch (error) {
          if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist'))) {
            return { claims: [], continueToken: null };
          }
          return { claims: [], continueToken: null };
        }
      });
      
      const results = await Promise.all(claimPromises);
      
      let allClaims = [];
      let lastContinueToken = null;
      
      for (const result of results) {
        allClaims.push(...result.claims);
        if (result.continueToken) {
          lastContinueToken = result.continueToken;
        }
        if (limit && allClaims.length >= limit) {
          break;
        }
      }
      
      if (limit && allClaims.length > limit) {
        allClaims = allClaims.slice(0, limit);
      }
      
      return {
        items: allClaims,
        continueToken: lastContinueToken
      };
    } catch (error) {
      throw new Error(`Failed to get claims: ${error.message}`);
    }
  }
}

