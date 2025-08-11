import { createPool } from '../lib/db';
import 'dotenv/config';

async function setupPodcastTables() {
  console.log('🎙️ Setting up podcast tables...');

  // Initialize database
  const pool = createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'forum',
  });

  try {
    // Create podcast_schedules table
    console.log('📅 Creating podcast_schedules table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS podcast_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create podcast_threads table (junction table)
    console.log('🔗 Creating podcast_threads table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS podcast_threads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        podcast_schedule_id INT NOT NULL,
        thread_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (podcast_schedule_id) REFERENCES podcast_schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
        UNIQUE KEY unique_podcast_thread (podcast_schedule_id, thread_id)
      )
    `);

    // Add indexes for better performance
    console.log('📊 Adding indexes...');
    try {
      await pool.execute(`
        CREATE INDEX idx_podcast_schedules_title ON podcast_schedules(title)
      `);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await pool.execute(`
        CREATE INDEX idx_podcast_threads_schedule ON podcast_threads(podcast_schedule_id)
      `);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await pool.execute(`
        CREATE INDEX idx_podcast_threads_thread ON podcast_threads(thread_id)
      `);
    } catch (error: any) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    console.log('✅ Podcast tables created successfully!');

    // Show table structure
    console.log('\n📋 Table structure:');
    
    const [scheduleColumns] = await pool.execute('DESCRIBE podcast_schedules');
    console.log('\n🎙️ podcast_schedules:');
    (scheduleColumns as any[]).forEach((column: any) => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });

    const [threadColumns] = await pool.execute('DESCRIBE podcast_threads');
    console.log('\n🔗 podcast_threads:');
    (threadColumns as any[]).forEach((column: any) => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error setting up podcast tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupPodcastTables()
  .then(() => {
    console.log('✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
