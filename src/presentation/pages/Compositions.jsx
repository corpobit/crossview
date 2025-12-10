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

export const Compositions = () => {
  const location = useLocation();
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [useAutoHeight, setUseAutoHeight] = useState(false);
  const tableContainerRef = useRef(null);

  // Close resource detail when route changes
  useEffect(() => {
    setSelectedResource(null);
    setNavigationHistory([]);
  }, [location.pathname]);

  // Server-side pagination fetch function - memoized to prevent unnecessary re-renders
  const fetchCompositions = useCallback(async (page, limit) => {
    if (!selectedContext) {
      return { items: [], totalCount: 0 };
    }
    
    const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
    const apiVersion = 'apiextensions.crossplane.io/v1';
    const kind = 'Composition';
    
    try {
      const result = await kubernetesRepository.getResources(apiVersion, kind, null, contextName, limit, null);
      const items = result.items || [];
      
      // Transform items to match the expected format
      const transformedItems = items.map(comp => ({
        name: comp.metadata?.name || 'unknown',
        namespace: comp.metadata?.namespace || null,
        uid: comp.metadata?.uid || '',
        creationTimestamp: comp.metadata?.creationTimestamp || '',
        labels: comp.metadata?.labels || {},
        compositeTypeRef: comp.spec?.compositeTypeRef || null,
        resources: comp.spec?.resources || [],
        writeConnectionSecretsToNamespace: comp.spec?.writeConnectionSecretsToNamespace || null,
        publishConnectionDetailsWithStoreConfigRef: comp.spec?.publishConnectionDetailsWithStoreConfigRef || null,
        functions: comp.spec?.functions || [],
        mode: comp.spec?.mode || 'Default',
        spec: comp.spec || {},
        status: comp.status || {},
        apiVersion: apiVersion,
        kind: kind,
      }));
      
      // Estimate total count if we have remaining items
      let estimatedTotal = null;
      if (result.remainingItemCount !== null && result.remainingItemCount !== undefined) {
        estimatedTotal = transformedItems.length + result.remainingItemCount;
      } else if (result.continueToken) {
        // If there's a continue token, there are more items
        estimatedTotal = (page * limit) + 1; // At least this many
      } else if (transformedItems.length === limit) {
        // Full page, might be more
        estimatedTotal = (page * limit) + 1;
      } else {
        // Last page
        estimatedTotal = (page - 1) * limit + transformedItems.length;
      }
      
      return {
        items: transformedItems,
        totalCount: estimatedTotal,
        continueToken: result.continueToken || null
      };
    } catch (err) {
      throw new Error(`Failed to fetch compositions: ${err.message}`);
    }
  }, [kubernetesRepository, selectedContext]);

  // Initial load - check if context is available
  useEffect(() => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }
    setLoading(false); // DataTable will handle loading via fetchData
  }, [selectedContext]);

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

  const handleRowClick = (item) => {
    const clickedResource = {
      apiVersion: item.apiVersion || 'apiextensions.crossplane.io/v1',
      kind: item.kind || 'Composition',
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
      const previous = navigationHistory.at(-1);
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
      header: 'Functions',
      accessor: 'functions',
      minWidth: '100px',
      render: (row) => row.functions?.length || 0,
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

  return (
    <Box
      display="flex"
      flexDirection="column"
      position="relative"
    >
      <HStack justify="space-between" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">Compositions</Text>
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
              data={[]}
              columns={columns}
              searchableFields={['name', 'compositeTypeRef.kind', 'mode']}
              itemsPerPage={20}
              onRowClick={handleRowClick}
              fetchData={fetchCompositions}
              serverSidePagination={true}
              loading={loading}
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

