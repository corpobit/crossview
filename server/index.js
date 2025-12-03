import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { KubernetesRepository } from '../src/data/repositories/KubernetesRepository.js';
import { initDatabase, getPool } from './db/connection.js';
import { User } from './models/User.js';
import { getConfig, updateConfig, resetConfig } from '../config/loader.js';
import path, { dirname } from 'path';
import { homedir } from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const serverConfig = getConfig('server');
const port = process.env.PORT || serverConfig.port || 3001;
const isProduction = process.env.NODE_ENV === 'production';

const PgSession = connectPgSimple(session);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
    };
    
    if (res.statusCode >= 500) {
      logger.error('HTTP Request', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.debug('HTTP Request', logData);
    }
  });
  next();
});

app.use(cors({
  origin: isProduction ? undefined : (serverConfig.cors?.origin || 'http://localhost:5173'),
  credentials: serverConfig.cors?.credentials !== false,
}));
app.use(express.json());

app.use(session({
  store: new PgSession({
    pool: getPool(),
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || serverConfig.session?.secret || 'crossview-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: serverConfig.session?.cookie?.secure !== false,
    httpOnly: serverConfig.session?.cookie?.httpOnly !== false,
    maxAge: serverConfig.session?.cookie?.maxAge || 24 * 60 * 60 * 1000,
  },
}));

const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

const requireAdmin = async (req, res, next) => {
  if (req.session && req.session.userId) {
    const user = await User.findById(req.session.userId);
    if (user && user.role === 'admin') {
      return next();
    }
  }
  res.status(403).json({ error: 'Forbidden' });
};

const kubernetesRepository = new KubernetesRepository();

// Get database configuration (only when no users exist)
app.get('/api/config/database', async (req, res) => {
  try {
    // Try to check if users exist, but don't fail if database connection fails
    // (user might be setting up database for the first time)
    let hasUsers = false;
    try {
      hasUsers = (await User.count()) > 0;
      if (hasUsers) {
        return res.status(403).json({ error: 'Database configuration can only be viewed during initial setup' });
      }
    } catch (dbError) {
      // Database connection might fail if config is wrong - that's okay during setup
      // We'll allow access to config in this case since user is likely setting up
      logger.warn('Could not check for existing users (database may not be configured yet)', { error: dbError.message });
    }
    
    // Reset config cache to ensure we get fresh data
    resetConfig();
    const dbConfig = getConfig('database');
    logger.debug('Database config retrieved', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
    });
    
    // Don't return password in response
    const response = {
      host: dbConfig.host ?? '',
      port: dbConfig.port ?? 5432,
      database: dbConfig.database ?? '',
      username: dbConfig.username ?? '',
      password: '', // Never return actual password
    };
    res.json(response);
  } catch (error) {
    logger.error('Error getting database config', { error: error.message, stack: error.stack });
    // Even on error, try to return what we can from config
    try {
      resetConfig();
      const dbConfig = getConfig('database');
      res.json({
        host: dbConfig.host ?? '',
        port: dbConfig.port ?? 5432,
        database: dbConfig.database ?? '',
        username: dbConfig.username ?? '',
        password: '',
      });
    } catch (fallbackError) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update database configuration (only when no users exist)
app.post('/api/config/database', async (req, res) => {
  try {
    const hasUsers = (await User.count()) > 0;
    if (hasUsers) {
      return res.status(403).json({ error: 'Database configuration can only be updated during initial setup' });
    }
    
    const { host, port, database, username, password } = req.body;
    
    if (!host || !database || !username || !password) {
      return res.status(400).json({ error: 'Host, database, username, and password are required' });
    }
    
    updateConfig('database', {
      host,
      port: port || 5432,
      database,
      username,
      password,
    });
    
    // Reset config cache and database pool to use new config
    resetConfig();
    const { resetPool } = await import('./db/connection.js');
    resetPool();
    
    logger.info('Database configuration updated successfully');
    res.json({ success: true, message: 'Database configuration updated' });
  } catch (error) {
    logger.error('Error updating database config', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/check', async (req, res) => {
  try {
    const hasAdmin = await User.hasAdmin();
    const hasUsers = (await User.count()) > 0;
    
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        return res.json({
          authenticated: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          hasAdmin,
          hasUsers,
        });
      }
    }
    
    res.json({
      authenticated: false,
      hasAdmin,
      hasUsers,
    });
  } catch (error) {
    logger.error('Error checking auth', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await User.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.userRole = user.role;
    
    logger.info('User logged in successfully', { userId: user.id, username: user.username, role: user.role });
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error during login', { error: error.message, stack: error.stack, username: req.body.username });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, database } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const hasUsers = (await User.count()) > 0;
    const role = hasUsers ? 'user' : 'admin';
    
    if (hasUsers) {
      return res.status(403).json({ error: 'Registration is disabled. Please contact an administrator.' });
    }
    
    // If database config is provided, update it before creating user
    if (database && database.host && database.database && database.username && database.password) {
      try {
        updateConfig('database', {
          host: database.host,
          port: database.port || 5432,
          database: database.database,
          username: database.username,
          password: database.password,
        });
        
        // Reset config cache and database pool to use new config
        resetConfig();
        const { resetPool } = await import('./db/connection.js');
        if (resetPool) {
          resetPool();
        }
      } catch (dbError) {
        logger.error('Error updating database config during registration', { error: dbError.message, stack: dbError.stack });
        return res.status(500).json({ error: `Failed to update database configuration: ${dbError.message}` });
      }
    }
    
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const user = await User.create({ username, email, password, role });
    
    req.session.userId = user.id;
    req.session.userRole = user.role;
    
    logger.info('User registered successfully', { userId: user.id, username: user.username, email: user.email, role: user.role });
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Error during registration', { error: error.message, stack: error.stack, username: req.body.username, email: req.body.email });
    res.status(500).json({ error: error.message });
  }
});

// User Management Endpoints (Admin only)
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.findAll();
    logger.debug('Users retrieved', { count: users.length, userId: req.session.userId });
    res.json(users);
  } catch (error) {
    logger.error('Error getting users', { error: error.message, stack: error.stack, userId: req.session.userId });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', requireAuth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Role must be either "admin" or "user"' });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = await User.create({ username, email, password, role });
    logger.info('User created', { userId: user.id, username: user.username, role: user.role, createdBy: req.session.userId });
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    });
  } catch (error) {
    logger.error('Error creating user', { error: error.message, stack: error.stack, createdBy: req.session.userId });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', requireAuth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.session.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = parseInt(req.params.id, 10);
    const { username, email, role, password } = req.body;

    if (role && role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Role must be either "admin" or "user"' });
    }

    // Check if username or email already exists (excluding current user)
    if (username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const updatedUser = await User.update(userId, { username, email, role, password });
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      created_at: updatedUser.created_at,
    });
  } catch (error) {
    logger.error('Error updating user', { error: error.message, stack: error.stack, userId: req.params.id, updatedBy: req.session.userId });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contexts', requireAuth, async (req, res) => {
  try {
    const contexts = kubernetesRepository.getContexts();
    logger.debug('Kubernetes contexts retrieved', { count: contexts.length });
    res.json(contexts);
  } catch (error) {
    logger.error('Error getting contexts', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contexts/current', requireAuth, async (req, res) => {
  try {
    await kubernetesRepository.initialize();
    const kubeConfig = kubernetesRepository.kubeConfig;
    const context = kubeConfig.getCurrentContext();
    res.json({ context });
  } catch (error) {
    logger.error('Error getting current context', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contexts/current', requireAuth, async (req, res) => {
  try {
    const { context } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'Context name is required' });
    }
    await kubernetesRepository.initialize();
    kubernetesRepository.kubeConfig.setCurrentContext(context);
    kubernetesRepository.initialized = false;
    await kubernetesRepository.initialize();
    logger.info('Kubernetes context changed', { context, userId: req.session.userId });
    res.json({ success: true, context });
  } catch (error) {
    logger.error('Error setting context', { error: error.message, stack: error.stack, context });
    res.status(500).json({ error: error.message });
  }
});

