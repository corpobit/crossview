import { getPool } from '../db/connection.js';
import bcrypt from 'bcrypt';

export class User {
  static async create({ username, email, password, role = 'user' }) {
    const pool = getPool();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash, role]
    );
    
    return result.rows[0];
  }

  static async findByUsername(username) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async count() {
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count, 10);
  }

  static async hasAdmin() {
    const pool = getPool();
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  static async verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }
}

