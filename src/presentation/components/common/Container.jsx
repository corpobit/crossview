import { Box } from '@chakra-ui/react';
import { getBorderColor } from '../../utils/theme.js';

export const Container = ({ children, ...props }) => {
  return (
    <Box
      bg="white"
      _dark={{ bg: 'gray.800' }}
      border="1px solid"
      borderRadius="md"
      css={{
        borderColor: `${getBorderColor('light')} !important`,
        '.dark &': {
          borderColor: `${getBorderColor('dark')} !important`,
        }
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

