import { Box, Text, VStack, HStack, Spinner } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetCompositeResourcesUseCase } from '../../../domain/usecases/GetCompositeResourcesUseCase.js';
import { GetClaimsUseCase } from '../../../domain/usecases/GetClaimsUseCase.js';
import { Container } from '../common/Container.jsx';

export const RecentActivityWidget = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [compositeResources, setCompositeResources] = useState([]);
  const [claims, setClaims] = useState([]);
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
        
        const [compositeData, claimsData] = await Promise.all([
          new GetCompositeResourcesUseCase(kubernetesRepository)
            .execute(contextName, 20, null)
            .catch(() => ({ items: [] })),
          new GetClaimsUseCase(kubernetesRepository)
            .execute(contextName, 20, null)
            .catch(() => ({ items: [] })),
        ]);
        
        setCompositeResources(Array.isArray(compositeData) ? compositeData : (compositeData?.items || []));
        setClaims(Array.isArray(claimsData) ? claimsData : (claimsData?.items || []));
      } catch (err) {
        console.warn('Failed to fetch recent activity:', err.message);
        setError(err.message);
        setCompositeResources([]);
        setClaims([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const recentResources = useMemo(() => {
    const allResources = [
      ...compositeResources.map(r => ({ ...r, type: 'CompositeResource' })),
      ...claims.map(r => ({ ...r, type: 'Claim' })),
    ];
    
    return allResources
      .filter(r => r.creationTimestamp)
      .sort((a, b) => new Date(b.creationTimestamp) - new Date(a.creationTimestamp))
      .slice(0, 5)
      .map(resource => ({
        name: resource.name,
        kind: resource.kind,
        type: resource.type,
        namespace: resource.namespace || '(none)',
        timestamp: resource.creationTimestamp,
      }));
  }, [compositeResources, claims]);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString();
  };

  if (loading) {
    return (
      <Container p={6} h="100%" display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="md" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container p={6} h="100%" display="flex" flexDirection="column">
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={4} fontWeight="medium">Recent Activity</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6} h="100%" display="flex" flexDirection="column">
      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={4} fontWeight="medium">Recent Activity</Text>
      <VStack align="stretch" spacing={3} flex={1}>
        {recentResources.length > 0 ? (
          recentResources.map((resource, index) => (
            <Box key={index} pb={index < recentResources.length - 1 ? 3 : 0} borderBottom={index < recentResources.length - 1 ? '1px solid' : 'none'} borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
              <HStack justify="space-between" align="start" mb={1}>
                <Box flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.900" _dark={{ color: 'gray.100' }} isTruncated>
                    {resource.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }}>
                    {resource.kind} • {resource.namespace}
                  </Text>
                </Box>
                <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }} whiteSpace="nowrap" ml={2}>
                  {formatTimeAgo(resource.timestamp)}
                </Text>
              </HStack>
            </Box>
          ))
        ) : (
          <Text fontSize="sm" color="gray.500" _dark={{ color: 'gray.500' }}>No recent activity</Text>
        )}
      </VStack>
    </Container>
  );
};

