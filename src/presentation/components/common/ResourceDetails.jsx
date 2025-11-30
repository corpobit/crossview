import {
  Box,
  Text,
  HStack,
  VStack,
  Button,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiArrowLeft, FiExternalLink, FiClock, FiTag, FiUser, FiLayers, FiZap, FiSettings, FiInfo, FiActivity, FiMinus } from 'react-icons/fi';
import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { ReactFlow, Background } from '@xyflow/react';
import { DataTable } from './DataTable.jsx';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '@xyflow/react/dist/style.css';

// Custom light theme for YAML - neutral gray colors
const customLightTheme = {
  ...oneLight,
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: '#ffffff',
    backgroundColor: '#ffffff',
    color: '#1a202c',
  },
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: '#ffffff',
    backgroundColor: '#ffffff',
    color: '#1a202c',
  },
  'pre': {
    background: '#ffffff',
    backgroundColor: '#ffffff',
  },
  'code': {
    background: '#ffffff',
    backgroundColor: '#ffffff',
  },
  '.token.comment': {
    color: '#718096',
    fontStyle: 'italic',
  },
  '.token.punctuation': {
    color: '#4a5568',
  },
  '.token.property': {
    color: '#2d3748',
  },
  '.token.tag': {
    color: '#2d3748',
  },
  '.token.boolean': {
    color: '#805ad5',
  },
  '.token.number': {
    color: '#805ad5',
  },
  '.token.string': {
    color: '#38a169',
  },
  '.token.operator': {
    color: '#4a5568',
  },
  '.token.keyword': {
    color: '#2c5282',
  },
  '.token.function': {
    color: '#2c5282',
  },
  '.token.class-name': {
    color: '#2c5282',
  },
  '.token.attr-name': {
    color: '#2d3748',
  },
  '.token.attr-value': {
    color: '#38a169',
  },
};

// Custom dark theme for YAML - neutral gray colors matching app theme
// Uses gray.800 (#1A202C) to match the app's dark mode background
const stoneDarkTheme = {
  ...oneDark,
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: '#1A202C',
    backgroundColor: '#1A202C',
    color: '#e2e8f0',
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#1A202C',
    backgroundColor: '#1A202C',
    color: '#e2e8f0',
  },
  'pre': {
    background: '#1A202C',
    backgroundColor: '#1A202C',
  },
  'code': {
    background: '#1A202C',
    backgroundColor: '#1A202C',
  },
  '.token.comment': {
    color: '#718096',
    fontStyle: 'italic',
  },
  '.token.prolog': {
    color: '#718096',
  },
  '.token.doctype': {
    color: '#718096',
  },
  '.token.cdata': {
    color: '#718096',
  },
  '.token.punctuation': {
    color: '#cbd5e0',
  },
  '.token.property': {
    color: '#cbd5e0',
  },
  '.token.tag': {
    color: '#cbd5e0',
  },
  '.token.boolean': {
    color: '#b794f4',
  },
  '.token.number': {
    color: '#b794f4',
  },
  '.token.constant': {
    color: '#b794f4',
  },
  '.token.symbol': {
    color: '#b794f4',
  },
  '.token.deleted': {
    color: '#cbd5e0',
  },
  '.token.selector': {
    color: '#9ae6b4',
  },
  '.token.attr-name': {
    color: '#cbd5e0',
  },
  '.token.string': {
    color: '#9ae6b4',
  },
  '.token.char': {
    color: '#9ae6b4',
  },
  '.token.builtin': {
    color: '#9ae6b4',
  },
  '.token.inserted': {
    color: '#9ae6b4',
  },
  '.token.operator': {
    color: '#e2e8f0',
  },
  '.token.entity': {
    color: '#e2e8f0',
    cursor: 'help',
  },
  '.token.url': {
    color: '#e2e8f0',
  },
  '.token.atrule': {
    color: '#90cdf4',
  },
  '.token.attr-value': {
    color: '#9ae6b4',
  },
  '.token.keyword': {
    color: '#90cdf4',
  },
  '.token.function': {
    color: '#90cdf4',
  },
  '.token.class-name': {
    color: '#90cdf4',
  },
  '.token.regex': {
    color: '#9ae6b4',
  },
  '.token.important': {
    color: '#90cdf4',
    fontWeight: 'bold',
  },
  '.token.variable': {
    color: '#90cdf4',
  },
};

