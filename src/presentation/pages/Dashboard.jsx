import {
  Box,
  Text,
  VStack,
  HStack,
} from '@chakra-ui/react';
import { Container } from '../components/common/Container.jsx';
import { useEffect, useState } from 'react';
import { useAppContext } from '../providers/AppProvider.jsx';

export const Dashboard = () => {
  const { getDashboardDataUseCase, selectedContext } = useAppContext();
  const [data, setData] = useState(null);
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
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const result = await getDashboardDataUseCase.execute(contextName);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Box
            as="div"
            w="40px"
            h="40px"
            border="4px solid"
            borderColor="gray.300"
            borderTopColor="blue.500"
            borderRadius="50%"
            style={{
              animation: 'spin 1s linear infinite',
            }}
          />
          <Text>Loading dashboard data...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          Dashboard
        </Text>
        <Box
          p={6}
        bg="yellow.50"
        _dark={{ bg: 'yellow.900', borderColor: 'yellow.700', color: 'yellow.100' }}
        border="1px solid"
        borderColor="yellow.200"
        borderRadius="md"
        color="yellow.800"
        >
          <Text fontWeight="bold" mb={2} fontSize="lg">Backend API Not Available</Text>
          <Text mb={4}>{error}</Text>
          <Box mt={4} p={4} bg="white" _dark={{ bg: 'gray.800' }} borderRadius="md">
            <Text fontWeight="semibold" mb={2}>To fix this:</Text>
            <VStack align="stretch" spacing={2} fontSize="sm">
              <Text>1. Set up a backend API server that implements the following endpoints:</Text>
              <Box pl={4} as="ul">
                <li>GET /api/health - Health check</li>
                <li>GET /api/namespaces - List namespaces</li>
                <li>GET /api/crossplane/resources - List Crossplane resources</li>
              </Box>
              <Text>2. The backend should use KubernetesRepository from src/data/repositories/KubernetesRepository.js</Text>
              <Text>3. Ensure the backend reads from ~/.kube/config or uses service account tokens</Text>
            </VStack>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={6}>
        Dashboard
      </Text>

      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
        gap={6}
        mb={8}
      >
        <Container p={6}>
          <Text fontSize="sm" color="gray.600" mb={2}>Connection Status</Text>
          <Box
            as="span"
            display="inline-block"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="sm"
            fontWeight="semibold"
            bg={data?.isConnected ? 'green.100' : 'red.100'}
            _dark={{ 
              bg: data?.isConnected ? 'green.800' : 'red.800',
              color: data?.isConnected ? 'green.100' : 'red.100'
            }}
            color={data?.isConnected ? 'green.800' : 'red.800'}
            mb={2}
          >
            {data?.isConnected ? 'Connected' : 'Disconnected'}
          </Box>
        </Container>

        <Container p={6}>
          <Text fontSize="sm" color="gray.600" mb={2}>Namespaces</Text>
          <Text fontSize="2xl" fontWeight="bold">{data?.namespacesCount || 0}</Text>
          <Text fontSize="xs" color="gray.500">Total namespaces</Text>
        </Container>

        <Container p={6}>
          <Text fontSize="sm" color="gray.600" mb={2}>Crossplane Resources</Text>
          <Text fontSize="2xl" fontWeight="bold">{data?.crossplaneResourcesCount || 0}</Text>
          <Text fontSize="xs" color="gray.500">Total resources</Text>
        </Container>

        <Container p={6}>
          <Text fontSize="sm" color="gray.600" mb={2}>Recent Resources</Text>
          <Text fontSize="2xl" fontWeight="bold">{data?.crossplaneResources?.length || 0}</Text>
          <Text fontSize="xs" color="gray.500">Displayed</Text>
        </Container>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
        gap={6}
      >
        <Container p={6}>
          <Text fontSize="lg" fontWeight="bold" mb={4}>Recent Crossplane Resources</Text>
          {data?.crossplaneResources && data.crossplaneResources.length > 0 ? (
            <VStack align="stretch" spacing={3}>
              {data.crossplaneResources.map((resource) => (
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
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="semibold">{resource.name}</Text>
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
                  {resource.namespace && (
                    <Text fontSize="sm" color="gray.500">
                      Namespace: {resource.namespace}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500">No Crossplane resources found</Text>
          )}
        </Container>

        <Container p={6}>
          <Text fontSize="lg" fontWeight="bold" mb={4}>Namespaces</Text>
          {data?.namespaces && data.namespaces.length > 0 ? (
            <VStack align="stretch" spacing={2}>
              {data.namespaces.slice(0, 10).map((namespace) => (
                <HStack key={namespace.uid} justify="space-between" p={2}>
                  <Text>{namespace.name}</Text>
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
                    {new Date(namespace.creationTimestamp).toLocaleDateString()}
                  </Box>
                </HStack>
              ))}
            </VStack>
          ) : (
            <Text color="gray.500">No namespaces found</Text>
          )}
        </Container>
      </Box>
    </Box>
  );
};
