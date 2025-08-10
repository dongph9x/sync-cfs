import { initializeDatabase, getPool } from '../lib/db';

async function updateRanksAfterSync() {
  // Initialize database connection
  const dbConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "password",
    database: process.env.MYSQL_DATABASE || "forum",
  };

  // Note: We don't need to createPool here since it's already initialized

  try {
    console.log('🔄 Updating ranks after sync...');
    
    const pool = getPool();
    
    // Get all channels - using exact same logic as web-app
    const [channelsResult] = await pool.execute(`
      SELECT 
        c.*,
        COUNT(t.id) as thread_count
      FROM channels c
      LEFT JOIN threads t ON c.id = t.channel_id
      GROUP BY c.id
      ORDER BY c.position ASC, c.name ASC
    `);
    
    const channels = (channelsResult as any[]).map(row => ({
      ...row,
      id: String(row.id),
      thread_count: parseInt(row.thread_count) || 0
    }));
    
    console.log(`Found ${channels.length} channels`);
    
    for (const channel of channels) {
      console.log(`\n📝 Processing channel: ${channel.name} (${channel.slug})`);
      
      // Get all threads in this channel, ordered by created_at DESC (newest first)
      const [threads] = await pool.execute(`
        SELECT id, title, thread_rank, created_at 
        FROM threads 
        WHERE CAST(channel_id AS CHAR) = ? 
        ORDER BY created_at DESC
      `, [channel.id]);
      
      const channelThreads = threads as any[];
      console.log(`Found ${channelThreads.length} threads in channel`);
      
      if (channelThreads.length === 0) {
        console.log('No threads to process');
        continue;
      }
      
      // Update ranks based on index (newest thread gets rank 1, oldest gets highest rank)
      console.log('🔄 Updating thread_ranks based on created_at order (newest first):');
      for (let i = 0; i < channelThreads.length; i++) {
        const thread = channelThreads[i];
        const newRank = i + 1; // 1, 2, 3, ...
        
        await pool.execute(`
          UPDATE threads 
          SET thread_rank = ?, updated_at = NOW()
          WHERE id = ?
        `, [newRank, thread.id]);
        
        console.log(`  ${i + 1}. "${thread.title}" - Thread Rank: ${thread.thread_rank} → ${newRank} (Created: ${thread.created_at})`);
      }
      
      console.log(`✅ Updated thread_ranks for ${channelThreads.length} threads in channel ${channel.name}`);
    }
    
    console.log('\n🎉 All thread_ranks updated successfully!');
    
    // Verify the results
    console.log('\n🔍 Verifying results...');
    const [verificationResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total_threads,
        COUNT(CASE WHEN thread_rank = 0 OR thread_rank IS NULL THEN 1 END) as threads_without_rank,
        COUNT(CASE WHEN thread_rank > 0 THEN 1 END) as threads_with_rank,
        MIN(thread_rank) as min_rank,
        MAX(thread_rank) as max_rank
      FROM threads
    `);
    
    const stats = (verificationResult as any[])[0];
    console.log('📊 Final statistics:');
    console.log(`  - Total threads: ${stats.total_threads}`);
    console.log(`  - Threads with thread_rank: ${stats.threads_with_rank}`);
    console.log(`  - Threads without thread_rank: ${stats.threads_without_rank}`);
    console.log(`  - Thread rank range: ${stats.min_rank} - ${stats.max_rank}`);
    
    if (stats.threads_without_rank === 0) {
      console.log('✅ All threads now have proper thread_rank values!');
    } else {
      console.log(`⚠️ Still ${stats.threads_without_rank} threads without thread_rank`);
    }
    
  } catch (error) {
    console.error('❌ Error updating ranks after sync:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    // Initialize database connection
    console.log('🔌 Initializing database connection...');
    await initializeDatabase();
    console.log('✅ Database connected successfully!');
    
    // Run the exact web-app logic
    await updateRanksAfterSync();
    
    console.log('\n🎯 Exact web-app logic completed!');
    
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
