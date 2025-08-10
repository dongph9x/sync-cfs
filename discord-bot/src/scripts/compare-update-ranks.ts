import { initializeDatabase, getPool } from '../lib/db';
import { createLogger } from '../lib/logger';

const logger = createLogger('compare-update-ranks');

interface Channel {
  id: string;
  discord_id: string;
  slug: string;
  name: string;
}

async function getAllChannels(): Promise<Channel[]> {
  const pool = getPool();
  const [result] = await pool.execute(`
    SELECT id, id as discord_id, slug, name 
    FROM channels 
    ORDER BY position ASC
  `);
  return result as Channel[];
}

async function testWebAppStyle() {
  console.log('\n🧪 Testing WEB-APP style update ranks...');
  
  try {
    const pool = getPool();
    
    // Get all channels
    const channels = await getAllChannels();
    console.log(`Found ${channels.length} channels`);
    
    for (const channel of channels) {
      console.log(`\n📝 Processing channel: ${channel.name} (${channel.slug})`);
      console.log(`Channel ID: ${channel.id} (type: ${typeof channel.id})`);
      
      // Get all threads in this channel, ordered by created_at DESC (newest first)
      const [threads] = await pool.execute(`
        SELECT id, title, thread_rank, created_at, channel_id
        FROM threads 
        WHERE channel_id = ? 
        ORDER BY created_at DESC
      `, [channel.id]);
      
      const channelThreads = threads as any[];
      console.log(`Found ${channelThreads.length} threads in channel`);
      
      if (channelThreads.length > 0) {
        console.log('Sample thread data:');
        console.log(`  - Thread ID: ${channelThreads[0].id} (type: ${typeof channelThreads[0].id})`);
        console.log(`  - Channel ID: ${channelThreads[0].channel_id} (type: ${typeof channelThreads[0].channel_id})`);
        console.log(`  - Current Rank: ${channelThreads[0].thread_rank}`);
      }
      
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
    console.error('❌ Error in web-app style:', error);
    throw error;
  }
}

async function main() {
  console.log('🔍 Comparing update ranks logic...');
  
  try {
    // Initialize database connection
    console.log('🔌 Initializing database connection...');
    await initializeDatabase();
    console.log('✅ Database connected successfully!');
    
    // Test web-app style
    await testWebAppStyle();
    
    console.log('\n🎯 Comparison completed!');
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    process.exit(1);
  }
}

// Run the comparison
main();