export const ResourceDetails = ({ resource, onClose, onNavigate, onBack }) => {
  const { kubernetesRepository, selectedContext, colorMode } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [fullResource, setFullResource] = useState(resource);
  const [relatedResources, setRelatedResources] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadFullResource = async () => {
      if (!resource || !selectedContext) return;
      
      try {
        setLoading(true);
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        
        if (resource.apiVersion && resource.kind && resource.name) {
          let full = resource; // Default to resource if fetch fails
          try {
            full = await kubernetesRepository.getResource(
            resource.apiVersion,
            resource.kind,
            resource.name,
            resource.namespace || null,
            contextName
          );
          setFullResource(full);
          } catch (error) {
            // If resource fetch fails, still try to load events with the resource we have
            console.warn('[ResourceDetails] Failed to load full resource, using provided resource:', error.message);
            setFullResource(resource);
            full = resource;
          }
          
          const related = [];
          
          if (full.spec?.resourceRef) {
            related.push({
              type: 'Composite Resource',
              apiVersion: full.spec.resourceRef.apiVersion,
              kind: full.spec.resourceRef.kind,
              name: full.spec.resourceRef.name,
              namespace: null,
            });
          }
          
          if (full.spec?.compositionRef) {
            related.push({
              type: 'Composition',
              apiVersion: 'apiextensions.crossplane.io/v1',
              kind: 'Composition',
              name: full.spec.compositionRef.name,
              namespace: null,
            });
          }
          
          if (full.spec?.claimRef) {
            related.push({
              type: 'Claim',
              apiVersion: full.spec.claimRef.apiVersion,
              kind: full.spec.claimRef.kind,
              name: full.spec.claimRef.name,
              namespace: full.spec.claimRef.namespace,
            });
          }
          
          if (full.spec?.writeConnectionSecretToRef) {
            related.push({
              type: 'Secret',
              apiVersion: 'v1',
              kind: 'Secret',
              name: full.spec.writeConnectionSecretToRef.name,
              namespace: full.spec.writeConnectionSecretToRef.namespace || resource.namespace,
            });
          }
          
          if (full.spec?.writeConnectionSecretsTo) {
            full.spec.writeConnectionSecretsTo.forEach((secretRef, index) => {
              related.push({
                type: 'Secret',
                apiVersion: 'v1',
                kind: 'Secret',
                name: secretRef.name,
                namespace: secretRef.namespace || resource.namespace,
              });
            });
          }
          
          if (full.spec?.resourceRefs) {
            full.spec.resourceRefs.forEach((ref) => {
              related.push({
                type: 'Managed Resource',
                apiVersion: ref.apiVersion,
                kind: ref.kind,
                name: ref.name,
                namespace: ref.namespace || null,
              });
            });
          }
          
          setRelatedResources(related);

          // Load events if resource has a namespace (events are namespaced)
          // Use fullResource metadata if available, fallback to resource
          // Check both full.metadata.namespace and resource.namespace
          const resourceNamespace = full.metadata?.namespace || resource.namespace;
          const resourceKind = full.kind || resource.kind;
          const resourceName = full.metadata?.name || resource.name;
          
          console.log('[ResourceDetails] Checking events for:', {
            kind: resourceKind,
            name: resourceName,
            namespace: resourceNamespace,
            fullMetadataNamespace: full.metadata?.namespace,
            resourceNamespace: resource.namespace,
            hasFullMetadata: !!full.metadata
          });
          
          if (resourceNamespace && resourceKind && resourceName) {
            try {
              setEventsLoading(true);
              console.log('[ResourceDetails] Fetching events for:', { resourceKind, resourceName, resourceNamespace });
              const eventsData = await kubernetesRepository.getEvents(
                resourceKind,
                resourceName,
                resourceNamespace,
                contextName
              );
              console.log('[ResourceDetails] Received events:', eventsData.length);
              setEvents(eventsData);
            } catch (error) {
              console.warn('[ResourceDetails] Failed to load events:', error);
              setEvents([]);
            } finally {
              setEventsLoading(false);
            }
          } else {
            console.log('[ResourceDetails] Skipping events - missing required fields:', {
              namespace: resourceNamespace,
              kind: resourceKind,
              name: resourceName
            });
            setEvents([]);
          }
        }
      } catch (error) {
        console.error('Error loading full resource:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFullResource();
  }, [resource, selectedContext, kubernetesRepository]);


  // Build React Flow graph from related resources (must be before early return)
  const { nodes, edges } = useMemo(() => {
    // Always show the main resource node, even if there are no related resources
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
              <Badge fontSize="xx-small" colorScheme="blue" mt={1} display="block">
                {related.kind}
              </Badge>
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

  if (!resource) return null;

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now - created;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      const remainingMinutes = diffMinutes % 60;
      return `${diffDays}d ${remainingHours}h ${remainingMinutes}m ago`;
    } else if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      return `${diffHours}h ${remainingMinutes}m ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return `${diffSeconds}s ago`;
    }
  };

  const jsonToYaml = (obj, indent = 0) => {
    const indentStr = '  '.repeat(indent);
    
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    if (typeof obj === 'string') {
      // Escape strings that need quoting
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.includes('|') || obj.includes('&') || obj.includes('*') || obj.includes('!') || obj.includes('%') || obj.includes('@') || obj.includes('`') || obj.trim() !== obj) {
        return `"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      }
      return obj;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '[]';
      }
      let yaml = '';
      obj.forEach((item) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // Array of objects - first property on same line as '-', rest indented
          const itemYaml = jsonToYaml(item, 0);
          const lines = itemYaml.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            yaml += `${indentStr}- ${lines[0]}\n`;
          lines.slice(1).forEach(line => {
              yaml += `${indentStr}  ${line}\n`;
          });
          }
        } else {
          // Array of primitives or arrays
          const itemYaml = jsonToYaml(item, 0);
          yaml += `${indentStr}- ${itemYaml}\n`;
        }
      });
      return yaml.trimEnd();
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return '{}';
      }
      let yaml = '';
      keys.forEach((key) => {
        const value = obj[key];
        if (value === null || value === undefined) {
          yaml += `${indentStr}${key}: null\n`;
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            yaml += `${indentStr}${key}: []\n`;
          } else {
            yaml += `${indentStr}${key}:\n`;
            value.forEach((item) => {
              if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                // Array of objects - first property on same line as '-', rest indented
                // Generate YAML with base indentation, then adjust for array item format
                const itemYaml = jsonToYaml(item, 0);
                const lines = itemYaml.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                  // First line: '- key: value' at indent + 2
                  yaml += `${indentStr}  - ${lines[0]}\n`;
                  // Subsequent lines: '  key: value' at indent + 4
                lines.slice(1).forEach(line => {
                    yaml += `${indentStr}    ${line}\n`;
                });
                }
              } else {
                // Array of primitives
                const itemYaml = jsonToYaml(item, 0);
                yaml += `${indentStr}  - ${itemYaml}\n`;
              }
            });
          }
        } else if (typeof value === 'object') {
          // Nested object
          yaml += `${indentStr}${key}:\n`;
          const valueYaml = jsonToYaml(value, indent + 1);
          const lines = valueYaml.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            yaml += `${indentStr}  ${line}\n`;
          });
        } else {
          // Primitive value
          const valueYaml = jsonToYaml(value, 0);
          yaml += `${indentStr}${key}: ${valueYaml}\n`;
        }
      });
      return yaml.trimEnd();
    }
    
    return String(obj);
  };

  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return <Text as="span" color="gray.500" _dark={{ color: 'gray.400' }}>null</Text>;
    }
    
    if (typeof value === 'boolean') {
      return <Text as="span" color={value ? 'green.500' : 'red.500'} _dark={{ color: value ? 'green.400' : 'red.400' }}>{String(value)}</Text>;
    }
    
    if (typeof value === 'number') {
      return <Text as="span" color="blue.500" _dark={{ color: 'blue.400' }}>{value}</Text>;
    }
    
    if (typeof value === 'string') {
      if (depth === 0 && value.length > 100) {
        return <Text as="span">{value.substring(0, 100)}...</Text>;
      }
      return <Text as="span">{value}</Text>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <Text as="span" color="gray.500" _dark={{ color: 'gray.400' }}>[]</Text>;
      }
      return (
        <VStack align="start" spacing={1} pl={depth * 2}>
          {value.map((item, idx) => (
            <Box key={idx}>
              <Text as="span" color="gray.400" _dark={{ color: 'gray.500' }}>[{idx}] </Text>
              {renderValue(item, depth + 1)}
            </Box>
          ))}
        </VStack>
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <Text as="span" color="gray.500" _dark={{ color: 'gray.400' }}>{'{}'}</Text>;
      }
      return (
        <VStack align="start" spacing={1} pl={depth * 2}>
          {keys.map((key) => (
            <Box key={key}>
              <Text as="span" fontWeight="bold" color="purple.500" _dark={{ color: 'purple.400' }}>{key}:</Text>{' '}
              {renderValue(value[key], depth + 1)}
            </Box>
          ))}
        </VStack>
      );
    }
    
    return <Text as="span">{String(value)}</Text>;
  };

  const handleRelatedClick = (related) => {
    onNavigate({
      apiVersion: related.apiVersion,
      kind: related.kind,
      name: related.name,
      namespace: related.namespace,
    });
  };

  return (
    <Box
      flex="1"
      display="flex"
      flexDirection="column"
      border="1px solid"
      borderRadius="lg"
      css={{
        borderColor: 'rgba(0, 0, 0, 0.08) !important',
        '.dark &': {
          borderColor: 'rgba(255, 255, 255, 0.1) !important',
        }
      }}
      mt={4}
      pt={4}
      px={4}
      pb={4}
    >
      <Box
        p={4}
        pt={6}
        flexShrink={0}
        position="relative"
      >
        <Button
          size="sm"
          variant="ghost"
          position="absolute"
          top={2}
          right={2}
          onClick={onClose}
          aria-label="Minimize"
          minW="auto"
          w="32px"
          h="32px"
          p={0}
        >
          <FiMinus />
        </Button>
        {onBack && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onBack}
            aria-label="Back"
            minW="auto"
            w="32px"
            h="32px"
            p={0}
            mb={3}
          >
            <FiArrowLeft />
          </Button>
        )}
        <HStack spacing={2} align="center">
          <Text fontSize="lg" fontWeight="bold" color="gray.700" _dark={{ color: 'gray.300' }}>
            {resource.kind || 'Resource'}
          </Text>
          <Badge colorScheme="blue">{resource.apiVersion}</Badge>
        </HStack>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mt={1}>
          {resource.name}
          {resource.namespace && ` • ${resource.namespace}`}
        </Text>
      </Box>

      <Box flex={1}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minH="200px" p={4}>
            <Text color="gray.700" _dark={{ color: 'gray.300' }}>Loading resource details...</Text>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" h="100%">
            {/* Custom Tabs */}
            <HStack
              px={4}
              pt={4}
              spacing={0}
            >
              <Button
                variant="ghost"
                size="sm"
                borderRadius="none"
                borderBottom="2px solid"
                borderBottomColor={activeTab === 'overview' ? 'blue.500' : 'transparent'}
                color={activeTab === 'overview' ? 'blue.600' : 'gray.600'}
                _dark={{
                  color: activeTab === 'overview' ? 'blue.400' : 'gray.400',
                  borderBottomColor: activeTab === 'overview' ? 'blue.400' : 'transparent',
                }}
                onClick={() => setActiveTab('overview')}
                _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
              >
                Overview
              </Button>
              <Button
                variant="ghost"
                size="sm"
                borderRadius="none"
                borderBottom="2px solid"
                borderBottomColor={activeTab === 'yaml' ? 'blue.500' : 'transparent'}
                color={activeTab === 'yaml' ? 'blue.600' : 'gray.600'}
                _dark={{
                  color: activeTab === 'yaml' ? 'blue.400' : 'gray.400',
                  borderBottomColor: activeTab === 'yaml' ? 'blue.400' : 'transparent',
                }}
                onClick={() => setActiveTab('yaml')}
                _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
              >
                YAML
              </Button>
              {fullResource.status && (
                <Button
                  variant="ghost"
                  size="sm"
                  borderRadius="none"
                  borderBottom="2px solid"
                  borderBottomColor={activeTab === 'status' ? 'blue.500' : 'transparent'}
                  color={activeTab === 'status' ? 'blue.600' : 'gray.600'}
                  _dark={{
                    color: activeTab === 'status' ? 'blue.400' : 'gray.400',
                    borderBottomColor: activeTab === 'status' ? 'blue.400' : 'transparent',
                  }}
                  onClick={() => setActiveTab('status')}
                  _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                  leftIcon={<FiActivity />}
                >
                  Status
                </Button>
              )}
              {relatedResources.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  borderRadius="none"
                  borderBottom="2px solid"
                  borderBottomColor={activeTab === 'relations' ? 'blue.500' : 'transparent'}
                  color={activeTab === 'relations' ? 'blue.600' : 'gray.600'}
                  _dark={{
                    color: activeTab === 'relations' ? 'blue.400' : 'gray.400',
                    borderBottomColor: activeTab === 'relations' ? 'blue.400' : 'transparent',
                  }}
                  onClick={() => setActiveTab('relations')}
                  _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                >
                  Relations
                </Button>
              )}
              {(fullResource.metadata?.namespace || resource.namespace) && (
                <Button
                  variant="ghost"
                  size="sm"
                  borderRadius="none"
                  borderBottom="2px solid"
                  borderBottomColor={activeTab === 'events' ? 'blue.500' : 'transparent'}
                  color={activeTab === 'events' ? 'blue.600' : 'gray.600'}
                  _dark={{
                    color: activeTab === 'events' ? 'blue.400' : 'gray.400',
                    borderBottomColor: activeTab === 'events' ? 'blue.400' : 'transparent',
                  }}
                  onClick={() => setActiveTab('events')}
                  _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
                  leftIcon={<FiActivity />}
                >
                  Events
                </Button>
              )}
            </HStack>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <Box p={4} flex={1} overflowY="auto">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {fullResource.metadata && (
                    <Box
                      p={5}
                    >
                      <HStack spacing={2} mb={4}>
                        <Box color="blue.500" _dark={{ color: 'blue.400' }}>
                          <FiTag size={18} />
                  </Box>
                        <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Summary</Text>
                </HStack>
                <VStack align="stretch" spacing={4}>
                    {fullResource.metadata.name && (
                <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                >
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                          Name
                        </Text>
                        <Text fontSize="sm" fontWeight="medium" color="gray.900" _dark={{ color: 'gray.100' }}>{fullResource.metadata.name}</Text>
                      </Box>
                    )}
                    {fullResource.metadata.namespace && (
                      <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                          Namespace
                        </Text>
                        <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>{fullResource.metadata.namespace}</Text>
                      </Box>
                    )}
                    {fullResource.metadata.uid && (
                      <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                          UID
                        </Text>
                        <Text fontSize="xs" fontFamily="mono" color="gray.600" _dark={{ color: 'gray.300' }}>
                          {fullResource.metadata.uid}
                        </Text>
                      </Box>
                    )}
                    {fullResource.metadata.creationTimestamp && (
                      <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <HStack spacing={2} mb={1}>
                          <Box color="blue.500" _dark={{ color: 'blue.400' }}>
                            <FiClock size={14} />
                          </Box>
                          <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }}>
                            Created
                          </Text>
                        </HStack>
                        <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                          {new Date(fullResource.metadata.creationTimestamp).toLocaleString()}
                        </Text>
                      </Box>
                    )}
                    {fullResource.metadata.labels && Object.keys(fullResource.metadata.labels).length > 0 && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={2}>
                          Labels
                        </Text>
                        <Box
                          p={3}
                          bg="gray.50"
                          _dark={{ bg: 'gray.700' }}
                          borderRadius="md"
                        >
                        <HStack spacing={2} flexWrap="wrap">
                          {Object.entries(fullResource.metadata.labels).map(([key, value]) => (
                              <Badge key={key} fontSize="xs" colorScheme="blue" px={2} py={1}>
                              {key}={value}
                            </Badge>
                          ))}
                        </HStack>
                        </Box>
                      </Box>
                    )}
                    {fullResource.metadata.annotations && Object.keys(fullResource.metadata.annotations).length > 0 && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={2}>
                          Annotations
                        </Text>
                        <Box
                          p={3}
                          bg="gray.50"
                          _dark={{ bg: 'gray.700' }}
                          borderRadius="md"
                        >
                          <VStack align="stretch" spacing={2}>
                          {Object.entries(fullResource.metadata.annotations).slice(0, 5).map(([key, value]) => (
                              <Box key={key} pb={2} borderBottom="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.600' }} _last={{ borderBottom: 'none', pb: 0 }}>
                                <Text fontSize="xs" fontWeight="medium" color="gray.700" _dark={{ color: 'gray.300' }} mb={1}>
                                {key}
                              </Text>
                                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} wordBreak="break-word">
                                {String(value).length > 100 ? String(value).substring(0, 100) + '...' : String(value)}
                              </Text>
                            </Box>
                          ))}
                          {Object.keys(fullResource.metadata.annotations).length > 5 && (
                              <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }} pt={1}>
                              +{Object.keys(fullResource.metadata.annotations).length - 5} more
                            </Text>
                          )}
                        </VStack>
                        </Box>
                      </Box>
                    )}
                  </VStack>
              </Box>
            )}

            {/* Properties section for CompositeResourceDefinitions */}
            {fullResource.kind === 'CompositeResourceDefinition' && (
                    <Box
                      p={5}
                    >
                      <HStack spacing={2} mb={4}>
                        <Box color="cyan.500" _dark={{ color: 'cyan.400' }}>
                          <FiInfo size={18} />
                        </Box>
                        <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Properties</Text>
                      </HStack>
                      <Box>
                  <VStack align="stretch" spacing={3}>
                    {fullResource.metadata?.creationTimestamp && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Created
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }}>
                          {formatRelativeTime(fullResource.metadata.creationTimestamp)} ({new Date(fullResource.metadata.creationTimestamp).toLocaleString()})
                        </Text>
                      </Box>
                    )}
                    {fullResource.metadata?.name && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Name
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                          {fullResource.metadata.name}
                        </Text>
                      </Box>
                    )}
                    {fullResource.metadata?.annotations && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Annotations
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }}>
                          {Object.keys(fullResource.metadata.annotations).length} Annotations
                        </Text>
                      </Box>
                    )}
                    {fullResource.metadata?.ownerReferences && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Controlled By
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }}>
                          {fullResource.metadata.ownerReferences.length} Owner References
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec?.group && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Group
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                          {fullResource.spec.group}
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec?.versions && fullResource.spec.versions.length > 0 && (
                      <>
                        <Box>
                          <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                            Version
                          </Text>
                          <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                            {fullResource.spec.versions[0]?.name || fullResource.spec.version || '-'}
                          </Text>
                        </Box>
                        <Box>
                          <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                            Stored versions
                          </Text>
                          <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                            {fullResource.spec.versions.map(v => v.name).join(', ')}
                          </Text>
                        </Box>
                      </>
                    )}
                    {fullResource.spec?.scope !== undefined && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Scope
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }}>
                          {fullResource.spec.scope || 'Cluster'}
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec?.names && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Resource
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                          {fullResource.spec.names.kind || '-'}
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec?.conversion && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Conversion
                        </Text>
                        <Box
                          p={2}
                          bg="gray.100"
                          _dark={{ bg: 'gray.800' }}
                          borderRadius="md"
                          overflowX="auto"
                        >
                          <Text fontSize="xs" fontFamily="mono" color="gray.700" _dark={{ color: 'gray.300' }} whiteSpace="pre-wrap">
                            {JSON.stringify(fullResource.spec.conversion, null, 2)}
                          </Text>
                        </Box>
                      </Box>
                    )}
                    {fullResource.status?.conditions && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Conditions
                        </Text>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }}>
                          {fullResource.status.conditions.length} conditions
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec?.names && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={2}>
                          Names
                        </Text>
                        <VStack align="stretch" spacing={1} pl={2}>
                          <Box>
                            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>Plural</Text>
                            <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                              {fullResource.spec.names.plural || '-'}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>Singular</Text>
                            <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                              {fullResource.spec.names.singular || '-'}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>Kind</Text>
                            <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                              {fullResource.spec.names.kind || '-'}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>ListKind</Text>
                            <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} fontFamily="mono">
                              {fullResource.spec.names.listKind || '-'}
                            </Text>
                          </Box>
                        </VStack>
                      </Box>
                    )}
                    {fullResource.spec?.validation && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                          Validation
                        </Text>
                        <Box
                          p={2}
                          bg="gray.100"
                          _dark={{ bg: 'gray.800' }}
                          borderRadius="md"
                          overflowX="auto"
                        >
                          <Text fontSize="xs" fontFamily="mono" color="gray.700" _dark={{ color: 'gray.300' }} whiteSpace="pre-wrap">
                            {JSON.stringify(fullResource.spec.validation, null, 2)}
                          </Text>
                        </Box>
                      </Box>
                    )}
                    {fullResource.spec?.additionalPrinterColumns && fullResource.spec.additionalPrinterColumns.length > 0 && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={2}>
                          Additional Printer Columns
                        </Text>
                        <VStack align="stretch" spacing={2}>
                          {fullResource.spec.additionalPrinterColumns.map((column, idx) => (
                            <Box key={idx} p={2} bg="gray.100" _dark={{ bg: 'gray.800' }} borderRadius="md">
                              <Text fontSize="xs" fontWeight="medium" color="gray.700" _dark={{ color: 'gray.300' }} mb={1}>
                                {column.name}
                              </Text>
                              <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} fontFamily="mono">
                                {column.type} - {column.jsonPath}
                              </Text>
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    )}
                    <Box>
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                        Events
                      </Text>
                      <Text fontSize="sm" color="gray.500" _dark={{ color: 'gray.400' }}>
                        No events found
                      </Text>
                    </Box>
                  </VStack>
                </Box>
              </Box>
            )}

            {(() => {
              const hasConfig = fullResource.spec && (
                fullResource.spec.compositionRef ||
                fullResource.spec.claimRef ||
                fullResource.spec.resourceRef ||
                fullResource.spec.writeConnectionSecretToRef ||
                (fullResource.spec.resourceRefs && fullResource.spec.resourceRefs.length > 0)
              );
              
              return hasConfig ? (
                <Box
                  p={5}
                >
                  <HStack spacing={2} mb={4}>
                    <Box color="purple.500" _dark={{ color: 'purple.400' }}>
                      <FiSettings size={18} />
                    </Box>
                    <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Configuration</Text>
                  </HStack>
                  <Box>
                    <VStack align="stretch" spacing={3}>
                      {fullResource.spec.compositionRef && (
                      <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                          Composition Reference
                        </Text>
                        <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>{fullResource.spec.compositionRef.name}</Text>
                      </Box>
                    )}
                    {fullResource.spec.claimRef && (
                      <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                          Claim Reference
                        </Text>
                        <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                          {fullResource.spec.claimRef.namespace}/{fullResource.spec.claimRef.name}
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec.resourceRef && (
                      <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                          Resource Reference
                        </Text>
                        <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                          {fullResource.spec.resourceRef.kind}/{fullResource.spec.resourceRef.name}
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec.writeConnectionSecretToRef && (
                      <Box
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                          Connection Secret
                        </Text>
                        <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                          {fullResource.spec.writeConnectionSecretToRef.namespace || 'default'}/{fullResource.spec.writeConnectionSecretToRef.name}
                        </Text>
                      </Box>
                    )}
                    {fullResource.spec.resourceRefs && fullResource.spec.resourceRefs.length > 0 && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={2}>
                          Managed Resources ({fullResource.spec.resourceRefs.length})
                        </Text>
                        <Box
                          p={3}
                          bg="gray.50"
                          _dark={{ bg: 'gray.700' }}
                          borderRadius="md"
                        >
                          <VStack align="stretch" spacing={2}>
                          {fullResource.spec.resourceRefs.slice(0, 5).map((ref, idx) => (
                              <Text key={idx} fontSize="xs" fontFamily="mono" color="gray.700" _dark={{ color: 'gray.300' }}>
                              {ref.kind}/{ref.name}
                            </Text>
                          ))}
                          {fullResource.spec.resourceRefs.length > 5 && (
                            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }}>
                              +{fullResource.spec.resourceRefs.length - 5} more
                            </Text>
                          )}
                        </VStack>
                        </Box>
                      </Box>
                    )}
                    </VStack>
                  </Box>
                </Box>
              ) : null;
            })()}

            {relatedResources.length > 0 && (
                    <Box
                      p={5}
                      gridColumn={{ base: '1', md: '1 / -1' }}
                    >
                      <HStack spacing={2} mb={4}>
                        <Box color="orange.500" _dark={{ color: 'orange.400' }}>
                          <FiLayers size={18} />
                  </Box>
                        <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Related Resources</Text>
                </HStack>
                <VStack align="stretch" spacing={2}>
                  {relatedResources.map((related, idx) => (
                    <Box
                      key={idx}
                      p={3}
                      border="1px solid"
                      borderRadius="md"
                      cursor="pointer"
                      bg="white"
                      _dark={{ bg: 'gray.800' }}
                      _hover={{ bg: 'blue.50', _dark: { bg: 'gray.700' } }}
                      css={{
                        borderColor: 'rgba(0, 0, 0, 0.08) !important',
                        '.dark &': {
                          borderColor: 'rgba(255, 255, 255, 0.1) !important',
                        },
                        '&:hover': {
                          borderColor: 'rgba(59, 130, 246, 0.5) !important',
                        },
                        '.dark &:hover': {
                          borderColor: 'rgba(59, 130, 246, 0.7) !important',
                        }
                      }}
                      onClick={() => handleRelatedClick(related)}
                      transition="all 0.2s"
                    >
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                          <HStack spacing={2}>
                            <Text fontWeight="semibold" fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }}>{related.type}</Text>
                            <Badge fontSize="xs" colorScheme="blue">{related.kind}</Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                            {related.name}
                            {related.namespace && ` • ${related.namespace}`}
                          </Text>
                        </VStack>
                        <FiExternalLink style={{ color: 'var(--chakra-colors-gray-400)' }} />
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </SimpleGrid>
              </Box>
            )}

            {activeTab === 'status' && (
              <Box p={4} flex={1} overflowY="auto">
                {fullResource.status && (
                  <Box>
                    {fullResource.status.conditions && fullResource.status.conditions.length > 0 ? (
                      <VStack align="stretch" spacing={3}>
                        {fullResource.status.conditions.map((condition, idx) => {
                          const isReady = condition.status === 'True';
                          const isFalse = condition.status === 'False';
                          return (
                            <Box
                              key={idx}
                              p={4}
                              bg={isReady ? 'green.50' : isFalse ? 'red.50' : 'yellow.50'}
                              borderRadius="md"
                              border="1px solid"
                              borderColor={isReady ? 'green.200' : isFalse ? 'red.200' : 'yellow.200'}
                              _dark={{
                                bg: isReady ? 'green.900' : isFalse ? 'red.900' : 'yellow.900',
                                borderColor: isReady ? 'green.700' : isFalse ? 'red.700' : 'yellow.700',
                              }}
                            >
                              <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" fontWeight="semibold" color={isReady ? 'green.700' : isFalse ? 'red.700' : 'yellow.700'} _dark={{ color: isReady ? 'green.300' : isFalse ? 'red.300' : 'yellow.300' }}>
                                  {condition.type}
                                </Text>
                                <Badge
                                  colorScheme={isReady ? 'green' : isFalse ? 'red' : 'yellow'}
                                  fontSize="xs"
                                >
                                  {condition.status}
                                </Badge>
                              </HStack>
                              {condition.reason && (
                                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                                  Reason: {condition.reason}
                                </Text>
                              )}
                              {condition.message && (
                                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                                  {condition.message}
                                </Text>
                              )}
                              {condition.lastTransitionTime && (
                                <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }} mt={2}>
                                  Last Transition: {new Date(condition.lastTransitionTime).toLocaleString()}
                                </Text>
                              )}
                            </Box>
                          );
                        })}
                      </VStack>
                    ) : (
                      <Box
                        p={6}
                        textAlign="center"
                        bg="gray.50"
                        _dark={{ bg: 'gray.800' }}
                        borderRadius="md"
                      >
                        <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                          No status conditions available
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {activeTab === 'yaml' && (
              <Box
                p={4}
                h="100%"
                flex={1}
                overflow="auto"
              >
                <Box
                  borderRadius="md"
                  overflow="hidden"
                  border="1px solid"
                  borderColor="gray.200"
                  _dark={{ borderColor: 'gray.700', bg: 'gray.800' }}
                  bg="white"
                >
                  <SyntaxHighlighter
                    language="yaml"
                    style={colorMode === 'dark' ? stoneDarkTheme : customLightTheme}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                      background: colorMode === 'dark' ? '#1A202C' : '#ffffff',
                      backgroundColor: colorMode === 'dark' ? '#1A202C' : '#ffffff',
                    }}
                    showLineNumbers
                    wrapLines
                  >
                    {jsonToYaml(fullResource)}
                  </SyntaxHighlighter>
                </Box>
              </Box>
            )}

            {activeTab === 'events' && (
              <Box p={4} flex={1} overflowY="auto">
                {eventsLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
                    <Text color="gray.700" _dark={{ color: 'gray.300' }}>Loading events...</Text>
                  </Box>
                ) : events.length === 0 ? (
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
                ) : (
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
                )}
              </Box>
            )}

            {activeTab === 'relations' && (
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
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

