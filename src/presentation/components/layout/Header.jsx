import {
  Box,
  HStack,
  Text,
} from '@chakra-ui/react';
import { SearchBar } from '../common/SearchBar.jsx';

export const Header = ({ sidebarWidth }) => {
  return (
    <Box
      as="header"
      h="64px"
      bg="white"
      _dark={{ bg: 'gray.800' }}
      borderBottom="1px solid"
      css={{
        borderColor: 'rgba(0, 0, 0, 0.08) !important',
        '.dark &': {
          borderColor: 'rgba(255, 255, 255, 0.1) !important',
        }
      }}
      position="fixed"
      top={0}
      left={`${sidebarWidth}px`}
      right={0}
      zIndex={999}
      px={6}
      display="flex"
      alignItems="center"
      boxShadow="sm"
      transition="left 0.2s"
    >
      <HStack h="100%" justify="space-between" w="100%">
        <Text fontSize="lg" fontWeight="semibold" color="gray.800" _dark={{ color: 'gray.100' }}>
          Crossplane Dashboard
        </Text>
        <SearchBar />
      </HStack>
    </Box>
  );
};
