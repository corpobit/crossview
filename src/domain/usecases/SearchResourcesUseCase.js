import { GetCompositeResourcesUseCase } from './GetCompositeResourcesUseCase.js';
import { GetClaimsUseCase } from './GetClaimsUseCase.js';
import { GetCompositionsUseCase } from './GetCompositionsUseCase.js';
import { GetCompositeResourceDefinitionsUseCase } from './GetCompositeResourceDefinitionsUseCase.js';
import { GetProvidersUseCase } from './GetProvidersUseCase.js';
import { GetManagedResourcesUseCase } from './GetManagedResourcesUseCase.js';

export class SearchResourcesUseCase {
  constructor(kubernetesRepository) {
    this.kubernetesRepository = kubernetesRepository;
  }

  async execute(context, searchQuery, filters = {}) {
    try {
      const [
        compositeResourcesResult,
        claimsResult,
        compositions,
        xrds,
        providers,
        managedResources,
      ] = await Promise.all([
        new GetCompositeResourcesUseCase(this.kubernetesRepository)
          .execute(context)
          .catch(() => ({ items: [] })),
        new GetClaimsUseCase(this.kubernetesRepository)
          .execute(context)
          .catch(() => ({ items: [] })),
        new GetCompositionsUseCase(this.kubernetesRepository)
          .execute(context)
          .catch(() => []),
        new GetCompositeResourceDefinitionsUseCase(this.kubernetesRepository)
          .execute(context)
          .catch(() => []),
        new GetProvidersUseCase(this.kubernetesRepository)
          .execute(context)
          .catch(() => []),
        new GetManagedResourcesUseCase(this.kubernetesRepository)
          .execute(context, null, false)
          .then(result => result?.items || [])
          .catch(() => []),
      ]);

      const compositeResources = Array.isArray(compositeResourcesResult) ? compositeResourcesResult : (compositeResourcesResult?.items || []);
      const claims = Array.isArray(claimsResult) ? claimsResult : (claimsResult?.items || []);
      const managedResourcesArray = Array.isArray(managedResources) ? managedResources : (managedResources?.items || []);

      const allResources = [
        ...compositeResources.map(r => ({ ...r, resourceType: 'CompositeResource' })),
        ...claims.map(r => ({ ...r, resourceType: 'Claim' })),
        ...compositions.map(r => ({ ...r, resourceType: 'Composition' })),
        ...xrds.map(r => ({ ...r, resourceType: 'XRD' })),
        ...providers.map(r => ({ ...r, resourceType: 'Provider' })),
        ...managedResourcesArray.map(r => ({ ...r, resourceType: 'ManagedResource' })),
      ];

      return this.filterResources(allResources, searchQuery, filters);
    } catch (error) {
      throw new Error(`Failed to search resources: ${error.message}`);
    }
  }

  filterResources(resources, searchQuery, filters) {
    let filtered = [...resources];

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(resource => {
        const name = (resource.name || '').toLowerCase();
        const kind = (resource.kind || '').toLowerCase();
        const namespace = (resource.namespace || '').toLowerCase();
        const labels = Object.entries(resource.labels || {})
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')
          .toLowerCase();
        
        return name.includes(query) ||
               kind.includes(query) ||
               namespace.includes(query) ||
               labels.includes(query);
      });
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(resource => {
        const conditions = resource.conditions || [];
        const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
        
        if (filters.status === 'ready') {
          return readyCondition?.status === 'True';
        } else if (filters.status === 'not-ready') {
          return readyCondition?.status === 'False';
        } else if (filters.status === 'unknown') {
          return !readyCondition || readyCondition.status === 'Unknown';
        }
        return true;
      });
    }

    if (filters.kind && filters.kind.length > 0) {
      filtered = filtered.filter(resource => 
        filters.kind.includes(resource.kind)
      );
    }

    if (filters.namespace && filters.namespace.length > 0) {
      filtered = filtered.filter(resource => 
        filters.namespace.includes(resource.namespace || '')
      );
    }

    if (filters.resourceType && filters.resourceType.length > 0) {
      filtered = filtered.filter(resource => 
        filters.resourceType.includes(resource.resourceType)
      );
    }

    if (filters.labels && Object.keys(filters.labels).length > 0) {
      filtered = filtered.filter(resource => {
        const resourceLabels = resource.labels || {};
        return Object.entries(filters.labels).every(([key, value]) => {
          return resourceLabels[key] === value;
        });
      });
    }

    if (filters.annotations && Object.keys(filters.annotations).length > 0) {
      filtered = filtered.filter(resource => {
        const resourceAnnotations = resource.annotations || {};
        return Object.entries(filters.annotations).every(([key, value]) => {
          return resourceAnnotations[key] === value;
        });
      });
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(resource => {
        if (!resource.creationTimestamp) return false;
        const created = new Date(resource.creationTimestamp);
        if (start && created < new Date(start)) return false;
        if (end && created > new Date(end)) return false;
        return true;
      });
    }

    return filtered;
  }

  getFailedResources(resources) {
    return resources.filter(resource => {
      const conditions = resource.conditions || [];
      const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
      return readyCondition?.status === 'False' || 
             conditions.some(c => c.status === 'False' && (c.type === 'Healthy' || c.type === 'Available'));
    });
  }

  getRecentResources(resources, hours = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    return resources.filter(resource => {
      if (!resource.creationTimestamp) return false;
      return new Date(resource.creationTimestamp) > cutoff;
    });
  }

  getReadyResources(resources) {
    return resources.filter(resource => {
      const conditions = resource.conditions || [];
      const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
      return readyCondition?.status === 'True';
    });
  }
}

