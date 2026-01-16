import {
  Box,
  Text,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiAlertCircle } from 'react-icons/fi';
import { getBorderColor, getBackgroundColor, getTextColor } from '../../utils/theme.js';
import { useAppContext } from '../../providers/AppProvider.jsx';

export const Dropdown = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select...',
  minW = '200px',
  ...props 
}) => {
  const { colorMode } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedLabel = options.find(opt => opt.value === value)?.label || value || placeholder;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const bgColor = getBackgroundColor(colorMode, 'header');
  const borderColor = getBorderColor(colorMode);
  const strongBorderColor = getBorderColor(colorMode, 'strong');
  const hoverBgColor = getBackgroundColor(colorMode, 'primary');
  const textColor = getTextColor(colorMode, value ? 'primary' : 'tertiary');
  const secondaryTextColor = getTextColor(colorMode, 'secondary');
  const selectedTextColor = getTextColor(colorMode, 'primary');

  return (
    <Box minW={minW} position="relative" ref={dropdownRef} {...props}>
      <Box
        as="button"
        w="100%"
        px={3}
        py={2.5}
        borderRadius="md"
        fontSize="sm"
        fontWeight="normal"
        onClick={() => setIsOpen(!isOpen)}
        cursor="pointer"
        textAlign="left"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        overflow="hidden"
        transition="all 0.2s"
        css={{
          backgroundColor: `${bgColor} !important`,
          border: `1px solid ${borderColor} !important`,
          color: `${textColor} !important`,
          '&:hover': {
            borderColor: `${strongBorderColor} !important`,
          },
        }}
      >
        <HStack spacing={2} flex={1} minW={0}>
          {(() => {
            const selectedOption = options.find(opt => opt.value === value);
            if (selectedOption?.hasError) {
              return (
                <Icon as={FiAlertCircle} color="red.500" boxSize={4} flexShrink={0} />
              );
            }
            return null;
          })()}
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
        </HStack>
        <Box
          ml={2}
          flexShrink={0}
          transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
          css={{
            color: `${secondaryTextColor} !important`,
          }}
        >
          <FiChevronDown size={16} />
        </Box>
      </Box>

      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          mt={1}
          borderRadius="md"
          w="100%"
          maxH="300px"
          overflowY="auto"
          zIndex={999}
          css={{
            backgroundColor: `${bgColor} !important`,
            border: `1px solid ${borderColor} !important`,
          }}
        >
          {options.map((option, index) => {
            const isSelected = value === option.value;
            return (
              <Box
                key={option.value || index}
                as="button"
                w="100%"
                px={3}
                py={2.5}
                textAlign="left"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                transition="background-color 0.15s"
                css={{
                  backgroundColor: isSelected ? `${hoverBgColor} !important` : 'transparent !important',
                  borderBottom: index < options.length - 1 ? `1px solid ${borderColor} !important` : 'none',
                  '&:hover': {
                    backgroundColor: `${hoverBgColor} !important`,
                  },
                }}
              >
                <HStack spacing={2} w="100%" minW={0}>
                  {option.hasError && (
                    <Icon as={FiAlertCircle} color="red.500" boxSize={4} flexShrink={0} />
                  )}
                <Text
                  fontSize="sm"
                  fontWeight={isSelected ? 'medium' : 'normal'}
                  isTruncated
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                    flex={1}
                  minW={0}
                  css={{
                    color: isSelected ? `${selectedTextColor} !important` : `${secondaryTextColor} !important`,
                  }}
                >
                  {option.label}
                </Text>
                </HStack>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

