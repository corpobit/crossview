import {
  Box,
  VStack,
  Text,
  HStack,
} from '@chakra-ui/react';
import { Container } from '../components/common/Container.jsx';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useAppContext } from '../providers/AppProvider.jsx';

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
            <HStack spacing={3}>
              <Box
                as="button"
                p={2}
                borderRadius="md"
                bg={colorMode === 'light' ? 'blue.500' : 'gray.200'}
                _dark={{ bg: colorMode === 'light' ? 'blue.600' : 'gray.700', color: colorMode === 'light' ? 'white' : 'gray.300' }}
                color={colorMode === 'light' ? 'white' : 'gray.600'}
                onClick={() => setColorMode('light')}
                cursor="pointer"
                _hover={{ opacity: 0.8 }}
                transition="all 0.2s"
              >
                <FiSun size={20} />
              </Box>
              <Box
                as="button"
                p={2}
                borderRadius="md"
                bg={colorMode === 'dark' ? 'blue.500' : 'gray.200'}
                _dark={{ bg: colorMode === 'dark' ? 'blue.600' : 'gray.700', color: colorMode === 'dark' ? 'white' : 'gray.300' }}
                color={colorMode === 'dark' ? 'white' : 'gray.600'}
                onClick={() => setColorMode('dark')}
                cursor="pointer"
                _hover={{ opacity: 0.8 }}
                transition="all 0.2s"
              >
                <FiMoon size={20} />
              </Box>
            </HStack>
          </HStack>
        </Container>
      </VStack>
    </Box>
  );
};

