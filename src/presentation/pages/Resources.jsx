import {
  Box,
  Text,
  HStack,
  Button,
  Badge,
} from '@chakra-ui/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { getStatusColor, getStatusText, getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const Resources = () => {
  const location = useLocation();
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kindFilter, setKindFilter] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [uniqueKinds, setUniqueKinds] = useState([]);
  const [useAutoHeight, setUseAutoHeight] = useState(false);
  const [allManagedResources, setAllManagedResources] = useState([]);
  const [fromCache, setFromCache] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tableContainerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  const loadManagedResources = useCallback(async (forceRefresh = false) => {
    if (!selectedContext) {
      setUniqueKinds([]);
      setAllManagedResources([]);
      setFromCache(false);
      return;
    }
    
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
      const { GetManagedResourcesUseCase } = await import('../../domain/usecases/GetManagedResourcesUseCase.js');
      const useCase = new GetManagedResourcesUseCase(kubernetesRepository);
      const result = await useCase.execute(contextName, null, forceRefresh);
      
      if (!isMountedRef.current) return;
      
      const resources = result.items || [];
      setAllManagedResources(Array.isArray(resources) ? resources : []);
      setUniqueKinds([...new Set(resources.map(r => r.kind).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
      setFromCache(result.fromCache || false);
      setLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('Failed to load managed resources:', err);
      setError(err.message);
      setAllManagedResources([]);
      setUniqueKinds([]);
      setFromCache(false);
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedContext, kubernetesRepository]);

  useEffect(() => {
    isMountedRef.current = true;
    loadManagedResources(false);
    
    return () => {
      isMountedRef.current = false;
    };
  }, [selectedContext, kubernetesRepository, loadManagedResources]);

  const fetchData = useCallback(async (page, pageSize) => {
    if (!selectedContext || allManagedResources.length === 0) {
      return { items: [], totalCount: 0 };
    }
    
    try {
      setError(null);
      let filtered = [...allManagedResources];
      
      if (kindFilter !== 'all') {
        filtered = filtered.filter(r => r.kind === kindFilter);
      }
      
      const startIndex = (page - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);
      
      return {
        items: paginated,
        totalCount: filtered.length
      };
    } catch (err) {
      setError(err.message);
      return { items: [], totalCount: 0 };
    }
  }, [selectedContext, allManagedResources, kindFilter]);


  useEffect(() => {
    if (!selectedResource || !tableContainerRef.current) {
      setUseAutoHeight(false);
      return;
    }

    const checkTableHeight = () => {
      const container = tableContainerRef.current;
      if (!container) return;
      
      const viewportHeight = window.innerHeight;
      const halfViewport = (viewportHeight - 100) * 0.5; // Account for header
      const tableHeight = container.scrollHeight;
      
      setUseAutoHeight(tableHeight > halfViewport);
    };

    checkTableHeight();

    const resizeObserver = new ResizeObserver(checkTableHeight);
    resizeObserver.observe(tableContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedResource, loading]);

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>Managed Resources</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading managed resources</Text>
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
      position="relative"
    >
      <HStack spacing={4} mb={2} align="center">
        <Text fontSize="2xl" fontWeight="bold">Managed Resources</Text>
        {fromCache && !loading && !isRefreshing && (
          <HStack spacing={2}>
            <Badge colorScheme="blue" variant="subtle">Cached</Badge>
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              onClick={() => loadManagedResources(true)}
              isLoading={isRefreshing}
            >
              Refresh
            </Button>
          </HStack>
        )}
      </HStack>
      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={6}>
        Kubernetes resources created and managed by Crossplane (Deployments, Services, etc.)
      </Text>
      
      {(loading || isRefreshing) && (
        <Box mb={4}>
          <HStack spacing={3} align="center">
            <Box
              w="16px"
              h="16px"
              border="2px solid"
              borderColor="blue.200"
              borderTopColor="blue.500"
              _dark={{ borderColor: 'blue.700', borderTopColor: 'blue.400' }}
              borderRadius="50%"
              style={{
                animation: 'spin 1s linear infinite',
              }}
            />
            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
              {isRefreshing ? 'Refreshing managed resources...' : 'Loading managed resources...'}
            </Text>
          </HStack>
        </Box>
      )}

      <Box
        display="flex"
        flexDirection="column"
        gap={4}
      >
        {!loading && !isRefreshing && (
          <Box
            ref={tableContainerRef}
            flex={selectedResource ? (useAutoHeight ? '0 0 50%' : '0 0 auto') : '1'}
            display="flex"
            flexDirection="column"
            minH={0}
            maxH={selectedResource && useAutoHeight ? '50vh' : 'none'}
            overflowY={selectedResource && useAutoHeight ? 'auto' : 'visible'}
          >
            <DataTable
              data={[]}
              columns={columns}
              searchableFields={['name', 'kind']}
              itemsPerPage={20}
              onRowClick={handleRowClick}
              serverSidePagination={true}
              fetchData={fetchData}
              loading={false}
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
        )}

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

