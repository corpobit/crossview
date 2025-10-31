export class GetResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, namespace = null) {
    try {
      const crossplaneResources = await this.kubernetesRepository.getCrossplaneResources(namespace, context);
      
      return crossplaneResources.map(resource => ({
        name: resource.metadata?.name || 'unknown',
        namespace: resource.metadata?.namespace || null,
        uid: resource.metadata?.uid || '',
        kind: resource.kind || '',
        apiVersion: resource.apiVersion || '',
        creationTimestamp: resource.metadata?.creationTimestamp || '',
        labels: resource.metadata?.labels || {},
        annotations: resource.metadata?.annotations || {},
        spec: resource.spec || {},
        status: resource.status || {},
        conditions: resource.status?.conditions || [],
      }));
    } catch (error) {
      throw new Error(`Failed to get resources: ${error.message}`);
    }
  }
}

