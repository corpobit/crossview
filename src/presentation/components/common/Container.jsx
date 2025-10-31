import { Box } from '@chakra-ui/react';

export const Container = ({ children, ...props }) => {
  return (
    <Box
      bg="white"
      _dark={{ bg: 'gray.800' }}
      border="1px solid"
      borderRadius="md"
      css={{
        borderColor: 'rgba(0, 0, 0, 0.08) !important',
        '.dark &': {
          borderColor: 'rgba(255, 255, 255, 0.1) !important',
        }
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

