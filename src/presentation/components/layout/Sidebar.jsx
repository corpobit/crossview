import {
  Box,
  VStack,
  HStack,
  IconButton,
  Text,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiLayout, FiSettings, FiLogOut, FiPackage, FiFileText, FiDatabase, FiLayers, FiBox, FiBook } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { ContextSelector } from './ContextSelector.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../providers/AppProvider.jsx';

export const Sidebar = ({ onToggle, onResize }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [compositeResourceKinds, setCompositeResourceKinds] = useState([]);
  const [loadingCompositeKinds, setLoadingCompositeKinds] = useState(false);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, kubernetesRepository, selectedContext, colorMode } = useAppContext();

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
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const resourceKinds = ['Composition', 'CompositeResourceDefinition'];

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
    { id: 'providers', label: 'Providers', icon: FiPackage, path: '/providers' },
    { id: 'compositions', label: 'Compositions', icon: FiLayers, path: '/compositions' },
    { id: 'xrds', label: 'XRDs', icon: FiBook, path: '/xrds' },
    { 
      id: 'composite-resources', 
      label: 'Composite Resources', 
      icon: FiBox, 
      path: '/composite-resources',
      hasSubMenu: true,
      getSubMenuItems: () => compositeResourceKinds.map(kind => ({
        id: `composite-resource-${kind.toLowerCase()}`,
        label: kind,
        path: `/composite-resources/${kind}`
      }))
    },
    { id: 'claims', label: 'Claims', icon: FiFileText, path: '/claims' },
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: FiDatabase, 
      path: '/resources',
      hasSubMenu: true,
      subMenuItems: resourceKinds.map(kind => ({
        id: `resource-${kind.toLowerCase()}`,
        label: kind,
        path: `/resources/${kind}`
      }))
    },
    { id: 'settings', label: 'Settings', icon: FiSettings, path: '/settings' },
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
      _dark={{ bg: 'gray.900' }}
      borderRight="1px solid"
      css={{
        borderColor: 'rgba(0, 0, 0, 0.08) !important',
        '.dark &': {
          borderColor: 'rgba(255, 255, 255, 0.1) !important',
        }
      }}
      transition={isResizing ? 'none' : 'width 0.2s'}
      position="fixed"
      left={0}
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
          p={isCollapsed ? 2 : 4}
          borderBottom="1px solid"
          css={{
            borderColor: 'rgba(0, 0, 0, 0.08) !important',
            '.dark &': {
              borderColor: 'rgba(255, 255, 255, 0.1) !important',
            }
          }}
        >
          <HStack justify={isCollapsed ? 'center' : 'space-between'} mb={isCollapsed ? 0 : 4}>
            {!isCollapsed && (
              <Text fontSize="xl" fontWeight="bold" color="blue.600" _dark={{ color: 'blue.400' }}>
                Crossview
              </Text>
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
          {!isCollapsed && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={2} px={2}>
                CONTEXT
              </Text>
              <ContextSelector />
            </Box>
          )}
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
                
                return (
                  <Box key={item.id}>
                    <Box
                      as="button"
                      w="100%"
                      px={3}
                      py={2}
                      borderRadius="md"
                      textAlign="left"
                      bg={isActive ? 'blue.50' : 'transparent'}
                      _dark={{ bg: isActive ? '#27272A' : 'transparent' }}
                      _hover={{ bg: isActive ? 'blue.100' : 'gray.100', _dark: { bg: isActive ? '#3f3f46' : 'gray.800' } }}
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
                              ? (colorMode === 'dark' ? '#e4e4e7' : '#2563eb')
                              : (colorMode === 'dark' ? '#d1d5db' : '#6b7280')
                          }} 
                        />
                        <Text
                          fontSize="sm"
                          fontWeight={isActive ? 'semibold' : 'normal'}
                          color={isActive ? 'blue.700' : 'gray.700'}
                          _dark={{ color: isActive ? '#e4e4e7' : 'gray.300' }}
                        >
                          {item.label}
                        </Text>
                      </HStack>
                      {hasSubMenu && (
                        isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />
                      )}
                    </Box>
                    {hasSubMenu && isExpanded && (
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
                                bg={isSubActive ? 'blue.50' : 'transparent'}
                                _dark={{ bg: isSubActive ? '#27272A' : 'transparent' }}
                                _hover={{ bg: isSubActive ? 'blue.100' : 'gray.100', _dark: { bg: isSubActive ? '#3f3f46' : 'gray.800' } }}
                                onClick={() => navigate(subItem.path)}
                                transition="all 0.2s"
                              >
                                <Text
                                  fontSize="sm"
                                  fontWeight={isSubActive ? 'semibold' : 'normal'}
                                  color={isSubActive ? 'blue.700' : 'gray.600'}
                                  _dark={{ color: isSubActive ? '#e4e4e7' : 'gray.400' }}
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
                    bg={isActive ? 'blue.100' : 'transparent'}
                    _dark={{ bg: isActive ? '#27272A' : 'transparent' }}
                    _hover={{ bg: isActive ? 'blue.200' : 'gray.100', _dark: { bg: isActive ? '#3f3f46' : 'gray.700' } }}
                    aria-label={item.label}
                    transition="all 0.2s"
                  >
                    <Icon 
                      size={20} 
                      style={{ 
                        color: isActive 
                          ? (colorMode === 'dark' ? '#e4e4e7' : '#2563eb')
                          : (colorMode === 'dark' ? '#d1d5db' : '#6b7280')
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
            borderColor: 'rgba(0, 0, 0, 0.08) !important',
            '.dark &': {
              borderColor: 'rgba(255, 255, 255, 0.1) !important',
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
                onClick={handleLogout}
                transition="all 0.2s"
              >
                <HStack spacing={3}>
                  <FiLogOut size={18} color="#ef4444" />
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
                onClick={handleLogout}
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
                <FiLogOut size={20} style={{ color: '#ef4444' }} />
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
};
