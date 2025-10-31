import {
  Box,
  VStack,
  Text,
} from '@chakra-ui/react';
import { Input } from '../components/common/Input.jsx';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';

export const Login = () => {
  const navigate = useNavigate();
  const { authService, authChecked, user, login, register } = useAppContext();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const state = await authService.checkAuth();
        setAuthState(state);
        if (state.authenticated) {
          navigate('/');
        } else if (!state.hasUsers) {
          setIsRegisterMode(true);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      }
    };
    if (authChecked && !user) {
      checkAuth();
    }
  }, [authChecked, user, navigate, authService]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register({ username, email, password });
      } else {
        await login({ username, password });
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || (authState === null && !user)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      _dark={{ bg: 'gray.900' }}
      display="flex"
      justifyContent="center"
      alignItems="center"
      p={6}
    >
      <Box
        w="100%"
        maxW="400px"
        bg="white"
        _dark={{ bg: 'gray.800' }}
        borderRadius="lg"
        boxShadow="xl"
        p={8}
      >
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" mb={2} color="blue.600" _dark={{ color: 'blue.400' }}>
              Crossview
            </Text>
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              {isRegisterMode ? 'Create Admin Account' : 'Sign in to your account'}
            </Text>
          </Box>

          {error && (
            <Box
              p={3}
              bg="red.50"
              border="1px solid"
              borderColor="red.200"
              _dark={{ bg: 'red.900', borderColor: 'red.700' }}
              borderRadius="md"
            >
              <Text fontSize="sm" color="red.800" _dark={{ color: 'red.200' }}>
                {error}
              </Text>
            </Box>
          )}

          <Box as="form" onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                  Username
                </Text>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Box>

              {isRegisterMode && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                    Email
                  </Text>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Box>
              )}

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                  Password
                </Text>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Box>

              <Box
                as="button"
                type="submit"
                w="100%"
                py={3}
                bg="blue.600"
                _hover={{ bg: 'blue.700' }}
                _dark={{ bg: 'blue.500', _hover: { bg: 'blue.600' } }}
                color="white"
                borderRadius="md"
                fontWeight="semibold"
                disabled={loading}
                opacity={loading ? 0.6 : 1}
                cursor={loading ? 'not-allowed' : 'pointer'}
              >
                {loading ? 'Processing...' : isRegisterMode ? 'Create Admin Account' : 'Sign In'}
              </Box>
            </VStack>
          </Box>

          {!isRegisterMode && authState.hasUsers && (
            <Text fontSize="xs" textAlign="center" color="gray.500" _dark={{ color: 'gray.400' }}>
              Contact an administrator to create an account
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

