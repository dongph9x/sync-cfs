import { createPool, getThreadsByChannelSlug, getAllChannels } from '../lib/db';

async function debugSyncProcess() {
  // Initialize database connection
  const dbConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "password",
    database: process.env.MYSQL_DATABASE || "forum",
  };

  createPool(dbConfig);

  try {
    console.log('🔍 Debugging sync process...');
    
    // Check all channels
    console.log('📋 Checking all channels...');
    const channels = await getAllChannels();
    console.log('Available channels:', channels.map(c => ({ id: c.id, slug: c.slug, name: c.name })));
    
    // Check confessions channel specifically
    console.log('\n📝 Checking confessions channel...');
    const confessionsChannel = channels.find(c => c.slug === 'confessions');
    if (confessionsChannel) {
      console.log('Confessions channel found:', confessionsChannel);
      
      // Check threads in confessions channel
      const confessionsThreads = await getThreadsByChannelSlug("confessions");
      console.log(`\n📊 Found ${confessionsThreads.length} threads in confessions channel`);
      
      if (confessionsThreads.length > 0) {
        console.log('Thread details:');
        confessionsThreads.forEach((thread, index) => {
          console.log(`${index + 1}. ID: ${thread.id}`);
          console.log(`   Title: ${thread.title}`);
          console.log(`   Rank: ${thread.rank}`);
          console.log(`   Channel ID: ${thread.channel_id}`);
          console.log(`   Created: ${thread.created_at}`);
          console.log(`   Updated: ${thread.updated_at}`);
          console.log('---');
        });
      }
    } else {
      console.log('❌ Confessions channel not found!');
    }
    
    // Check for threads without rank
    console.log('\n🔍 Checking for threads without rank...');
    const { getPool } = await import('../lib/db');
    const pool = getPool();
    
    const [threadsWithoutRank] = await pool.execute(`
      SELECT id, title, channel_id, rank, created_at 
      FROM threads 
      WHERE rank IS NULL OR rank = 0
      ORDER BY created_at DESC
    `);
    
    if ((threadsWithoutRank as any[]).length > 0) {
      console.log(`⚠️ Found ${(threadsWithoutRank as any[]).length} threads without proper rank:`);
      (threadsWithoutRank as any[]).forEach((thread, index) => {
        console.log(`${index + 1}. ID: ${thread.id}`);
        console.log(`   Title: ${thread.title}`);
        console.log(`   Channel ID: ${thread.channel_id}`);
        console.log(`   Rank: ${thread.rank}`);
        console.log(`   Created: ${thread.created_at}`);
        console.log('---');
      });
    } else {
      console.log('✅ All threads have proper rank values');
    }
    
    // Check database schema
    console.log('\n🔍 Checking database schema...');
    const [columns] = await pool.execute(`
      DESCRIBE threads
    `);
    
    console.log('Threads table columns:');
    (columns as any[]).forEach((column: any) => {
      console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

// Run the debug
debugSyncProcess();
