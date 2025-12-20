import { useEffect, useState } from 'react';
import { Box, Text, HStack } from '@chakra-ui/react';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import { getBackgroundColor, getBorderColor, getTextColor } from '../../utils/theme.js';

export const NotificationToast = ({ message, resourceName, onClose, colorMode }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose();
      }, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = getBackgroundColor(colorMode, 'primary');
  const borderColor = getBorderColor(colorMode);
  const textColor = getTextColor(colorMode, 'primary');
  const secondaryTextColor = getTextColor(colorMode, 'secondary');

  return (
    <Box
      minW="320px"
      maxW="400px"
      p={4}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      bg={bgColor}
      boxShadow="xl"
      opacity={isVisible ? 1 : 0}
      transform={isVisible ? 'translateX(0)' : 'translateX(400px)'}
      transition="all 0.3s ease-in-out"
    >
      <HStack spacing={3} align="flex-start">
        <Box
          as={FiRefreshCw}
          size={20}
          style={{
            color: colorMode === 'dark' ? '#60a5fa' : '#3b82f6',
            flexShrink: 0,
            marginTop: '2px',
          }}
        />
        <Box flex={1}>
          <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={1}>
            {message}
          </Text>
          {resourceName && (
            <Text fontSize="xs" color={secondaryTextColor} noOfLines={1}>
              {resourceName}
            </Text>
          )}
        </Box>
        <Box
          as="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => {
              onClose();
            }, 300);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: secondaryTextColor,
          }}
          _hover={{ opacity: 0.7 }}
        >
          <FiX size={16} />
        </Box>
      </HStack>
    </Box>
  );
};

