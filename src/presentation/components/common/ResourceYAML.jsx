import { Box, Button, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { FiCopy } from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { jsonToYaml } from './resourceUtils.js';

// Custom light theme for YAML - white background
const customLightTheme = {
  ...oneLight,
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: '#ffffff',
    backgroundColor: '#ffffff',
    color: '#1a202c',
  },
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: '#ffffff',
    backgroundColor: '#ffffff',
    color: '#1a202c',
  },
  'pre': {
    background: '#ffffff',
    backgroundColor: '#ffffff',
  },
  'code': {
    background: '#ffffff',
    backgroundColor: '#ffffff',
  },
};

// Custom dark theme for YAML
const stoneDarkTheme = {
  ...oneDark,
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: '#27272A',
    backgroundColor: '#27272A',
    color: '#e2e8f0',
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#27272A',
    backgroundColor: '#27272A',
    color: '#e2e8f0',
  },
  'pre': {
    background: '#27272A',
    backgroundColor: '#27272A',
  },
  'code': {
    background: '#27272A',
    backgroundColor: '#27272A',
  },
};

export const ResourceYAML = ({ fullResource, colorMode }) => {
  const [copied, setCopied] = useState(false);

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
          borderColor: 'rgba(0, 0, 0, 0.08)',
          backgroundColor: '#ffffff',
          '.dark &': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backgroundColor: '#27272A',
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
              const yamlContent = jsonToYaml(fullResource);
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
          bg={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
          _hover={{
            bg: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          }}
          color={colorMode === 'dark' ? 'gray.300' : 'gray.700'}
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
            background: colorMode === 'dark' ? '#27272A' : '#ffffff',
            backgroundColor: colorMode === 'dark' ? '#27272A' : '#ffffff',
          }}
          showLineNumbers
          wrapLines
        >
          {jsonToYaml(fullResource)}
        </SyntaxHighlighter>
      </Box>
    </Box>
  );
};

