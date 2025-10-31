import { Input as ChakraInput } from '@chakra-ui/react';

export const Input = ({ ...props }) => {
  return (
    <ChakraInput
      bg="white"
      border="1px solid"
      borderRadius="md"
      fontSize="sm"
      color="gray.900"
      _dark={{ 
        bg: 'gray.800', 
        color: 'white' 
      }}
      _placeholder={{
        color: 'gray.400',
        _dark: { color: 'gray.500' }
      }}
      _focus={{
        boxShadow: 'none',
      }}
      css={{
        borderColor: 'rgba(0, 0, 0, 0.08) !important',
        '.dark &': {
          borderColor: 'rgba(255, 255, 255, 0.1) !important',
        },
        '.dark &:focus': {
          borderColor: '#3b82f6 !important',
        },
        '&:focus': {
          borderColor: '#3b82f6 !important',
        }
      }}
      {...props}
    />
  );
};

