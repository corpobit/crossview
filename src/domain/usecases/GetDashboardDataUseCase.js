export class GetDashboardDataUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null) {
    try {
      const [namespaces, isConnected] = await Promise.all([
        this.kubernetesRepository.getNamespaces(context),
        this.kubernetesRepository.isConnected(context),
      ]);

      const { GetResourcesUseCase } = await import('./GetResourcesUseCase.js');
      const useCase = new GetResourcesUseCase(this.kubernetesRepository);
      const result = await useCase.execute(context, null, 100, null);
      const crossplaneResources = result.items || [];

      return {
        isConnected,
        namespacesCount: namespaces.length,
        crossplaneResourcesCount: crossplaneResources.length,
        namespaces,
        crossplaneResources: crossplaneResources.slice(0, 10),
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }
}

