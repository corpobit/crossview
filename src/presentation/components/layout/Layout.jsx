import { Box } from '@chakra-ui/react';
import { useState } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';
import { useAppContext } from '../../providers/AppProvider.jsx';
import { getBackgroundColor } from '../../utils/theme.js';

export const Layout = ({ children }) => {
  const { colorMode } = useAppContext();
  const [sidebarWidth, setSidebarWidth] = useState(280);

  const handleSidebarToggle = (collapsed, width) => {
    setSidebarWidth(width || (collapsed ? 60 : 280));
  };

  const handleSidebarResize = (newWidth) => {
    setSidebarWidth(newWidth);
  };

  const bgColor = getBackgroundColor(colorMode, 'html');

  return (
    <Box minH="100vh" bg={bgColor}>
      <Sidebar onToggle={handleSidebarToggle} onResize={handleSidebarResize} />
      <Box 
        ml={`${sidebarWidth}px`} 
        transition="margin-left 0.2s"
      >
        <Header sidebarWidth={sidebarWidth} />
        <Box pt="64px" px={6} pb={0} mb={0} bg={bgColor} minH="calc(100vh - 64px)">
          <Box pt={6} pb={0} mb={0}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

