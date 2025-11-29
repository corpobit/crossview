import { Box, Text, VStack, HStack, Spinner } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetProvidersUseCase } from '../../../domain/usecases/GetProvidersUseCase.js';
import { Container } from '../common/Container.jsx';

export const ProvidersStatusWidget = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [providers, setProviders] = useState([]);
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
        
        const data = await new GetProvidersUseCase(kubernetesRepository)
          .execute(contextName);
        setProviders(data || []);
      } catch (err) {
        console.warn('Failed to fetch providers:', err.message);
        setError(err.message);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const data = useMemo(() => {
    const healthy = providers.filter(p => p.healthy && p.installed).length;
    const unhealthy = providers.filter(p => !p.healthy && p.installed).length;
    const notInstalled = providers.filter(p => !p.installed).length;
    
    return {
      total: providers.length,
      healthy,
      unhealthy,
      notInstalled,
    };
  }, [providers]);

  if (loading) {
    return (
      <Container p={6} display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="md" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container p={6}>
        <Text fontSize="lg" fontWeight="bold" mb={4}>Providers Status</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6}>
      <Text fontSize="lg" fontWeight="bold" mb={4}>Providers Status</Text>
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.600">Total Providers</Text>
          <Text fontSize="xl" fontWeight="bold">{data?.total || 0}</Text>
        </HStack>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="green.500" />
            <Text fontSize="sm" color="gray.600">Healthy</Text>
          </HStack>
          <Text fontSize="lg" fontWeight="semibold" color="green.600">{data?.healthy || 0}</Text>
        </HStack>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="yellow.500" />
            <Text fontSize="sm" color="gray.600">Unhealthy</Text>
          </HStack>
          <Text fontSize="lg" fontWeight="semibold" color="yellow.600">{data?.unhealthy || 0}</Text>
        </HStack>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Box w={3} h={3} borderRadius="full" bg="gray.400" />
            <Text fontSize="sm" color="gray.600">Not Installed</Text>
          </HStack>
          <Text fontSize="lg" fontWeight="semibold" color="gray.600">{data?.notInstalled || 0}</Text>
        </HStack>
      </VStack>
    </Container>
  );
};

