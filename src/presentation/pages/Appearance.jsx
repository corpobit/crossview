import {
  Box,
  VStack,
  Text,
  HStack,
} from '@chakra-ui/react';
import { Container } from '../components/common/Container.jsx';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useAppContext } from '../providers/AppProvider.jsx';
import { colors, colors as themeColors } from '../utils/theme.js';

export const Appearance = () => {
  const { user, colorMode, setColorMode } = useAppContext();

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={6}>
        Appearance
      </Text>

      <VStack spacing={6} align="stretch">
        <Container p={6}>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            User Information
          </Text>
          <VStack align="stretch" spacing={3}>
            <Box>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                Username
              </Text>
              <Text fontSize="md" fontWeight="medium">
                {user?.username}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                Email
              </Text>
              <Text fontSize="md" fontWeight="medium">
                {user?.email}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                Role
              </Text>
              <Text fontSize="md" fontWeight="medium">
                {user?.role}
              </Text>
            </Box>
          </VStack>
        </Container>

        <Container p={6}>
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontSize="lg" fontWeight="semibold">Theme</Text>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                Switch between light and dark mode
              </Text>
            </VStack>
            <HStack spacing={4} align="center">
              <Box
                display="flex"
                alignItems="center"
                color={colorMode === 'light' ? 'orange.400' : 'gray.400'}
                transition="color 0.2s"
              >
                <FiSun size={18} />
              </Box>
              <Box
                as="button"
                position="relative"
                w="52px"
                h="28px"
                borderRadius="full"
                bg={colorMode === 'dark' ? 'blue.500' : 'gray.300'}
                _dark={{ bg: colorMode === 'dark' ? 'blue.500' : 'gray.600' }}
                onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
                cursor="pointer"
                transition="all 0.3s ease"
                _hover={{
                  bg: colorMode === 'dark' ? 'blue.600' : 'gray.400',
                  _dark: { bg: colorMode === 'dark' ? 'blue.600' : 'gray.500' }
                }}
                aria-label="Toggle theme"
              >
                <Box
                  position="absolute"
                  top="2px"
                  left={colorMode === 'dark' ? '26px' : '2px'}
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  bg="white"
                  boxShadow={`0 2px 4px ${colors.shadow.dark}`}
                  transition="left 0.3s ease"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {colorMode === 'dark' ? (
                    <FiMoon size={12} color={colors.accent.blue.secondary} />
                  ) : (
                    <FiSun size={12} color={colors.accent.amber.primary} />
                  )}
                </Box>
              </Box>
              <Box
                display="flex"
                alignItems="center"
                color={colorMode === 'dark' ? 'blue.400' : 'gray.400'}
                transition="color 0.2s"
              >
                <FiMoon size={18} />
              </Box>
            </HStack>
          </HStack>
        </Container>
      </VStack>
    </Box>
  );
};

