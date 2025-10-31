export class GetCompositionsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const kind = 'Composition';
      const compositionsResult = await this.kubernetesRepository.getResources(apiVersion, kind, null, context);
      const compositions = compositionsResult.items || compositionsResult; // Support both new format and legacy array format
      const compositionsArray = Array.isArray(compositions) ? compositions : [];
      
      return compositionsArray.map(comp => ({
        name: comp.metadata?.name || 'unknown',
        namespace: comp.metadata?.namespace || null,
        uid: comp.metadata?.uid || '',
        creationTimestamp: comp.metadata?.creationTimestamp || '',
        labels: comp.metadata?.labels || {},
        compositeTypeRef: comp.spec?.compositeTypeRef || null,
        resources: comp.spec?.resources || [],
        writeConnectionSecretsToNamespace: comp.spec?.writeConnectionSecretsToNamespace || null,
        publishConnectionDetailsWithStoreConfigRef: comp.spec?.publishConnectionDetailsWithStoreConfigRef || null,
        functions: comp.spec?.functions || [],
        mode: comp.spec?.mode || 'Default',
        spec: comp.spec || {},
        status: comp.status || {},
      }));
    } catch (error) {
      throw new Error(`Failed to get compositions: ${error.message}`);
    }
  }
}

