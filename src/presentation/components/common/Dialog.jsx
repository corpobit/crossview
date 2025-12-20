import { Box, HStack, Text, Portal } from '@chakra-ui/react';
import { getBorderColor, getBackgroundColor, getTextColor, colors } from '../../utils/theme.js';

export const Dialog = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmColorScheme = 'blue',
  colorMode,
  children,
  maxW = '400px',
  isConfirmDisabled = false,
}) => {
  if (!isOpen) return null;

  const bgColor = getBackgroundColor(colorMode, 'primary');
  const borderColor = getBorderColor(colorMode, 'default');
  const textColor = getTextColor(colorMode, 'primary');
  const secondaryTextColor = getTextColor(colorMode, 'secondary');
  const hoverBg = getBackgroundColor(colorMode, 'secondary');

  const getConfirmButtonBg = () => {
    if (confirmColorScheme === 'red') {
      return colorMode === 'dark' ? 'red.500' : 'red.600';
    }
    return colorMode === 'dark' ? 'blue.500' : 'blue.600';
  };

  const getConfirmButtonHoverBg = () => {
    if (confirmColorScheme === 'red') {
      return colorMode === 'dark' ? 'red.600' : 'red.700';
    }
    return colorMode === 'dark' ? 'blue.600' : 'blue.700';
  };

  return (
    <Portal>
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={20000}
        onClick={onClose}
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          backdropFilter="blur(8px)"
        />
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          p={6}
          maxW={maxW}
          w="90%"
          bg={bgColor}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
          boxShadow={colorMode === 'dark' 
            ? `0 20px 60px ${colors.shadow.dark}, 0 0 0 1px ${borderColor}`
            : `0 20px 60px ${colors.shadow.light}, 0 0 0 1px ${borderColor}`
          }
          css={{
            transition: 'all 0.3s ease',
            filter: 'none',
            backdropFilter: 'none',
            isolation: 'isolate',
          }}
          onClick={(e) => e.stopPropagation()}
          zIndex={20001}
        >
          {title && (
            <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
              {title}
            </Text>
          )}
          
          {message && (
            <Text mb={6} color={secondaryTextColor}>
              {message}
            </Text>
          )}

          {children}

          {(onConfirm || onClose) && (
            <HStack justify="flex-end" spacing={3} mt={children ? 4 : 0}>
              {onClose && (
                <Box
                  as="button"
                  px={4}
                  py={2}
                  borderRadius="md"
                  bg="transparent"
                  border="1px solid"
                  borderColor={borderColor}
                  color={textColor}
                  _hover={{ bg: hoverBg }}
                  onClick={onClose}
                  transition="background-color 0.15s"
                >
                  <Text fontSize="sm" fontWeight="medium">{cancelLabel}</Text>
                </Box>
              )}
              {onConfirm && (
                <Box
                  as="button"
                  px={4}
                  py={2}
                  borderRadius="md"
                  bg={getConfirmButtonBg()}
                  color="white"
                  _hover={{ bg: isConfirmDisabled ? getConfirmButtonBg() : getConfirmButtonHoverBg() }}
                  onClick={onConfirm}
                  transition="background-color 0.15s"
                  opacity={isConfirmDisabled ? 0.5 : 1}
                  cursor={isConfirmDisabled ? 'not-allowed' : 'pointer'}
                  disabled={isConfirmDisabled}
                >
                  <Text fontSize="sm" fontWeight="medium">{confirmLabel}</Text>
                </Box>
              )}
            </HStack>
          )}
        </Box>
      </Box>
    </Portal>
  );
};

