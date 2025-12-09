export class GetManagedResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context = null, namespace = null) {
    try {
      const managedResources = [];
      const namespaces = namespace ? [{ name: namespace }] : await this.kubernetesRepository.getNamespaces(context);
      
      const standardKinds = [
        // Apps API
        { apiVersion: 'apps/v1', kind: 'Deployment' },
        { apiVersion: 'apps/v1', kind: 'ReplicaSet' },
        { apiVersion: 'apps/v1', kind: 'StatefulSet' },
        { apiVersion: 'apps/v1', kind: 'DaemonSet' },
        // Core API
        { apiVersion: 'v1', kind: 'Service' },
        { apiVersion: 'v1', kind: 'ConfigMap' },
        { apiVersion: 'v1', kind: 'Secret' },
        { apiVersion: 'v1', kind: 'PersistentVolumeClaim' },
        { apiVersion: 'v1', kind: 'Pod' },
        { apiVersion: 'v1', kind: 'ServiceAccount' },
        { apiVersion: 'v1', kind: 'Endpoints' },
        // Networking API
        { apiVersion: 'networking.k8s.io/v1', kind: 'Ingress' },
        { apiVersion: 'networking.k8s.io/v1', kind: 'NetworkPolicy' },
        // Batch API
        { apiVersion: 'batch/v1', kind: 'Job' },
        { apiVersion: 'batch/v1', kind: 'CronJob' },
        // Autoscaling API
        { apiVersion: 'autoscaling/v2', kind: 'HorizontalPodAutoscaler' },
        // Policy API
        { apiVersion: 'policy/v1', kind: 'PodDisruptionBudget' },
        // RBAC API
        { apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'Role' },
        { apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'RoleBinding' },
      ];
      
      const allPromises = [];
      
      for (const { apiVersion, kind } of standardKinds) {
        for (const ns of namespaces) {
          allPromises.push(
            this.kubernetesRepository.getResources(
              apiVersion,
              kind,
              ns.name,
              context
            ).then(resourcesResult => {
              const resources = resourcesResult.items || resourcesResult;
              const resourcesArray = Array.isArray(resources) ? resources : [];
              
              return resourcesArray.filter(resource => {
                const hasManagedLabel = resource.metadata?.labels?.['crossplane.io/managed'] === 'true';
                const hasExternalName = resource.metadata?.annotations?.['crossplane.io/external-name'];
                return hasManagedLabel || hasExternalName;
              }).map(resource => ({
                name: resource.metadata?.name || 'unknown',
                namespace: resource.metadata?.namespace || ns.name,
                uid: resource.metadata?.uid || '',
                kind: kind,
                apiVersion: apiVersion,
                creationTimestamp: resource.metadata?.creationTimestamp || '',
                labels: resource.metadata?.labels || {},
                annotations: resource.metadata?.annotations || {},
                externalName: resource.metadata?.annotations?.['crossplane.io/external-name'] || null,
                provider: resource.metadata?.labels?.['crossplane.io/provider'] || null,
                status: resource.status || {},
                conditions: resource.status?.conditions || [],
              }));
            }).catch(error => {
              return [];
            })
          );
        }
      }
      
      const results = await Promise.all(allPromises);
      const allResources = results.flat();
      
      return allResources;
    } catch (error) {
      throw new Error(`Failed to get managed resources: ${error.message}`);
    }
  }
}

