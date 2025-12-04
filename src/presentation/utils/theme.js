/**
 * Centralized color theme for the application
 * All colors used throughout the app should reference this file
 */

export const colors = {
  // Background colors
  background: {
    light: {
      html: '#f9fafb',
      primary: '#ffffff',
      secondary: 'gray.50',
      tertiary: 'gray.100',
    },
    dark: {
      html: '#050509',      // near-black neutral
      primary: '#0a0a0f',   // main app bg
      secondary: '#111118', // raised surfaces
      tertiary: '#181822',  // higher elevation
      quaternary: '#181822',
      quinary: '#000000',
    },
  },

  // Border colors
  border: {
    light: {
      default: 'rgba(0, 0, 0, 0.08)',
      strong: 'rgba(0, 0, 0, 0.1)',
      gray: '#e5e7eb',
      blue: '#3b82f6',
      blueHover: 'rgba(59, 130, 246, 0.5)',
    },
    dark: {
      default: 'rgba(54, 54, 60, 0.35)', // neutral gray border
      strong: 'rgba(95, 95, 106, 0.6)',
      gray: '#4b4b55',
      blue: '#8b8b95',        // neutral gray “accent” border
      blueHover: 'rgba(200, 200, 210, 0.9)',
    },
  },

  // Text colors
  text: {
    light: {
      primary: '#1a202c',
      secondary: 'gray.600',
      tertiary: 'gray.500',
      muted: 'gray.400',
      inverse: 'gray.700',
    },
    dark: {
      primary: '#e5e7eb',   // primary text on dark bg
      secondary: '#c4c6cf', // secondary text
      tertiary: '#9ca0aa',
      muted: '#6d707a',
      inverse: '#f9fafb',
    },
  },

  // Accent colors (neutralized for dark theme)
  accent: {
    blue: {
      primary: '#a3a3b3',  // neutral gray accent
      secondary: '#8a8a98',
      light: '#d4d4dd',
      medium: '#a3a3b3',
      dark: '#73737f',
      darker: '#52525b',
    },
    red: {
      primary: '#ef4444',
      light: 'red.400',
      medium: 'red.600',
      dark: 'red.700',
    },
    amber: {
      primary: '#f59e0b',
      light: 'orange.400',
    },
    purple: {
      light: 'purple.400',
      medium: 'purple.500',
    },
  },

  // Status colors (used in resourceStatus.js)
  status: {
    green: 'green',
    red: 'red',
    yellow: 'yellow',
    gray: 'gray',
  },

  // Interactive element colors
  interactive: {
    light: {
      active: '#2563eb',
      inactive: '#6b7280',
      hover: {
        background: 'gray.100',
        border: 'rgba(59, 130, 246, 0.5)',
      },
    },
    dark: {
      active: '#e5e7eb',          // high‑contrast neutral
      inactive: '#9ca0aa',        // muted gray
      hover: {
        background: '#1e1e28',    // slightly lighter panel on hover
        border: 'rgba(200, 200, 210, 0.8)',
      },
    },
  },

  // Sidebar specific colors
  sidebar: {
    light: {
      activeBg: 'blue.50',
      activeText: '#2563eb',
      inactiveText: '#6b7280',
      hoverBg: 'blue.100',
    },
    dark: {
      activeBg: '#111118',
      activeText: '#f3f4f6',
      inactiveText: '#9ca0aa',
      hoverBg: '#1b1b24',
    },
  },

  // Code/YAML editor colors
  code: {
    light: {
      background: '#ffffff',
      text: '#1a202c',
      buttonBg: 'rgba(0, 0, 0, 0.05)',
      buttonBgHover: 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
      background: 'rgba(0, 0, 0, 0)',
      text: 'rgba(199, 199, 203, 0.81)',
      buttonBg: 'rgba(148, 148, 164, 0.24)',
      buttonBgHover: 'rgba(148, 148, 164, 0.35)',
    },
  },

  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },

  // Pattern/Grid colors (for backgrounds)
  pattern: {
    light: {
      primary: 'rgba(0, 0, 0, 0.05)',
      secondary: 'rgba(0, 0, 0, 0.03)',
    },
    dark: {
      primary: 'rgba(160, 160, 172, 0.2)',
      secondary: 'rgba(160, 160, 172, 0.1)',
    },
  },
};

/**
 * Helper function to get color based on color mode
 * @param {string} colorMode - 'light' or 'dark'
 * @param {string} category - Category in colors object (e.g., 'background', 'text')
 * @param {string} variant - Variant within category (e.g., 'primary', 'secondary')
 * @returns {string} Color value
 */
export const getColor = (colorMode, category, variant) => {
  const mode = colorMode === 'dark' ? 'dark' : 'light';
  return colors[category]?.[mode]?.[variant] || colors[category]?.[variant];
};

/**
 * Helper function to get border color
 * @param {string} colorMode - 'light' or 'dark'
 * @param {string} variant - 'default', 'strong', 'gray', 'blue', 'blueHover'
 * @returns {string} Border color value
 */
export const getBorderColor = (colorMode, variant = 'default') => {
  return getColor(colorMode, 'border', variant);
};

/**
 * Helper function to get background color
 * @param {string} colorMode - 'light' or 'dark'
 * @param {string} variant - 'html', 'primary', 'secondary', etc.
 * @returns {string} Background color value
 */
export const getBackgroundColor = (colorMode, variant = 'primary') => {
  return getColor(colorMode, 'background', variant);
};

/**
 * Helper function to get text color
 * @param {string} colorMode - 'light' or 'dark'
 * @param {string} variant - 'primary', 'secondary', 'tertiary', etc.
 * @returns {string} Text color value
 */
export const getTextColor = (colorMode, variant = 'primary') => {
  return getColor(colorMode, 'text', variant);
};

