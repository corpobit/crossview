import { Box } from '@chakra-ui/react';
import { getBorderColor, getBackgroundColor } from '../../utils/theme.js';
import { useAppContext } from '../../providers/AppProvider.jsx';

export const Container = ({ children, ...props }) => {
  const { colorMode } = useAppContext();
  return (
    <Box
      bg={getBackgroundColor(colorMode, 'header')}
      _dark={{ bg: getBackgroundColor('dark', 'header') }}
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

