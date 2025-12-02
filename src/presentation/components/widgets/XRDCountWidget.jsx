import { Box, Text, VStack, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetCompositeResourceDefinitionsUseCase } from '../../../domain/usecases/GetCompositeResourceDefinitionsUseCase.js';
import { Container } from '../common/Container.jsx';

export const XRDCountWidget = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [xrds, setXrds] = useState([]);
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
        
        const data = await new GetCompositeResourceDefinitionsUseCase(kubernetesRepository)
          .execute(contextName);
        setXrds(data || []);
      } catch (err) {
        console.warn('Failed to fetch XRDs:', err.message);
        setError(err.message);
        setXrds([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const count = (xrds || []).length;

  if (loading) {
    return (
      <Container p={6} display="flex" justifyContent="center" alignItems="center" minH="120px">
        <Spinner size="md" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container p={6}>
        <Text fontSize="sm" color="gray.600" mb={2}>Composite Resource Definitions</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6}>
      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={3}>Composite Resource Definitions</Text>
      <Text fontSize="3xl" fontWeight="bold" color="gray.900" _dark={{ color: 'gray.100' }} mb={1}>{count || 0}</Text>
      <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }}>Total XRDs</Text>
    </Container>
  );
};

