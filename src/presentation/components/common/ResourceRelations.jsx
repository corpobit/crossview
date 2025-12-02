import { Box, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { ReactFlow, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export const ResourceRelations = ({ resource, relatedResources, colorMode }) => {
  const { nodes, edges } = useMemo(() => {
    if (!resource) {
      return { nodes: [], edges: [] };
    }

    const flowNodes = [];
    const flowEdges = [];

    // Add the main resource as the center node
    const mainNodeId = 'main-resource';
    flowNodes.push({
      id: mainNodeId,
      type: 'default',
      position: { x: 400, y: 300 },
      data: {
        label: (
          <Box textAlign="center" p={2}>
            <Text fontWeight="bold" fontSize="sm" color={colorMode === 'dark' ? 'blue.400' : 'blue.600'}>
              {resource.kind || 'Resource'}
            </Text>
            <Text fontSize="xs" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'} mt={1}>
              {resource.name}
            </Text>
          </Box>
        ),
      },
      style: {
        background: colorMode === 'dark' ? '#1f2937' : 'white',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '0',
        minWidth: '150px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    });

    // Add related resources as nodes arranged in a circle
    const relatedResourcesList = relatedResources || [];
    relatedResourcesList.forEach((related, index) => {
      const nodeId = `related-${index}`;
      const angle = (index * 2 * Math.PI) / relatedResourcesList.length;
      const radius = Math.max(250, relatedResourcesList.length * 30);
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      flowNodes.push({
        id: nodeId,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <Box textAlign="center" p={2}>
              <Text fontWeight="semibold" fontSize="xs" color={colorMode === 'dark' ? 'gray.300' : 'gray.700'}>
                {related.type || related.kind}
              </Text>
              <Text fontSize="xs" color={colorMode === 'dark' ? 'gray.400' : 'gray.600'} mt={1} maxW="120px" noOfLines={1}>
                {related.name}
              </Text>
            </Box>
          ),
        },
        style: {
          background: colorMode === 'dark' ? '#374151' : 'white',
          border: colorMode === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '0',
          minWidth: '120px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        },
      });

      // Add edge from main resource to related resource
      flowEdges.push({
        id: `edge-${index}`,
        source: mainNodeId,
        target: nodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [resource, relatedResources, colorMode]);

  return (
    <Box
      minH="600px"
      h="600px"
      w="100%"
      flex={1}
      position="relative"
      css={{
        '.react-flow__background': {
          display: colorMode === 'dark' ? 'none !important' : 'block',
        },
        '.react-flow__background svg': {
          display: colorMode === 'dark' ? 'none !important' : 'block',
        },
        '.react-flow__background-pattern': {
          display: colorMode === 'dark' ? 'none !important' : 'block',
        },
        'svg[data-id="rf__background"]': {
          display: colorMode === 'dark' ? 'none !important' : 'block',
        },
        '.react-flow__background pattern': {
          display: colorMode === 'dark' ? 'none !important' : 'block',
        },
        'pattern': {
          display: colorMode === 'dark' ? 'none !important' : 'block',
        },
      }}
    >
      {nodes.length > 0 ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          {colorMode === 'light' && <Background color="#e5e7eb" gap={16} size={1} />}
        </ReactFlow>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          h="100%"
        >
          <Text color="gray.500" _dark={{ color: 'gray.400' }}>
            No related resources found
          </Text>
        </Box>
      )}
    </Box>
  );
};

