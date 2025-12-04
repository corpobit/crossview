import {
  Box,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { getBorderColor } from '../../utils/theme.js';

export const Dropdown = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select...',
  minW = '200px',
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = options.find(opt => opt.value === value)?.label || value || placeholder;

  return (
    <Box minW={minW} position="relative" {...props}>
      <Box
        as="button"
        w="100%"
        px={3}
        py={2}
        borderRadius="md"
        bg="gray.50"
        _dark={{ bg: 'gray.800', color: 'gray.300' }}
        border="1px solid"
        fontSize="sm"
        fontWeight="medium"
        color="gray.700"
        onClick={() => setIsOpen(!isOpen)}
        _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
        cursor="pointer"
        textAlign="left"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        overflow="hidden"
        css={{
          borderColor: `${getBorderColor('light')} !important`,
          '.dark &': {
            borderColor: `${getBorderColor('dark')} !important`,
          }
        }}
      >
        <Text 
          isTruncated 
          flex={1}
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
          minW={0}
        >
          {selectedLabel}
        </Text>
        <Text fontSize="xs" ml={2} flexShrink={0}>▼</Text>
      </Box>

      {isOpen && (
        <>
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            onClick={() => setIsOpen(false)}
            zIndex={998}
          />
          <Box
            position="absolute"
            top="100%"
            left={0}
            mt={2}
            bg="white"
            _dark={{ bg: 'gray.800' }}
            border="1px solid"
            borderRadius="md"
            boxShadow="lg"
            w="100%"
            maxH="300px"
            overflowY="auto"
            zIndex={999}
            css={{
              borderColor: `${getBorderColor('light')} !important`,
              '.dark &': {
                borderColor: `${getBorderColor('dark')} !important`,
              }
            }}
          >
            {options.map((option, index) => {
              const isSelected = value === option.value;
              return (
                <Box
                  key={option.value || index}
                  as="button"
                  w="100%"
                  px={4}
                  py={2}
                  textAlign="left"
                  bg={isSelected ? 'blue.50' : 'transparent'}
                  _dark={{ bg: isSelected ? 'blue.900' : 'transparent' }}
                  _hover={{ 
                    bg: isSelected ? 'blue.100' : 'gray.100', 
                    _dark: { bg: isSelected ? 'blue.800' : 'gray.700' } 
                  }}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  borderBottom={index < options.length - 1 ? '1px solid' : 'none'}
                  css={{
                    borderColor: `${getBorderColor('light')} !important`,
                    '.dark &': {
                      borderColor: `${getBorderColor('dark')} !important`,
                    },
                    '.dark &': {
                      backgroundColor: isSelected ? 'var(--chakra-colors-blue-900)' : 'transparent',
                    },
                    '.dark &:hover': {
                      backgroundColor: isSelected ? 'var(--chakra-colors-blue-800)' : 'var(--chakra-colors-gray-700)',
                    }
                  }}
                >
                  <Text
                    fontSize="sm"
                    fontWeight={isSelected ? 'semibold' : 'normal'}
                    color={isSelected ? 'blue.700' : 'gray.700'}
                    _dark={{ color: isSelected ? 'blue.200' : 'gray.300' }}
                    isTruncated
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    w="100%"
                    minW={0}
                  >
                    {option.label}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
};

