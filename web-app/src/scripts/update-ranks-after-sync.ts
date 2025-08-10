import { createPool, getAllChannels } from '../lib/db';

async function updateRanksAfterSync() {
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
    console.log('🔄 Updating ranks after sync...');
    
    const { getPool } = await import('../lib/db');
    const pool = getPool();
    
    // Get all channels
    const channels = await getAllChannels();
    console.log(`Found ${channels.length} channels`);
    
    for (const channel of channels) {
      console.log(`\n📝 Processing channel: ${channel.name} (${channel.slug})`);
      
      // Get all threads in this channel, ordered by created_at DESC (newest first)
      const [threads] = await pool.execute(`
        SELECT id, title, rank, created_at 
        FROM threads 
        WHERE channel_id = ? 
        ORDER BY created_at DESC
      `, [channel.id]);
      
      const channelThreads = threads as any[];
      console.log(`Found ${channelThreads.length} threads in channel`);
      
      if (channelThreads.length === 0) {
        console.log('No threads to process');
        continue;
      }
      
      // Update ranks based on index (newest thread gets rank 1, oldest gets highest rank)
      console.log('🔄 Updating ranks based on created_at order (newest first):');
      for (let i = 0; i < channelThreads.length; i++) {
        const thread = channelThreads[i];
        const newRank = i + 1; // 1, 2, 3, ...
        
        await pool.execute(`
          UPDATE threads 
          SET rank = ?, updated_at = NOW()
          WHERE id = ?
        `, [newRank, thread.id]);
        
        console.log(`  ${i + 1}. "${thread.title}" - Rank: ${thread.rank} → ${newRank} (Created: ${thread.created_at})`);
      }
      
      console.log(`✅ Updated ranks for ${channelThreads.length} threads in channel ${channel.name}`);
    }
    
    console.log('\n🎉 All ranks updated successfully!');
    
    // Verify the results
    console.log('\n🔍 Verifying results...');
    const [verificationResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total_threads,
        COUNT(CASE WHEN rank = 0 OR rank IS NULL THEN 1 END) as threads_without_rank,
        COUNT(CASE WHEN rank > 0 THEN 1 END) as threads_with_rank,
        MIN(rank) as min_rank,
        MAX(rank) as max_rank
      FROM threads
    `);
    
    const stats = (verificationResult as any[])[0];
    console.log('📊 Final statistics:');
    console.log(`  - Total threads: ${stats.total_threads}`);
    console.log(`  - Threads with rank: ${stats.threads_with_rank}`);
    console.log(`  - Threads without rank: ${stats.threads_without_rank}`);
    console.log(`  - Rank range: ${stats.min_rank} - ${stats.max_rank}`);
    
    if (stats.threads_without_rank === 0) {
      console.log('✅ All threads now have proper rank values!');
    } else {
      console.log(`⚠️ Still ${stats.threads_without_rank} threads without rank`);
    }
    
  } catch (error) {
    console.error('❌ Error updating ranks after sync:', error);
    process.exit(1);
  }
}

// Run the script
updateRanksAfterSync();
