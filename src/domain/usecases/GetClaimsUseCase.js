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
        return [];
      }
      
      // Fetch all claim types in parallel
      const claimPromises = claimDefinitions.map(async (claimDef) => {
        try {
          // Try cluster-level query first - this should work for namespaced custom resources
          // The API will return all instances across all namespaces
          // Use a very large limit - Kubernetes API servers will cap it at their maximum (usually 50000)
          // This minimizes the number of pagination requests needed
          let continueToken = null;
          let pageCount = 0;
          const MAX_PAGES = 5; // Safety limit - with large page size, we shouldn't need many pages
          const PAGE_SIZE = 50000; // Very large page size - API server will cap at its maximum
          const claimResults = [];
        
        do {
          const result = await this.kubernetesRepository.getResources(
            claimDef.apiVersion,
            claimDef.kind,
              null, // null namespace = query across all namespaces
            context,
              PAGE_SIZE, // Large limit to minimize pagination
            continueToken,
            claimDef.plural // Pass the correct plural from XRD
          );
          
          const claimResources = result.items || [];
          const claimsArray = Array.isArray(claimResources) ? claimResources : [];
          
          claimResults.push(...claimsArray.map(claim => ({
            name: claim.metadata?.name || 'unknown',
            namespace: claim.metadata?.namespace || null,
            uid: claim.metadata?.uid || '',
            kind: claimDef.kind,
            apiVersion: claimDef.apiVersion,
            plural: claimDef.plural, // Include plural for getResource calls
            creationTimestamp: claim.metadata?.creationTimestamp || '',
            labels: claim.metadata?.labels || {},
            resourceRef: claim.spec?.resourceRef || null,
            compositionRef: claim.spec?.compositionRef || null,
            writeConnectionSecretToRef: claim.spec?.writeConnectionSecretToRef || null,
            status: claim.status || {},
            conditions: claim.status?.conditions || [],
            spec: claim.spec || {}, // Include full spec for relation extraction
          })));
          
          continueToken = result.continueToken || null;
          pageCount++;
          
          // Safety check to prevent infinite pagination loops
          if (pageCount >= MAX_PAGES) {
            console.warn(`Reached maximum page limit (${MAX_PAGES}) for ${claimDef.kind}. Some claims may be missing.`);
            break;
          }
        } while (continueToken);
        
        return claimResults;
        } catch (error) {
          // If cluster-level query fails (e.g., resource is strictly namespaced),
          // fall back to querying each namespace individually
          if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist'))) {
            // Resource type doesn't exist, skip it
            return [];
          }
          
          // If cluster-level query doesn't work, fall back to namespace-by-namespace
          // This should rarely happen, but we handle it gracefully
          console.warn(`Cluster-level query failed for ${claimDef.kind}, falling back to namespace-by-namespace:`, error.message);
          
          const namespaces = await this.kubernetesRepository.getNamespaces(context);
          const MAX_NAMESPACES = 500;
          const namespacesToCheck = namespaces.slice(0, MAX_NAMESPACES);
          
          const namespacePromises = namespacesToCheck.map(async (namespace) => {
            try {
              const result = await this.kubernetesRepository.getResources(
                claimDef.apiVersion,
                claimDef.kind,
                namespace.name,
                context,
                50000, // Very large page size - API server will cap at its maximum
                null,
                claimDef.plural // Pass the correct plural from XRD
              );
          
              const claimResources = result.items || [];
              const claimsArray = Array.isArray(claimResources) ? claimResources : [];
              
              return claimsArray.map(claim => ({
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
              }));
            } catch (nsError) {
              // Ignore errors for individual namespaces
              // eslint-disable-next-line no-unused-vars
              return [];
            }
          });
          
          const namespaceResults = await Promise.all(namespacePromises);
          return namespaceResults.flat();
        }
      });
      
      const claimResults = await Promise.all(claimPromises);
      claims.push(...claimResults.flat());
      
      return claims;
    } catch (error) {
      throw new Error(`Failed to get claims: ${error.message}`);
    }
  }
}

