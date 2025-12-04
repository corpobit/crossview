import { Box, Text } from '@chakra-ui/react';
import { useMemo } from 'react';
import { ReactFlow, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { colors, getBackgroundColor, getBorderColor, getTextColor } from '../../utils/theme.js';

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
            <Text fontWeight="bold" fontSize="sm" color={colorMode === 'dark' ? colors.accent.blue.light : colors.accent.blue.dark}>
              {resource.kind || 'Resource'}
            </Text>
            <Text fontSize="xs" color={getTextColor(colorMode, colorMode === 'dark' ? 'secondary' : 'secondary')} mt={1}>
              {resource.name}
            </Text>
          </Box>
        ),
      },
      style: {
        background: getBackgroundColor(colorMode, colorMode === 'dark' ? 'secondary' : 'primary'),
        border: `2px solid ${colors.border.light.blue}`,
        borderRadius: '8px',
        padding: '0',
        minWidth: '150px',
        boxShadow: `0 2px 4px ${colors.shadow.light}`,
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
              <Text fontWeight="semibold" fontSize="xs" color={getTextColor(colorMode, colorMode === 'dark' ? 'secondary' : 'inverse')}>
                {related.type || related.kind}
              </Text>
              <Text fontSize="xs" color={getTextColor(colorMode, colorMode === 'dark' ? 'tertiary' : 'secondary')} mt={1} maxW="120px" noOfLines={1}>
                {related.name}
              </Text>
            </Box>
          ),
        },
        style: {
          background: getBackgroundColor(colorMode, colorMode === 'dark' ? 'tertiary' : 'primary'),
          border: `1px solid ${getBorderColor(colorMode, colorMode === 'dark' ? 'gray' : 'gray')}`,
          borderRadius: '8px',
          padding: '0',
          minWidth: '120px',
          boxShadow: `0 1px 2px ${colors.shadow.light}`,
        },
      });

      // Add edge from main resource to related resource
      flowEdges.push({
        id: `edge-${index}`,
        source: mainNodeId,
        target: nodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: colors.border.light.blue, strokeWidth: 2 },
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
          {colorMode === 'light' && <Background color={colors.border.light.gray} gap={16} size={1} />}
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

