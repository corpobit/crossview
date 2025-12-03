#!/usr/bin/env node

/**
 * Script to make a user an admin
 * Usage: node scripts/make-admin.js <username>
 */

import { getPool } from '../server/db/connection.js';
import { User } from '../server/models/User.js';
import { initDatabase } from '../server/db/connection.js';

const username = process.argv[2];

if (!username) {
  console.error('Usage: node scripts/make-admin.js <username>');
  process.exit(1);
}

async function makeAdmin() {
  try {
    // Initialize database connection
    await initDatabase();
    
    // Find the user
    const user = await User.findByUsername(username);
    
    if (!user) {
      console.error(`User "${username}" not found.`);
      process.exit(1);
    }
    
    // Update to admin
    const updated = await User.update(user.id, { role: 'admin' });
    
    if (updated) {
      console.log(`✓ Successfully made "${username}" an admin.`);
      console.log(`  User ID: ${updated.id}`);
      console.log(`  Email: ${updated.email}`);
      console.log(`  Role: ${updated.role}`);
    } else {
      console.error('Failed to update user.');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

makeAdmin();

