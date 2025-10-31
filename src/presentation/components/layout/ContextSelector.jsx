import {
  Box,
  Text,
} from '@chakra-ui/react';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { Dropdown } from '../common/Dropdown.jsx';

export const ContextSelector = () => {
  const { contexts, selectedContext, setSelectedContext } = useAppContext();

  const handleSelect = async (contextName) => {
    await setSelectedContext(contextName);
  };

  if (contexts.length === 0) {
    return (
      <Box
        px={3}
        py={2}
        borderRadius="md"
        bg="gray.100"
        _dark={{ bg: 'gray.700' }}
        fontSize="sm"
        w="100%"
      >
        <Text color="gray.600" _dark={{ color: 'gray.400' }}>No contexts available</Text>
      </Box>
    );
  }

  const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext?.name || selectedContext;
  const options = contexts.map(context => {
    const name = typeof context === 'string' ? context : context.name || context;
    return { value: name, label: name };
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

