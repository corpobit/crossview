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
import { GetClaimsUseCase } from '../../domain/usecases/GetClaimsUseCase.js';

export const Claims = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    
    const loadClaims = async () => {
      if (!selectedContext) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const useCase = new GetClaimsUseCase(kubernetesRepository);
        const data = await useCase.execute(contextName);
        if (isMounted) {
          setClaims(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadClaims();
    
    return () => {
      isMounted = false;
    };
  }, [selectedContext, kubernetesRepository]);

  const getStatusColor = (conditions) => {
    if (!conditions || conditions.length === 0) return 'gray';
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition && readyCondition.status === 'True') return 'green';
    if (readyCondition && readyCondition.status === 'False') return 'red';
    return 'yellow';
  };

  const getStatusText = (conditions) => {
    if (!conditions || conditions.length === 0) return 'Unknown';
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition && readyCondition.status === 'True') return 'Ready';
    if (readyCondition && readyCondition.status === 'False') return 'Not Ready';
    return 'Pending';
  };

  useEffect(() => {
    let filtered = claims;
    
    if (namespaceFilter !== 'all') {
      filtered = filtered.filter(c => (c.namespace || '') === namespaceFilter);
    }
    
    if (kindFilter !== 'all') {
      filtered = filtered.filter(c => c.kind === kindFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => {
        const statusText = getStatusText(c.conditions);
        return statusText === statusFilter;
      });
    }
    
    setFilteredClaims(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, namespaceFilter, kindFilter, statusFilter]);

  if (loading) {
    return <LoadingSpinner message="Loading claims..." subMessage="Fetching data from cluster" />;
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>Claims</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading claims</Text>
          <Text>{error}</Text>
        </Box>
      </Box>
    );
  }

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      minWidth: '200px',
    },
    {
      header: 'Namespace',
      accessor: 'namespace',
      minWidth: '150px',
      render: (row) => row.namespace || '-',
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
      header: 'Resource Ref',
      accessor: 'resourceRef',
      minWidth: '200px',
      render: (row) => {
        if (row.resourceRef) {
          return `${row.resourceRef.kind}/${row.resourceRef.name}`;
        }
        return '-';
      },
    },
    {
      header: 'Composition',
      accessor: 'compositionRef',
      minWidth: '200px',
      render: (row) => row.compositionRef?.name || '-',
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
        <Text fontSize="2xl" fontWeight="bold">Claims</Text>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''}
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
          data={filteredClaims}
          columns={columns}
          searchableFields={['name', 'namespace', 'kind', 'compositionRef.name']}
          itemsPerPage={20}
          onRowClick={handleRowClick}
          filters={
            <HStack spacing={3}>
              <Dropdown
                minW="180px"
                placeholder="All Namespaces"
                value={namespaceFilter}
                onChange={setNamespaceFilter}
                options={[
                  { value: 'all', label: 'All Namespaces' },
                  ...Array.from(new Set(claims.map(c => c.namespace).filter(Boolean))).sort().map(ns => ({
                    value: ns,
                    label: ns
                  })),
                  { value: '', label: '(No Namespace)' }
                ]}
              />
              <Dropdown
                minW="180px"
                placeholder="All Kinds"
                value={kindFilter}
                onChange={setKindFilter}
                options={[
                  { value: 'all', label: 'All Kinds' },
                  ...Array.from(new Set(claims.map(c => c.kind).filter(Boolean))).sort().map(kind => ({
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

