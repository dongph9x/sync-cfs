import { createPool } from '../lib/db';
import 'dotenv/config';

async function addPublishedField() {
  console.log('🔧 Adding published field to threads table...');

  // Initialize database pool
  createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  try {
    // Add published column to threads table
    await createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'forum',
    }).execute(`
      ALTER TABLE threads 
      ADD COLUMN published BOOLEAN DEFAULT TRUE,
      ADD INDEX idx_published (published)
    `);
    
    console.log('✅ Published field added to threads table');
    console.log('✅ Index created for published field');

    // Update existing threads to be published by default
    await createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'forum',
    }).execute(`
      UPDATE threads 
      SET published = TRUE 
      WHERE published IS NULL
    `);
    
    console.log('✅ Existing threads set to published by default');

    console.log('🎉 Published field setup completed successfully!');

  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Published field already exists');
    } else {
      console.error('❌ Error adding published field:', error);
      throw error;
    }
  }
}

// Run the setup
addPublishedField()
  .then(() => {
    console.log('✅ Published field setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Published field setup failed:', error);
    process.exit(1);
  });
