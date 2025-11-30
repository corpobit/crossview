import {
  Box,
  IconButton,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const SearchBar = () => {
  const navigate = useNavigate();

  // Keyboard shortcut: / to open search
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        // Don't navigate if user is typing in an input/textarea
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          navigate('/search');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const handleClick = () => {
    navigate('/search');
  };

  return (
    <Box
      as="button"
      onClick={handleClick}
      p={2}
      borderRadius="md"
      bg="transparent"
      color="gray.700"
      _dark={{ color: 'gray.300' }}
      _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      aria-label="Search"
      transition="all 0.2s"
    >
      <FiSearch size={20} />
    </Box>
  );
};

