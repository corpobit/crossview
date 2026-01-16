import {
  Box,
  Text,
} from '@chakra-ui/react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { GetResourcesUseCase } from '../../domain/usecases/GetResourcesUseCase.js';
import { getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const ResourceKind = () => {
  const { kind } = useParams();
  const location = useLocation();
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [syncedFilter, setSyncedFilter] = useState('all');
  const [readyFilter, setReadyFilter] = useState('all');
  const [responsiveFilter, setResponsiveFilter] = useState('all');
  const [useAutoHeight, setUseAutoHeight] = useState(false);
  const tableContainerRef = useRef(null);

  // Close resource detail when route changes
  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  useEffect(() => {
    const loadResources = async () => {
      if (!selectedContext || !kind) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const useCase = new GetResourcesUseCase(kubernetesRepository);
        const result = await useCase.execute(contextName, null);
        const data = Array.isArray(result) ? result : (result?.items || []);
        // Filter by kind
        const filtered = data.filter(r => r.kind === kind);
        setResources(filtered);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [selectedContext, kubernetesRepository, kind]);

  useEffect(() => {
    let filtered = resources;
    
    filtered = filtered.filter(r => {
      const syncedStatus = getSyncedStatus(r.conditions);
      const readyStatus = getReadyStatus(r.conditions);
      const responsiveStatus = getResponsiveStatus(r.conditions);
      
      if (syncedFilter !== 'all') {
        if (syncedFilter === 'synced' && syncedStatus?.text !== 'Synced') return false;
        if (syncedFilter === 'not-synced' && syncedStatus?.text !== 'Not Synced') return false;
        if (syncedFilter === 'none' && syncedStatus !== null) return false;
      }
      
      if (readyFilter !== 'all') {
        if (readyFilter === 'ready' && readyStatus?.text !== 'Ready') return false;
        if (readyFilter === 'not-ready' && readyStatus?.text !== 'Not Ready') return false;
        if (readyFilter === 'none' && readyStatus !== null) return false;
      }
      
      if (responsiveFilter !== 'all') {
        if (responsiveFilter === 'responsive' && responsiveStatus?.text !== 'Responsive') return false;
        if (responsiveFilter === 'not-responsive' && responsiveStatus?.text !== 'Not Responsive') return false;
        if (responsiveFilter === 'none' && responsiveStatus !== null) return false;
      }
      
      return true;
    });
    
    setFilteredResources(filtered);
  }, [resources, syncedFilter, readyFilter, responsiveFilter]);

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

    // Check immediately
    checkTableHeight();

    // Check on resize
    const resizeObserver = new ResizeObserver(checkTableHeight);
    resizeObserver.observe(tableContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedResource, loading]);

  const renderStatusBadge = (status) => {
    if (!status) {
      return (
        <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
          -
        </Text>
      );
    }
    return (
      <Box
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
    );
  };

  const allColumns = [
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
      header: 'Synced',
      accessor: (row) => {
        if (!row || !row.conditions) return '-';
        const syncedStatus = getSyncedStatus(row.conditions);
        return syncedStatus?.text || '-';
      },
      minWidth: '120px',
      render: (row) => renderStatusBadge(row?.conditions ? getSyncedStatus(row.conditions) : null),
      statusType: 'synced',
    },
    {
      header: 'Ready',
      accessor: (row) => {
        if (!row || !row.conditions) return '-';
        const readyStatus = getReadyStatus(row.conditions);
        return readyStatus?.text || '-';
      },
      minWidth: '120px',
      render: (row) => renderStatusBadge(row?.conditions ? getReadyStatus(row.conditions) : null),
      statusType: 'ready',
    },
    {
      header: 'Responsive',
      accessor: (row) => {
        if (!row || !row.conditions) return '-';
        const responsiveStatus = getResponsiveStatus(row.conditions);
        return responsiveStatus?.text || '-';
      },
      minWidth: '120px',
      render: (row) => renderStatusBadge(row?.conditions ? getResponsiveStatus(row.conditions) : null),
      statusType: 'responsive',
    },
    {
      header: 'Created',
      accessor: 'creationTimestamp',
      minWidth: '150px',
      render: (row) => row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleString() : '-',
    },
  ];

  const columns = useMemo(() => {
    if (filteredResources.length === 0) {
      return allColumns;
    }

    return allColumns.filter(column => {
      if (!column.statusType) {
        return true;
      }

      const hasData = filteredResources.some(row => {
        if (!row || !row.conditions || !Array.isArray(row.conditions)) return false;
        if (column.statusType === 'synced') {
          return row.conditions.some(c => c.type === 'Synced');
        }
        if (column.statusType === 'ready') {
          return row.conditions.some(c => c.type === 'Ready');
        }
        if (column.statusType === 'responsive') {
          return row.conditions.some(c => c.type === 'Responsive');
        }
        return false;
      });

      return hasData;
    });
  }, [filteredResources]);

  if (loading) {
    return <LoadingSpinner message={`Loading ${kind}...`} />;
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>{kind}</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading {kind}</Text>
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
      <Text fontSize="2xl" fontWeight="bold" mb={6}>{kind}</Text>

      <Box
        display="flex"
        flexDirection="column"
        gap={4}
      >
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
              data={filteredResources}
              columns={columns}
              searchableFields={['name', 'kind']}
              itemsPerPage={20}
              onRowClick={handleRowClick}
              filters={
                <>
                  {columns.some(col => col.header === 'Synced') && (
                    <Dropdown
                      minW="140px"
                      placeholder="All Synced"
                      value={syncedFilter}
                      onChange={setSyncedFilter}
                      options={[
                        { value: 'all', label: 'All Synced' },
                        { value: 'synced', label: 'Synced' },
                        { value: 'not-synced', label: 'Not Synced' },
                        { value: 'none', label: 'No Synced Status' }
                      ]}
                    />
                  )}
                  {columns.some(col => col.header === 'Ready') && (
                    <Dropdown
                      minW="140px"
                      placeholder="All Ready"
                      value={readyFilter}
                      onChange={setReadyFilter}
                      options={[
                        { value: 'all', label: 'All Ready' },
                        { value: 'ready', label: 'Ready' },
                        { value: 'not-ready', label: 'Not Ready' },
                        { value: 'none', label: 'No Ready Status' }
                      ]}
                    />
                  )}
                  {columns.some(col => col.header === 'Responsive') && (
                    <Dropdown
                      minW="140px"
                      placeholder="All Responsive"
                      value={responsiveFilter}
                      onChange={setResponsiveFilter}
                      options={[
                        { value: 'all', label: 'All Responsive' },
                        { value: 'responsive', label: 'Responsive' },
                        { value: 'not-responsive', label: 'Not Responsive' },
                        { value: 'none', label: 'No Responsive Status' }
                      ]}
                    />
                  )}
                </>
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

