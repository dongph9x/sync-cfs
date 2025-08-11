import { createPool } from '../lib/db';
import { hashPassword } from '../lib/auth';
import 'dotenv/config';

async function createPresenterUser() {
  console.log('🎤 Creating presenter user...');

  // Initialize database pool
  createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  try {
    const username = 'presenter';
    const email = 'presenter@gmail.com';
    const password = '112233';
    const role = 'presenter';

    // Check if user already exists
    const pool = createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'forum'
    });
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      console.log('ℹ️ Presenter user already exists');
      return;
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    console.log('Creating presenter user with data:', { username, email, role });
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())',
      [username, email, passwordHash, role]
    );

    console.log('✅ Presenter user created successfully!');
    console.log('📝 Presenter credentials:');
    console.log('   Username: presenter');
    console.log('   Email: presenter@gmail.com');
    console.log('   Password: 112233');
    console.log('   Role: presenter');

  } catch (error) {
    console.error('❌ Error creating presenter user:', error);
    throw error;
  }
}

// Run the script
createPresenterUser()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
