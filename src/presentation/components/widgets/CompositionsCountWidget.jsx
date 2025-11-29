import { Text, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetCompositionsUseCase } from '../../../domain/usecases/GetCompositionsUseCase.js';
import { Container } from '../common/Container.jsx';

export const CompositionsCountWidget = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [compositions, setCompositions] = useState([]);
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
        
        const data = await new GetCompositionsUseCase(kubernetesRepository)
          .execute(contextName);
        setCompositions(data || []);
      } catch (err) {
        console.warn('Failed to fetch compositions:', err.message);
        setError(err.message);
        setCompositions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const count = (compositions || []).length;

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
        <Text fontSize="sm" color="gray.600" mb={2}>Compositions</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6}>
      <Text fontSize="sm" color="gray.600" mb={2}>Compositions</Text>
      <Text fontSize="2xl" fontWeight="bold">{count || 0}</Text>
      <Text fontSize="xs" color="gray.500">Total compositions</Text>
    </Container>
  );
};

