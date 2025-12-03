import {
  Box,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { DataTable } from '../components/common/DataTable.jsx';
import { ResourceDetails } from '../components/common/ResourceDetails.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Dropdown } from '../components/common/Dropdown.jsx';
import { GetCompositeResourcesUseCase } from '../../domain/usecases/GetCompositeResourcesUseCase.js';
import { GetCompositionsUseCase } from '../../domain/usecases/GetCompositionsUseCase.js';
import { GetCompositeResourceDefinitionsUseCase } from '../../domain/usecases/GetCompositeResourceDefinitionsUseCase.js';
import { getStatusColor, getStatusText, getSyncedStatus, getReadyStatus, getResponsiveStatus } from '../utils/resourceStatus.js';

export const CompositeResourceKind = () => {
  const { kind } = useParams();
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

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
        
        let data = [];
        if (kind === 'Composition') {
          const useCase = new GetCompositionsUseCase(kubernetesRepository);
          const result = await useCase.execute(contextName);
          data = Array.isArray(result) ? result : [];
        } else if (kind === 'CompositeResourceDefinition') {
          const useCase = new GetCompositeResourceDefinitionsUseCase(kubernetesRepository);
          const result = await useCase.execute(contextName);
          data = Array.isArray(result) ? result : [];
        } else {
          // For other composite resource kinds, use GetCompositeResourcesUseCase
          const useCase = new GetCompositeResourcesUseCase(kubernetesRepository);
          const result = await useCase.execute(contextName);
          const allResources = Array.isArray(result) ? result : (result?.items || []);
          data = allResources.filter(r => r.kind === kind);
        }
        
        setResources(data);
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
    
    // Only apply status filter if the resource type has status (not for Composition or CompositeResourceDefinition)
    if (statusFilter !== 'all' && kind !== 'Composition' && kind !== 'CompositeResourceDefinition') {
      filtered = filtered.filter(r => {
        const statusText = getStatusText(r.conditions);
        return statusText === statusFilter;
      });
    }
    
    setFilteredResources(filtered);
  }, [resources, statusFilter, kind]);

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
      apiVersion: item.apiVersion || 'apiextensions.crossplane.io/v1',
      kind: item.kind || kind,
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

  // Define columns based on kind
  const getColumns = () => {
    if (kind === 'Composition') {
      return [
        {
          header: 'Name',
          accessor: 'name',
          minWidth: '200px',
        },
        {
          header: 'Composite Type',
          accessor: 'compositeTypeRef',
          minWidth: '250px',
          render: (row) => {
            if (row.compositeTypeRef) {
              return `${row.compositeTypeRef.apiVersion}/${row.compositeTypeRef.kind}`;
            }
            return '-';
          },
        },
        {
          header: 'Resources',
          accessor: 'resources',
          minWidth: '100px',
          render: (row) => row.resources?.length || 0,
        },
        {
          header: 'Mode',
          accessor: 'mode',
          minWidth: '120px',
        },
        {
          header: 'Created',
          accessor: 'creationTimestamp',
          minWidth: '150px',
          render: (row) => row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleString() : '-',
        },
      ];
    } else if (kind === 'CompositeResourceDefinition') {
      return [
        {
          header: 'Name',
          accessor: 'name',
          minWidth: '200px',
        },
        {
          header: 'Group',
          accessor: 'group',
          minWidth: '200px',
        },
        {
          header: 'Kind',
          accessor: 'names',
          minWidth: '150px',
          render: (row) => row.names?.kind || '-',
        },
        {
          header: 'Created',
          accessor: 'creationTimestamp',
          minWidth: '150px',
          render: (row) => row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleString() : '-',
        },
      ];
    } else {
      // For other composite resource kinds
      return [
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
          header: 'Created',
          accessor: 'creationTimestamp',
          minWidth: '150px',
          render: (row) => row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleString() : '-',
        },
      ];
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      h="calc(100vh - 100px)"
      overflowY="auto"
      position="relative"
    >
        <Text fontSize="2xl" fontWeight="bold" mb={6}>{kind}</Text>

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
          columns={getColumns()}
          searchableFields={['name']}
          itemsPerPage={20}
          onRowClick={handleRowClick}
          filters={
            kind !== 'Composition' && kind !== 'CompositeResourceDefinition' ? (
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
            ) : undefined
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

