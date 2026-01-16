import {
  Box,
  Text,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { FiAlertCircle } from 'react-icons/fi';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { Dropdown } from '../common/Dropdown.jsx';
import { getBackgroundColor, getTextColor } from '../../utils/theme.js';

export const ContextSelector = () => {
  const { contexts, selectedContext, setSelectedContext, contextErrors, colorMode } = useAppContext();

  const handleSelect = async (contextName) => {
    await setSelectedContext(contextName);
  };

  if (contexts.length === 0) {
    return (
      <Box
        px={3}
        py={2}
        borderRadius="md"
        bg={getBackgroundColor(colorMode, 'secondary')}
        _dark={{ bg: getBackgroundColor('dark', 'tertiary') }}
        fontSize="sm"
        w="100%"
      >
        <Text color={getTextColor(colorMode, 'secondary')} _dark={{ color: getTextColor('dark', 'tertiary') }}>No contexts available</Text>
      </Box>
    );
  }

  const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext?.name || selectedContext;
  const options = contexts.map(context => {
    const name = typeof context === 'string' ? context : context.name || context;
    const hasError = contextErrors[name];
    return { 
      value: name, 
      label: name,
      hasError: !!hasError
    };
  });

  return (
    <Dropdown
        w="100%"
      placeholder="Select context"
      value={contextName}
      onChange={handleSelect}
      options={options}
    />
  );
};

