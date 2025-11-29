import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { GetResourcesUseCase } from '../../domain/usecases/GetResourcesUseCase.js';

export const Resources = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kindFilter, setKindFilter] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);

  useEffect(() => {
    const loadResources = async () => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const useCase = new GetResourcesUseCase(kubernetesRepository);
        const data = await useCase.execute(contextName, null);
        // Filter to only show Composition and CompositeResourceDefinition
        const filtered = data.filter(r => r.kind === 'Composition' || r.kind === 'CompositeResourceDefinition');
        setResources(filtered);
        setFilteredResources(filtered);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [selectedContext, kubernetesRepository]);

  useEffect(() => {
    let filtered = resources;
    
    if (kindFilter !== 'all') {
      filtered = filtered.filter(r => r.kind === kindFilter);
    }
    
    setFilteredResources(filtered);
  }, [resources, kindFilter]);

  if (loading) {
    return <LoadingSpinner message="Loading resources..." />;
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>Resources</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading resources</Text>
          <Text>{error}</Text>
        </Box>
      </Box>
    );
  }

  const uniqueKinds = [...new Set(resources.map(r => r.kind).filter(Boolean))].sort();

  const getStatusColor = (conditions, kind) => {
    if (!conditions || conditions.length === 0) return 'gray';
    
    // For Provider, check Healthy condition
    if (kind === 'Provider') {
      const healthyCondition = conditions.find(c => c.type === 'Healthy');
      if (healthyCondition && healthyCondition.status === 'True') return 'green';
      if (healthyCondition && healthyCondition.status === 'False') return 'red';
      return 'yellow';
    }
    
    // For other resources, check Ready or Synced conditions
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition && readyCondition.status === 'True') return 'green';
    if (readyCondition && readyCondition.status === 'False') return 'red';
    
    // If we have conditions but none match, check if any are True/False
    const trueCondition = conditions.find(c => c.status === 'True');
    const falseCondition = conditions.find(c => c.status === 'False');
    if (trueCondition) return 'green';
    if (falseCondition) return 'red';
    
    return 'yellow';
  };

  const getStatusText = (conditions, kind) => {
    if (!conditions || conditions.length === 0) return 'Unknown';
    
    // For Provider, check Healthy condition
    if (kind === 'Provider') {
      const healthyCondition = conditions.find(c => c.type === 'Healthy');
      if (healthyCondition && healthyCondition.status === 'True') return 'Healthy';
      if (healthyCondition && healthyCondition.status === 'False') return 'Unhealthy';
      const installedCondition = conditions.find(c => c.type === 'Installed');
      if (installedCondition && installedCondition.status === 'True') return 'Installed';
      return 'Pending';
    }
    
    // For other resources, check Ready or Synced conditions
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition && readyCondition.status === 'True') return 'Ready';
    if (readyCondition && readyCondition.status === 'False') return 'Not Ready';
    
    // If we have conditions but none match, check if any are True/False
    const trueCondition = conditions.find(c => c.status === 'True');
    const falseCondition = conditions.find(c => c.status === 'False');
    if (trueCondition) return 'Active';
    if (falseCondition) return 'Inactive';
    
    return 'Pending';
  };

  const handleRowClick = (item) => {
    const clickedResource = {
      apiVersion: item.apiVersion,
      kind: item.kind,
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
    // Clear navigation history when opening from table (not from another resource)
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

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      minWidth: '200px',
    },
    {
      header: 'Kind',
      accessor: 'kind',
      minWidth: '200px',
    },
    {
      header: 'Status',
      accessor: 'status',
      minWidth: '120px',
      render: (row) => {
        const statusColor = getStatusColor(row.conditions, row.kind);
        const statusText = getStatusText(row.conditions, row.kind);
        return (
          <Box
            as="span"
            display="inline-block"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="semibold"
            bg={`${statusColor}.100`}
            _dark={{ bg: `${statusColor}.800`, color: `${statusColor}.100` }}
            color={`${statusColor}.800`}
          >
            {statusText}
          </Box>
        );
      },
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
        <Text fontSize="2xl" fontWeight="bold">Resources</Text>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
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
        data={filteredResources}
        columns={columns}
          searchableFields={['name', 'kind']}
        itemsPerPage={20}
        onRowClick={handleRowClick}
        filters={
            <Dropdown
              minW="200px"
              placeholder="All Kinds"
              value={kindFilter}
              onChange={setKindFilter}
              options={[
                { value: 'all', label: 'All Kinds' },
                ...uniqueKinds.map(kind => ({ value: kind, label: kind }))
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

