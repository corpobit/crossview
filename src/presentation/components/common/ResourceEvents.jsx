import { Box, Text, Badge } from '@chakra-ui/react';
import { DataTable } from './DataTable.jsx';

export const ResourceEvents = ({ events, eventsLoading }) => {
  if (eventsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Text color="gray.700" _dark={{ color: 'gray.300' }}>Loading events...</Text>
      </Box>
    );
  }

  if (events.length === 0) {
    return (
      <Box
        p={6}
        textAlign="center"
        bg="gray.50"
        _dark={{ bg: 'gray.800' }}
        borderRadius="md"
      >
        <Text color="gray.600" _dark={{ color: 'gray.400' }}>
          No events found for this resource
        </Text>
      </Box>
    );
  }

  return (
    <Box p={4} flex={1} overflowY="auto">
      <DataTable
        data={events}
        columns={[
          {
            header: 'Type',
            accessor: 'type',
            minWidth: '100px',
            render: (row) => (
              <Badge
                colorScheme={row.type === 'Normal' ? 'green' : 'red'}
                fontSize="xs"
              >
                {row.type}
              </Badge>
            ),
          },
          {
            header: 'Reason',
            accessor: 'reason',
            minWidth: '150px',
          },
          {
            header: 'Message',
            accessor: 'message',
            minWidth: '300px',
          },
          {
            header: 'Count',
            accessor: 'count',
            minWidth: '80px',
          },
          {
            header: 'Last Seen',
            accessor: 'lastTimestamp',
            minWidth: '150px',
            render: (row) => row.lastTimestamp 
              ? new Date(row.lastTimestamp).toLocaleString() 
              : '-',
          },
          {
            header: 'First Seen',
            accessor: 'firstTimestamp',
            minWidth: '150px',
            render: (row) => row.firstTimestamp 
              ? new Date(row.firstTimestamp).toLocaleString() 
              : '-',
          },
        ]}
        searchableFields={['type', 'reason', 'message']}
        itemsPerPage={20}
      />
    </Box>
  );
};

