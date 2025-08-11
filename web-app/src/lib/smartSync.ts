import { query } from './db';
import { createLogger } from './logger';

const logger = createLogger('smartSync');

export interface SmartSyncOptions {
    forceFull?: boolean;
}

interface SyncState {
    last_sync: string;
    is_first_run: number;
}

interface SyncStats {
    mode: 'full' | 'delta';
    guildsProcessed: number;
    channelsProcessed: number;
    threadsProcessed: number;
    postsProcessed: number;
    errorsEncountered: number;
    startTime: Date;
    endTime?: Date;
    durationMs?: number;
}

export async function smartSync(
    client: any,
    options: SmartSyncOptions = {}
): Promise<void> {
    const stats: SyncStats = {
        mode: 'full',
        guildsProcessed: 0,
        channelsProcessed: 0,
        threadsProcessed: 0,
        postsProcessed: 0,
        errorsEncountered: 0,
        startTime: new Date(),
    };

    logger.info({ options }, 'Starting smart sync from web-app');

    try {
        // Get current sync state
        const syncState = await getSyncState();

        // Determine sync mode
        if (options.forceFull || syncState.is_first_run === 1) {
            stats.mode = 'full';
            logger.info({ syncState, forceFull: options.forceFull }, 'Running full historical sync');
            await runFullSync(client, stats);
        } else {
            stats.mode = 'delta';
            const lastSyncDate = new Date(syncState.last_sync);
            logger.info({ lastSync: lastSyncDate }, 'Running delta sync since last sync');
            await runDeltaSync(client, stats, lastSyncDate);
        }

        // Update sync state
        await updateSyncState();

        stats.endTime = new Date();
        stats.durationMs = stats.endTime.getTime() - stats.startTime.getTime();

        logger.info({
            mode: stats.mode,
            guildsProcessed: stats.guildsProcessed,
            channelsProcessed: stats.channelsProcessed,
            threadsProcessed: stats.threadsProcessed,
            postsProcessed: stats.postsProcessed,
            errorsEncountered: stats.errorsEncountered,
            durationMs: stats.durationMs,
        }, 'Smart sync completed');

    } catch (error) {
        stats.errorsEncountered++;
        logger.error({ error, stats }, 'Smart sync failed');
        throw error;
    }
}

async function getSyncState(): Promise<SyncState> {
    try {
        const result = await query<{ value: string }>(`
            SELECT value FROM config WHERE key_name = 'sync_state'
        `);

        if (result.length === 0 || !result[0]) {
            throw new Error('Sync state not found in config table');
        }

        const syncState = JSON.parse(result[0].value);
        return syncState;
    } catch (error) {
        logger.warn({ error }, 'Failed to get sync state, assuming first run');
        return {
            last_sync: new Date(0).toISOString(),
            is_first_run: 1
        };
    }
}

async function updateSyncState(): Promise<void> {
    const syncState = {
        last_sync: new Date().toISOString(),
        is_first_run: 0
    };

    await query(`
        INSERT INTO config (key_name, value, updated_at) 
        VALUES ('sync_state', ?, NOW())
        ON DUPLICATE KEY UPDATE 
        value = VALUES(value), 
        updated_at = NOW()
    `, [JSON.stringify(syncState)]);
}

async function runFullSync(client: any, stats: SyncStats): Promise<void> {
    logger.info('Running full sync from web-app');
    
    try {
        // Get all existing channels from database
        const channels = await query<{ id: string; slug: string; name: string }>(`
            SELECT id, slug, name 
            FROM channels 
            ORDER BY position ASC
        `);
        
        logger.info(`Found ${channels.length} channels for full sync`);
        stats.channelsProcessed = channels.length;
        
        // Process each channel
        for (const channel of channels) {
            logger.info(`Processing channel: ${channel.name} (${channel.slug})`);
            
            // Get all threads in this channel
            const threads = await query<{ id: string; title: string; created_at: Date }>(`
                SELECT id, title, created_at 
                FROM threads 
                WHERE channel_id = ? 
                ORDER BY created_at ASC
            `, [channel.id]);
            
            logger.info(`Found ${threads.length} threads in channel ${channel.name}`);
            stats.threadsProcessed += threads.length;
            
            // Process each thread
            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                const rank = i + 1; // 1, 2, 3, ...
                
                // Update thread rank
                await query(`
                    UPDATE threads 
                    SET thread_rank = ?, updated_at = NOW()
                    WHERE id = ?
                `, [rank, thread.id]);
                
                logger.info(`  Updated thread "${thread.title}" with rank ${rank}`);
            }
            
            // Get posts count for this channel
            const postsResult = await query(`
                SELECT COUNT(*) as post_count
                FROM posts p
                JOIN threads t ON p.thread_id = t.id
                WHERE t.channel_id = ?
            `, [channel.id]);
            
            const postCount = postsResult[0]?.post_count || 0;
            stats.postsProcessed += postCount;
            
            logger.info(`Channel ${channel.name} processed: ${threads.length} threads, ${postCount} posts`);
        }
        
        stats.guildsProcessed = 1; // We're processing one "guild" (our database)
        
        logger.info('Full sync completed successfully');
        
    } catch (error) {
        stats.errorsEncountered++;
        logger.error({ error }, 'Error during full sync');
        throw error;
    }
}

