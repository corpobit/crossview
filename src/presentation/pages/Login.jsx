import {
  Box,
  VStack,
  HStack,
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
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('');
  const [dbDatabase, setDbDatabase] = useState('');
  const [dbUsername, setDbUsername] = useState('');
  const [dbPassword, setDbPassword] = useState('');
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
          // Load database config if available
          try {
            console.log('Attempting to load database config...');
            const dbConfig = await authService.getDatabaseConfig();
            console.log('Loaded database config from API:', dbConfig);
            console.log('Port value received:', dbConfig.port, 'Type:', typeof dbConfig.port);
            if (dbConfig) {
              console.log('Setting form values from config...');
              setDbHost(dbConfig.host ?? '');
              // Handle port - if it exists, use it, otherwise default to empty string (not 5432)
              if (dbConfig.port != null && dbConfig.port !== undefined) {
                console.log('Setting port to:', dbConfig.port.toString());
                setDbPort(dbConfig.port.toString());
              } else {
                console.log('Port is null/undefined, using default 5432');
                setDbPort('5432'); // Only default if truly missing
              }
              setDbDatabase(dbConfig.database ?? '');
              setDbUsername(dbConfig.username ?? '');
              setDbPassword(''); // Never prefill password
              console.log('Form values set. dbPort state should be:', dbConfig.port != null ? dbConfig.port.toString() : '5432');
            } else {
              console.warn('dbConfig is null or undefined');
            }
          } catch (err) {
            // Log error for debugging
            console.error('Could not load database config:', err);
            console.error('Error details:', err.message, err.stack);
          }
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
        // Validate password confirmation
        if (password !== passwordConfirmation) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        
        const database = dbHost && dbDatabase && dbUsername && dbPassword ? {
          host: dbHost,
          port: Number.parseInt(dbPort, 10) || 5432,
          database: dbDatabase,
          username: dbUsername,
          password: dbPassword,
        } : null;
        await register({ username, email, password, database });
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
      bg="white"
      _dark={{ bg: 'gray.950' }}
      display="flex"
      justifyContent="center"
      alignItems="center"
      p={6}
    >
      <Box
        w="100%"
        maxW={isRegisterMode ? '1000px' : '440px'}
        border="1px solid"
        borderColor="gray.200"
        _dark={{ borderColor: 'gray.800', bg: 'gray.900' }}
        borderRadius="md"
        bg="white"
        p={8}
      >
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Text 
              fontSize="2xl" 
              fontWeight="700" 
              mb={2} 
              letterSpacing="-0.5px"
              color="gray.900" 
              _dark={{ color: 'white' }}
            >
              Crossview
            </Text>
            <Text 
              fontSize="sm" 
              color="gray.500" 
              _dark={{ color: 'gray.400' }}
              fontWeight="400"
            >
              {isRegisterMode ? 'Create your admin account' : 'Welcome back'}
            </Text>
          </Box>

          {error && (
            <Box
              p={4}
              bg="red.50"
              _dark={{ bg: 'red.950' }}
              borderLeft="3px solid"
              borderColor="red.500"
              borderRadius="sm"
            >
              <Text fontSize="sm" color="red.700" _dark={{ color: 'red.300' }} fontWeight="500">
                {error}
              </Text>
            </Box>
          )}

          <Box as="form" onSubmit={handleSubmit}>
            {isRegisterMode ? (
              <HStack spacing={8} align="flex-start">
                <Box flex={1}>
            <VStack spacing={4} align="stretch">
                    <Text 
                      fontSize="xs" 
                      fontWeight="600" 
                      mb={1} 
                      color="gray.900" 
                      _dark={{ color: 'white' }}
                      letterSpacing="0.2px"
                      textTransform="uppercase"
                    >
                      Account Information
                    </Text>
              <Box>
                      <Text 
                        fontSize="sm" 
                        fontWeight="500" 
                        mb={2} 
                        color="gray.700" 
                        _dark={{ color: 'gray.300' }}
                      >
                  Username
                </Text>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Box>
                <Box>
                      <Text 
                        fontSize="sm" 
                        fontWeight="500" 
                        mb={2} 
                        color="gray.700" 
                        _dark={{ color: 'gray.300' }}
                      >
                    Email
                  </Text>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Box>
                    <Box>
                      <Text 
                        fontSize="sm" 
                        fontWeight="500" 
                        mb={2} 
                        color="gray.700" 
                        _dark={{ color: 'gray.300' }}
                      >
                        Password
                      </Text>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </Box>
                    <Box>
                      <Text 
                        fontSize="sm" 
                        fontWeight="500" 
                        mb={2} 
                        color="gray.700" 
                        _dark={{ color: 'gray.300' }}
                      >
                        Confirm Password
                      </Text>
                      <Input
                        type="password"
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        required
                      />
                    </Box>
                  </VStack>
                </Box>

                <Box flex={1}>
                  <VStack spacing={4} align="stretch">
                    <Text 
                      fontSize="xs" 
                      fontWeight="600" 
                      mb={1} 
                      color="gray.900" 
                      _dark={{ color: 'white' }}
                      letterSpacing="0.2px"
                      textTransform="uppercase"
                    >
                      Database Configuration
                      <Text as="span" fontSize="xs" fontWeight="400" color="gray.500" _dark={{ color: 'gray.400' }} ml={2} textTransform="none">
                        (Optional)
                      </Text>
                    </Text>
                    <Box
                      p={4}
                      bg="gray.50"
                      _dark={{ bg: 'gray.900', borderColor: 'gray.800' }}
                      borderRadius="sm"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <VStack spacing={3} align="stretch">
                        <Box>
                          <Text fontSize="sm" fontWeight="500" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                            Host
                          </Text>
                          <Input
                            type="text"
                            value={dbHost}
                            onChange={(e) => setDbHost(e.target.value)}
                            placeholder="localhost"
                          />
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="500" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                            Port
                          </Text>
                          <Input
                            type="number"
                            value={dbPort}
                            onChange={(e) => setDbPort(e.target.value)}
                            placeholder="5432"
                          />
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="500" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                            Database
                          </Text>
                          <Input
                            type="text"
                            value={dbDatabase}
                            onChange={(e) => setDbDatabase(e.target.value)}
                            placeholder="crossview"
                          />
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="500" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                            Username
                          </Text>
                          <Input
                            type="text"
                            value={dbUsername}
                            onChange={(e) => setDbUsername(e.target.value)}
                            placeholder="postgres"
                          />
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="500" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                            Password
                          </Text>
                          <Input
                            type="password"
                            value={dbPassword}
                            onChange={(e) => setDbPassword(e.target.value)}
                            placeholder="Database password"
                          />
                        </Box>
                      </VStack>
                    </Box>
                  </VStack>
                </Box>
              </HStack>
            ) : (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                    Username
                  </Text>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Box>
              <Box>
                  <Text fontSize="sm" fontWeight="500" mb={2} color="gray.700" _dark={{ color: 'gray.300' }}>
                  Password
                </Text>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Box>
              </VStack>
            )}

              <Box
                as="button"
                type="submit"
                w="auto"
                minW="120px"
                mx="auto"
                py={2.5}
                px={6}
                mt={4}
                bg="gray.900"
                _hover={{ bg: 'gray.800' }}
                _dark={{ bg: 'white', color: 'gray.900', _hover: { bg: 'gray.100' } }}
                color="white"
                borderRadius="sm"
                fontWeight="500"
                fontSize="sm"
                disabled={loading}
                opacity={loading ? 0.5 : 1}
                cursor={loading ? 'not-allowed' : 'pointer'}
                transition="all 0.2s"
              >
                {loading ? 'Processing...' : isRegisterMode ? 'Create Account' : 'Sign In'}
              </Box>
          </Box>

          {!isRegisterMode && authState.hasUsers && (
            <Text 
              fontSize="sm" 
              textAlign="center" 
              color="gray.500" 
              _dark={{ color: 'gray.400' }}
              mt={2}
            >
              Contact an administrator to create an account
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
};

