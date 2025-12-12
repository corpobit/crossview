import { Box, Button, Text } from '@chakra-ui/react';
import { useState, useMemo } from 'react';
import { FiCopy } from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { jsonToYaml } from './resourceUtils.js';
import { colors, getBackgroundColor, getBorderColor, getTextColor } from '../../utils/theme.js';

// Create theme objects once - memoized outside component
const createLightTheme = () => ({
  ...oneLight,
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: colors.code.light.background,
    backgroundColor: colors.code.light.background,
    color: colors.code.light.text,
  },
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: colors.code.light.background,
    backgroundColor: colors.code.light.background,
    color: colors.code.light.text,
  },
  'pre': {
    background: colors.code.light.background,
    backgroundColor: colors.code.light.background,
  },
  'code': {
    background: colors.code.light.background,
    backgroundColor: colors.code.light.background,
  },
});

const createDarkTheme = () => ({
  ...oneDark,
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: colors.background.dark.dropdown,
    backgroundColor: colors.background.dark.dropdown,
    color: colors.code.dark.text,
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: colors.background.dark.dropdown,
    backgroundColor: colors.background.dark.dropdown,
    color: colors.code.dark.text,
  },
  'pre': {
    background: colors.background.dark.dropdown,
    backgroundColor: colors.background.dark.dropdown,
  },
  'code': {
    background: colors.background.dark.dropdown,
    backgroundColor: colors.background.dark.dropdown,
  },
});

// Create themes once and reuse
const customLightTheme = createLightTheme();
const stoneDarkTheme = createDarkTheme();

export const ResourceYAML = ({ fullResource, colorMode }) => {
  const [copied, setCopied] = useState(false);

  // Memoize YAML conversion - only recalculate when fullResource changes
  const yamlContent = useMemo(() => {
    if (!fullResource) return '';
    try {
      return jsonToYaml(fullResource);
    } catch (error) {
      console.error('Error converting to YAML:', error);
      return '';
    }
  }, [fullResource]);

  return (
    <Box
      p={4}
      h="100%"
      flex={1}
      overflow="auto"
    >
      <Box
        borderRadius="md"
        overflow="hidden"
        border="1px solid"
        position="relative"
        css={{
          borderColor: getBorderColor('light'),
          backgroundColor: getBackgroundColor('light'),
          '.dark &': {
            borderColor: getBorderColor('dark'),
            backgroundColor: getBackgroundColor('dark'),
          }
        }}
      >
        <Button
          size="sm"
          variant="ghost"
          position="absolute"
          top={2}
          right={2}
          zIndex={10}
          onClick={async () => {
            try {
              // Use already computed yamlContent instead of recalculating
              await navigator.clipboard.writeText(yamlContent);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch (err) {
              console.error('Failed to copy:', err);
            }
          }}
          aria-label="Copy YAML"
          minW="auto"
          h="32px"
          px={2}
          bg={colorMode === 'dark' ? colors.code.dark.buttonBg : colors.code.light.buttonBg}
          _hover={{
            bg: colorMode === 'dark' ? colors.code.dark.buttonBgHover : colors.code.light.buttonBgHover,
          }}
          color={getTextColor(colorMode, colorMode === 'dark' ? 'secondary' : 'inverse')}
        >
          {copied ? (
            <Text fontSize="xs" mr={1}>Copied!</Text>
          ) : (
            <FiCopy size={16} />
          )}
        </Button>
        <SyntaxHighlighter
          language="yaml"
          style={colorMode === 'dark' ? stoneDarkTheme : customLightTheme}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.75rem',
            lineHeight: '1.5',
            background: getBackgroundColor(colorMode, 'dropdown'),
            backgroundColor: getBackgroundColor(colorMode, 'dropdown'),
          }}
          showLineNumbers
          wrapLines
          PreTag="div"
        >
          {yamlContent}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
};

