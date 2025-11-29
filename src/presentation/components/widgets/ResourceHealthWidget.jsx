import { Box, Text, VStack, HStack, Spinner } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetCompositeResourcesUseCase } from '../../../domain/usecases/GetCompositeResourcesUseCase.js';
import { GetClaimsUseCase } from '../../../domain/usecases/GetClaimsUseCase.js';
import { Container } from '../common/Container.jsx';

export const ResourceHealthWidget = () => {
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
        
        // Load both composite resources and claims in parallel
        const [compositeData, claimsData] = await Promise.all([
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
        ]);
        
        setCompositeResources(compositeData || []);
        setClaims(claimsData || []);
      } catch (err) {
        console.warn('Failed to fetch resource health data:', err.message);
        setError(err.message);
        setCompositeResources([]);
        setClaims([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const health = useMemo(() => {
    const allResources = [...(compositeResources || []), ...(claims || [])];
    
    let ready = 0;
    let notReady = 0;
    let unknown = 0;

    allResources.forEach(resource => {
      const conditions = resource.conditions || [];
      const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
      
      if (readyCondition) {
        if (readyCondition.status === 'True') {
          ready++;
        } else {
          notReady++;
        }
      } else if (conditions.length > 0) {
        const trueCondition = conditions.find(c => c.status === 'True');
        if (trueCondition) {
          ready++;
        } else {
          unknown++;
        }
      } else {
        unknown++;
      }
    });

    const total = allResources.length;
    const healthPercentage = total > 0 ? Math.round((ready / total) * 100) : 0;

    return {
      ready,
      notReady,
      unknown,
      total,
      healthPercentage,
    };
  }, [compositeResources, claims]);

  const getHealthColor = (percentage) => {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'yellow';
    return 'red';
  };

  const healthColor = getHealthColor(health?.healthPercentage || 0);

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
        <Text fontSize="lg" fontWeight="bold" mb={4}>Resource Health</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6}>
      <Text fontSize="lg" fontWeight="bold" mb={4}>Resource Health</Text>
      <VStack align="stretch" spacing={4}>
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" color="gray.600">Overall Health</Text>
            <Text fontSize="xl" fontWeight="bold" color={`${healthColor}.600`}>
              {health?.healthPercentage || 0}%
            </Text>
          </HStack>
          <Box
            w="100%"
            h="8px"
            bg="gray.200"
            _dark={{ bg: 'gray.700' }}
            borderRadius="md"
            overflow="hidden"
          >
            <Box
              h="100%"
              bg={`${healthColor}.500`}
              width={`${health?.healthPercentage || 0}%`}
              transition="width 0.3s ease"
              borderRadius="md"
            />
          </Box>
        </Box>
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Box w={3} h={3} borderRadius="full" bg="green.500" />
              <Text fontSize="sm" color="gray.600">Ready</Text>
            </HStack>
            <Text fontSize="md" fontWeight="semibold" color="green.600">{health?.ready || 0}</Text>
          </HStack>
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Box w={3} h={3} borderRadius="full" bg="red.500" />
              <Text fontSize="sm" color="gray.600">Not Ready</Text>
            </HStack>
            <Text fontSize="md" fontWeight="semibold" color="red.600">{health?.notReady || 0}</Text>
          </HStack>
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Box w={3} h={3} borderRadius="full" bg="gray.400" />
              <Text fontSize="sm" color="gray.600">Unknown</Text>
            </HStack>
            <Text fontSize="md" fontWeight="semibold" color="gray.600">{health?.unknown || 0}</Text>
          </HStack>
          <HStack justify="space-between" pt={2} borderTop="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.600">Total</Text>
            <Text fontSize="md" fontWeight="bold">{health?.total || 0}</Text>
          </HStack>
        </VStack>
      </VStack>
    </Container>
  );
};

