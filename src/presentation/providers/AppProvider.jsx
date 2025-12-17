import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { KubernetesApiRepository } from '../../data/repositories/KubernetesApiRepository.js';
import { GetDashboardDataUseCase } from '../../domain/usecases/GetDashboardDataUseCase.js';
import { GetKubernetesContextsUseCase } from '../../domain/usecases/GetKubernetesContextsUseCase.js';
import { AuthService } from '../../domain/services/AuthService.js';
import { UserService } from '../../domain/services/UserService.js';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { colors } from '../utils/theme.js';

const AppContext = createContext(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const kubernetesRepository = useMemo(() => new KubernetesApiRepository(), []);
  const getDashboardDataUseCase = useMemo(() => new GetDashboardDataUseCase(kubernetesRepository), [kubernetesRepository]);
  const getKubernetesContextsUseCase = useMemo(() => new GetKubernetesContextsUseCase(kubernetesRepository), [kubernetesRepository]);
  const authService = useMemo(() => new AuthService(), []);
  const userService = useMemo(() => new UserService(), []);
  const [selectedContext, setSelectedContext] = useState(null);
  const [contexts, setContexts] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [contextErrors, setContextErrors] = useState({});
  const [colorMode, setColorMode] = useState(() => {
    const saved = localStorage.getItem('colorMode');
    return saved || 'light';
  });
  const [savedSearches, setSavedSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('savedSearches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isInClusterMode = useMemo(() => {
    if (contexts.length !== 1) return false;
    const contextName = typeof contexts[0] === 'string' ? contexts[0] : contexts[0]?.name || contexts[0];
    return contextName === 'in-cluster';
  }, [contexts]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setServerError(null);
        const authState = await authService.checkAuth();
        if (authState.authenticated) {
          setUser(authState.user);
        }
      } catch (error) {
        console.warn('Failed to check auth:', error);
        const errorMessage = (error.message || '').toLowerCase();
        const errorName = error.name || '';
        const originalError = error.originalError || error;
        
        const isAuthError = errorMessage.includes('401') || 
                           errorMessage.includes('403') || 
                           errorMessage.includes('unauthorized') || 
                           errorMessage.includes('forbidden');
        
        if (!isAuthError) {
          setServerError('Unable to connect to the server. Please ensure the server is running and accessible.');
        } else {
          setServerError(null);
        }
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [authService]);

  useEffect(() => {
    const loadContexts = async () => {
      if (!user) return;
      try {
        const contextsList = await getKubernetesContextsUseCase.execute();
        setContexts(contextsList);
        if (contextsList.length > 0 && !selectedContext) {
          const current = await kubernetesRepository.getCurrentContext();
          const contextToSet = current || (typeof contextsList[0] === 'string' ? contextsList[0] : contextsList[0].name || contextsList[0]);
          setSelectedContext(contextToSet);
        }
      } catch (error) {
        console.warn('Failed to load contexts:', error.message);
        setContexts([]);
      }
    };
    if (contexts.length === 0 && user) {
      loadContexts();
    }
  }, [user, selectedContext]);

  useEffect(() => {
    const handleContextsUpdated = async () => {
      if (!user) return;
      try {
        const contextsList = await getKubernetesContextsUseCase.execute();
        setContexts(contextsList);
      } catch (error) {
        console.warn('Failed to refresh contexts:', error.message);
      }
    };

    window.addEventListener('contextsUpdated', handleContextsUpdated);
    return () => {
      window.removeEventListener('contextsUpdated', handleContextsUpdated);
    };
  }, [user, getKubernetesContextsUseCase]);

  useEffect(() => {
    const checkContextConnection = async () => {
      if (!selectedContext || !user) return;
      
      const contextNameStr = typeof selectedContext === 'string' ? selectedContext : selectedContext?.name || selectedContext;
      if (!contextNameStr) return;
      
      try {
        const isConnected = await kubernetesRepository.isConnected(contextNameStr);
        
        if (!isConnected) {
          setContextErrors(prev => ({
            ...prev,
            [contextNameStr]: 'Unable to connect to the Kubernetes cluster. Please check your connection settings.'
          }));
        } else {
          setContextErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[contextNameStr];
            return newErrors;
          });
        }
      } catch (error) {
        setContextErrors(prev => ({
          ...prev,
          [contextNameStr]: error.message || 'Failed to connect to the Kubernetes cluster.'
        }));
      }
    };
    
    checkContextConnection();
  }, [selectedContext, user, kubernetesRepository]);

  const handleContextChange = async (contextName) => {
    try {
      await kubernetesRepository.setContext(contextName);
      setSelectedContext(contextName);
    } catch (error) {
      console.error('Failed to set context:', error);
      const contextNameStr = typeof contextName === 'string' ? contextName : contextName?.name || contextName;
      setContextErrors(prev => ({
        ...prev,
        [contextNameStr]: error.message || 'Failed to connect to the Kubernetes cluster.'
      }));
    }
  };

  const handleLogin = async (credentials) => {
    const result = await authService.login(credentials);
    setUser(result.user);
    return result;
  };

  const handleRegister = async (data) => {
    const result = await authService.register(data);
    setUser(result.user);
    return result;
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  const handleColorModeChange = (mode) => {
    setColorMode(mode);
    localStorage.setItem('colorMode', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    const bgColor = colors.background[colorMode].html;
    
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;
  }, [colorMode]);

  const handleSaveSearch = (searchQuery) => {
    const updated = [...savedSearches, { ...searchQuery, id: Date.now() }];
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  };

  const handleLoadSearch = (searchQuery) => {
  };

  const handleDeleteSearch = (searchId) => {
    const updated = savedSearches.filter(s => s.id !== searchId);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  };

  const value = useMemo(() => {
    const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext?.name || selectedContext;
    const selectedContextError = contextName ? contextErrors[contextName] : null;
    
    return {
    kubernetesRepository,
    getDashboardDataUseCase,
    getKubernetesContextsUseCase,
    authService,
    userService,
    selectedContext,
    contexts,
    setSelectedContext: handleContextChange,
    user,
    authChecked,
    serverError,
      contextErrors,
      selectedContextError,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    colorMode,
    setColorMode: handleColorModeChange,
    savedSearches,
    saveSearch: handleSaveSearch,
    loadSearch: handleLoadSearch,
    deleteSearch: handleDeleteSearch,
    isInClusterMode,
    };
  }, [kubernetesRepository, getDashboardDataUseCase, getKubernetesContextsUseCase, authService, userService, selectedContext, contexts, user, authChecked, serverError, contextErrors, colorMode, savedSearches, isInClusterMode]);

  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <AppContext.Provider value={value}>
          {children}
        </AppContext.Provider>
      </BrowserRouter>
    </ChakraProvider>
  );
};

