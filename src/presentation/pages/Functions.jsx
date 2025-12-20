import {
  Box,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { Input } from '../components/common/Input.jsx';
import { Container } from '../components/common/Container.jsx';
import { GetFunctionsUseCase } from '../../domain/usecases/GetFunctionsUseCase.js';

export const Functions = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const location = useLocation();
  const [functions, setFunctions] = useState([]);
  const [filteredFunctions, setFilteredFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [useSplitView, setUseSplitView] = useState(false);
  const gridContainerRef = useRef(null);

  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  useEffect(() => {
    const loadFunctions = async () => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const useCase = new GetFunctionsUseCase(kubernetesRepository);
        const data = await useCase.execute(contextName);
        setFunctions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFunctions();
  }, [selectedContext, kubernetesRepository]);

  useEffect(() => {
    let filtered = functions;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => {
        const isHealthy = f.healthy;
        const isInstalled = f.installed;
        let status = 'Not Installed';
        if (isInstalled) {
          status = isHealthy ? 'Healthy' : 'Unhealthy';
        }
        return status === statusFilter;
      });
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        (f.name && f.name.toLowerCase().includes(query)) ||
        (f.package && f.package.toLowerCase().includes(query)) ||
        (f.revision && f.revision.toLowerCase().includes(query)) ||
        (f.controllerConfigRef && f.controllerConfigRef.toLowerCase().includes(query))
      );
    }
    
    setFilteredFunctions(filtered);
  }, [functions, statusFilter, searchQuery]);

  useEffect(() => {
    if (!selectedResource || !gridContainerRef.current) {
      setUseSplitView(false);
      return;
    }

    const checkGridHeight = () => {
      const container = gridContainerRef.current;
      if (!container) return;
      
      const viewportHeight = window.innerHeight;
      const halfViewport = (viewportHeight - 100) * 0.5;
      const gridHeight = container.scrollHeight;
      
      setUseSplitView(gridHeight > halfViewport);
    };

    checkGridHeight();

    const resizeObserver = new ResizeObserver(checkGridHeight);
    resizeObserver.observe(gridContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedResource, filteredFunctions]);

  if (loading) {
    return <LoadingSpinner message="Loading functions..." />;
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>Functions</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading functions</Text>
          <Text>{error}</Text>
        </Box>
      </Box>
    );
  }

  const handleCardClick = (item) => {
    const clickedResource = {
      apiVersion: item.apiVersion || 'pkg.crossplane.io/v1',
      kind: item.kind || 'Function',
      name: item.name,
      namespace: item.namespace || null,
    };

    if (selectedResource && 
        selectedResource.name === clickedResource.name &&
        selectedResource.kind === clickedResource.kind &&
        selectedResource.apiVersion === clickedResource.apiVersion &&
        selectedResource.namespace === clickedResource.namespace) {
      setSelectedResource(null);
      setNavigationHistory([]);
      return;
    }

    setNavigationHistory([]);
    setSelectedResource(clickedResource);
  };

  const handleNavigate = (resource) => {
    setNavigationHistory(prev => [...prev, selectedResource]);
    setSelectedResource(resource);
  };

  const handleBack = () => {
    if (navigationHistory.length > 0) {
      const previous = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setSelectedResource(previous);
    } else {
      setSelectedResource(null);
    }
  };

  const handleClose = () => {
    setSelectedResource(null);
    setNavigationHistory([]);
  };

  const getStatusBadge = (func) => {
    const isHealthy = func.healthy;
    const isInstalled = func.installed;
    let status = 'Not Installed';
    let colorScheme = 'gray';
    
    if (isInstalled) {
      status = isHealthy ? 'Healthy' : 'Unhealthy';
      colorScheme = isHealthy ? 'green' : 'yellow';
    }
    
    return (
      <Badge
        colorScheme={colorScheme}
        px={2}
        py={1}
        borderRadius="md"
        fontSize="xs"
        fontWeight="semibold"
      >
        {status}
      </Badge>
    );
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      position="relative"
    >
      <HStack justify="space-between" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">Functions</Text>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          {filteredFunctions.length} function{filteredFunctions.length !== 1 ? 's' : ''}
        </Text>
      </HStack>

      <HStack spacing={4} mb={4}>
        <Box flex={1} position="relative">
          <Box
            position="absolute"
            left="12px"
            top="14px"
            zIndex={1}
            pointerEvents="none"
            color="gray.400"
          >
            <FiSearch size={18} />
          </Box>
          <Input
            placeholder="Search functions by name, package, revision..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            pl="40px"
          />
        </Box>
        <Dropdown
          minW="180px"
          placeholder="All Statuses"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'Healthy', label: 'Healthy' },
            { value: 'Unhealthy', label: 'Unhealthy' },
            { value: 'Not Installed', label: 'Not Installed' }
          ]}
        />
      </HStack>

      <Box
        display="flex"
        flexDirection="column"
        gap={4}
      >
        <Box
          ref={gridContainerRef}
          flex={selectedResource ? (useSplitView ? '0 0 50%' : '0 0 auto') : '1'}
          display="flex"
          flexDirection="column"
          minH={0}
          maxH={selectedResource && useSplitView ? '50vh' : 'none'}
          overflowY={selectedResource && useSplitView ? 'auto' : 'visible'}
        >
          {filteredFunctions.length === 0 ? (
              <Container p={8} textAlign="center">
                <Text color="gray.500" fontSize="lg">
                  No functions found
                </Text>
              </Container>
            ) : (
              <SimpleGrid
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                spacing={6}
                p={4}
              >
                {filteredFunctions.map((func) => (
                  <Container
                    key={func.name}
                    p={4}
                    m={2}
                    cursor="pointer"
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: 'md',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleCardClick(func)}
                    transition="all 0.2s"
                  >
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between" align="start">
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          noOfLines={1}
                          title={func.name}
                        >
                          {func.name}
                        </Text>
                        {getStatusBadge(func)}
                      </HStack>

                      <VStack align="stretch" spacing={2}>
                        {func.revision && (
                          <Box>
                            <Text fontSize="xs" color="gray.500" mb={0.5}>
                              Revision
                            </Text>
                            <Text fontSize="sm">{func.revision}</Text>
                          </Box>
                        )}

                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={0.5}>
                            Usages
                          </Text>
                          <Text fontSize="sm" fontWeight="medium">
                            {func.usedInCount || 0} composition{func.usedInCount !== 1 ? 's' : ''}
                          </Text>
                        </Box>
                      </VStack>
                    </VStack>
                  </Container>
                ))}
              </SimpleGrid>
            )}
        </Box>
        
        {selectedResource && (
          <Box
            flex="1"
            display="flex"
            flexDirection="column"
            mb={8}
          >
            <ResourceDetails
                resource={selectedResource}
                onClose={handleClose}
                onNavigate={handleNavigate}
                onBack={navigationHistory.length > 0 ? handleBack : undefined}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

