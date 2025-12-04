import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { getStatusColor, getStatusText, getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const Claims = () => {
  const location = useLocation();
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOptions, setFilterOptions] = useState({ namespaces: [], kinds: [] });
  const [useAutoHeight, setUseAutoHeight] = useState(false);
  const continueTokensRef = useRef([null]);
  const tableContainerRef = useRef(null);

  // Close resource detail when route changes
  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  useEffect(() => {
    if (!selectedContext) {
      setFilterOptions({ namespaces: [], kinds: [] });
      return;
    }
    
    const loadFilterOptions = async () => {
      try {
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const result = await kubernetesRepository.getClaims(contextName, 30, null);
        const claims = result.items || [];
        setFilterOptions({
          namespaces: [...new Set(claims.map(c => c.namespace).filter(Boolean))].sort(),
          kinds: [...new Set(claims.map(c => c.kind).filter(Boolean))].sort()
        });
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
      const continueToken = continueTokensRef.current[page - 1] || null;
      const hasFilters = namespaceFilter !== 'all' || kindFilter !== 'all' || statusFilter !== 'all';
      const fetchLimit = hasFilters ? pageSize * 2 : pageSize;
      const result = await kubernetesRepository.getClaims(contextName, fetchLimit, continueToken);
      
      if (result.continueToken) {
        while (continueTokensRef.current.length < page) {
          continueTokensRef.current.push(null);
        }
        continueTokensRef.current[page] = result.continueToken;
      }
      
      let filtered = result.items || [];
      
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
  }, [selectedContext, kubernetesRepository, namespaceFilter, kindFilter, statusFilter]);

  useEffect(() => {
    continueTokensRef.current = [null];
  }, [selectedContext, namespaceFilter, kindFilter, statusFilter]);

  // Check if table height is less than 50% of viewport
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
      
      setUseAutoHeight(tableHeight < halfViewport);
    };

    // Check immediately
    checkTableHeight();

    // Check on resize
    const resizeObserver = new ResizeObserver(checkTableHeight);
    resizeObserver.observe(tableContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedResource, loading]);

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
      position="relative"
    >
      <Text fontSize="2xl" fontWeight="bold" mb={6}>Claims</Text>

      <Box
        display="flex"
        flexDirection="column"
        gap={4}
      >
        <Box
          ref={tableContainerRef}
          flex={selectedResource ? (useAutoHeight ? '0 0 auto' : `0 0 50%`) : '1'}
          display="flex"
          flexDirection="column"
          minH={0}
        >
          <DataTable
              data={[]}
              columns={columns}
              searchableFields={['name', 'namespace', 'kind', 'compositionRef.name']}
              itemsPerPage={20}
              onRowClick={handleRowClick}
              serverSidePagination={true}
              fetchData={fetchData}
              loading={loading}
              filters={
                <HStack spacing={3}>
                  <Dropdown
                    minW="180px"
                    placeholder="All Namespaces"
                    value={namespaceFilter}
                    onChange={setNamespaceFilter}
                    options={[
                      { value: 'all', label: 'All Namespaces' },
                      ...filterOptions.namespaces.map(ns => ({
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
                </HStack>
              }
            />
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