// Simple health check endpoint (no auth required for Kubernetes probes)
app.get('/api/health', async (req, res) => {
  try {
    // If context is provided, check Kubernetes connection (requires auth)
    const context = req.query.context;
    if (context) {
      // This requires auth, so check if user is authenticated
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const kubeConfigPath = path.join(homedir(), '.kube', 'config');
      if (!fs.existsSync(kubeConfigPath)) {
        return res.json({ connected: false });
      }
      kubernetesRepository.kubeConfig.loadFromFile(kubeConfigPath);
      kubernetesRepository.kubeConfig.setCurrentContext(context);
      kubernetesRepository.initialized = false;
      await kubernetesRepository.initialize();
      const connected = await kubernetesRepository.isConnected(context);
      return res.json({ connected });
    }
    // Simple health check - just return OK
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error checking health', { error: error.message, stack: error.stack });
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/namespaces', requireAuth, async (req, res) => {
  try {
    const context = req.query.context;
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    // Load config (automatically detects cluster vs local)
    kubernetesRepository.loadKubeConfig();
    if (context) {
      kubernetesRepository.kubeConfig.setCurrentContext(context);
    }
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    kubernetesRepository.appsApi = null;
    await kubernetesRepository.initialize();
    const namespaces = await kubernetesRepository.getNamespaces(context);
    logger.debug('Namespaces retrieved', { context, count: namespaces.length });
    res.json(namespaces);
  } catch (error) {
    logger.error('Error getting namespaces', { error: error.message, stack: error.stack, context });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/crossplane/resources', requireAuth, async (req, res) => {
  try {
    const context = req.query.context;
    const namespace = req.query.namespace || null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const continueToken = req.query.continue || null;
    
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    
    kubernetesRepository.loadKubeConfig();
    if (context) {
      kubernetesRepository.kubeConfig.setCurrentContext(context);
    }
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    kubernetesRepository.appsApi = null;
    await kubernetesRepository.initialize();
    
    const result = await kubernetesRepository.getCrossplaneResources(namespace, context, limit, continueToken);
    const items = result.items || result;
    const itemsArray = Array.isArray(items) ? items : [];
    
    res.json({
      items: itemsArray.map(r => ({
        apiVersion: r.apiVersion,
        kind: r.kind,
        metadata: r.metadata,
        spec: r.spec,
        status: r.status,
      })),
      continueToken: result.continueToken || null
    });
    logger.debug('Crossplane resources retrieved', { context, namespace, count: itemsArray.length, continueToken: result.continueToken });
  } catch (error) {
    logger.error('Error getting Crossplane resources', { error: error.message, stack: error.stack, context, namespace });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/resources', requireAuth, async (req, res) => {
  const { apiVersion, kind, namespace, context: contextParam, limit, continue: continueToken, plural } = req.query;
  const context = contextParam;
  
  try {
    // Load config (automatically detects cluster vs local)
    // Context is only required when running locally (not in cluster)
    const serviceAccountPath = '/var/run/secrets/kubernetes.io/serviceaccount';
    const isInCluster = fs.existsSync(serviceAccountPath) && 
                       fs.existsSync(`${serviceAccountPath}/token`) &&
                       fs.existsSync(`${serviceAccountPath}/ca.crt`);
    
    if (!isInCluster && !context) {
      return res.status(400).json({ error: 'Context parameter is required when not running in cluster' });
    }
    kubernetesRepository.loadKubeConfig();
    if (context) {
      kubernetesRepository.kubeConfig.setCurrentContext(context);
    }
    
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    kubernetesRepository.appsApi = null;
    await kubernetesRepository.initialize();
    
    const limitNum = limit ? parseInt(limit, 10) : null;
    const result = await kubernetesRepository.getResources(
      apiVersion, 
      kind, 
      namespace, 
      context, 
      limitNum, 
      continueToken || null,
      plural || null
    );
    
    // Return paginated response
    res.json({
      items: result.items || [],
      continueToken: result.continueToken || null,
      remainingItemCount: result.remainingItemCount || null
    });
  } catch (error) {
    if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist'))) {
      logger.debug('Resource not found (404)', { apiVersion, kind, namespace, context });
      return res.json({ items: [], continueToken: null, remainingItemCount: null });
    }
    // Defensive error logging - handle undefined variables gracefully
    logger.error('Error getting resources', { 
      error: error?.message || 'Unknown error', 
      stack: error?.stack, 
      apiVersion: apiVersion || 'undefined', 
      kind: kind || 'undefined', 
      namespace: namespace || 'undefined', 
      context: context || 'undefined' 
    });
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

app.get('/api/resource', requireAuth, async (req, res) => {
  const { apiVersion, kind, name, namespace, context: contextParam, plural } = req.query;
  const context = contextParam;
  
  try {
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    // Load config (automatically detects cluster vs local)
    kubernetesRepository.loadKubeConfig();
    if (context) {
      kubernetesRepository.kubeConfig.setCurrentContext(context);
    }
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    kubernetesRepository.appsApi = null;
    await kubernetesRepository.initialize();
    
    // Clean up namespace - convert "undefined" string to null for cluster-scoped resources
    const cleanNamespace = namespace && namespace !== 'undefined' && namespace !== 'null' ? namespace : null;
    
    const resource = await kubernetesRepository.getResource(apiVersion, kind, name, cleanNamespace, context, plural || null);
    logger.debug('Resource retrieved', { apiVersion, kind, name, namespace, context, plural });
    res.json(resource);
  } catch (error) {
    if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist'))) {
      logger.debug('Resource not found (404)', { apiVersion, kind, name, namespace, context });
      return res.status(404).json({ error: 'Resource not found' });
    }
    // Defensive error logging - handle undefined variables gracefully
    logger.error('Error getting resource', { 
      error: error?.message || 'Unknown error', 
      stack: error?.stack, 
      apiVersion: apiVersion || 'undefined', 
      kind: kind || 'undefined', 
      name: name || 'undefined', 
      namespace: namespace || 'undefined', 
      context: context || 'undefined' 
    });
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

app.get('/api/claims', requireAuth, async (req, res) => {
  const { context: contextParam, limit, continue: continueToken } = req.query;
  const context = contextParam;
  
  try {
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    
    kubernetesRepository.loadKubeConfig();
    if (context) {
      kubernetesRepository.kubeConfig.setCurrentContext(context);
    }
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    kubernetesRepository.appsApi = null;
    await kubernetesRepository.initialize();
    
    const { GetClaimsUseCase } = await import('../src/domain/usecases/GetClaimsUseCase.js');
    const useCase = new GetClaimsUseCase(kubernetesRepository);
    const limitNum = limit ? parseInt(limit, 10) : null;
    const result = await useCase.execute(context, limitNum, continueToken || null);
    
    res.json({
      items: result.items || [],
      continueToken: result.continueToken || null
    });
    logger.debug('Claims retrieved', { context, count: result.items?.length || 0, continueToken: result.continueToken });
  } catch (error) {
    logger.error('Error getting claims', { error: error.message, stack: error.stack, context });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/composite-resources', requireAuth, async (req, res) => {
  const { context: contextParam, limit, continue: continueToken } = req.query;
  const context = contextParam;
  
  try {
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    
    kubernetesRepository.loadKubeConfig();
    if (context) {
      kubernetesRepository.kubeConfig.setCurrentContext(context);
    }
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    kubernetesRepository.appsApi = null;
    await kubernetesRepository.initialize();
    
    const { GetCompositeResourcesUseCase } = await import('../src/domain/usecases/GetCompositeResourcesUseCase.js');
    const useCase = new GetCompositeResourcesUseCase(kubernetesRepository);
    const limitNum = limit ? parseInt(limit, 10) : null;
    const result = await useCase.execute(context, limitNum, continueToken || null);
    
    res.json({
      items: result.items || [],
      continueToken: result.continueToken || null
    });
    logger.debug('Composite resources retrieved', { context, count: result.items?.length || 0, continueToken: result.continueToken });
  } catch (error) {
    logger.error('Error getting composite resources', { error: error.message, stack: error.stack, context });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', requireAuth, async (req, res) => {
  const { kind, name, namespace, context: contextParam } = req.query;
  const context = contextParam;
  
  try {
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    if (!kind || !name) {
      return res.status(400).json({ error: 'Kind and name parameters are required' });
    }
    // Load config (automatically detects cluster vs local)
    kubernetesRepository.loadKubeConfig();
    if (context) {
      kubernetesRepository.kubeConfig.setCurrentContext(context);
    }
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    kubernetesRepository.appsApi = null;
    await kubernetesRepository.initialize();
    
    const events = await kubernetesRepository.getEvents(kind, name, namespace || null, context);
    logger.debug('Events retrieved', { kind, name, namespace, context, count: events.length });
    res.json(events);
  } catch (error) {
    // Defensive error logging - handle undefined variables gracefully
    logger.error('Error getting events', { 
      error: error?.message || 'Unknown error', 
      stack: error?.stack, 
      kind: kind || 'undefined', 
      name: name || 'undefined', 
      namespace: namespace || 'undefined', 
      context: context || 'undefined' 
    });
    // Return empty array instead of error to not break the UI
    res.json([]);
  }
});

// Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason: reason?.message || reason, stack: reason?.stack });
  // Don't exit - just log the error
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Don't exit - just log the error
});

// Handle errors in async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Unhandled route error', { 
        error: error?.message || 'Unknown error', 
        stack: error?.stack,
        url: req.url,
        method: req.method
      });
      if (!res.headersSent) {
        res.status(500).json({ error: error?.message || 'Internal server error' });
      }
    });
  };
};

const startServer = async () => {
  try {
    await initDatabase();
    
    if (isProduction) {
      const distPath = path.join(__dirname, '..', 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
          } else {
            res.status(404).json({ error: 'Not found' });
          }
        });
        logger.info('Serving frontend from', { path: distPath });
      } else {
        logger.warn('Frontend dist folder not found. API-only mode.');
      }
    }
    
    app.listen(port, () => {
      const kubeConfigPath = process.env.KUBECONFIG || process.env.KUBE_CONFIG_PATH || '~/.kube/config';
      logger.info('Server started successfully', {
        port,
        mode: isProduction ? 'production' : 'development',
        sessionStorage: 'PostgreSQL (cluster-ready)',
        kubeConfigPath,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

