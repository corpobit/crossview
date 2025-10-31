export class GetProviderConfigsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const apiVersion = 'apiextensions.crossplane.io/v1';
      const kind = 'ProviderConfig';
      
      let providerConfigsResult;
      try {
        providerConfigsResult = await this.kubernetesRepository.getResources(apiVersion, kind, null, context);
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('NotFound')) {
          return [];
        }
        throw error;
      }
      const providerConfigs = providerConfigsResult.items || providerConfigsResult; // Support both formats
      const providerConfigsArray = Array.isArray(providerConfigs) ? providerConfigs : [];
      
      return providerConfigsArray.map(config => ({
        name: config.metadata?.name || 'unknown',
        namespace: config.metadata?.namespace || null,
        uid: config.metadata?.uid || '',
        creationTimestamp: config.metadata?.creationTimestamp || '',
        labels: config.metadata?.labels || {},
        credentials: config.spec?.credentials || null,
        credentialsSecretRef: config.spec?.credentialsSecretRef || null,
        identity: config.spec?.identity || null,
        spec: config.spec || {},
        status: config.status || {},
        conditions: config.status?.conditions || [],
      }));
    } catch (error) {
      throw new Error(`Failed to get provider configs: ${error.message}`);
    }
  }
}

