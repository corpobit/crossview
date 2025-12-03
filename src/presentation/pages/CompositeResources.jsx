import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { getStatusColor, getStatusText, getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const CompositeResources = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [compositionFilter, setCompositionFilter] = useState('all');
  const [filterOptions, setFilterOptions] = useState({ kinds: [], compositions: [] });
  const continueTokensRef = useRef([null]);

  useEffect(() => {
    if (!selectedContext) {
      setFilterOptions({ kinds: [], compositions: [] });
      return;
    }
    
    const loadFilterOptions = async () => {
      try {
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const result = await kubernetesRepository.getCompositeResources(contextName, 100, null);
        const resources = result.items || [];
        setFilterOptions({
          kinds: [...new Set(resources.map(r => r.kind).filter(Boolean))].sort(),
          compositions: [...new Set(resources.map(r => r.compositionRef?.name).filter(Boolean))].sort()
        });
      } catch (err) {
        console.warn('Failed to load filter options:', err);
      }
    };
    
    loadFilterOptions();
    continueTokensRef.current = [null];
  }, [selectedContext, kubernetesRepository]);

  const fetchData = async (page, pageSize) => {
    if (!selectedContext) {
      return { items: [], totalCount: 0 };
    }
    
    try {
      setError(null);
      const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
      const continueToken = continueTokensRef.current[page - 1] || null;
      const result = await kubernetesRepository.getCompositeResources(contextName, pageSize * 3, continueToken);
      
      if (result.continueToken) {
        while (continueTokensRef.current.length < page) {
          continueTokensRef.current.push(null);
        }
        continueTokensRef.current[page] = result.continueToken;
      }
      
      let filtered = result.items || [];
      
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
      
      const startIndex = (page - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);
      
      return {
        items: paginated,
        totalCount: result.continueToken ? (page * pageSize) + 1 : startIndex + filtered.length
      };
    } catch (err) {
      setError(err.message);
      return { items: [], totalCount: 0 };
    }
  };

  useEffect(() => {
    continueTokensRef.current = [null];
  }, [selectedContext, kindFilter, statusFilter, compositionFilter]);

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
      minWidth: '160px',
      render: (row) => {
        const syncedStatus = getSyncedStatus(row.conditions);
        const readyStatus = getReadyStatus(row.conditions);
        const responsiveStatus = getResponsiveStatus(row.conditions);
        const statusText = getStatusText(row.conditions);
        
        const statusBadges = [syncedStatus, readyStatus, responsiveStatus].filter(Boolean);
        
        if (statusBadges.length > 0) {
          return (
            <HStack spacing={2}>
              {statusBadges.map((status, idx) => (
                <Box
                  key={idx}
                  as="span"
                  display="inline-block"
                  px={2}
                  py={1}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="semibold"
                  bg={`${status.color}.100`}
                  _dark={{ bg: `${status.color}.800`, color: `${status.color}.100` }}
                  color={`${status.color}.800`}
                >
                  {status.text}
                </Box>
              ))}
            </HStack>
          );
        }
        
        const statusColor = getStatusColor(row.conditions);
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
      plural: item.plural || null, // Include plural for getResource calls
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

  return (
    <Box
      display="flex"
      flexDirection="column"
      h="calc(100vh - 100px)"
      overflowY="auto"
      position="relative"
    >
      <Text fontSize="2xl" fontWeight="bold" mb={6}>Composite Resources</Text>

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
          data={[]}
          columns={columns}
          searchableFields={['name', 'kind', 'compositionRef.name']}
          itemsPerPage={20}
          onRowClick={handleRowClick}
          serverSidePagination={true}
          fetchData={fetchData}
          loading={loading}
          filters={
            <HStack spacing={3}>
              <Dropdown
                minW="180px"
                placeholder="All Kinds"
                value={kindFilter}
                onChange={setKindFilter}
                options={[
                  { value: 'all', label: 'All Kinds' },
                  ...filterOptions.kinds.map(kind => ({
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
                  ...filterOptions.compositions.map(comp => ({
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

