import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
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
  const [ssoStatus, setSsoStatus] = useState({ enabled: false, oidc: { enabled: false }, saml: { enabled: false } });

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
        
        // Load SSO status
        try {
          const sso = await authService.getSSOStatus();
          setSsoStatus(sso);
        } catch (err) {
          console.error('Could not load SSO status:', err);
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
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minH="100vh"
        bg="gray.50"
        _dark={{ bg: 'gray.900' }}
      >
        <VStack spacing={4}>
          <Box
            w="40px"
            h="40px"
            border="4px solid"
            borderColor="gray.200"
            borderTopColor="gray.900"
            _dark={{ borderColor: 'gray.700', borderTopColor: 'gray.300' }}
            borderRadius="full"
            animation="spin 1s linear infinite"
          />
          <Text color="gray.600" _dark={{ color: 'gray.400' }} fontSize="sm">
            Loading...
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      justifyContent="center"
      alignItems="center"
      p={6}
      position="relative"
      overflow="hidden"
      bg="gray.50"
      _dark={{ bg: 'gray.900' }}
      css={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0),
          radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.03) 1px, transparent 0)
        `,
        backgroundSize: '40px 40px, 20px 20px',
        backgroundPosition: '0 0, 20px 20px',
        '.dark &': {
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0),
            radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0)
          `,
        }
      }}
    >
      <HStack 
        spacing={0} 
        align="stretch" 
        w="100%" 
        maxW="1400px" 
        mx="auto"
        flexDirection={{ base: 'column', lg: 'row' }}
        h={{ base: 'auto', lg: '100vh' }}
      >
        {/* Left Side - Login Container */}
        <Box
          w={{ base: '100%', lg: '50%' }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={6}
        >
          <Box
            w="100%"
            maxW="480px"
            borderRadius="2xl"
            p={10}
            position="relative"
            zIndex={1}
            border="1px solid"
            bg="white"
            _dark={{ bg: 'gray.800' }}
            css={{
              borderColor: 'rgba(0, 0, 0, 0.1) !important',
              '.dark &': {
                borderColor: 'rgba(255, 255, 255, 0.12) !important',
              }
            }}
          >
          <VStack spacing={8} align="stretch">
            <Box textAlign="center">
              <Text 
                fontSize="md" 
                color="gray.600" 
                _dark={{ color: 'gray.400' }}
                fontWeight="500"
              >
                {isRegisterMode ? 'Create your admin account to get started' : 'Sign in to your account'}
              </Text>
            </Box>

          {error && (
            <Box
              p={4}
              bg="red.50"
              border="1px solid"
              borderColor="red.200"
              _dark={{ bg: 'red.950/50', borderColor: 'red.800' }}
              borderRadius="lg"
              display="flex"
              alignItems="center"
              gap={3}
              animation="slideIn 0.3s ease-out"
            >
              <Box
                w="20px"
                h="20px"
                borderRadius="full"
                bg="red.500"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <Text color="white" fontSize="xs" fontWeight="bold">!</Text>
              </Box>
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

              <Button
                type="submit"
                w="100%"
                mt={6}
                bg="gray.900"
                _hover={{ bg: 'gray.800' }}
                _dark={{ bg: 'white', color: 'gray.900', _hover: { bg: 'gray.100' } }}
                color="white"
                disabled={loading}
              >
                {loading ? (
                  <HStack spacing={2}>
                    <Box
                      w="16px"
                      h="16px"
                      border="2px solid"
                      borderColor="white"
                      borderTopColor="transparent"
                      borderRadius="full"
                      animation="spin 0.8s linear infinite"
                    />
                    <Text>Processing...</Text>
                  </HStack>
                ) : (
                  isRegisterMode ? 'Create Account' : 'Sign In'
                )}
              </Button>
          </Box>

          {/* SSO Login Options */}
          {!isRegisterMode && ssoStatus.enabled && (ssoStatus.oidc.enabled || ssoStatus.saml.enabled) && (
            <>
              <HStack my={6} spacing={4} align="center">
                <Box h="1px" flex={1} bg="gray.200" _dark={{ bg: 'gray.700' }} />
                <Text 
                  fontSize="xs" 
                  fontWeight="600" 
                  color="gray.500" 
                  _dark={{ color: 'gray.400' }}
                  textTransform="uppercase"
                  letterSpacing="1px"
                  px={2}
                >
                  Or continue with
                </Text>
                <Box h="1px" flex={1} bg="gray.200" _dark={{ bg: 'gray.700' }} />
              </HStack>
              <VStack spacing={3} align="stretch">
                {ssoStatus.oidc.enabled && (
                  <Button
                    as="a"
                    href={authService.getOIDCLoginURL()}
                    w="100%"
                    py={6}
                    bg="white"
                    _hover={{ bg: 'gray.50', transform: 'translateY(-1px)' }}
                    color="gray.700"
                    border="1px solid"
                    borderColor="gray.200"
                    _dark={{ bg: 'gray.800', color: 'gray.200', borderColor: 'gray.700', _hover: { bg: 'gray.700' } }}
                    borderRadius="lg"
                    fontWeight="600"
                    fontSize="sm"
                    transition="all 0.2s"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={2}
                  >
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="sm"
                      bg="blue.500"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color="white" fontSize="xs" fontWeight="bold">O</Text>
                    </Box>
                    Sign in with OIDC
                  </Button>
                )}
                {ssoStatus.saml.enabled && (
                  <Button
                    as="a"
                    href={authService.getSAMLLoginURL()}
                    w="100%"
                    py={6}
                    bg="white"
                    _hover={{ bg: 'gray.50', transform: 'translateY(-1px)' }}
                    color="gray.700"
                    border="1px solid"
                    borderColor="gray.200"
                    _dark={{ bg: 'gray.800', color: 'gray.200', borderColor: 'gray.700', _hover: { bg: 'gray.700' } }}
                    borderRadius="lg"
                    fontWeight="600"
                    fontSize="sm"
                    transition="all 0.2s"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={2}
                  >
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="sm"
                      bg="green.500"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color="white" fontSize="xs" fontWeight="bold">S</Text>
                    </Box>
                    Sign in with SAML
                  </Button>
                )}
              </VStack>
            </>
          )}

          {!isRegisterMode && authState.hasUsers && (
            <Text 
              fontSize="sm" 
              textAlign="center" 
              color="gray.500" 
              _dark={{ color: 'gray.400' }}
              mt={4}
              fontWeight="500"
            >
              Need an account? Contact an administrator
            </Text>
          )}
          </VStack>
        </Box>
        </Box>

        {/* Divider */}
        <Box
          w="1px"
          h={{ base: '0', lg: '80%' }}
          bg="gray.200"
          _dark={{ bg: 'gray.700' }}
          display={{ base: 'none', lg: 'block' }}
          alignSelf="center"
        />

        {/* Right Side - Logo, Typography, and Description */}
        <Box
          w={{ base: '100%', lg: '50%' }}
          display={{ base: 'none', lg: 'flex' }}
          flexDirection="column"
          justifyContent="center"
          alignItems="flex-start"
          p={12}
        >
          <VStack spacing={6} align="flex-start" w="100%">
            <Box>
              <Box
                mb={6}
                w="140px"
                h="140px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Box
                  as="img"
                  src="/images/crossview-logo.svg"
                  alt="Crossview Logo"
                  w="100%"
                  h="100%"
                  objectFit="contain"
                  css={{
                    filter: 'none',
                    '.dark &': {
                      filter: 'invert(1)',
                    }
                  }}
                />
              </Box>
              <Text 
                fontSize="4xl" 
                fontWeight="800" 
                mb={4} 
                letterSpacing="-1px"
                color="gray.900"
                _dark={{ color: 'gray.100' }}
              >
                Crossview
              </Text>
              <Text 
                fontSize="lg" 
                color="gray.600" 
                _dark={{ color: 'gray.400' }}
                fontWeight="400"
                lineHeight="1.7"
                mb={4}
              >
                A powerful platform for managing and visualizing your infrastructure resources with ease.
              </Text>
              <VStack spacing={3} align="flex-start" mt={6}>
                <HStack spacing={3}>
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="gray.900"
                    _dark={{ bg: 'gray.100' }}
                    mt={1}
                  />
                  <Text fontSize="md" color="gray.700" _dark={{ color: 'gray.300' }}>
                    Centralized resource management
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="gray.900"
                    _dark={{ bg: 'gray.100' }}
                    mt={1}
                  />
                  <Text fontSize="md" color="gray.700" _dark={{ color: 'gray.300' }}>
                    Real-time monitoring and insights
                  </Text>
                </HStack>
                <HStack spacing={3}>
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="gray.900"
                    _dark={{ bg: 'gray.100' }}
                    mt={1}
                  />
                  <Text fontSize="md" color="gray.700" _dark={{ color: 'gray.300' }}>
                    Secure authentication and access control
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </Box>
      </HStack>
    </Box>
  );
};

