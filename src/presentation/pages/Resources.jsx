import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { getStatusColor, getStatusText, getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const Resources = () => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kindFilter, setKindFilter] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [uniqueKinds, setUniqueKinds] = useState([]);
  const continueTokensRef = useRef([null]);

  useEffect(() => {
    if (!selectedContext) {
      setUniqueKinds([]);
      return;
    }
    
    const loadFilterOptions = async () => {
      try {
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const { GetResourcesUseCase } = await import('../../domain/usecases/GetResourcesUseCase.js');
        const useCase = new GetResourcesUseCase(kubernetesRepository);
        const result = await useCase.execute(contextName, null, 20, null);
        const data = Array.isArray(result) ? result : (result?.items || []);
        const filtered = data.filter(r => r.kind === 'Composition' || r.kind === 'CompositeResourceDefinition');
        setUniqueKinds([...new Set(filtered.map(r => r.kind).filter(Boolean))].sort());
      } catch (err) {
        console.warn('Failed to load filter options:', err);
      }
    };
    
    loadFilterOptions();
    continueTokensRef.current = [null];
  }, [selectedContext, kubernetesRepository]);

  const fetchData = useCallback(async (page, pageSize) => {
    if (!selectedContext) {
      return { items: [], totalCount: 0 };
    }
    
    try {
      setError(null);
      const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
      const { GetResourcesUseCase } = await import('../../domain/usecases/GetResourcesUseCase.js');
      const useCase = new GetResourcesUseCase(kubernetesRepository);
      const continueToken = continueTokensRef.current[page - 1] || null;
      const hasFilters = kindFilter !== 'all';
      const fetchLimit = hasFilters ? pageSize * 2 : pageSize;
      const result = await useCase.execute(contextName, null, fetchLimit, continueToken);
      
      if (result.continueToken) {
        while (continueTokensRef.current.length < page) {
          continueTokensRef.current.push(null);
        }
        continueTokensRef.current[page] = result.continueToken;
      }
      
      const data = result.items || [];
      let filtered = Array.isArray(data) ? data.filter(r => r.kind === 'Composition' || r.kind === 'CompositeResourceDefinition') : [];
      
      if (kindFilter !== 'all') {
        filtered = filtered.filter(r => r.kind === kindFilter);
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
  }, [selectedContext, kubernetesRepository, kindFilter]);

  useEffect(() => {
    continueTokensRef.current = [null];
  }, [selectedContext, kindFilter]);

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
      minWidth: '160px',
      render: (row) => {
        const syncedStatus = getSyncedStatus(row.conditions);
        const readyStatus = getReadyStatus(row.conditions);
        const responsiveStatus = getResponsiveStatus(row.conditions);
        const statusText = getStatusText(row.conditions, row.kind);
        
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
        
        const statusColor = getStatusColor(row.conditions, row.kind);
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
      <Text fontSize="2xl" fontWeight="bold" mb={6}>Resources</Text>

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
          searchableFields={['name', 'kind']}
          itemsPerPage={20}
          onRowClick={handleRowClick}
          serverSidePagination={true}
          fetchData={fetchData}
          loading={loading}
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

