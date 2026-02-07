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
      logger.debug('Loading config from file', { path: configFilePath });
      const fileContents = readFileSync(configFilePath, 'utf8');
      fileConfig = yaml.load(fileContents) || {};
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error('Failed to load configuration file', { error: error.message, stack: error.stack, path: configPath });
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
    sso: {
      enabled: process.env.SSO_ENABLED === 'true' || fileConfig.sso?.enabled === true,
      oidc: {
        enabled: process.env.OIDC_ENABLED === 'true' || fileConfig.sso?.oidc?.enabled === true,
        issuer: process.env.OIDC_ISSUER || fileConfig.sso?.oidc?.issuer || 'http://localhost:8080/realms/crossview',
        clientId: process.env.OIDC_CLIENT_ID || fileConfig.sso?.oidc?.clientId || 'crossview-client',
        clientSecret: process.env.OIDC_CLIENT_SECRET || fileConfig.sso?.oidc?.clientSecret || '',
        authorizationURL: process.env.OIDC_AUTHORIZATION_URL || fileConfig.sso?.oidc?.authorizationURL || '',
        tokenURL: process.env.OIDC_TOKEN_URL || fileConfig.sso?.oidc?.tokenURL || '',
        userInfoURL: process.env.OIDC_USERINFO_URL || fileConfig.sso?.oidc?.userInfoURL || '',
        callbackURL: process.env.OIDC_CALLBACK_URL || fileConfig.sso?.oidc?.callbackURL || 'http://localhost:3001/api/auth/oidc/callback',
        scope: process.env.OIDC_SCOPE || fileConfig.sso?.oidc?.scope || 'openid profile email',
        usernameAttribute: process.env.OIDC_USERNAME_ATTRIBUTE || fileConfig.sso?.oidc?.usernameAttribute || 'preferred_username',
        emailAttribute: process.env.OIDC_EMAIL_ATTRIBUTE || fileConfig.sso?.oidc?.emailAttribute || 'email',
        firstNameAttribute: process.env.OIDC_FIRSTNAME_ATTRIBUTE || fileConfig.sso?.oidc?.firstNameAttribute || 'given_name',
        lastNameAttribute: process.env.OIDC_LASTNAME_ATTRIBUTE || fileConfig.sso?.oidc?.lastNameAttribute || 'family_name',
        roleAttributePath: process.env.OIDC_ROLE_ATTRIBUTE_PATH || fileConfig.sso?.oidc?.roleAttributePath || '',
      },
      saml: {
        enabled: process.env.SAML_ENABLED === 'true' || fileConfig.sso?.saml?.enabled === true,
        entryPoint: process.env.SAML_ENTRY_POINT || fileConfig.sso?.saml?.entryPoint || 'http://localhost:8080/realms/crossview/protocol/saml',
        issuer: process.env.SAML_ISSUER || fileConfig.sso?.saml?.issuer || 'crossview',
        callbackURL: process.env.SAML_CALLBACK_URL || fileConfig.sso?.saml?.callbackURL || 'http://localhost:3001/api/auth/saml/callback',
        cert: process.env.SAML_CERT || fileConfig.sso?.saml?.cert || null,
        usernameAttribute: process.env.SAML_USERNAME_ATTRIBUTE || fileConfig.sso?.saml?.usernameAttribute || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
        emailAttribute: process.env.SAML_EMAIL_ATTRIBUTE || fileConfig.sso?.saml?.emailAttribute || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstNameAttribute: process.env.SAML_FIRSTNAME_ATTRIBUTE || fileConfig.sso?.saml?.firstNameAttribute || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastNameAttribute: process.env.SAML_LASTNAME_ATTRIBUTE || fileConfig.sso?.saml?.lastNameAttribute || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
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
    logger.debug(`Config section retrieved: ${section}`, { section, hasData: Object.keys(sectionConfig).length > 0 });
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

