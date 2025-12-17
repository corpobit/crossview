import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
} from '@chakra-ui/react';
import { FiAlertCircle, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { getBorderColor, getBackgroundColor } from '../../utils/theme.js';

export const ContextSidebar = () => {
  const { contexts, selectedContext, setSelectedContext, contextErrors, colorMode, isInClusterMode } = useAppContext();
  const navigate = useNavigate();

  if (isInClusterMode) {
    return null;
  }

  const handleContextClick = async (contextName) => {
    await setSelectedContext(contextName);
  };

  const getFirstLetter = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext?.name || selectedContext;

  const bgColor = getBackgroundColor(colorMode, 'sidebar');
  const borderColor = getBorderColor(colorMode);

  return (
    <Box
      w="60px"
      h="100vh"
      bg={bgColor}
      borderRight="1px solid"
      borderColor={borderColor}
      position="fixed"
      left={0}
      top={0}
      zIndex={1001}
      display="flex"
      flexDirection="column"
    >
      <Box flex={1} overflowY="auto" p={2}>
        {contexts.length === 0 ? (
          <VStack spacing={3} align="center" justify="center" h="100%">
            <Box
              w="44px"
              h="44px"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="gray.100"
              _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
              border="2px dashed"
              borderColor="gray.300"
              cursor="pointer"
              _hover={{
                bg: 'gray.200',
                borderColor: 'blue.400',
                _dark: { bg: 'gray.600', borderColor: 'blue.500' }
              }}
              transition="all 0.2s"
            >
              <Icon as={FiPlus} boxSize={5} color="gray.500" _dark={{ color: 'gray.400' }} />
            </Box>
          </VStack>
        ) : (
          <VStack spacing={2} align="stretch">
            {contexts.map((context) => {
              const name = typeof context === 'string' ? context : context.name || context;
              const isSelected = contextName === name;
              const hasError = contextErrors[name];
              return (
                <Box
                  key={name}
                  as="button"
                  onClick={() => handleContextClick(name)}
                  w="100%"
                  p={0}
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg={isSelected ? 'blue.500' : 'gray.200'}
                  _dark={{ bg: isSelected ? 'blue.600' : 'gray.700', color: isSelected ? 'white' : 'gray.300' }}
                  color={isSelected ? 'white' : 'gray.700'}
                  _hover={{
                    bg: isSelected ? 'blue.600' : 'gray.300',
                    _dark: { bg: isSelected ? 'blue.700' : 'gray.600' }
                  }}
                  position="relative"
                  transition="all 0.2s"
                  h="44px"
                  title={name}
                >
                  <Text fontSize="md" fontWeight="bold">
                    {getFirstLetter(name)}
                  </Text>
                  {hasError && (
                    <Box
                      position="absolute"
                      top="-2px"
                      right="-2px"
                      w="12px"
                      h="12px"
                      borderRadius="full"
                      bg="red.500"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon as={FiAlertCircle} boxSize={6} color="white" />
                    </Box>
                  )}
                </Box>
              );
            })}
            <Box
              as="button"
              onClick={() => navigate('/settings/context-management')}
              w="100%"
              p={0}
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="transparent"
              border="2px dashed"
              borderColor="gray.300"
              color="gray.500"
              _dark={{ borderColor: 'gray.600', color: 'gray.400' }}
              _hover={{
                borderColor: 'blue.400',
                color: 'blue.500',
                _dark: { borderColor: 'blue.500', color: 'blue.400' }
              }}
              transition="all 0.2s"
              h="44px"
              title="Add Context"
            >
              <Icon as={FiPlus} boxSize={5} />
            </Box>
          </VStack>
        )}
      </Box>
    </Box>
  );
};

