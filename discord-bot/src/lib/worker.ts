import { createLogger } from './logger';
import { smartSync } from './smartSync';
import { getPool } from './db';
import mysql from 'mysql2/promise';

const logger = createLogger('worker');

interface Channel {
  id: string;
  discord_id: string;
  slug: string;
  name: string;
}

async function getAllChannels(): Promise<Channel[]> {
  const pool = getPool();
  const result = await pool.execute(`
    SELECT id, id as discord_id, slug, name 
    FROM channels 
    ORDER BY position ASC
  `);
  return result[0] as Channel[];
}

async function updateRanksAfterSync(): Promise<void> {
  try {
    logger.info('🔄 Updating thread_ranks after sync...');
    
    // Create a separate pool for this operation with web-app config
    const webAppPool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || 'forum',
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    
    // Get all channels
    const channels = await getAllChannels();
    logger.info(`Found ${channels.length} channels to update ranks`);
    
    for (const channel of channels) {
      logger.info(`📝 Processing channel: ${channel.name} (${channel.slug})`);
      
      // Get all threads in this channel, ordered by created_at DESC (newest first)
      const [threads] = await webAppPool.execute(`
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
        
        await webAppPool.execute(`
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
    const [verificationResult] = await webAppPool.execute(`
      SELECT 
        COUNT(*) as total_threads,
        COUNT(CASE WHEN thread_rank = 0 OR thread_rank IS NULL THEN 1 END) as threads_without_rank,
        COUNT(CASE WHEN thread_rank > 0 THEN 1 END) as threads_with_rank,
        MIN(thread_rank) as min_rank,
        MAX(thread_rank) as max_rank
      FROM threads
    `);
    
    const stats = verificationResult as any[];
    logger.info('📊 Final statistics:');
    logger.info(`  Total threads: ${stats[0].total_threads}`);
    logger.info(`  Threads without rank: ${stats[0].threads_without_rank}`);
    logger.info(`  Threads with rank: ${stats[0].threads_with_rank}`);
    logger.info(`  Rank range: ${stats[0].min_rank} - ${stats[0].max_rank}`);
    
    await webAppPool.end();
    
  } catch (error) {
    logger.error('❌ Error updating thread ranks:', error);
    throw error;
  }
}

export async function runScheduledSync(client: any): Promise<void> {
  try {
    logger.info('🚀 Starting scheduled sync...');
    
    // Run smartSync with forceFull = false (delta sync)
    await smartSync(client, { forceFull: false });
    
    // Update ranks after sync
    await updateRanksAfterSync();
    
    logger.info('✅ Scheduled sync completed successfully!');
  } catch (error) {
    logger.error('❌ Error during scheduled sync:', error);
    throw error;
  }
}

export function startScheduledWorker(client: any): void {
  const SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  logger.info(`🕐 Starting scheduled worker - sync every ${SYNC_INTERVAL / 1000 / 60} minutes`);
  
  // Run initial sync after 5 minutes
  setTimeout(async () => {
    try {
      logger.info('🔄 Running initial scheduled sync...');
      await runScheduledSync(client);
    } catch (error) {
      logger.error('❌ Initial scheduled sync failed:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  // Set up recurring sync
  setInterval(async () => {
    try {
      logger.info('🔄 Running scheduled sync...');
      await runScheduledSync(client);
    } catch (error) {
      logger.error('❌ Scheduled sync failed:', error);
    }
  }, SYNC_INTERVAL);
  
  logger.info('✅ Scheduled worker started successfully');
}
