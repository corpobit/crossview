import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { GetCompositeResourceDefinitionsUseCase } from '../../domain/usecases/GetCompositeResourceDefinitionsUseCase.js';
import { getStatusColor, getStatusText, getEstablishedStatus, getOfferedStatus } from '../utils/resourceStatus.js';

export const CompositeResourceDefinitions = () => {
  const location = useLocation();
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [xrds, setXrds] = useState([]);
  const [filteredXrds, setFilteredXrds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [groupFilter, setGroupFilter] = useState('all');
  const [useAutoHeight, setUseAutoHeight] = useState(false);
  const tableContainerRef = useRef(null);

  // Close resource detail when route changes
  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  useEffect(() => {
    const loadXrds = async () => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        const useCase = new GetCompositeResourceDefinitionsUseCase(kubernetesRepository);
        const data = await useCase.execute(contextName);
        setXrds(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setXrds([]);
      } finally {
        setLoading(false);
      }
    };

    loadXrds();
  }, [selectedContext, kubernetesRepository]);

  useEffect(() => {
    let filtered = Array.isArray(xrds) ? xrds : [];
    
    if (groupFilter !== 'all') {
      filtered = filtered.filter(x => x.group === groupFilter);
    }
    
    setFilteredXrds(filtered);
  }, [xrds, groupFilter]);

  useEffect(() => {
    if (!selectedResource || !tableContainerRef.current) {
      setUseAutoHeight(false);
      return;
    }

    const checkTableHeight = () => {
      const container = tableContainerRef.current;
      if (!container) return;
      
      const viewportHeight = window.innerHeight;
      const halfViewport = (viewportHeight - 100) * 0.5;
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

  if (loading) {
    return <LoadingSpinner message="Loading composite resource definitions..." />;
  }

  if (error) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={6}>Composite Resource Definitions</Text>
        <Box
          p={6}
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700', color: 'red.100' }}
          border="1px"
          borderColor="red.200"
          borderRadius="md"
          color="red.800"
        >
          <Text fontWeight="bold" mb={2}>Error loading composite resource definitions</Text>
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
      header: 'Group',
      accessor: 'group',
      minWidth: '250px',
    },
    {
      header: 'Resource Kind',
      accessor: 'names.kind',
      minWidth: '150px',
      render: (row) => row.names?.kind || '-',
    },
    {
      header: 'Claim Kind',
      accessor: 'claimNames.kind',
      minWidth: '150px',
      render: (row) => row.claimNames?.kind || '-',
    },
    {
      header: 'Status',
      accessor: 'status',
      minWidth: '160px',
      render: (row) => {
        const establishedStatus = getEstablishedStatus(row.conditions);
        const offeredStatus = getOfferedStatus(row.conditions);
        const statusText = getStatusText(row.conditions, 'CompositeResourceDefinition');
        
        const statusBadges = [establishedStatus, offeredStatus].filter(Boolean);
        
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
        
        const statusColor = getStatusColor(row.conditions, 'CompositeResourceDefinition');
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
      header: 'Versions',
      accessor: 'versions',
      minWidth: '100px',
      render: (row) => row.versions?.length || 0,
    },
    {
      header: 'Default Composition',
      accessor: 'defaultCompositionRef',
      minWidth: '200px',
      render: (row) => row.defaultCompositionRef?.name || '-',
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
      apiVersion: item.apiVersion || 'apiextensions.crossplane.io/v1',
      kind: item.kind || 'CompositeResourceDefinition',
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

  return (
    <Box
      display="flex"
      flexDirection="column"
      position="relative"
    >
      <HStack justify="space-between" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">Composite Resource Definitions</Text>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          {filteredXrds.length} definition{filteredXrds.length !== 1 ? 's' : ''}
        </Text>
      </HStack>

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
              data={filteredXrds}
              columns={columns}
              searchableFields={['name', 'group', 'names.kind', 'claimNames.kind']}
              itemsPerPage={20}
              onRowClick={handleRowClick}
              filters={
                <Dropdown
                  minW="250px"
                  placeholder="All Groups"
                  value={groupFilter}
                  onChange={setGroupFilter}
                  options={[
                    { value: 'all', label: 'All Groups' },
                    ...Array.from(new Set((Array.isArray(xrds) ? xrds : []).map(x => x.group).filter(Boolean))).sort().map(group => ({
                      value: group,
                      label: group
                    }))
                  ]}
                />
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

