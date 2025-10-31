export class GetClaimsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const claims = [];
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      const xrdsResult = await this.kubernetesRepository.getResources(apiVersion, xrdKind, null, context);
      const xrds = xrdsResult.items || xrdsResult; // Support both new format and legacy array format
      const xrdsArray = Array.isArray(xrds) ? xrds : [];
      
      const claimDefinitions = [];
      for (const xrd of xrdsArray) {
        const claimNames = xrd.spec?.claimNames;
        if (claimNames && claimNames.kind) {
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
        return [];
      }
      
      const namespaces = await this.kubernetesRepository.getNamespaces(context);
      const MAX_NAMESPACES = 200;
      const namespacesToCheck = namespaces.slice(0, MAX_NAMESPACES);
      
      const BATCH_SIZE = 3;
      const DELAY_MS = 50;
      const PAGE_SIZE = 500; // Fetch claims in pages of 500
      
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Helper function to fetch all claims from a namespace with pagination
      const fetchAllClaimsFromNamespace = async (claimDef, namespace, context) => {
        const allClaims = [];
        let continueToken = null;
        
        do {
          const result = await this.kubernetesRepository.getResources(
            claimDef.apiVersion,
            claimDef.kind,
            namespace.name,
            context,
            PAGE_SIZE,
            continueToken
          );
          
          const claimResources = result.items || [];
          const claimsArray = Array.isArray(claimResources) ? claimResources : [];
          
          allClaims.push(...claimsArray.map(claim => ({
            name: claim.metadata?.name || 'unknown',
            namespace: claim.metadata?.namespace || namespace.name,
            uid: claim.metadata?.uid || '',
            kind: claimDef.kind,
            apiVersion: claimDef.apiVersion,
            creationTimestamp: claim.metadata?.creationTimestamp || '',
            labels: claim.metadata?.labels || {},
            resourceRef: claim.spec?.resourceRef || null,
            compositionRef: claim.spec?.compositionRef || null,
            writeConnectionSecretToRef: claim.spec?.writeConnectionSecretToRef || null,
            status: claim.status || {},
            conditions: claim.status?.conditions || [],
          })));
          
          continueToken = result.continueToken || null;
        } while (continueToken);
        
        return allClaims;
      };
      
      for (const claimDef of claimDefinitions) {
        for (let i = 0; i < namespacesToCheck.length; i += BATCH_SIZE) {
          const namespaceBatch = namespacesToCheck.slice(i, i + BATCH_SIZE);
          const batchPromises = namespaceBatch.map(namespace =>
            fetchAllClaimsFromNamespace(claimDef, namespace, context).catch(() => [])
          );
          
          const batchResults = await Promise.all(batchPromises);
          claims.push(...batchResults.flat());
          
          if (i + BATCH_SIZE < namespacesToCheck.length) {
            await delay(DELAY_MS);
          }
        }
      }
      
      return claims;
    } catch (error) {
      throw new Error(`Failed to get claims: ${error.message}`);
    }
  }
}

