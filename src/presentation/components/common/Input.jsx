import { Input as ChakraInput } from '@chakra-ui/react';

export const Input = ({ ...props }) => {
  return (
    <ChakraInput
      bg="white"
      _dark={{ 
        bg: 'gray.800', 
        color: 'gray.200',
        borderColor: 'gray.700',
        _focus: {
          borderColor: 'gray.600',
        },
        _hover: {
          borderColor: 'gray.600',
        },
        _placeholder: {
          color: 'gray.500',
        }
      }}
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      fontSize="sm"
      color="gray.900"
      py={2}
      px={3}
      _placeholder={{
        color: 'gray.400',
      }}
      _focus={{
        borderColor: 'gray.400',
        outline: 'none',
        boxShadow: 'none',
      }}
      transition="all 0.2s"
      _hover={{
        borderColor: 'gray.300',
      }}
      {...props}
    />
  );
};