async function runDeltaSync(client: any, stats: SyncStats, lastSyncDate: Date): Promise<void> {
    logger.info('Running delta sync from web-app since', lastSyncDate.toISOString());
    
    try {
        // Get all existing channels from database
        const channels = await query<{ id: string; slug: string; name: string }>(`
            SELECT id, slug, name 
            FROM channels 
            ORDER BY position ASC
        `);
        
        logger.info(`Found ${channels.length} channels for delta sync`);
        stats.channelsProcessed = channels.length;
        
        // Process each channel
        for (const channel of channels) {
            logger.info(`Processing channel: ${channel.name} (${channel.slug})`);
            
            // Get threads created after last sync date
            const threads = await query<{ id: string; title: string; created_at: Date }>(`
                SELECT id, title, created_at 
                FROM threads 
                WHERE channel_id = ? AND created_at > ?
                ORDER BY created_at ASC
            `, [channel.id, lastSyncDate]);
            
            logger.info(`Found ${threads.length} new threads in channel ${channel.name} since ${lastSyncDate.toISOString()}`);
            stats.threadsProcessed += threads.length;
            
            // Process each new thread
            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                const rank = i + 1; // 1, 2, 3, ...
                
                // Update thread rank
                await query(`
                    UPDATE threads 
                    SET thread_rank = ?, updated_at = NOW()
                    WHERE id = ?
                `, [rank, thread.id]);
                
                logger.info(`  Updated new thread "${thread.title}" with rank ${rank}`);
            }
            
            // Get new posts count for this channel since last sync
            const postsResult = await query(`
                SELECT COUNT(*) as post_count
                FROM posts p
                JOIN threads t ON p.thread_id = t.id
                WHERE t.channel_id = ? AND p.created_at > ?
            `, [channel.id, lastSyncDate]);
            
            const postCount = postsResult[0]?.post_count || 0;
            stats.postsProcessed += postCount;
            
            logger.info(`Channel ${channel.name} delta processed: ${threads.length} new threads, ${postCount} new posts`);
        }
        
        stats.guildsProcessed = 1; // We're processing one "guild" (our database)
        
        logger.info('Delta sync completed successfully');
        
    } catch (error) {
        stats.errorsEncountered++;
        logger.error({ error }, 'Error during delta sync');
        throw error;
    }
}

export async function updateRanksAfterSync(): Promise<void> {
    try {
        logger.info('🔄 Updating thread_ranks after sync...');
        
        // Get all channels
        const channels = await query<{ id: string; slug: string; name: string }>(`
            SELECT id, slug, name 
            FROM channels 
            ORDER BY position ASC
        `);
        
        logger.info(`Found ${channels.length} channels to update ranks`);
        
        for (const channel of channels) {
            logger.info(`📝 Processing channel: ${channel.name} (${channel.slug})`);
            
            // Get all threads in this channel, ordered by created_at DESC (newest first)
            const threads = await query<{ id: string; title: string; thread_rank: number; created_at: Date }>(`
                SELECT id, title, thread_rank, created_at 
                FROM threads 
                WHERE channel_id = ? 
                ORDER BY created_at DESC
            `, [channel.id]);
            
            logger.info(`Found ${threads.length} threads in channel`);
            
            if (threads.length === 0) {
                logger.info('No threads to process');
                continue;
            }
            
            // Update ranks based on index (newest thread gets rank 1, oldest gets highest rank)
            logger.info('🔄 Updating thread_ranks based on created_at order (newest first):');
            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                const newRank = i + 1; // 1, 2, 3, ...
                
                await query(`
                    UPDATE threads 
                    SET thread_rank = ?, updated_at = NOW()
                    WHERE id = ?
                `, [newRank, thread.id]);
                
                logger.info(`  ${i + 1}. "${thread.title}" - Thread Rank: ${thread.thread_rank} → ${newRank} (Created: ${thread.created_at})`);
            }
            
            logger.info(`✅ Updated thread_ranks for ${threads.length} threads in channel ${channel.name}`);
        }
        
        logger.info('🎉 All thread_ranks updated successfully!');
        
        // Verify the results
        logger.info('🔍 Verifying results...');
        const verificationResult = await query(`
            SELECT 
                COUNT(*) as total_threads,
                COUNT(CASE WHEN thread_rank = 0 OR thread_rank IS NULL THEN 1 END) as threads_without_rank,
                COUNT(CASE WHEN thread_rank > 0 THEN 1 END) as threads_with_rank,
                MIN(thread_rank) as min_rank,
                MAX(thread_rank) as max_rank
            FROM threads
        `);
        
        logger.info('Verification results:', verificationResult[0]);
        
    } catch (error) {
        logger.error({ error }, 'Failed to update thread ranks');
        throw error;
    }
}
