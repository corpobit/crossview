import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Select,
  Input,
  Badge,
  IconButton,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiFilter, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useState } from 'react';

export const AdvancedFilters = ({ filters, onFiltersChange, availableKinds = [], availableNamespaces = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [labelKey, setLabelKey] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const [annotationKey, setAnnotationKey] = useState('');
  const [annotationValue, setAnnotationValue] = useState('');

  const updateFilter = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const addLabel = () => {
    if (labelKey && labelValue) {
      const labels = { ...(filters.labels || {}), [labelKey]: labelValue };
      updateFilter('labels', labels);
      setLabelKey('');
      setLabelValue('');
    }
  };

  const removeLabel = (key) => {
    const labels = { ...(filters.labels || {}) };
    delete labels[key];
    updateFilter('labels', labels);
  };

  const addAnnotation = () => {
    if (annotationKey && annotationValue) {
      const annotations = { ...(filters.annotations || {}), [annotationKey]: annotationValue };
      updateFilter('annotations', annotations);
      setAnnotationKey('');
      setAnnotationValue('');
    }
  };

  const removeAnnotation = (key) => {
    const annotations = { ...(filters.annotations || {}) };
    delete annotations[key];
    updateFilter('annotations', annotations);
  };

  const setDateRange = (type, value) => {
    const dateRange = { ...(filters.dateRange || {}) };
    dateRange[type] = value;
    updateFilter('dateRange', dateRange);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: 'all',
      kind: [],
      namespace: [],
      resourceType: [],
      labels: {},
      annotations: {},
      dateRange: {},
    });
  };

  const hasActiveFilters = 
    filters.status !== 'all' ||
    (filters.kind && filters.kind.length > 0) ||
    (filters.namespace && filters.namespace.length > 0) ||
    (filters.resourceType && filters.resourceType.length > 0) ||
    (filters.labels && Object.keys(filters.labels).length > 0) ||
    (filters.annotations && Object.keys(filters.annotations).length > 0) ||
    (filters.dateRange && (filters.dateRange.start || filters.dateRange.end));

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <HStack>
          <Button
            leftIcon={<FiFilter />}
            rightIcon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            Advanced Filters
            {hasActiveFilters && (
              <Badge ml={2} colorScheme="blue">
                Active
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearAllFilters}>
              Clear All
            </Button>
          )}
        </HStack>
      </HStack>

      {isOpen && (
        <Box
          p={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          bg="gray.50"
          _dark={{ borderColor: 'gray.700', bg: 'gray.800' }}
          mt={4}
          transition="all 0.2s"
        >
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {/* Status Filter */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>Status</Text>
              <Select
                size="sm"
                value={filters.status || 'all'}
                onChange={(e) => updateFilter('status', e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="not-ready">Not Ready</option>
                <option value="unknown">Unknown</option>
              </Select>
            </Box>

            {/* Resource Type Filter */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>Resource Type</Text>
              <Select
                size="sm"
                value={filters.resourceType?.[0] || 'all'}
                onChange={(e) => {
                  const value = e.target.value === 'all' ? [] : [e.target.value];
                  updateFilter('resourceType', value);
                }}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              >
                <option value="all">All Types</option>
                <option value="CompositeResource">Composite Resources</option>
                <option value="Claim">Claims</option>
                <option value="Composition">Compositions</option>
                <option value="XRD">XRDs</option>
                <option value="Provider">Providers</option>
              </Select>
            </Box>

            {/* Kind Filter */}
            {availableKinds.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Kind</Text>
                <Select
                  size="sm"
                  value={filters.kind?.[0] || 'all'}
                  onChange={(e) => {
                    const value = e.target.value === 'all' ? [] : [e.target.value];
                    updateFilter('kind', value);
                  }}
                  bg="white"
                  _dark={{ bg: 'gray.700' }}
                >
                  <option value="all">All Kinds</option>
                  {availableKinds.map(kind => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </Select>
              </Box>
            )}

            {/* Namespace Filter */}
            {availableNamespaces.length > 0 && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Namespace</Text>
                <Select
                  size="sm"
                  value={filters.namespace?.[0] || 'all'}
                  onChange={(e) => {
                    const value = e.target.value === 'all' ? [] : [e.target.value === '(none)' ? '' : e.target.value];
                    updateFilter('namespace', value);
                  }}
                  bg="white"
                  _dark={{ bg: 'gray.700' }}
                >
                  <option value="all">All Namespaces</option>
                  <option value="(none)">(none)</option>
                  {availableNamespaces.map(ns => (
                    <option key={ns} value={ns}>{ns}</option>
                  ))}
                </Select>
              </Box>
            )}

            {/* Date Range */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>Created After</Text>
              <Input
                type="date"
                size="sm"
                value={filters.dateRange?.start || ''}
                onChange={(e) => setDateRange('start', e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>Created Before</Text>
              <Input
                type="date"
                size="sm"
                value={filters.dateRange?.end || ''}
                onChange={(e) => setDateRange('end', e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              />
            </Box>
          </SimpleGrid>

          {/* Labels */}
          <Box mt={4}>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>Labels</Text>
            <HStack mb={2}>
              <Input
                placeholder="Label key"
                size="sm"
                value={labelKey}
                onChange={(e) => setLabelKey(e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              />
              <Input
                placeholder="Label value"
                size="sm"
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              />
              <Button size="sm" onClick={addLabel}>Add</Button>
            </HStack>
            <HStack flexWrap="wrap" spacing={2}>
              {Object.entries(filters.labels || {}).map(([key, value]) => (
                <Badge key={key} colorScheme="blue">
                  {key}={value}
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={<FiX />}
                    onClick={() => removeLabel(key)}
                    ml={1}
                    aria-label="Remove label"
                  />
                </Badge>
              ))}
            </HStack>
          </Box>

          {/* Annotations */}
          <Box mt={4}>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>Annotations</Text>
            <HStack mb={2}>
              <Input
                placeholder="Annotation key"
                size="sm"
                value={annotationKey}
                onChange={(e) => setAnnotationKey(e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              />
              <Input
                placeholder="Annotation value"
                size="sm"
                value={annotationValue}
                onChange={(e) => setAnnotationValue(e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.700' }}
              />
              <Button size="sm" onClick={addAnnotation}>Add</Button>
            </HStack>
            <HStack flexWrap="wrap" spacing={2}>
              {Object.entries(filters.annotations || {}).map(([key, value]) => (
                <Badge key={key} colorScheme="purple">
                  {key}={value}
                  <IconButton
                    size="xs"
                    variant="ghost"
                    icon={<FiX />}
                    onClick={() => removeAnnotation(key)}
                    ml={1}
                    aria-label="Remove annotation"
                  />
                </Badge>
              ))}
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

