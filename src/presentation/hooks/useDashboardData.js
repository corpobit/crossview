import { useState, useEffect } from 'react';
import { GetCompositeResourcesUseCase } from '../../domain/usecases/GetCompositeResourcesUseCase.js';
import { GetClaimsUseCase } from '../../domain/usecases/GetClaimsUseCase.js';
import { GetCompositeResourceDefinitionsUseCase } from '../../domain/usecases/GetCompositeResourceDefinitionsUseCase.js';
import { GetCompositionsUseCase } from '../../domain/usecases/GetCompositionsUseCase.js';
import { GetProvidersUseCase } from '../../domain/usecases/GetProvidersUseCase.js';

/**
 * Custom hook that fetches all dashboard data in parallel
 * This eliminates duplicate API calls and significantly improves performance
 */
export const useDashboardData = (kubernetesRepository, selectedContext) => {
  const [data, setData] = useState({
    compositeResources: null,
    claims: null,
    xrds: null,
    compositions: null,
    providers: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' 
          ? selectedContext 
          : selectedContext.name || selectedContext;

        // Fetch all resources in parallel for maximum performance
        const [
          compositeResources,
          claims,
          xrds,
          compositions,
          providers,
        ] = await Promise.all([
          new GetCompositeResourcesUseCase(kubernetesRepository)
            .execute(contextName)
            .catch(err => {
              console.warn('Failed to fetch composite resources:', err.message);
              return [];
            }),
          new GetClaimsUseCase(kubernetesRepository)
            .execute(contextName)
            .catch(err => {
              console.warn('Failed to fetch claims:', err.message);
              return [];
            }),
          new GetCompositeResourceDefinitionsUseCase(kubernetesRepository)
            .execute(contextName)
            .catch(err => {
              console.warn('Failed to fetch XRDs:', err.message);
              return [];
            }),
          new GetCompositionsUseCase(kubernetesRepository)
            .execute(contextName)
            .catch(err => {
              console.warn('Failed to fetch compositions:', err.message);
              return [];
            }),
          new GetProvidersUseCase(kubernetesRepository)
            .execute(contextName)
            .catch(err => {
              console.warn('Failed to fetch providers:', err.message);
              return [];
            }),
        ]);

        setData({
          compositeResources,
          claims,
          xrds,
          compositions,
          providers,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  return { data, loading, error };
};

