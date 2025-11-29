import {
  Box,
  Text,
  VStack,
} from '@chakra-ui/react';

export const LoadingSpinner = ({ 
  message = 'Loading...', 
  subMessage = null,
  minH = '400px',
  size = '48px',
}) => {
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minH={minH}
      w="100%"
    >
      <VStack spacing={4}>
        <Box
          as="div"
          w={size}
          h={size}
          border="4px solid"
          borderColor="gray.200"
          borderTopColor="gray.900"
          _dark={{ borderColor: 'gray.700', borderTopColor: 'white' }}
          borderRadius="50%"
          style={{
            animation: 'spin 1s linear infinite',
          }}
        />
        <VStack spacing={1}>
          <Text 
            fontSize="sm" 
            fontWeight="500" 
            color="gray.700" 
            _dark={{ color: 'gray.300' }}
          >
            {message}
          </Text>
          {subMessage && (
            <Text 
              fontSize="xs" 
              color="gray.500" 
              _dark={{ color: 'gray.500' }}
            >
              {subMessage}
            </Text>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

