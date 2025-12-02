export class GetProvidersUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const apiVersion = 'pkg.crossplane.io/v1';
      const kind = 'Provider';
      const providersResult = await this.kubernetesRepository.getResources(apiVersion, kind, null, context);
      const providers = providersResult.items || providersResult; // Support both new format and legacy array format
      const providersArray = Array.isArray(providers) ? providers : [];
      return providersArray.map(provider => {
        const conditions = provider.status?.conditions || [];
        const installed = conditions.some(c => c.type === 'Installed' && c.status === 'True');
        const healthy = conditions.some(c => c.type === 'Healthy' && c.status === 'True');
        
        return {
          name: provider.metadata?.name || 'unknown',
          namespace: provider.metadata?.namespace || null,
          uid: provider.metadata?.uid || '',
          creationTimestamp: provider.metadata?.creationTimestamp || '',
          version: provider.spec?.package || '',
          package: provider.spec?.package || '',
          controllerConfigRef: provider.spec?.controllerConfigRef?.name || null,
          revision: provider.status?.currentRevision || '',
          installed: installed,
          healthy: healthy,
          conditions: conditions,
          status: provider.status || {},
          spec: provider.spec || {},
        };
      });
    } catch (error) {
      throw new Error(`Failed to get providers: ${error.message}`);
    }
  }
}

