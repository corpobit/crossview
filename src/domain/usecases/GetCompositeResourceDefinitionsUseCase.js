export class GetCompositeResourceDefinitionsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const kind = 'CompositeResourceDefinition';
      const xrdsResult = await this.kubernetesRepository.getResources(apiVersion, kind, null, context);
      const xrds = xrdsResult.items || xrdsResult; // Support both new format and legacy array format
      const xrdsArray = Array.isArray(xrds) ? xrds : [];
      
      return xrdsArray.map(xrd => ({
        name: xrd.metadata?.name || 'unknown',
        namespace: xrd.metadata?.namespace || null,
        uid: xrd.metadata?.uid || '',
        creationTimestamp: xrd.metadata?.creationTimestamp || '',
        labels: xrd.metadata?.labels || {},
        group: xrd.spec?.group || '',
        names: xrd.spec?.names || {},
        versions: xrd.spec?.versions || [],
        claimNames: xrd.spec?.claimNames || null,
        connectionSecretKeys: xrd.spec?.connectionSecretKeys || [],
        defaultCompositionRef: xrd.spec?.defaultCompositionRef || null,
        enforceCompositionRef: xrd.spec?.enforceCompositionRef || false,
        spec: xrd.spec || {},
        status: xrd.status || {},
        conditions: xrd.status?.conditions || [],
      }));
    } catch (error) {
      throw new Error(`Failed to get composite resource definitions: ${error.message}`);
    }
  }
}

