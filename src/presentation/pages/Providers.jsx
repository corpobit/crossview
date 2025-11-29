import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { GetProvidersUseCase } from '../../domain/usecases/GetProvidersUseCase.js';

export const Providers = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const loadProviders = async () => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const useCase = new GetProvidersUseCase(kubernetesRepository);
        const data = await useCase.execute(contextName);
        setProviders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, [selectedContext, kubernetesRepository]);

  useEffect(() => {
    let filtered = providers;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        const isHealthy = p.healthy;
        const isInstalled = p.installed;
        let status = 'Not Installed';
        if (isInstalled) {
          status = isHealthy ? 'Healthy' : 'Unhealthy';
        }
        return status === statusFilter;
      });
    }
    
    setFilteredProviders(filtered);
  }, [providers, statusFilter]);

  if (loading) {
    return <LoadingSpinner message="Loading providers..." />;
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>Providers</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading providers</Text>
          <Text>{error}</Text>
        </Box>
      </Box>
    );
  }

  const handleRowClick = (item) => {
    const clickedResource = {
      apiVersion: item.apiVersion || 'apiextensions.crossplane.io/v1',
      kind: item.kind || 'Provider',
      name: item.name,
      namespace: item.namespace || null,
    };

    // If clicking the same row that's already open, close the slideout
    if (selectedResource && 
        selectedResource.name === clickedResource.name &&
        selectedResource.kind === clickedResource.kind &&
        selectedResource.apiVersion === clickedResource.apiVersion &&
        selectedResource.namespace === clickedResource.namespace) {
      setSelectedResource(null);
      setNavigationHistory([]);
      return;
    }

    // Otherwise, open/update the slideout with the new resource
    setNavigationHistory([clickedResource]);
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

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      minWidth: '200px',
    },
    {
      header: 'Package',
      accessor: 'package',
      minWidth: '250px',
    },
    {
      header: 'Revision',
      accessor: 'revision',
      minWidth: '150px',
    },
    {
      header: 'Status',
      accessor: 'status',
      minWidth: '120px',
      render: (row) => {
        const isHealthy = row.healthy;
        const isInstalled = row.installed;
        return (
          <HStack spacing={2}>
            <Box
              as="span"
              display="inline-block"
              px={2}
              py={1}
              borderRadius="md"
              fontSize="xs"
              fontWeight="semibold"
              bg={isInstalled ? (isHealthy ? 'green.100' : 'yellow.100') : 'gray.100'}
              _dark={{
                bg: isInstalled ? (isHealthy ? 'green.800' : 'yellow.800') : 'gray.700',
                color: isInstalled ? (isHealthy ? 'green.100' : 'yellow.100') : 'gray.300'
              }}
              color={isInstalled ? (isHealthy ? 'green.800' : 'yellow.800') : 'gray.600'}
            >
              {isInstalled ? (isHealthy ? 'Healthy' : 'Unhealthy') : 'Not Installed'}
            </Box>
          </HStack>
        );
      },
    },
    {
      header: 'Controller Config',
      accessor: 'controllerConfigRef',
      minWidth: '150px',
      render: (row) => row.controllerConfigRef || '-',
    },
    {
      header: 'Created',
      accessor: 'creationTimestamp',
      minWidth: '150px',
      render: (row) => row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleString() : '-',
    },
  ];

  return (
    <Box
      display="flex"
      flexDirection="column"
      h="calc(100vh - 100px)"
      overflowY="auto"
      position="relative"
    >
      <HStack justify="space-between" mb={6} flexShrink={0}>
        <Text fontSize="2xl" fontWeight="bold">Providers</Text>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''}
        </Text>
      </HStack>

      <Box
        flex={selectedResource ? `0 0 calc(50% - 4px)` : '1'}
        overflow="hidden"
        display="flex"
        flexDirection="column"
        transition="flex 0.3s ease"
        minH={0}
        mt={4}
      >
        <DataTable
          data={filteredProviders}
          columns={columns}
          searchableFields={['name', 'package', 'revision', 'controllerConfigRef']}
          itemsPerPage={20}
          onRowClick={handleRowClick}
          filters={
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
          }
        />
      </Box>
      
      {selectedResource && (
        <ResourceDetails
            resource={selectedResource}
            onClose={handleClose}
            onNavigate={handleNavigate}
            onBack={navigationHistory.length > 0 ? handleBack : undefined}
        />
      )}
    </Box>
  );
};

