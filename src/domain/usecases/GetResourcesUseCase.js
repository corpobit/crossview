export class GetResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, namespace = null, limit = null, continueToken = null) {
    try {
      const crossplaneResources = await this.kubernetesRepository.getCrossplaneResources(namespace, context, limit, continueToken);
      
      const items = crossplaneResources.items || crossplaneResources;
      const itemsArray = Array.isArray(items) ? items : [];
      
      const mapped = itemsArray.map(resource => ({
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
      
      return {
        items: mapped,
        continueToken: crossplaneResources.continueToken || null
      };
    } catch (error) {
      throw new Error(`Failed to get resources: ${error.message}`);
    }
  }
}

