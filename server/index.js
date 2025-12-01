import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { KubernetesRepository } from '../src/data/repositories/KubernetesRepository.js';
import { initDatabase, getPool } from './db/connection.js';
import { User } from './models/User.js';
import { getConfig, updateConfig, resetConfig } from '../config/loader.js';
import path from 'path';
import { homedir } from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const serverConfig = getConfig('server');
const port = process.env.PORT || serverConfig.port || 3001;
const isProduction = process.env.NODE_ENV === 'production';

const PgSession = connectPgSimple(session);

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
      console.warn('Could not check for existing users (database may not be configured yet):', dbError.message);
    }
    
    // Reset config cache to ensure we get fresh data
    resetConfig();
    const dbConfig = getConfig('database');
    console.log('=== DATABASE CONFIG DEBUG ===');
    console.log('Full dbConfig object:', JSON.stringify(dbConfig, null, 2));
    console.log('dbConfig.port value:', dbConfig.port);
    console.log('dbConfig.port type:', typeof dbConfig.port);
    
    // Don't return password in response
    const response = {
      host: dbConfig.host ?? '',
      port: dbConfig.port ?? 5432,
      database: dbConfig.database ?? '',
      username: dbConfig.username ?? '',
      password: '', // Never return actual password
    };
    console.log('Final response object:', JSON.stringify(response, null, 2));
    console.log('=== END DEBUG ===');
    res.json(response);
  } catch (error) {
    console.error('Error getting database config:', error);
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
    
    res.json({ success: true, message: 'Database configuration updated' });
  } catch (error) {
    console.error('Error updating database config:', error);
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
    console.error('Error checking auth:', error);
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
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
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
        console.error('Error updating database config:', dbError);
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
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error during registration:', error);
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
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
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
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('Error creating user:', error);
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
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contexts', requireAuth, async (req, res) => {
  try {
    await kubernetesRepository.initialize();
    const kubeConfig = kubernetesRepository.kubeConfig;
    const contexts = kubeConfig.getContexts().map(ctx => ({
      name: ctx.name,
      cluster: ctx.cluster,
      user: ctx.user,
      namespace: ctx.namespace || 'default',
    }));
    res.json(contexts);
  } catch (error) {
    console.error('Error getting contexts:', error);
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
    console.error('Error getting current context:', error);
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
    res.json({ success: true, context });
  } catch (error) {
    console.error('Error setting context:', error);
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
    console.error('Error checking health:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/namespaces', requireAuth, async (req, res) => {
  try {
    const context = req.query.context;
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    const kubeConfigPath = path.join(homedir(), '.kube', 'config');
    if (!fs.existsSync(kubeConfigPath)) {
      return res.status(500).json({ error: 'Kubeconfig file not found' });
    }
    kubernetesRepository.kubeConfig.loadFromFile(kubeConfigPath);
    kubernetesRepository.kubeConfig.setCurrentContext(context);
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    await kubernetesRepository.initialize();
    const namespaces = await kubernetesRepository.getNamespaces(context);
    res.json(namespaces);
  } catch (error) {
    console.error('Error getting namespaces:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/crossplane/resources', requireAuth, async (req, res) => {
  try {
    const context = req.query.context;
    const namespace = req.query.namespace || null;
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    const kubeConfigPath = path.join(homedir(), '.kube', 'config');
    if (!fs.existsSync(kubeConfigPath)) {
      return res.status(500).json({ error: 'Kubeconfig file not found' });
    }
    kubernetesRepository.kubeConfig.loadFromFile(kubeConfigPath);
    kubernetesRepository.kubeConfig.setCurrentContext(context);
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    await kubernetesRepository.initialize();
    const resources = await kubernetesRepository.getCrossplaneResources(namespace, context);
    res.json(resources.map(r => ({
      apiVersion: r.apiVersion,
      kind: r.kind,
      metadata: r.metadata,
      spec: r.spec,
      status: r.status,
    })));
  } catch (error) {
    console.error('Error getting Crossplane resources:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/resources', requireAuth, async (req, res) => {
  try {
    const { apiVersion, kind, namespace, context: contextParam, limit, continue: continueToken } = req.query;
    const context = contextParam;
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    const kubeConfigPath = path.join(homedir(), '.kube', 'config');
    if (!fs.existsSync(kubeConfigPath)) {
      return res.status(500).json({ error: 'Kubeconfig file not found' });
    }
    kubernetesRepository.kubeConfig.loadFromFile(kubeConfigPath);
    kubernetesRepository.kubeConfig.setCurrentContext(context);
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    await kubernetesRepository.initialize();
    
    const limitNum = limit ? parseInt(limit, 10) : null;
    const result = await kubernetesRepository.getResources(
      apiVersion, 
      kind, 
      namespace, 
      context, 
      limitNum, 
      continueToken || null
    );
    
    // Return paginated response
    res.json({
      items: result.items || [],
      continueToken: result.continueToken || null,
      remainingItemCount: result.remainingItemCount || null
    });
  } catch (error) {
    if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist'))) {
      return res.json({ items: [], continueToken: null, remainingItemCount: null });
    }
    console.error('Error getting resources:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/resource', requireAuth, async (req, res) => {
  try {
    const { apiVersion, kind, name, namespace, context: contextParam } = req.query;
    const context = contextParam;
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    const kubeConfigPath = path.join(homedir(), '.kube', 'config');
    if (!fs.existsSync(kubeConfigPath)) {
      return res.status(500).json({ error: 'Kubeconfig file not found' });
    }
    kubernetesRepository.kubeConfig.loadFromFile(kubeConfigPath);
    kubernetesRepository.kubeConfig.setCurrentContext(context);
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    await kubernetesRepository.initialize();
    
    const resource = await kubernetesRepository.getResource(apiVersion, kind, name, namespace, context);
    res.json(resource);
  } catch (error) {
    if (error.message && (error.message.includes('404') || error.message.includes('NotFound') || error.message.includes('does not exist'))) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    console.error('Error getting resource:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const { kind, name, namespace, context: contextParam } = req.query;
    const context = contextParam;
    if (!context) {
      return res.status(400).json({ error: 'Context parameter is required' });
    }
    if (!kind || !name) {
      return res.status(400).json({ error: 'Kind and name parameters are required' });
    }
    const kubeConfigPath = path.join(homedir(), '.kube', 'config');
    if (!fs.existsSync(kubeConfigPath)) {
      return res.status(500).json({ error: 'Kubeconfig file not found' });
    }
    kubernetesRepository.kubeConfig.loadFromFile(kubeConfigPath);
    kubernetesRepository.kubeConfig.setCurrentContext(context);
    kubernetesRepository.initialized = false;
    kubernetesRepository.coreApi = null;
    kubernetesRepository.customObjectsApi = null;
    await kubernetesRepository.initialize();
    
    const events = await kubernetesRepository.getEvents(kind, name, namespace || null, context);
    res.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    // Return empty array instead of error to not break the UI
    res.json([]);
  }
});

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
        console.log('Serving frontend from:', distPath);
      } else {
        console.warn('Frontend dist folder not found. API-only mode.');
      }
    }
    
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log('Session storage: PostgreSQL (cluster-ready)');
      const kubeConfigPath = process.env.KUBECONFIG || process.env.KUBE_CONFIG_PATH || '~/.kube/config';
      console.log(`Kubernetes config: ${kubeConfigPath}`);
      if (isProduction) {
        console.log('Mode: Production (serving frontend + API)');
      } else {
        console.log('Mode: Development (API only)');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

