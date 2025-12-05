export class GetClaimsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, limit = null, continueToken = null, claimType = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const xrdKind = 'CompositeResourceDefinition';
      
      // Get XRDs with pagination if no specific claim type requested
      const xrdsResult = await this.kubernetesRepository.getResources(
        apiVersion, 
        xrdKind, 
        null, 
        context,
        null, // No limit on XRDs - we need all to know claim types
        null  // No continue token for XRDs
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
      
      // If specific claim type requested, only query that type with proper pagination
      if (claimType) {
        const claimDef = claimDefinitions.find(cd => 
          cd.kind === claimType || 
          cd.plural === claimType ||
          cd.apiVersion.includes(claimType)
        );
        
        if (!claimDef) {
          return { items: [], continueToken: null };
        }
        
        // Direct pagination to Kubernetes API - no client-side aggregation
        const result = await this.kubernetesRepository.getResources(
          claimDef.apiVersion,
          claimDef.kind,
          null,
          context,
          limit, // Pass limit directly to Kubernetes API
          continueToken, // Pass continue token directly to Kubernetes API
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
      
      // Multiple claim types: query first type with pagination, return its results
      // This ensures proper Kubernetes pagination instead of client-side aggregation
      const firstClaimDef = claimDefinitions[0];
      const result = await this.kubernetesRepository.getResources(
        firstClaimDef.apiVersion,
        firstClaimDef.kind,
        null,
        context,
        limit, // Pass limit directly to Kubernetes API
        continueToken, // Pass continue token directly to Kubernetes API
        firstClaimDef.plural
      );
      
      const claimResources = result.items || [];
      const claimsArray = Array.isArray(claimResources) ? claimResources : [];
      
      return {
        items: claimsArray.map(claim => ({
          name: claim.metadata?.name || 'unknown',
          namespace: claim.metadata?.namespace || null,
          uid: claim.metadata?.uid || '',
          kind: firstClaimDef.kind,
          apiVersion: firstClaimDef.apiVersion,
          plural: firstClaimDef.plural,
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
      throw new Error(`Failed to get claims: ${error.message}`);
    }
  }
}

