import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { KubernetesApiRepository } from '../../data/repositories/KubernetesApiRepository.js';
import { GetDashboardDataUseCase } from '../../domain/usecases/GetDashboardDataUseCase.js';
import { GetKubernetesContextsUseCase } from '../../domain/usecases/GetKubernetesContextsUseCase.js';
import { AuthService } from '../../domain/services/AuthService.js';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';

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
  const [selectedContext, setSelectedContext] = useState(null);
  const [contexts, setContexts] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [colorMode, setColorMode] = useState(() => {
    const saved = localStorage.getItem('colorMode');
    return saved || 'light';
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authState = await authService.checkAuth();
        if (authState.authenticated) {
          setUser(authState.user);
        }
      } catch (error) {
        console.warn('Failed to check auth:', error.message);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

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

  const handleContextChange = async (contextName) => {
    try {
      await kubernetesRepository.setContext(contextName);
      setSelectedContext(contextName);
    } catch (error) {
      console.error('Failed to set context:', error);
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
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  const value = useMemo(() => ({
    kubernetesRepository,
    getDashboardDataUseCase,
    getKubernetesContextsUseCase,
    authService,
    selectedContext,
    contexts,
    setSelectedContext: handleContextChange,
    user,
    authChecked,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    colorMode,
    setColorMode: handleColorModeChange,
  }), [kubernetesRepository, getDashboardDataUseCase, getKubernetesContextsUseCase, authService, selectedContext, contexts, user, authChecked, colorMode]);

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

