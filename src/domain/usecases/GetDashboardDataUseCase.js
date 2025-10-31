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

      const crossplaneResources = await this.kubernetesRepository.getCrossplaneResources(null, context);

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

