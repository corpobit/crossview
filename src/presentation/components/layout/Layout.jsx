import { Box, Text, HStack, Icon } from '@chakra-ui/react';
import { FiAlertCircle } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { ContextSidebar } from './ContextSidebar.jsx';
import { Header } from './Header.jsx';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { getBackgroundColor } from '../../utils/theme.js';

export const Layout = ({ children }) => {
  const { colorMode, selectedContextError, selectedContext, isInClusterMode } = useAppContext();
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [contextSidebarWidth, setContextSidebarWidth] = useState(60);
  const [showContextSidebar, setShowContextSidebar] = useState(() => {
    if (isInClusterMode) return false;
    const saved = localStorage.getItem('contextSidebarCollapsed');
    return saved !== 'true';
  });

  const handleSidebarToggle = (collapsed, width) => {
    setSidebarWidth(width || (collapsed ? 60 : 280));
  };

  const handleSidebarResize = (newWidth) => {
    setSidebarWidth(newWidth);
  };

  useEffect(() => {
    if (isInClusterMode) {
      setContextSidebarWidth(0);
      setShowContextSidebar(false);
      return;
    }
    const updateContextSidebarWidth = () => {
      const saved = localStorage.getItem('contextSidebarCollapsed');
      const isCollapsed = saved === 'true';
      setContextSidebarWidth(isCollapsed ? 0 : 60);
      setShowContextSidebar(!isCollapsed);
    };
    updateContextSidebarWidth();
    const handleWidthChange = () => {
      updateContextSidebarWidth();
    };
    window.addEventListener('contextSidebarWidthChanged', handleWidthChange);
    return () => window.removeEventListener('contextSidebarWidthChanged', handleWidthChange);
  }, [isInClusterMode]);

  const bgColor = getBackgroundColor(colorMode, 'html');
  const totalLeftWidth = sidebarWidth + contextSidebarWidth;

  return (
    <Box minH="100vh" bg={bgColor}>
      {showContextSidebar && <ContextSidebar />}
      <Sidebar onToggle={handleSidebarToggle} onResize={handleSidebarResize} />
      <Box 
        ml={`${totalLeftWidth}px`} 
        transition="margin-left 0.2s"
      >
        <Header sidebarWidth={totalLeftWidth} />
        <Box pt="64px" px={6} pb={0} mb={0} bg={bgColor} minH="calc(100vh - 64px)">
          {selectedContextError && selectedContext && (
            <Box pt={6} pb={4}>
              <Box
                p={4}
                borderRadius="md"
                bg="red.50"
                _dark={{ bg: 'red.900', borderColor: 'red.700' }}
                border="1px solid"
                borderColor="red.200"
              >
                <HStack spacing={3} align="flex-start">
                  <Icon as={FiAlertCircle} boxSize={5} color="red.500" flexShrink={0} mt={0.5} />
                  <Box flex={1}>
                    <Text fontSize="md" fontWeight="semibold" color="red.800" _dark={{ color: 'red.200' }} mb={1}>
                      Context Connection Error
                    </Text>
                    <Text fontSize="sm" color="red.700" _dark={{ color: 'red.300' }}>
                      {selectedContextError}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            </Box>
          )}
          <Box pt={selectedContextError && selectedContext ? 0 : 6} pb={0} mb={0}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

