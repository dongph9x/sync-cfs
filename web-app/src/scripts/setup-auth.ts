import { query, createPool } from '../lib/db';
import { hashPassword } from '../lib/auth';
import 'dotenv/config';

async function setupAuthTables() {
  console.log('🔧 Setting up authentication tables...');

  // Initialize database pool
  createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_username (username),
        INDEX idx_email (email)
      )
    `);
    console.log('✅ Users table created');

    // Create sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        INDEX idx_active (is_active)
      )
    `);
    console.log('✅ Sessions table created');

    // Create default admin user
    const adminPassword = 'admin123'; // Change this in production!
    const adminPasswordHash = hashPassword(adminPassword);
    
    try {
      await query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `, ['admin', 'admin@example.com', adminPasswordHash, 'admin']);
      console.log('✅ Default admin user created');
      console.log('📝 Admin credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change these credentials in production!');
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('ℹ️ Admin user already exists');
      } else {
        throw error;
      }
    }

    // Create additional indexes for better performance (ignore if exists)
    try {
      await query(`CREATE INDEX idx_sessions_user_expires ON sessions(user_id, expires_at)`);
      console.log('✅ Performance indexes created');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ Index already exists');
      } else {
        throw error;
      }
    }
    console.log('🎉 Authentication setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up authentication tables:', error);
    throw error;
  }
}

// Run the setup
setupAuthTables()
  .then(() => {
    console.log('✅ Authentication setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Authentication setup failed:', error);
    process.exit(1);
  });
