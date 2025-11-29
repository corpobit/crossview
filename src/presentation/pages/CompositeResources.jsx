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
import { GetCompositeResourcesUseCase } from '../../domain/usecases/GetCompositeResourcesUseCase.js';

export const CompositeResources = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [compositeResources, setCompositeResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [compositionFilter, setCompositionFilter] = useState('all');

  useEffect(() => {
    const loadCompositeResources = async () => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const useCase = new GetCompositeResourcesUseCase(kubernetesRepository);
        const data = await useCase.execute(contextName);
        setCompositeResources(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCompositeResources();
  }, [selectedContext, kubernetesRepository]);

  const getStatusText = (conditions) => {
    if (!conditions || conditions.length === 0) return 'Unknown';
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition && readyCondition.status === 'True') return 'Ready';
    if (readyCondition && readyCondition.status === 'False') return 'Not Ready';
    return 'Pending';
  };

  useEffect(() => {
    let filtered = compositeResources;
    
    if (kindFilter !== 'all') {
      filtered = filtered.filter(r => r.kind === kindFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => {
        const statusText = getStatusText(r.conditions);
        return statusText === statusFilter;
      });
    }
    
    if (compositionFilter !== 'all') {
      filtered = filtered.filter(r => (r.compositionRef?.name || '') === compositionFilter);
    }
    
    setFilteredResources(filtered);
  }, [compositeResources, kindFilter, statusFilter, compositionFilter]);

  if (loading) {
    return <LoadingSpinner message="Loading composite resources..." />;
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>Composite Resources</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading composite resources</Text>
          <Text>{error}</Text>
        </Box>
      </Box>
    );
  }

  const getStatusColor = (conditions) => {
    if (!conditions || conditions.length === 0) return 'gray';
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition && readyCondition.status === 'True') return 'green';
    if (readyCondition && readyCondition.status === 'False') return 'red';
    return 'yellow';
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
        const statusColor = getStatusColor(row.conditions);
        const statusText = getStatusText(row.conditions);
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
      header: 'Composition',
      accessor: 'compositionRef',
      minWidth: '200px',
      render: (row) => row.compositionRef?.name || '-',
    },
    {
      header: 'Claim Ref',
      accessor: 'claimRef',
      minWidth: '200px',
      render: (row) => {
        if (row.claimRef) {
          return `${row.claimRef.namespace}/${row.claimRef.name}`;
        }
        return '-';
      },
    },
    {
      header: 'Resource Refs',
      accessor: 'resourceRefs',
      minWidth: '150px',
      render: (row) => row.resourceRefs?.length || 0,
    },
    {
      header: 'Created',
      accessor: 'creationTimestamp',
      minWidth: '150px',
      render: (row) => row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleString() : '-',
    },
  ];

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

  return (
    <Box
      display="flex"
      flexDirection="column"
      h="calc(100vh - 100px)"
      overflowY="auto"
      position="relative"
    >
      <HStack justify="space-between" mb={6} flexShrink={0}>
        <Text fontSize="2xl" fontWeight="bold">Composite Resources</Text>
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
          searchableFields={['name', 'kind', 'compositionRef.name']}
          itemsPerPage={20}
          onRowClick={handleRowClick}
          filters={
            <HStack spacing={3}>
              <Dropdown
                minW="180px"
                placeholder="All Kinds"
                value={kindFilter}
                onChange={setKindFilter}
                options={[
                  { value: 'all', label: 'All Kinds' },
                  ...Array.from(new Set(compositeResources.map(r => r.kind).filter(Boolean))).sort().map(kind => ({
                    value: kind,
                    label: kind
                  }))
                ]}
              />
              <Dropdown
                minW="150px"
                placeholder="All Statuses"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'Ready', label: 'Ready' },
                  { value: 'Not Ready', label: 'Not Ready' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Unknown', label: 'Unknown' }
                ]}
              />
              <Dropdown
                minW="200px"
                placeholder="All Compositions"
                value={compositionFilter}
                onChange={setCompositionFilter}
                options={[
                  { value: 'all', label: 'All Compositions' },
                  ...Array.from(new Set(compositeResources.map(r => r.compositionRef?.name).filter(Boolean))).sort().map(comp => ({
                    value: comp,
                    label: comp
                  }))
                ]}
              />
            </HStack>
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

