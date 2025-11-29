import { Box, Text, VStack, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetClaimsUseCase } from '../../../domain/usecases/GetClaimsUseCase.js';
import { Container } from '../common/Container.jsx';

export const ClaimsCountWidget = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
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
        
        const data = await new GetClaimsUseCase(kubernetesRepository)
          .execute(contextName);
        setClaims(data || []);
      } catch (err) {
        console.warn('Failed to fetch claims:', err.message);
        setError(err.message);
        setClaims([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const count = (claims || []).length;

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
        <Text fontSize="sm" color="gray.600" mb={2}>Claims</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6}>
      <Text fontSize="sm" color="gray.600" mb={2}>Claims</Text>
      <Text fontSize="2xl" fontWeight="bold">{count || 0}</Text>
      <Text fontSize="xs" color="gray.500">Total claims</Text>
    </Container>
  );
};

