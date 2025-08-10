import { query, initializeDatabase } from '../lib/db';
import { createLogger } from '../lib/logger';

const logger = createLogger('test-smart-sync-ranks');

interface Channel {
  id: string;
  discord_id: string;
  slug: string;
  name: string;
}

async function getAllChannels(): Promise<Channel[]> {
  const result = await query<Channel>(`
    SELECT id, id as discord_id, slug, name 
    FROM channels 
    ORDER BY position ASC
  `);
  return result;
}

async function updateRanksAfterSync(): Promise<void> {
  console.log('\n🔄 Updating ranks based on created_at order...');
  
  try {
    // Get all channels
    const channels = await getAllChannels();
    console.log(`Found ${channels.length} channels to update ranks`);
    
    for (const channel of channels) {
      console.log(`\n📝 Processing channel: ${channel.name} (${channel.slug})`);
      
      // Get all threads in this channel, ordered by created_at DESC (newest first)
      const [threads] = await query<any>(`
        SELECT id, title, thread_rank, created_at
        FROM threads 
        WHERE channel_id = ? 
        ORDER BY created_at DESC
      `, [channel.id]);
      
      const channelThreads = threads as any[] || [];
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
        
        await query(`
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
    const [verificationResult] = await query<any>(`
      SELECT 
        COUNT(*) as total_threads,
        COUNT(CASE WHEN thread_rank = 0 OR thread_rank IS NULL THEN 1 END) as threads_without_rank,
        COUNT(CASE WHEN thread_rank > 0 THEN 1 END) as threads_with_rank,
        MIN(thread_rank) as min_rank,
        MAX(thread_rank) as max_rank
      FROM threads
    `);
    
    const stats = (verificationResult as any[])[0] || {};
    console.log('📊 Final statistics:');
    console.log(`  - Total threads: ${stats.total_threads || 0}`);
    console.log(`  - Threads with thread_rank: ${stats.threads_with_rank || 0}`);
    console.log(`  - Threads without thread_rank: ${stats.threads_without_rank || 0}`);
    console.log(`  - Thread rank range: ${stats.min_rank || 0} - ${stats.max_rank || 0}`);
    
    if ((stats.threads_without_rank || 0) === 0) {
      console.log('✅ All threads now have proper thread_rank values!');
    } else {
      console.log(`⚠️ Still ${stats.threads_without_rank || 0} threads without thread_rank`);
    }
    
    console.log('\n🎯 Test completed successfully!');
    console.log('💡 This demonstrates the integrated rank update logic.');
    console.log('🚀 When you have Discord token configured, use: npm run smart-sync');
    
  } catch (error) {
    console.error('❌ Error updating ranks after sync:', error);
    logger.error({ error }, 'Failed to update ranks after sync');
    throw error;
  }
}

async function testSmartSyncRanks() {
  console.log('🧪 Testing Smart Sync with Integrated Rank Update...\n');
  
  try {
    // Initialize database connection
    console.log('🔌 Initializing database connection...');
    await initializeDatabase();
    console.log('✅ Database connected successfully!');
    
    console.log('🔄 Step 1: Simulating smart sync completion...');
    console.log('✅ Smart sync completed successfully! (simulated)');
    
    // Test the integrated rank update logic
    await updateRanksAfterSync();
    
    console.log('\n🎯 Complete workflow test finished successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSmartSyncRanks();
