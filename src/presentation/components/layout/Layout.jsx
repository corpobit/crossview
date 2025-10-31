import { Box } from '@chakra-ui/react';
import { useState } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';

export const Layout = ({ children }) => {
  const [sidebarWidth, setSidebarWidth] = useState(280);

  const handleSidebarToggle = (collapsed, width) => {
    setSidebarWidth(width || (collapsed ? 60 : 280));
  };

  const handleSidebarResize = (newWidth) => {
    setSidebarWidth(newWidth);
  };

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }}>
      <Sidebar onToggle={handleSidebarToggle} onResize={handleSidebarResize} />
      <Box 
        ml={`${sidebarWidth}px`} 
        transition="margin-left 0.2s"
      >
        <Header sidebarWidth={sidebarWidth} />
        <Box pt="64px" p={6} bg="gray.50" _dark={{ bg: 'gray.900' }} minH="calc(100vh - 64px)">
          {children}
        </Box>
      </Box>
    </Box>
  );
};

