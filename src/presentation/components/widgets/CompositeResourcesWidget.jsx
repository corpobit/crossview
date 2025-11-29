import { Box, Text, VStack, HStack, Spinner } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetCompositeResourcesUseCase } from '../../../domain/usecases/GetCompositeResourcesUseCase.js';
import { Container } from '../common/Container.jsx';

export const CompositeResourcesWidget = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [compositeResources, setCompositeResources] = useState([]);
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
        
        const data = await new GetCompositeResourcesUseCase(kubernetesRepository)
          .execute(contextName);
        setCompositeResources(data || []);
      } catch (err) {
        console.warn('Failed to fetch composite resources:', err.message);
        setError(err.message);
        setCompositeResources([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const resources = useMemo(() => {
    // Sort by creation timestamp and take the 5 most recent
    return (compositeResources || [])
      .filter(r => r.creationTimestamp)
      .sort((a, b) => new Date(b.creationTimestamp) - new Date(a.creationTimestamp))
      .slice(0, 5);
  }, [compositeResources]);

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
        <Text fontSize="lg" fontWeight="bold" mb={4}>Recent Composite Resources</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6}>
      <Text fontSize="lg" fontWeight="bold" mb={4}>Recent Composite Resources</Text>
      {resources.length > 0 ? (
        <VStack align="stretch" spacing={3}>
          {resources.map((resource) => (
            <Box
              key={resource.uid}
              p={3}
              border="1px solid"
              borderRadius="md"
              css={{
                borderColor: 'rgba(0, 0, 0, 0.08) !important',
                '.dark &': {
                  borderColor: 'rgba(255, 255, 255, 0.1) !important',
                }
              }}
            >
              <HStack justify="space-between" mb={1}>
                <Text fontWeight="semibold" fontSize="sm">{resource.name}</Text>
                <Box
                  as="span"
                  display="inline-block"
                  px={2}
                  py={1}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="semibold"
                  bg="blue.100"
                  _dark={{ bg: 'blue.800', color: 'blue.100' }}
                  color="blue.800"
                >
                  {resource.kind}
                </Box>
              </HStack>
              {resource.creationTimestamp && (
                <Text fontSize="xs" color="gray.500">
                  {new Date(resource.creationTimestamp).toLocaleDateString()}
                </Text>
              )}
            </Box>
          ))}
        </VStack>
      ) : (
        <Text color="gray.500" fontSize="sm">No composite resources found</Text>
      )}
    </Container>
  );
};

