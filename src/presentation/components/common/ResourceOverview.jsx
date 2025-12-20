import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiExternalLink, FiClock, FiTag, FiLayers, FiSettings, FiInfo } from 'react-icons/fi';
import { formatRelativeTime } from './resourceUtils.js';
import { colors, getBorderColor } from '../../utils/theme.js';

export const ResourceOverview = ({ fullResource, resource, relatedResources, onRelatedClick }) => {
  return (
    <Box p={4} flex={1} overflowY="auto">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {(fullResource.metadata || fullResource.name || resource.name) && (
          <Box p={5}>
            <HStack spacing={2} mb={4}>
              <Box color="blue.500" _dark={{ color: 'blue.400' }}>
                <FiTag size={18} />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Summary</Text>
            </HStack>
            <VStack align="stretch" spacing={4}>
              {(fullResource.metadata?.name || fullResource.name || resource.name) && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Name
                  </Text>
                  <Text fontSize="sm" fontWeight="medium" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.metadata?.name || fullResource.name || resource.name}
                  </Text>
                </Box>
              )}
              {(fullResource.metadata?.namespace || fullResource.namespace || resource.namespace) && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Namespace
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.metadata?.namespace || fullResource.namespace || resource.namespace}
                  </Text>
                </Box>
              )}
              {(fullResource.metadata?.uid || fullResource.uid) && (
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
                    {fullResource.metadata?.uid || fullResource.uid}
                  </Text>
                </Box>
              )}
              {(fullResource.metadata?.creationTimestamp || fullResource.creationTimestamp) && (
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
                    {new Date(fullResource.metadata?.creationTimestamp || fullResource.creationTimestamp).toLocaleString()}
                  </Text>
                </Box>
              )}
              {(fullResource.metadata?.labels || fullResource.labels) && Object.keys(fullResource.metadata?.labels || fullResource.labels || {}).length > 0 && (
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
                      {Object.entries(fullResource.metadata?.labels || fullResource.labels || {}).map(([key, value]) => (
                        <Badge key={key} fontSize="xs" colorScheme="blue" px={2} py={1}>
                          {key}={value}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                </Box>
              )}
              {(fullResource.metadata?.annotations || fullResource.annotations) && Object.keys(fullResource.metadata?.annotations || fullResource.annotations || {}).length > 0 && (
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
                      {Object.entries(fullResource.metadata?.annotations || fullResource.annotations || {}).slice(0, 5).map(([key, value]) => (
                        <Box key={key} pb={2} borderBottom="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.600' }} _last={{ borderBottom: 'none', pb: 0 }}>
                          <Text fontSize="xs" fontWeight="medium" color="gray.700" _dark={{ color: 'gray.300' }} mb={1}>
                            {key}
                          </Text>
                          <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} wordBreak="break-word">
                            {String(value).length > 100 ? String(value).substring(0, 100) + '...' : String(value)}
                          </Text>
                        </Box>
                      ))}
                      {Object.keys(fullResource.metadata?.annotations || fullResource.annotations || {}).length > 5 && (
                        <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }} pt={1}>
                          +{Object.keys(fullResource.metadata?.annotations || fullResource.annotations || {}).length - 5} more
                        </Text>
                      )}
                    </VStack>
                  </Box>
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Fallback: Show basic info if no metadata */}
        {!fullResource.metadata && !fullResource.name && !resource.name && (
          <Box p={5}>
            <Text color="gray.500" _dark={{ color: 'gray.400' }}>
              No resource details available. Resource may not be fully loaded.
            </Text>
          </Box>
        )}

        {/* Properties section for Claims */}
        {(fullResource.kind === 'Nginx' || (fullResource.kind && fullResource.kind.endsWith('Claim'))) && fullResource.spec && (
          <Box p={5}>
            <HStack spacing={2} mb={4}>
              <Box color="purple.500" _dark={{ color: 'purple.400' }}>
                <FiInfo size={18} />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Claim Details</Text>
            </HStack>
            <VStack align="stretch" spacing={3}>
              {fullResource.spec?.resourceRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Composite Resource
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.spec.resourceRef.kind}/{fullResource.spec.resourceRef.name}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.compositionRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Composition
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.compositionRef.name}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.compositionRevisionRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Composition Revision
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.spec.compositionRevisionRef.name}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.compositeDeletePolicy && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Composite Delete Policy
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.compositeDeletePolicy}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.replicas !== undefined && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Replicas
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.replicas}
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Properties section for Composite Resources */}
        {(fullResource.kind === 'XNginx' || (fullResource.kind && fullResource.kind.startsWith('X'))) && fullResource.spec && (
          <Box p={5}>
            <HStack spacing={2} mb={4}>
              <Box color="orange.500" _dark={{ color: 'orange.400' }}>
                <FiInfo size={18} />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Composite Resource Details</Text>
            </HStack>
            <VStack align="stretch" spacing={3}>
              {fullResource.spec?.claimRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Claim
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.spec.claimRef.namespace}/{fullResource.spec.claimRef.kind}/{fullResource.spec.claimRef.name}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.compositionRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Composition
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.compositionRef.name}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.compositionRevisionRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Composition Revision
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.spec.compositionRevisionRef.name}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.compositionUpdatePolicy && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Composition Update Policy
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.compositionUpdatePolicy}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.resourceRefs && fullResource.spec.resourceRefs.length > 0 && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={2}>
                    Managed Resources ({fullResource.spec.resourceRefs.length})
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {fullResource.spec.resourceRefs.map((ref, idx) => (
                      <Box key={idx} pl={2} borderLeft="2px solid" borderColor="blue.300" _dark={{ borderColor: 'blue.600' }}>
                        <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }} fontFamily="mono">
                          {ref.kind}/{ref.name}
                          {ref.namespace && ` (${ref.namespace})`}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}
              {fullResource.spec?.replicas !== undefined && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Replicas
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.replicas}
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Properties section for Providers */}
        {fullResource.kind === 'Provider' && (
          <Box p={5}>
            <HStack spacing={2} mb={4}>
              <Box color="green.500" _dark={{ color: 'green.400' }}>
                <FiInfo size={18} />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Provider Details</Text>
            </HStack>
            <VStack align="stretch" spacing={3}>
              {fullResource.spec?.package && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Package
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.spec.package}
                  </Text>
                </Box>
              )}
              {fullResource.status?.currentRevision && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Current Revision
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.status.currentRevision}
                  </Text>
                </Box>
              )}
              {fullResource.status?.currentIdentifier && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Current Identifier
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.status.currentIdentifier}
                  </Text>
                </Box>
              )}
              {fullResource.status?.resolvedPackage && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Resolved Package
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.status.resolvedPackage}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.controllerConfigRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Controller Config Reference
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.controllerConfigRef.name || fullResource.spec.controllerConfigRef}
                  </Text>
                </Box>
              )}
              {fullResource.status?.conditions && fullResource.status.conditions.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={2}>
                    Conditions
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {fullResource.status.conditions.map((condition, idx) => (
                      <Box
                        key={idx}
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                      >
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.900" _dark={{ color: 'gray.100' }}>
                            {condition.type}
                          </Text>
                          <Badge
                            colorScheme={condition.status === 'True' ? 'green' : condition.status === 'False' ? 'red' : 'yellow'}
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
                          <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }} mt={1}>
                            Last transition: {new Date(condition.lastTransitionTime).toLocaleString()}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Properties section for Functions */}
        {fullResource.kind === 'Function' && (
          <Box p={5}>
            <HStack spacing={2} mb={4}>
              <Box color="purple.500" _dark={{ color: 'purple.400' }}>
                <FiLayers size={18} />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="gray.800" _dark={{ color: 'gray.100' }}>Function Details</Text>
            </HStack>
            <VStack align="stretch" spacing={3}>
              {fullResource.spec?.package && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Package
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.spec.package}
                  </Text>
                </Box>
              )}
              {fullResource.status?.currentRevision && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Current Revision
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.status.currentRevision}
                  </Text>
                </Box>
              )}
              {fullResource.status?.currentIdentifier && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Current Identifier
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.status.currentIdentifier}
                  </Text>
                </Box>
              )}
              {fullResource.status?.resolvedPackage && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Resolved Package
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }} fontFamily="mono">
                    {fullResource.status.resolvedPackage}
                  </Text>
                </Box>
              )}
              {fullResource.spec?.controllerConfigRef && (
                <Box
                  p={3}
                  bg="gray.50"
                  _dark={{ bg: 'gray.700' }}
                  borderRadius="md"
                >
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                    Controller Config Reference
                  </Text>
                  <Text fontSize="sm" color="gray.900" _dark={{ color: 'gray.100' }}>
                    {fullResource.spec.controllerConfigRef.name || fullResource.spec.controllerConfigRef}
                  </Text>
                </Box>
              )}
              {fullResource.status?.conditions && fullResource.status.conditions.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" _dark={{ color: 'gray.400' }} mb={2}>
                    Conditions
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {fullResource.status.conditions.map((condition, idx) => (
                      <Box
                        key={idx}
                        p={3}
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                        borderRadius="md"
                        borderLeft="4px solid"
                        borderColor={condition.status === 'True' ? 'green.500' : condition.status === 'False' ? 'red.500' : 'yellow.500'}
                      >
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.900" _dark={{ color: 'gray.100' }}>
                            {condition.type}
                          </Text>
                          <Badge
                            colorScheme={condition.status === 'True' ? 'green' : condition.status === 'False' ? 'red' : 'yellow'}
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
                          <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.500' }} mt={1}>
                            Last transition: {new Date(condition.lastTransitionTime).toLocaleString()}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </Box>
        )}

        {/* Properties section for CompositeResourceDefinitions */}
        {fullResource.kind === 'CompositeResourceDefinition' && (
          <Box p={5}>
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
            <Box p={5}>
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
                    borderColor: `${getBorderColor('light')} !important`,
                    '.dark &': {
                      borderColor: `${getBorderColor('dark')} !important`,
                    },
                    '&:hover': {
                      borderColor: `${colors.border.light.blueHover} !important`,
                    },
                    '.dark &:hover': {
                      borderColor: `${colors.border.dark.blueHover} !important`,
                    }
                  }}
                  onClick={() => onRelatedClick(related)}
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
  );
};

