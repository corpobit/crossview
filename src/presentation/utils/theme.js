/**
 * Centralized color theme for the application
 * All colors used throughout the app should reference this file
 */

export const colors = {
  // Background colors - Perplexity-inspired
  background: {
    light: {
      html: '#F7FAFC',
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#f1f3f4',
      dropdown: '#F7FAFC',
      sidebar: '#FAFBFC',
      header: '#FFFFFF',
    },
    dark: {
      html: '#18181B',
      primary: '#131315',
      secondary: '#1A1A1D',
      tertiary: '#2d2d2d',
      quaternary: '#353535',
      quinary: '#000000',
      dropdown: '#27272A',
      sidebar: '#1A1A1D',
      header: '#1F1F23',
    },
  },

  // Border colors
  border: {
    light: {
      default: 'rgba(0, 0, 0, 0.08)',
      strong: 'rgba(0, 0, 0, 0.12)',
      gray: '#e0e0e0',
      blue: '#3a86ff',
      blueHover: 'rgba(58, 134, 255, 0.2)',
    },
    dark: {
      default: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.2)',
      gray: '#404040',
      blue: '#60a5fa',
      blueHover: 'rgba(96, 165, 250, 0.3)',
    },
  },

  // Text colors
  text: {
    light: {
      primary: '#111111',
      secondary: '#666666',
      tertiary: '#888888',
      muted: '#999999',
      inverse: '#000000',
    },
    dark: {
      primary: '#e5e5e5',
      secondary: '#b3b3b3',
      tertiary: '#808080',
      muted: '#666666',
      inverse: '#ffffff',
    },
  },

  // Accent colors - Perplexity signature colors
  accent: {
    cyan: {
      primary: '#00c2ff',
      light: '#33d4ff',
      medium: '#00c2ff',
      dark: '#0099cc',
      darker: '#007399',
    },
    coral: {
      primary: '#ff6f59',
      light: '#ff8f7a',
      medium: '#ff6f59',
      dark: '#ff4a3a',
    },
    yellow: {
      primary: '#f9c74f',
      light: '#fadb80',
      medium: '#f9c74f',
    },
    blue: {
      primary: '#3a86ff',
      light: '#60a5fa',
      medium: '#3a86ff',
    },
    red: {
      primary: '#ef4444',
      light: '#f87171',
      medium: '#ef4444',
      dark: '#dc2626',
    },
    purple: {
      light: '#c084fc',
      medium: '#a855f7',
    },
  },

  // Status colors
  status: {
    green: '#10b981',
    red: '#ef4444',
    yellow: '#f9c74f',
    gray: '#9ca3af',
    cyan: '#00c2ff',
    coral: '#ff6f59',
  },

  // Interactive element colors
  interactive: {
    light: {
      active: '#00c2ff',
      inactive: '#9ca3af',
      hover: {
        background: 'rgba(0, 194, 255, 0.08)',
        border: 'rgba(0, 194, 255, 0.2)',
      },
    },
    dark: {
      active: '#00c2ff',
      inactive: '#9ca3af',
      hover: {
        background: 'rgba(0, 194, 255, 0.15)',
        border: 'rgba(0, 194, 255, 0.3)',
      },
    },
  },

  // Sidebar specific colors
  sidebar: {
    light: {
      activeBg: 'rgba(0, 194, 255, 0.1)',
      activeText: '#00c2ff',
      inactiveText: '#6b7280',
      hoverBg: 'rgba(0, 194, 255, 0.05)',
    },
    dark: {
      activeBg: 'rgba(0, 194, 255, 0.2)',
      activeText: '#00c2ff',
      inactiveText: '#9ca3af',
      hoverBg: 'rgba(255, 255, 255, 0.05)',
    },
  },

  // Code/YAML editor colors
  code: {
    light: {
      background: '#ffffff',
      text: '#111111',
      buttonBg: 'rgba(0, 0, 0, 0.04)',
      buttonBgHover: 'rgba(0, 0, 0, 0.08)',
    },
    dark: {
      background: '#27272A',
      text: '#e5e5e5',
      buttonBg: 'rgba(255, 255, 255, 0.1)',
      buttonBgHover: 'rgba(255, 255, 255, 0.2)',
    },
  },

  // Shadow colors
  shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.4)',
  },

  // Pattern/Grid colors
  pattern: {
    light: {
      primary: 'rgba(0, 194, 255, 0.03)',
      secondary: 'rgba(249, 199, 79, 0.03)',
    },
    dark: {
      primary: 'rgba(0, 194, 255, 0.1)',
      secondary: 'rgba(255, 111, 89, 0.1)',
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

/**
 * Helper function to get sidebar color
 * @param {string} colorMode - 'light' or 'dark'
 * @param {string} variant - 'activeBg', 'activeText', 'inactiveText', 'hoverBg'
 * @returns {string} Sidebar color value
 */
export const getSidebarColor = (colorMode, variant) => {
  return getColor(colorMode, 'sidebar', variant);
};

/**
 * Helper function to get interactive color
 * @param {string} colorMode - 'light' or 'dark'
 * @param {string} variant - 'active', 'inactive', 'hover.background', 'hover.border'
 * @returns {string} Interactive color value
 */
export const getInteractiveColor = (colorMode, variant) => {
  if (variant.includes('.')) {
    const [category, subVariant] = variant.split('.');
    return colors.interactive[colorMode === 'dark' ? 'dark' : 'light']?.[category]?.[subVariant];
  }
  return getColor(colorMode, 'interactive', variant);
};

/**
 * Helper function to get accent color
 * @param {string} colorName - 'cyan', 'coral', 'yellow', 'blue', 'red', 'purple'
 * @param {string} variant - 'primary', 'light', 'medium', 'dark', 'darker'
 * @returns {string} Accent color value
 */
export const getAccentColor = (colorName, variant = 'primary') => {
  return colors.accent[colorName]?.[variant] || colors.accent[colorName]?.primary;
};

/**
 * Helper function to get status color
 * @param {string} statusName - 'green', 'red', 'yellow', 'gray', 'cyan', 'coral'
 * @returns {string} Status color value
 */
export const getStatusColor = (statusName) => {
  return colors.status[statusName] || colors.status.gray;
};
