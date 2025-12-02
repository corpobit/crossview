import { Box, Text, Badge, VStack, HStack } from '@chakra-ui/react';

export const ResourceStatus = ({ fullResource }) => {
  if (!fullResource.status) {
    return (
      <Box
        p={6}
        textAlign="center"
        bg="gray.50"
        _dark={{ bg: 'gray.800' }}
        borderRadius="md"
      >
        <Text color="gray.600" _dark={{ color: 'gray.400' }}>
          No status available for this resource
        </Text>
      </Box>
    );
  }

  if (!fullResource.status.conditions || fullResource.status.conditions.length === 0) {
    return (
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
    );
  }

  return (
    <Box p={4} flex={1} overflowY="auto">
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
    </Box>
  );
};

