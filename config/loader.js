import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let config = null;

/**
 * Loads configuration from YAML file
 * @param {string} configPath - Optional path to config file. Defaults to config/config.yaml
 * @returns {object} Configuration object
 */
export const loadConfig = (configPath = null) => {
  if (config) {
    console.log('Using cached config');
    return config;
  }

  try {
    const configFilePath = configPath || join(__dirname, 'config.yaml');
    console.log('Loading config from:', configFilePath);
    const fileContents = readFileSync(configFilePath, 'utf8');
    config = yaml.load(fileContents);
    console.log('Loaded config database section:', JSON.stringify(config.database, null, 2));
    return config;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    throw error;
  }
};

/**
 * Gets a specific configuration section
 * @param {string} section - Configuration section name (e.g., 'database', 'server')
 * @returns {object} Configuration section
 */
export const getConfig = (section = null) => {
  const fullConfig = loadConfig();
  if (section) {
    const sectionConfig = fullConfig[section] || {};
    console.log(`getConfig('${section}') returning:`, JSON.stringify(sectionConfig, null, 2));
    return sectionConfig;
  }
  return fullConfig;
};

/**
 * Updates a specific configuration section
 * @param {string} section - Configuration section name (e.g., 'database', 'server')
 * @param {object} sectionConfig - Configuration values to update
 */
export const updateConfig = (section, sectionConfig) => {
  const fullConfig = loadConfig();
  fullConfig[section] = { ...fullConfig[section], ...sectionConfig };
  
  const configFilePath = join(__dirname, 'config.yaml');
  const yamlContent = yaml.dump(fullConfig, {
    indent: 2,
    lineWidth: -1,
    quotingType: '"',
  });
  
  writeFileSync(configFilePath, yamlContent, 'utf8');
  config = fullConfig; // Update cache
};

/**
 * Resets the cached configuration (useful for testing)
 */
export const resetConfig = () => {
  config = null;
};

