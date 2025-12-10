export class GetClaimsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, limit = null, continueToken = null, claimType = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      const xrdsResult = await this.kubernetesRepository.getResources(
        apiVersion, 
        xrdKind, 
        null, 
        context,
        null,
        null
      );
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
      
      if (claimType) {
        const claimDef = claimDefinitions.find(cd => 
          cd.kind === claimType || 
          cd.plural === claimType ||
          cd.apiVersion.includes(claimType)
        );
        
        if (!claimDef) {
          return { items: [], continueToken: null };
        }
        
        const result = await this.kubernetesRepository.getResources(
          claimDef.apiVersion,
          claimDef.kind,
          null,
          context,
          limit,
          continueToken,
          claimDef.plural
        );
        
        const claimResources = result.items || [];
        const claimsArray = Array.isArray(claimResources) ? claimResources : [];
        
        return {
          items: claimsArray.map(claim => ({
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
      }
      
      const claimPromises = claimDefinitions.map(async (claimDef) => {
        try {
          const allClaims = [];
          let continueToken = null;
          
          do {
            const result = await this.kubernetesRepository.getResources(
              claimDef.apiVersion,
              claimDef.kind,
              null,
              context,
              null,
              continueToken,
              claimDef.plural
            );
            
            const claimResources = result.items || result || [];
            const claimsArray = Array.isArray(claimResources) ? claimResources : [];
            allClaims.push(...claimsArray);
            
            continueToken = result.continueToken || null;
          } while (continueToken);
          
          return allClaims.map(claim => ({
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
          }));
        } catch (error) {
          return [];
        }
      });
      
      const claimArrays = await Promise.all(claimPromises);
      const allClaims = claimArrays.flat();
      
      allClaims.sort((a, b) => {
        const timeA = a.creationTimestamp || '';
        const timeB = b.creationTimestamp || '';
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        return timeB.localeCompare(timeA);
      });
      
      return {
        items: allClaims,
        continueToken: null
      };
    } catch (error) {
      throw new Error(`Failed to get claims: ${error.message}`);
    }
  }
}

