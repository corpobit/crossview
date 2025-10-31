export class GetCompositeResourceKindsUseCase {
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
        if (error.message && (error.message.includes('500') || error.message.includes('Failed to get'))) {
          return [];
        }
        throw error;
      }
      
      const xrds = xrdsResult.items || xrdsResult;
      const xrdsArray = Array.isArray(xrds) ? xrds : [];
      
      // Extract kinds from XRDs without fetching the actual composite resources
      const kinds = xrdsArray
        .map(xrd => xrd.spec?.names?.kind)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      
      return [...new Set(kinds)]; // Remove duplicates
    } catch (error) {
      // If it's a server error (500), return empty array instead of throwing
      if (error.message && error.message.includes('500')) {
        return [];
      }
      throw new Error(`Failed to get composite resource kinds: ${error.message}`);
    }
  }
}

