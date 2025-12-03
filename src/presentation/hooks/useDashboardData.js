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

        // Fetch all resources in parallel with minimal limits for dashboard
        const [
          compositeResourcesResult,
          claimsResult,
          xrds,
          compositions,
          providers,
        ] = await Promise.all([
          new GetCompositeResourcesUseCase(kubernetesRepository)
            .execute(contextName, 10, null)
            .catch(err => {
              console.warn('Failed to fetch composite resources:', err.message);
              return { items: [] };
            }),
          new GetClaimsUseCase(kubernetesRepository)
            .execute(contextName, 10, null)
            .catch(err => {
              console.warn('Failed to fetch claims:', err.message);
              return { items: [] };
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
          compositeResources: Array.isArray(compositeResourcesResult) ? compositeResourcesResult : (compositeResourcesResult?.items || []),
          claims: Array.isArray(claimsResult) ? claimsResult : (claimsResult?.items || []),
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

