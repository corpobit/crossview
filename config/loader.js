import yaml from 'js-yaml';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let config = null;

/**
 * Gets configuration from environment variables with fallback to YAML file
 * Environment variables take precedence over YAML config
 * @param {string} configPath - Optional path to config file. Defaults to config/config.yaml
 * @returns {object} Configuration object
 */
export const loadConfig = (configPath = null) => {
  if (config) {
    return config;
  }

  let fileConfig = {};
  
  try {
    const configFilePath = configPath || join(__dirname, 'config.yaml');
    if (existsSync(configFilePath)) {
      console.log('Loading config from:', configFilePath);
      const fileContents = readFileSync(configFilePath, 'utf8');
      fileConfig = yaml.load(fileContents) || {};
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to load configuration file:', error);
    }
  }

  config = {
    database: {
      host: process.env.DB_HOST || fileConfig.database?.host || 'localhost',
      port: parseInt(process.env.DB_PORT || fileConfig.database?.port || '5432', 10),
      database: process.env.DB_NAME || fileConfig.database?.database || 'crossview',
      username: process.env.DB_USER || fileConfig.database?.username || 'postgres',
      password: process.env.DB_PASSWORD || fileConfig.database?.password || 'postgres',
    },
    server: {
      port: parseInt(process.env.PORT || process.env.SERVER_PORT || fileConfig.server?.port || '3001', 10),
      cors: {
        origin: process.env.CORS_ORIGIN || fileConfig.server?.cors?.origin || 'http://localhost:5173',
        credentials: process.env.CORS_CREDENTIALS !== 'false' && (fileConfig.server?.cors?.credentials !== false),
      },
      session: {
        secret: process.env.SESSION_SECRET || fileConfig.server?.session?.secret || 'crossview-secret-key-change-in-production',
        cookie: {
          secure: process.env.SESSION_SECURE === 'true' || fileConfig.server?.session?.cookie?.secure === true,
          httpOnly: process.env.SESSION_HTTP_ONLY !== 'false' && (fileConfig.server?.session?.cookie?.httpOnly !== false),
          maxAge: parseInt(process.env.SESSION_MAX_AGE || fileConfig.server?.session?.cookie?.maxAge || '86400000', 10),
        },
      },
    },
    vite: fileConfig.vite || getDefaultConfig().vite,
  };

  return config;
};

const getDefaultConfig = () => {
  return {
    vite: {
      server: {
        proxy: {
          api: {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
    },
  };
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

