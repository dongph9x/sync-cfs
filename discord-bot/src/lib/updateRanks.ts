import { createLogger } from './logger';
import { query } from './db';
import mysql from 'mysql2/promise';

const logger = createLogger('updateRanks');

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

export async function updateRanksAfterSync(): Promise<void> {
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
    
    const verification = verificationResult as any[];
    logger.info('Verification results:', verification[0]);
    
    // Close the pool
    await webAppPool.end();
    
  } catch (error) {
    logger.error({ error }, 'Failed to update thread ranks');
    throw error;
  }
}
