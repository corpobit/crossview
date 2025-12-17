import {
  Box,
  Text,
  HStack,
  Button,
} from '@chakra-ui/react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { UserManagement } from './UserManagement.jsx';
import { Appearance } from './Appearance.jsx';
import { ContextManagement } from './ContextManagement.jsx';
import { useAppContext } from '../providers/AppProvider.jsx';

export const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isInClusterMode } = useAppContext();

  const isUserManagement = location.pathname.includes('/user-management');
  const isAppearance = location.pathname.includes('/appearance');
  const isContextManagement = location.pathname.includes('/context-management');

  useEffect(() => {
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      navigate('/settings/appearance', { replace: true });
    } else if (isInClusterMode && location.pathname === '/settings/context-management') {
      navigate('/settings/appearance', { replace: true });
    }
  }, [location.pathname, navigate, isInClusterMode]);

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={6}>
        Settings
      </Text>

      <HStack spacing={4} mb={6} borderBottom="1px solid" borderColor="gray.200" _dark={{ borderColor: 'gray.700' }} pb={4}>
        <Button
          variant={isAppearance ? 'solid' : 'ghost'}
          onClick={() => navigate('/settings/appearance')}
          size="sm"
          bg={isAppearance ? 'gray.900' : 'transparent'}
          _dark={{ bg: isAppearance ? 'white' : 'transparent', color: isAppearance ? 'gray.900' : 'gray.300' }}
          color={isAppearance ? 'white' : 'gray.700'}
          _hover={{ bg: isAppearance ? 'gray.800' : 'gray.100', _dark: { bg: isAppearance ? 'gray.100' : 'gray.700' } }}
        >
          Appearance
        </Button>
        <Button
          variant={isUserManagement ? 'solid' : 'ghost'}
          onClick={() => navigate('/settings/user-management')}
          size="sm"
          bg={isUserManagement ? 'gray.900' : 'transparent'}
          _dark={{ bg: isUserManagement ? 'white' : 'transparent', color: isUserManagement ? 'gray.900' : 'gray.300' }}
          color={isUserManagement ? 'white' : 'gray.700'}
          _hover={{ bg: isUserManagement ? 'gray.800' : 'gray.100', _dark: { bg: isUserManagement ? 'gray.100' : 'gray.700' } }}
        >
          User Management
        </Button>
        {!isInClusterMode && (
          <Button
            variant={isContextManagement ? 'solid' : 'ghost'}
            onClick={() => navigate('/settings/context-management')}
            size="sm"
            bg={isContextManagement ? 'gray.900' : 'transparent'}
            _dark={{ bg: isContextManagement ? 'white' : 'transparent', color: isContextManagement ? 'gray.900' : 'gray.300' }}
            color={isContextManagement ? 'white' : 'gray.700'}
            _hover={{ bg: isContextManagement ? 'gray.800' : 'gray.100', _dark: { bg: isContextManagement ? 'gray.100' : 'gray.700' } }}
          >
            Contexts
          </Button>
        )}
            </HStack>

      <Routes>
        <Route path="appearance" element={<Appearance />} />
        <Route path="user-management" element={<UserManagement />} />
        <Route path="context-management" element={<ContextManagement />} />
        <Route path="*" element={<Appearance />} />
      </Routes>
    </Box>
  );
};
