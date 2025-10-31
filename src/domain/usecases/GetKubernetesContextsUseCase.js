export class GetKubernetesContextsUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute() {
    try {
      return await this.kubernetesRepository.getContexts();
    } catch (error) {
      throw new Error(`Failed to get Kubernetes contexts: ${error.message}`);
    }
  }
}

