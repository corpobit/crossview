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

  static async findAll() {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async update(id, { username, email, role, password }) {
    const pool = getPool();
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (password !== undefined) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, role, created_at`,
      values
    );

    return result.rows[0] || null;
  }

  static async delete(id) {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0] || null;
  }
}

