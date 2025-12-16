import {
  Box,
  HStack,
  Text,
} from '@chakra-ui/react';
import { SearchBar } from '../common/SearchBar.jsx';
import { getBorderColor } from '../../utils/theme.js';

export const Header = ({ sidebarWidth }) => {
  return (
    <Box
      as="header"
      h="64px"
      bg="white"
      _dark={{ bg: 'gray.800' }}
      borderBottom="1px solid"
      css={{
        borderColor: `${getBorderColor('light')} !important`,
        '.dark &': {
          borderColor: `${getBorderColor('dark')} !important`,
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
