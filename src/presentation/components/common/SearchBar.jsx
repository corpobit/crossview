import {
  Box,
  HStack,
} from '@chakra-ui/react';
import { FiSearch, FiX } from 'react-icons/fi';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

export const SearchBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isOnSearchPage = location.pathname === '/search';
  const hasQuery = searchParams.get('q');

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          navigate('/search');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const handleSearchClick = () => {
    if (isOnSearchPage && hasQuery) {
      const newParams = new URLSearchParams();
      navigate(`/search?${newParams.toString()}`, { replace: true });
    } else if (!isOnSearchPage) {
      navigate('/search');
    }
  };

  const handleCloseClick = () => {
    if (isOnSearchPage && hasQuery) {
      navigate('/');
    } else if (isOnSearchPage) {
      navigate(-1);
    }
  };

  if (isOnSearchPage && hasQuery) {
    return (
      <HStack spacing={2}>
        <Box
          as="button"
          onClick={handleSearchClick}
          p={2}
          borderRadius="md"
          bg="transparent"
          color="stone.700"
          _dark={{ color: 'stone.300' }}
          _hover={{ bg: 'stone.100', _dark: { bg: 'stone.700' } }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          aria-label="Back to search"
          transition="all 0.2s"
        >
          <FiSearch size={20} />
        </Box>
        <Box
          as="button"
          onClick={handleCloseClick}
          p={2}
          borderRadius="md"
          bg="transparent"
          color="stone.700"
          _dark={{ color: 'stone.300' }}
          _hover={{ bg: 'stone.100', _dark: { bg: 'stone.700' } }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          aria-label="Close search"
          transition="all 0.2s"
        >
          <FiX size={20} />
        </Box>
      </HStack>
    );
  }

  return (
    <Box
      as="button"
      onClick={isOnSearchPage ? handleCloseClick : handleSearchClick}
      p={2}
      borderRadius="md"
      bg="transparent"
      color="stone.700"
      _dark={{ color: 'stone.300' }}
      _hover={{ bg: 'stone.100', _dark: { bg: 'stone.700' } }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      aria-label={isOnSearchPage ? 'Close search' : 'Search'}
      transition="all 0.2s"
    >
      {isOnSearchPage ? <FiX size={20} /> : <FiSearch size={20} />}
    </Box>
  );
};

