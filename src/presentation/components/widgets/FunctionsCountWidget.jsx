import { Box, Text, VStack, HStack, Spinner } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetFunctionsUseCase } from '../../../domain/usecases/GetFunctionsUseCase.js';
import { Container } from '../common/Container.jsx';

export const FunctionsCountWidget = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [functions, setFunctions] = useState([]);
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
        
        const data = await new GetFunctionsUseCase(kubernetesRepository)
          .execute(contextName);
        setFunctions(data || []);
      } catch (err) {
        console.warn('Failed to fetch functions:', err.message);
        setError(err.message);
        setFunctions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const data = useMemo(() => {
    const healthy = functions.filter(f => f.healthy && f.installed).length;
    const unhealthy = functions.filter(f => !f.healthy && f.installed).length;
    const notInstalled = functions.filter(f => !f.installed).length;
    const usedInCompositions = functions.filter(f => f.usedInCount > 0).length;
    
    return {
      total: functions.length,
      healthy,
      unhealthy,
      notInstalled,
      usedInCompositions,
    };
  }, [functions]);

  if (loading) {
    return (
      <Container p={4} display="flex" justifyContent="center" alignItems="center" minH="120px">
        <Spinner size="sm" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container p={4}>
        <Text fontSize="sm" fontWeight="bold" mb={2}>Functions</Text>
        <Text fontSize="xs" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={4}>
      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={2} fontWeight="medium">Functions</Text>
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Total</Text>
          <Text fontSize="lg" fontWeight="bold" color="gray.900" _dark={{ color: 'gray.100' }}>{data?.total || 0}</Text>
        </HStack>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Box w={2} h={2} borderRadius="full" bg="green.500" />
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Healthy</Text>
          </HStack>
          <Text fontSize="sm" fontWeight="semibold" color="green.600" _dark={{ color: 'green.400' }}>{data?.healthy || 0}</Text>
        </HStack>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Box w={2} h={2} borderRadius="full" bg="yellow.500" />
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Unhealthy</Text>
          </HStack>
          <Text fontSize="sm" fontWeight="semibold" color="yellow.600" _dark={{ color: 'yellow.400' }}>{data?.unhealthy || 0}</Text>
        </HStack>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Box w={2} h={2} borderRadius="full" bg="blue.500" />
            <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>Used</Text>
          </HStack>
          <Text fontSize="sm" fontWeight="semibold" color="blue.600" _dark={{ color: 'blue.400' }}>{data?.usedInCompositions || 0}</Text>
        </HStack>
      </VStack>
    </Container>
  );
};

