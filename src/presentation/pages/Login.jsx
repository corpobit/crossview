import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
} from '@chakra-ui/react';
import { Input } from '../components/common/Input.jsx';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../providers/AppProvider.jsx';
import { colors, getBorderColor, getBackgroundColor, getTextColor } from '../utils/theme.js';

export const Login = () => {
  const navigate = useNavigate();
  const { authService, authChecked, user, login, register, colorMode } = useAppContext();
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
        bg={getBackgroundColor(colorMode, 'html')}
      >
        <VStack spacing={4}>
          <Box
            w="40px"
            h="40px"
            border="4px solid"
            borderColor={getBorderColor(colorMode, 'gray')}
            borderTopColor={getTextColor(colorMode, 'primary')}
            borderRadius="full"
            animation="spin 1s linear infinite"
          />
          <Text color={getTextColor(colorMode, 'secondary')} fontSize="sm">
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
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      p={6}
      position="relative"
      overflow="hidden"
      bg={getBackgroundColor(colorMode, 'html')}
      css={{
        backgroundImage: `
          radial-gradient(circle at 1px 1px, ${colors.pattern[colorMode].primary} 1px, transparent 0),
          radial-gradient(circle at 1px 1px, ${colors.pattern[colorMode].secondary} 1px, transparent 0)
        `,
        backgroundSize: '40px 40px, 20px 20px',
        backgroundPosition: '0 0, 20px 20px',
      }}
    >
      <VStack spacing={12} align="center" w="100%" maxW="400px">
        {/* Logo and Typography */}
        <VStack spacing={6} align="center">
          <HStack spacing={4} align="center">
            <Box
              w="60px"
              h="60px"
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
                  filter: colorMode === 'dark' ? 'invert(1)' : 'none',
                }}
              />
            </Box>
            <Text 
              fontSize="5xl" 
              fontWeight="800" 
              letterSpacing="-1px"
              color={getTextColor(colorMode, 'primary')}
            >
              Crossview
            </Text>
          </HStack>
          <Text 
            fontSize="md" 
            color={getTextColor(colorMode, 'secondary')}
            fontWeight="500"
            textAlign="center"
          >
            {isRegisterMode ? 'Create your admin account to get started' : 'Sign in to your account'}
          </Text>
        </VStack>

        {/* Login Form */}
        <VStack spacing={6} align="stretch" w="100%">

          {error && (
            <Box
              p={4}
              bg={colorMode === 'dark' ? 'red.950/50' : 'red.50'}
              border="1px solid"
              borderColor={colorMode === 'dark' ? 'red.800' : 'red.200'}
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
              <Text fontSize="sm" color={colorMode === 'dark' ? 'red.300' : 'red.700'} fontWeight="500">
                {error}
              </Text>
            </Box>
          )}

          <Box as="form" onSubmit={handleSubmit} w="100%">
            {isRegisterMode ? (
              <VStack spacing={6} align="stretch">
                <VStack spacing={4} align="stretch">
                  <Text 
                    fontSize="xs" 
                    fontWeight="600" 
                    mb={1} 
                    color={getTextColor(colorMode, 'primary')}
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
                      color={getTextColor(colorMode, 'secondary')}
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
                      color={getTextColor(colorMode, 'secondary')}
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
                      color={getTextColor(colorMode, 'secondary')}
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
                      color={getTextColor(colorMode, 'secondary')}
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

                <VStack spacing={4} align="stretch">
                  <Text 
                    fontSize="xs" 
                    fontWeight="600" 
                    mb={1} 
                    color={getTextColor(colorMode, 'primary')}
                    letterSpacing="0.2px"
                    textTransform="uppercase"
                  >
                    Database Configuration
                    <Text as="span" fontSize="xs" fontWeight="400" color={getTextColor(colorMode, 'tertiary')} ml={2} textTransform="none">
                      (Optional)
                    </Text>
                  </Text>
                  <Box
                    p={4}
                    bg={getBackgroundColor(colorMode, 'secondary')}
                    borderRadius="sm"
                    border="1px solid"
                    borderColor={getBorderColor(colorMode, 'default')}
                  >
                    <VStack spacing={3} align="stretch">
                      <Box>
                        <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'secondary')}>
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
                        <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'secondary')}>
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
                        <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'secondary')}>
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
                        <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'secondary')}>
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
                        <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'secondary')}>
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
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'secondary')}>
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
                  <Text fontSize="sm" fontWeight="500" mb={2} color={getTextColor(colorMode, 'secondary')}>
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
              mt={2}
              bg={colorMode === 'dark' ? getTextColor(colorMode, 'primary') : getTextColor('light', 'primary')}
              _hover={{ 
                bg: colorMode === 'dark' ? getTextColor(colorMode, 'secondary') : 'gray.800',
                opacity: 0.9
              }}
              color={colorMode === 'dark' ? getBackgroundColor(colorMode, 'primary') : 'white'}
              disabled={loading}
              py={6}
              fontSize="md"
              fontWeight="600"
            >
              {loading ? (
                <HStack spacing={2}>
                  <Box
                    w="16px"
                    h="16px"
                    border="2px solid"
                    borderColor={colorMode === 'dark' ? getBackgroundColor(colorMode, 'primary') : 'white'}
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
              <HStack spacing={4} align="center" w="100%">
                <Box h="1px" flex={1} bg={getBorderColor(colorMode, 'gray')} />
                <Text 
                  fontSize="xs" 
                  fontWeight="600" 
                  color={getTextColor(colorMode, 'tertiary')}
                  textTransform="uppercase"
                  letterSpacing="1px"
                  px={2}
                >
                  Or continue with
                </Text>
                <Box h="1px" flex={1} bg={getBorderColor(colorMode, 'gray')} />
              </HStack>
              <VStack spacing={3} align="stretch" w="100%">
                {ssoStatus.oidc.enabled && (
                  <Button
                    as="a"
                    href={authService.getOIDCLoginURL()}
                    w="100%"
                    py={6}
                    bg={getBackgroundColor(colorMode, 'primary')}
                    _hover={{ 
                      bg: getBackgroundColor(colorMode, 'secondary'),
                      transform: 'translateY(-1px)'
                    }}
                    color={getTextColor(colorMode, 'primary')}
                    border="1px solid"
                    borderColor={getBorderColor(colorMode, 'default')}
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
                    bg={getBackgroundColor(colorMode, 'primary')}
                    _hover={{ 
                      bg: getBackgroundColor(colorMode, 'secondary'),
                      transform: 'translateY(-1px)'
                    }}
                    color={getTextColor(colorMode, 'primary')}
                    border="1px solid"
                    borderColor={getBorderColor(colorMode, 'default')}
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
              color={getTextColor(colorMode, 'tertiary')}
              mt={2}
              fontWeight="500"
            >
              Need an account? Contact an administrator
            </Text>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

