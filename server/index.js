import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { KubernetesRepository } from '../src/data/repositories/KubernetesRepository.js';
import { initDatabase } from './db/connection.js';
import { User } from './models/User.js';
import path from 'path';
import { homedir } from 'os';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'crossview-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
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
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const hasUsers = (await User.count()) > 0;
    const role = hasUsers ? 'user' : 'admin';
    
    if (hasUsers) {
      return res.status(403).json({ error: 'Registration is disabled. Please contact an administrator.' });
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

app.get('/api/health', requireAuth, async (req, res) => {
  try {
    const context = req.query.context;
    if (!context) {
      return res.json({ connected: false });
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
    res.json({ connected });
  } catch (error) {
    console.error('Error checking health:', error);
    res.json({ connected: false });
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

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(port, () => {
      console.log(`Backend API server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

