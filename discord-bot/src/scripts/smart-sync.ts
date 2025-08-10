import { Client, GatewayIntentBits } from 'discord.js';
import { smartSync } from '../lib/smartSync';
import { query } from '../lib/db';
import { createLogger } from '../lib/logger';

const logger = createLogger('smart-sync-script');

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
  try {
    logger.info('🔄 Updating thread_ranks after sync...');
    
    // Get all channels
    const channels = await getAllChannels();
    logger.info(`Found ${channels.length} channels to update ranks`);
    
    for (const channel of channels) {
      logger.info(`📝 Processing channel: ${channel.name} (${channel.slug})`);
      
      // Get all threads in this channel, ordered by created_at DESC (newest first)
      const [threads] = await query<any>(`
        SELECT id, title, thread_rank, created_at 
        FROM threads 
        WHERE channel_id = ? 
        ORDER BY created_at DESC
      `, [channel.id]);
      
      const channelThreads = threads as any[];
      logger.info(`Found ${channelThreads.length} threads in channel`);
      
      if (channelThreads.length === 0) {
        logger.info('No threads to process');
        continue;
      }
      
      // Update ranks based on index (newest thread gets rank 1, oldest gets highest rank)
      logger.info('🔄 Updating thread_ranks based on created_at order (newest first):');
      for (let i = 0; i < channelThreads.length; i++) {
        const thread = channelThreads[i];
        const newRank = i + 1; // 1, 2, 3, ...
        
        await query(`
          UPDATE threads 
          SET thread_rank = ?, updated_at = NOW()
          WHERE id = ?
        `, [newRank, thread.id]);
        
        logger.info(`  ${i + 1}. "${thread.title}" - Thread Rank: ${thread.thread_rank} → ${newRank} (Created: ${thread.created_at})`);
      }
      
      logger.info(`✅ Updated thread_ranks for ${channelThreads.length} threads in channel ${channel.name}`);
    }
    
    logger.info('🎉 All thread_ranks updated successfully!');
    
    // Verify the results
    logger.info('🔍 Verifying results...');
    const [verificationResult] = await query<any>(`
      SELECT 
        COUNT(*) as total_threads,
        COUNT(CASE WHEN thread_rank = 0 OR thread_rank IS NULL THEN 1 END) as threads_without_rank,
        COUNT(CASE WHEN thread_rank > 0 THEN 1 END) as threads_with_rank,
        MIN(thread_rank) as min_rank,
        MAX(thread_rank) as max_rank
      FROM threads
    `);
    
    const stats = (verificationResult as any[])[0];
    logger.info('📊 Final statistics:', {
      total_threads: stats.total_threads,
      threads_with_rank: stats.threads_with_rank,
      threads_without_rank: stats.threads_without_rank,
      rank_range: `${stats.min_rank} - ${stats.max_rank}`
    });
    
    if (stats.threads_without_rank === 0) {
      logger.info('✅ All threads now have proper thread_rank values!');
    } else {
      logger.warn(`⚠️ Still ${stats.threads_without_rank} threads without thread_rank`);
    }
    
  } catch (error) {
    logger.error({ error }, 'Failed to update thread_ranks after sync');
    throw error;
  }
}

async function runSmartSync() {
  console.log('🚀 Starting Smart Sync with automatic rank update...');
  
  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  try {
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    console.log('✅ Connected to Discord');

    // Get all channels from database
    const channels = await getAllChannels();
    console.log(`📋 Found ${channels.length} channels to sync`);

    // Run smart sync with forceFull option
    await smartSync(client, { forceFull: true });
    
    console.log('\n🎉 Smart sync completed successfully!');
    
    // Automatically update ranks after sync completion
    await updateRanksAfterSync();
    
    console.log('\n🎯 Complete workflow finished successfully!');
    
  } catch (error) {
    console.error('❌ Smart sync failed:', error);
    logger.error({ error }, 'Smart sync failed');
    process.exit(1);
  } finally {
    // Cleanup
    client.destroy();
    console.log('👋 Disconnected from Discord');
  }
}

// Run the smart sync
runSmartSync();
