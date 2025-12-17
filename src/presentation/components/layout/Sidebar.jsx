import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Image,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiLayout, FiSettings, FiLogOut, FiPackage, FiFileText, FiLayers, FiBox, FiBook, FiServer, FiUsers, FiSliders, FiGrid, FiDatabase } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { colors, getBorderColor, getTextColor } from '../../utils/theme.js';

export const Sidebar = ({ onToggle, onResize }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [compositeResourceKinds, setCompositeResourceKinds] = useState([]);
  const [loadingCompositeKinds, setLoadingCompositeKinds] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [contextSidebarWidth, setContextSidebarWidth] = useState(80);
  const sidebarRef = useRef(null);
  const cancelRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, kubernetesRepository, selectedContext, colorMode, selectedContextError, isInClusterMode } = useAppContext();

  useEffect(() => {
    if (isInClusterMode) {
      setContextSidebarWidth(0);
      return;
    }
    const updateContextSidebarWidth = () => {
      const saved = localStorage.getItem('contextSidebarCollapsed');
      setContextSidebarWidth(saved === 'true' ? 0 : 60);
    };
    updateContextSidebarWidth();
    const handleWidthChange = () => {
      updateContextSidebarWidth();
    };
    window.addEventListener('contextSidebarWidthChanged', handleWidthChange);
    return () => window.removeEventListener('contextSidebarWidthChanged', handleWidthChange);
  }, [isInClusterMode]);

  useEffect(() => {
    const currentWidth = isCollapsed ? 60 : width;
    if (onToggle) {
      onToggle(isCollapsed, currentWidth);
    }
    if (onResize) {
      onResize(currentWidth);
    }
  }, [isCollapsed, width, onToggle, onResize]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleLogout = async () => {
    try {
      setIsLogoutDialogOpen(false);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Fetch composite resource kinds dynamically (lightweight - only gets kinds from XRDs)
  useEffect(() => {
    let isMounted = true;
    const loadCompositeResourceKinds = async () => {
      if (!selectedContext || !kubernetesRepository) {
        if (isMounted) {
          setCompositeResourceKinds([]);
          setLoadingCompositeKinds(false);
        }
        return;
      }
      
      if (isMounted) {
        setLoadingCompositeKinds(true);
      }
      
      try {
        const contextName = typeof selectedContext === 'string' ? selectedContext : selectedContext.name || selectedContext;
        if (!contextName) {
          if (isMounted) {
            setCompositeResourceKinds([]);
            setLoadingCompositeKinds(false);
          }
          return;
        }
        
        // Use lightweight use case that only fetches XRDs and extracts kinds
        const { GetCompositeResourceKindsUseCase } = await import('../../../domain/usecases/GetCompositeResourceKindsUseCase.js');
        const useCase = new GetCompositeResourceKindsUseCase(kubernetesRepository);
        const kinds = await useCase.execute(contextName);
        
        if (isMounted) {
          setCompositeResourceKinds(Array.isArray(kinds) ? kinds : []);
          setLoadingCompositeKinds(false);
        }
      } catch (error) {
        // Silently fail - kinds will be empty, user can still navigate via the main page
        if (isMounted) {
          // Only log if it's not a network/API error (those are expected)
          if (!error.message || (!error.message.includes('500') && !error.message.includes('Failed to get'))) {
            console.warn('Failed to load composite resource kinds for sidebar:', error.message || error);
          }
          setCompositeResourceKinds([]);
          setLoadingCompositeKinds(false);
        }
      }
    };
    loadCompositeResourceKinds();
    return () => {
      isMounted = false;
    };
  }, [selectedContext, kubernetesRepository]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiLayout, path: '/' },
    // Core Crossplane Resources (building blocks)
    { id: 'providers', label: 'Providers', icon: FiPackage, path: '/providers', tooltip: 'Crossplane providers that extend Kubernetes capabilities' },
    { id: 'xrds', label: 'XRDs', icon: FiBook, path: '/xrds', tooltip: 'Composite Resource Definitions - define custom resource types' },
    { id: 'compositions', label: 'Compositions', icon: FiLayers, path: '/compositions', tooltip: 'Templates that define how to compose resources' },
    // Crossplane Instances (created resources)
    { 
      id: 'composite-resources', 
      label: 'Composite Resources', 
      icon: FiBox, 
      path: '/composite-resources',
      tooltip: 'Composite Resources (XRs) - instances created from Compositions',
      hasSubMenu: true,
      getSubMenuItems: () => compositeResourceKinds.map(kind => ({
        id: `composite-resource-${kind.toLowerCase()}`,
        label: kind,
        path: `/composite-resources/${kind}`
      }))
    },
    { id: 'claims', label: 'Claims', icon: FiFileText, path: '/claims', tooltip: 'User-facing abstractions that create Composite Resources' },
    { id: 'managed-resources', label: 'Managed Resources', icon: FiServer, path: '/managed-resources', tooltip: 'Kubernetes resources created and managed by Crossplane (Deployments, Services, etc.)' },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: FiSettings, 
      path: '/settings',
      hasSubMenu: true,
      subMenuItems: [
        { id: 'settings-appearance', label: 'Appearance', icon: FiSliders, path: '/settings/appearance' },
        { id: 'settings-users', label: 'User Management', icon: FiUsers, path: '/settings/user-management' },
        ...(isInClusterMode ? [] : [{ id: 'settings-contexts', label: 'Contexts', icon: FiDatabase, path: '/settings/context-management' }]),
      ]
    },
  ];

  // Auto-expand menu if a sub-menu item is active
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.hasSubMenu) {
        const subMenuItems = item.getSubMenuItems ? item.getSubMenuItems() : (item.subMenuItems || []);
        const hasActiveSub = subMenuItems.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
        if (hasActiveSub) {
          setExpandedMenus(prev => ({
            ...prev,
            [item.id]: true
          }));
        }
      }
    });
  }, [location.pathname, compositeResourceKinds]);

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const currentWidth = isCollapsed ? 60 : width;

  return (
    <Box
      ref={sidebarRef}
      as="aside"
      w={`${currentWidth}px`}
      h="100vh"
      bg="white"
      _dark={{ bg: 'gray.800' }}
      borderRight="1px solid"
      css={{
        borderColor: `${getBorderColor('light')} !important`,
        '.dark &': {
          borderColor: `${getBorderColor('dark')} !important`,
        }
      }}
      transition={isResizing ? 'none' : 'width 0.2s, left 0.2s'}
      position="fixed"
      left={`${isInClusterMode ? 0 : contextSidebarWidth}px`}
      top={0}
      zIndex={1000}
      display="flex"
      flexDirection="column"
    >
      {!isCollapsed && (
        <Box
          onMouseDown={handleMouseDown}
          cursor={isResizing ? 'col-resize' : 'ew-resize'}
          w="4px"
          h="100%"
          position="absolute"
          right={0}
          top={0}
          bg="transparent"
          _hover={{ bg: 'blue.200' }}
          zIndex={1001}
        />
      )}
      
      <VStack spacing={0} align="stretch" h="100%">
        <Box
          h="64px"
          p={isCollapsed ? 2 : 4}
          borderBottom="1px solid"
          css={{
            borderColor: `${getBorderColor('light')} !important`,
            '.dark &': {
              borderColor: `${getBorderColor('dark')} !important`,
            }
          }}
          display="flex"
          alignItems="center"
        >
          <HStack justify={isCollapsed ? 'center' : 'space-between'} w="100%" spacing={2}>
            {!isCollapsed && (
              <HStack spacing={3} align="center" flex={1}>
                <Image 
                  src="/images/cross-view-logo-sidebar.svg" 
                  alt="Crossview Logo" 
                  h="32px"
                  w="auto"
                  _dark={{ filter: 'brightness(0) invert(1)' }}
                />
                <Text fontSize="xl" fontWeight="bold" color="black" _dark={{ color: 'white' }}>
                Crossview
              </Text>
              </HStack>
            )}
            {!isCollapsed && !isInClusterMode && (
              <Box
                as="button"
                onClick={() => {
                  const saved = localStorage.getItem('contextSidebarCollapsed');
                  const newState = saved !== 'true';
                  localStorage.setItem('contextSidebarCollapsed', newState.toString());
                  window.dispatchEvent(new CustomEvent('contextSidebarWidthChanged'));
                }}
                p={2}
                borderRadius="md"
                bg="transparent"
                display="flex"
                alignItems="center"
                justifyContent="center"
                minW="40px"
                minH="40px"
                aria-label="Toggle context sidebar"
                transition="all 0.2s"
                color="gray.600"
                _dark={{ color: 'gray.300' }}
                _hover={{ 
                  bg: 'gray.100', 
                  _dark: { 
                    bg: 'gray.800',
                    color: 'gray.200'
                  },
                  color: 'gray.700'
                }}
                title="Toggle context sidebar"
              >
                <FiGrid size={18} />
              </Box>
            )}
            <Box
              as="button"
              onClick={toggleCollapse}
              p={2}
              borderRadius="md"
              bg="transparent"
              display="flex"
              alignItems="center"
              justifyContent="center"
              minW="40px"
              minH="40px"
              aria-label="Toggle sidebar"
              transition="all 0.2s"
              color="gray.600"
              _dark={{ color: 'gray.300' }}
              _hover={{ 
                bg: 'gray.100', 
                _dark: { 
                  bg: 'gray.800',
                  color: 'gray.200'
                },
                color: 'gray.700'
              }}
            >
              {isCollapsed ? (
                <FiChevronRight size={20} />
              ) : (
                <FiChevronLeft size={20} />
              )}
            </Box>
          </HStack>
        </Box>

        <Box flex={1} overflowY="auto" p={2}>
          {!isCollapsed && (
            <VStack spacing={1} align="stretch">
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" px={3} py={2}>
                MENU
              </Text>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const subMenuItems = item.getSubMenuItems ? item.getSubMenuItems() : (item.subMenuItems || []);
                const isActive = location.pathname === item.path || (item.hasSubMenu && subMenuItems.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/')));
                const isExpanded = expandedMenus[item.id] || false;
                const hasSubMenu = item.hasSubMenu && subMenuItems && subMenuItems.length > 0;
                const shouldHideSubMenu = selectedContextError && hasSubMenu;
                
                return (
                  <Box key={item.id}>
                    <Box
                      as="button"
                      w="100%"
                      px={3}
                      py={2}
                      borderRadius="md"
                      textAlign="left"
                      bg={isActive ? colors.sidebar.light.activeBg : 'transparent'}
                      _dark={{ bg: isActive ? 'gray.800' : 'transparent' }}
                      _hover={{ bg: isActive ? colors.sidebar.light.hoverBg : 'gray.100', _dark: { bg: isActive ? 'gray.800' : 'gray.800' } }}
                      onClick={() => {
                        if (hasSubMenu) {
                          toggleMenu(item.id);
                        } else {
                          navigate(item.path);
                        }
                      }}
                      transition="all 0.2s"
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <HStack spacing={3}>
                        <Icon 
                          size={18} 
                          style={{ 
                            color: isActive 
                              ? (colorMode === 'dark' ? colors.sidebar.dark.activeText : colors.sidebar.light.activeText)
                              : (colorMode === 'dark' ? colors.sidebar.dark.inactiveText : colors.sidebar.light.inactiveText)
                          }} 
                        />
                        <Text
                          fontSize="sm"
                          fontWeight={isActive ? 'semibold' : 'normal'}
                          color={isActive ? colors.accent.blue.darker : 'gray.700'}
                          _dark={{ color: isActive ? colors.sidebar.dark.activeText : 'gray.300' }}
                        >
                          {item.label}
                        </Text>
                      </HStack>
                      {hasSubMenu && !shouldHideSubMenu && (
                        isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />
                      )}
                    </Box>
                    {hasSubMenu && isExpanded && !shouldHideSubMenu && (
                      <VStack spacing={0} align="stretch" pl={8} mt={1}>
                        {item.id === 'composite-resources' && loadingCompositeKinds ? (
                          <Box px={3} py={2} display="flex" alignItems="center" gap={2}>
                            <Box
                              w="12px"
                              h="12px"
                              border="2px solid"
                              borderColor="gray.300"
                              borderTopColor="blue.500"
                              borderRadius="50%"
                              style={{
                                animation: 'spin 1s linear infinite',
                              }}
                            />
                            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
                              Loading...
                            </Text>
                          </Box>
                        ) : subMenuItems.length === 0 ? (
                          <Box px={3} py={2}>
                            <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }}>
                              No items
                            </Text>
                          </Box>
                        ) : (
                          subMenuItems.map((subItem) => {
                            const isSubActive = location.pathname === subItem.path || location.pathname.startsWith(subItem.path + '/');
                            return (
                              <Box
                                key={subItem.id}
                                as="button"
                                w="100%"
                                px={3}
                                py={2}
                                borderRadius="md"
                                textAlign="left"
                                bg={isSubActive ? colors.sidebar.light.activeBg : 'transparent'}
                                _dark={{ bg: isSubActive ? 'gray.800' : 'transparent' }}
                                _hover={{ bg: isSubActive ? colors.sidebar.light.hoverBg : 'gray.100', _dark: { bg: isSubActive ? 'gray.800' : 'gray.800' } }}
                                onClick={() => navigate(subItem.path)}
                                transition="all 0.2s"
                              >
                                <Text
                                  fontSize="sm"
                                  fontWeight={isSubActive ? 'semibold' : 'normal'}
                                  color={isSubActive ? colors.accent.blue.darker : 'gray.600'}
                                  _dark={{ color: isSubActive ? colors.sidebar.dark.activeText : 'gray.400' }}
                                >
                                  {subItem.label}
                                </Text>
                              </Box>
                            );
                          })
                        )}
                      </VStack>
                    )}
                  </Box>
                );
              })}
            </VStack>
          )}
          {isCollapsed && (
            <VStack spacing={2} align="center" pt={2}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Box
                    key={item.id}
                    as="button"
                    onClick={() => navigate(item.path)}
                    w="44px"
                    h="44px"
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg={isActive ? colors.sidebar.light.hoverBg : 'transparent'}
                    _dark={{ bg: isActive ? 'gray.800' : 'transparent' }}
                    _hover={{ bg: isActive ? 'blue.200' : 'gray.100', _dark: { bg: isActive ? 'gray.800' : 'gray.700' } }}
                    aria-label={item.label}
                    transition="all 0.2s"
                  >
                    <Icon 
                      size={20} 
                      style={{ 
                        color: isActive 
                          ? (colorMode === 'dark' ? colors.sidebar.dark.activeText : colors.sidebar.light.activeText)
                          : (colorMode === 'dark' ? colors.sidebar.dark.inactiveText : colors.sidebar.light.inactiveText)
                      }} 
                    />
                  </Box>
                );
              })}
            </VStack>
          )}
        </Box>

        <Box
          p={isCollapsed ? 2 : 4}
          borderTop="1px solid"
          css={{
            borderColor: `${getBorderColor('light')} !important`,
            '.dark &': {
              borderColor: `${getBorderColor('dark')} !important`,
            }
          }}
        >
          {!isCollapsed && user && (
            <VStack spacing={2} align="stretch">
              <Box
                px={3}
                py={2}
                borderRadius="md"
                bg="gray.50"
                _dark={{ bg: 'gray.800' }}
              >
                <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }} mb={1}>
                  Logged in as
                </Text>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" _dark={{ color: 'gray.300' }}>
                  {user.username}
                </Text>
              </Box>
              <Box
                as="button"
                w="100%"
                px={3}
                py={2}
                borderRadius="md"
                textAlign="left"
                bg="transparent"
                _hover={{ bg: 'red.50', _dark: { bg: 'red.900' } }}
                onClick={() => setIsLogoutDialogOpen(true)}
                transition="all 0.2s"
              >
                <HStack spacing={3}>
                  <FiLogOut size={18} color={colors.accent.red.primary} />
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="red.600"
                    _dark={{ color: 'red.400' }}
                  >
                    Logout
                  </Text>
                </HStack>
              </Box>
            </VStack>
          )}
          {isCollapsed && user && (
            <VStack spacing={2} align="center">
              <Box
                as="button"
                onClick={() => setIsLogoutDialogOpen(true)}
                w="44px"
                h="44px"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="transparent"
                _hover={{ bg: 'red.50', _dark: { bg: 'red.900' } }}
                aria-label="Logout"
                transition="all 0.2s"
              >
                <FiLogOut size={20} style={{ color: colors.accent.red.primary }} />
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>

      {isLogoutDialogOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setIsLogoutDialogOpen(false)}
        >
          <Box
            p={6}
            maxW="400px"
            w="90%"
            bg="white"
            border="1px solid"
            borderRadius="md"
            borderColor="gray.200"
            _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
            boxShadow="xl"
            onClick={(e) => e.stopPropagation()}
            position="relative"
            zIndex={1001}
          >
            <Text fontSize="lg" fontWeight="bold" mb={4}>
              Confirm Logout
            </Text>
            <Text mb={6} color="gray.600" _dark={{ color: 'gray.400' }}>
              Are you sure you want to logout? You will need to login again to access the application.
            </Text>
            <HStack justify="flex-end" spacing={3}>
              <Button ref={cancelRef} onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleLogout}>
                Logout
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};
