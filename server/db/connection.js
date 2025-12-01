import pg from 'pg';
import { getConfig } from '../../config/loader.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

let pool = null;

export const getPool = () => {
  if (!pool) {
    try {
      const config = getConfig('database');
      
      pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
      });

      pool.on('error', (err) => {
        logger.error('Unexpected error on idle database client', { error: err.message, stack: err.stack });
      });
    } catch (error) {
      logger.error('Failed to initialize database pool', { error: error.message, stack: error.stack });
      throw error;
    }
  }
  return pool;
};

export const resetPool = () => {
  if (pool) {
    pool.end();
    pool = null;
  }
};

export const initDatabase = async () => {
  const pool = getPool();
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Error initializing database', { error: error.message, stack: error.stack });
    throw error;
  }
};

