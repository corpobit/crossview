import { Box, Text, Spinner } from '@chakra-ui/react';
import { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { GetCompositeResourcesUseCase } from '../../../domain/usecases/GetCompositeResourcesUseCase.js';
import { Container } from '../common/Container.jsx';
import { DataTable } from '../common/DataTable.jsx';

export const CompositeResourcesWidget = ({ onResourceClick }) => {
  const { kubernetesRepository, selectedContext } = useAppContext();
  const [compositeResources, setCompositeResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedContext) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const contextName = typeof selectedContext === 'string' 
          ? selectedContext 
          : selectedContext.name || selectedContext;
        
        const data = await new GetCompositeResourcesUseCase(kubernetesRepository)
          .execute(contextName);
        setCompositeResources(data || []);
      } catch (err) {
        console.warn('Failed to fetch composite resources:', err.message);
        setError(err.message);
        setCompositeResources([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedContext, kubernetesRepository]);

  const resources = useMemo(() => {
    // Sort by creation timestamp and take the 10 most recent
    return (compositeResources || [])
      .filter(r => r.creationTimestamp)
      .sort((a, b) => new Date(b.creationTimestamp) - new Date(a.creationTimestamp))
      .slice(0, 10);
  }, [compositeResources]);

  const getStatusText = (conditions) => {
    if (!conditions || conditions.length === 0) return 'Unknown';
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition?.status === 'True') return 'Ready';
    if (readyCondition?.status === 'False') return 'Not Ready';
    return 'Pending';
  };

  const getStatusColor = (conditions) => {
    if (!conditions || conditions.length === 0) return 'gray';
    const readyCondition = conditions.find(c => c.type === 'Ready' || c.type === 'Synced');
    if (readyCondition?.status === 'True') return 'green';
    if (readyCondition?.status === 'False') return 'red';
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
      minWidth: '150px',
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
      minWidth: '150px',
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

    if (onResourceClick) {
      onResourceClick(clickedResource);
    }
  };

  if (loading) {
    return (
      <Container p={6} display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="md" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container p={6}>
        <Text fontSize="lg" fontWeight="bold" mb={4}>Recent Composite Resources</Text>
        <Text fontSize="sm" color="red.500">Error loading</Text>
      </Container>
    );
  }

  return (
    <Container p={6} h="100%" display="flex" flexDirection="column">
      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={4} fontWeight="medium">Recent Composite Resources</Text>
      {resources.length > 0 ? (
        <Box flex={1} minH={0} display="flex" flexDirection="column">
          <DataTable
            data={resources}
            columns={columns}
            searchableFields={['name', 'kind', 'compositionRef.name']}
            itemsPerPage={5}
            onRowClick={handleRowClick}
          />
            </Box>
      ) : (
        <Text color="gray.500" _dark={{ color: 'gray.500' }} fontSize="sm">No composite resources found</Text>
      )}
    </Container>
  );
};

CompositeResourcesWidget.propTypes = {
  onResourceClick: PropTypes.func,
};

