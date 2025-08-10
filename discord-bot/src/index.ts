import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { createLogger } from './lib/logger';
import { initializeDatabase, query } from './lib/db';
import { initializeMetrics } from './lib/metrics';
import { loadStaffFromCSV } from './lib/staffLoader';
import { messageHandler } from './handlers/message';
import { threadHandler } from './handlers/thread';
import { CommandHandler } from './lib/commandHandler';
import { smartSync } from './lib/smartSync';
import { getPool } from './lib/db';
import mysql from 'mysql2/promise';

const logger = createLogger('main');

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
    logger.info('🔄 Updating ranks after sync...');
    
    // Create a separate pool with web-app configuration
    const webAppPool = mysql.createPool({
      host: process.env.MYSQL_HOST || "localhost",
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER || "root",
      password: '', // Empty password like web-app
      database: process.env.MYSQL_DATABASE || "forum",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      supportBigNumbers: true,
      bigNumberStrings: true
    } as mysql.PoolOptions);
    
    // Get all channels - using exact same logic as web-app
    const [channelsResult] = await webAppPool.execute(`
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
    
    logger.info(`Found ${channels.length} channels`);
    
    for (const channel of channels) {
      logger.info(`📝 Processing channel: ${channel.name} (${channel.slug})`);
      
      // Get all threads in this channel, ordered by created_at DESC (newest first)
      const [threads] = await webAppPool.execute(`
        SELECT id, title, rank, created_at 
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
      logger.info('🔄 Updating ranks based on created_at order (newest first):');
      for (let i = 0; i < channelThreads.length; i++) {
        const thread = channelThreads[i];
        const newRank = i + 1; // 1, 2, 3, ...
        
        await webAppPool.execute(`
          UPDATE threads 
          SET rank = ?, updated_at = NOW()
          WHERE id = ?
        `, [newRank, thread.id]);
        
        logger.info(`  ${i + 1}. "${thread.title}" - Rank: ${thread.rank} → ${newRank} (Created: ${thread.created_at})`);
      }
      
      logger.info(`✅ Updated ranks for ${channelThreads.length} threads in channel ${channel.name}`);
    }
    
    logger.info('🎉 All ranks updated successfully!');
    
    // Verify the results
    logger.info('🔍 Verifying results...');
    const [verificationResult] = await webAppPool.execute(`
      SELECT 
        COUNT(*) as total_threads,
        COUNT(CASE WHEN rank = 0 OR rank IS NULL THEN 1 END) as threads_without_rank,
        COUNT(CASE WHEN rank > 0 THEN 1 END) as threads_with_rank,
        MIN(rank) as min_rank,
        MAX(rank) as max_rank
      FROM threads
    `);
    
    const stats = (verificationResult as any[])[0];
    logger.info('📊 Final statistics:');
    logger.info(`  - Total threads: ${stats.total_threads}`);
    logger.info(`  - Threads with rank: ${stats.threads_with_rank}`);
    logger.info(`  - Threads without rank: ${stats.threads_without_rank}`);
    logger.info(`  - Rank range: ${stats.min_rank} - ${stats.max_rank}`);
    
    if (stats.threads_without_rank === 0) {
      logger.info('✅ All threads now have proper rank values!');
    } else {
      logger.warn(`⚠️ Still ${stats.threads_without_rank} threads without rank`);
    }
    
    // Close the web-app pool
    await webAppPool.end();
    
  } catch (error) {
    logger.error('❌ Error updating ranks after sync:', error);
    throw error;
  }
}

async function main() {
    try {
        // Initialize metrics
        initializeMetrics();
        logger.info('Metrics initialized');

        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized');

        // Load staff from CSV if exists
        if (process.env.STAFF_CSV_PATH) {
            await loadStaffFromCSV(process.env.STAFF_CSV_PATH);
            logger.info('Staff roles loaded from CSV');
        }

        // Initialize Discord client
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.Message, Partials.Channel, Partials.Reaction],
        });

        // Initialize command handler
        const commandHandler = new CommandHandler(client);
        await commandHandler.loadCommands();

        // Check run mode configuration
        const runMode = process.env.RUN_MODE || 'watch'; // 'watch' or 'once'
        const exitAfterSync = process.env.EXIT_AFTER_SYNC === 'true';

        logger.info({ runMode, exitAfterSync }, 'Bot configuration');

        // Set up Discord event handlers
        client.on('ready', async () => {
            logger.info(`Bot logged in as ${client.user?.tag}`);

            // Register commands only in watch mode or if explicitly enabled
            if ((runMode === 'watch' || process.env.REGISTER_COMMANDS === 'true') && client.user && process.env.DISCORD_TOKEN) {
                try {
                    // Use guild ID for faster command registration during development
                    const guildId = process.env.DISCORD_GUILD_ID;
                    await commandHandler.registerCommands(client.user.id, process.env.DISCORD_TOKEN, guildId);
                } catch (error) {
                    logger.error({ error }, 'Failed to register commands');
                }
            }

            // Run smart sync if enabled
            if (process.env.ENABLE_HISTORICAL_SYNC === 'true') {
                logger.info('Smart sync enabled, starting sync process...');

                try {
                    // Determine if this should be a forced full sync based on environment variables
                    const forceFull = process.env.FORCE_FULL_SYNC === 'true';

                    logger.info({ forceFull }, 'Starting smart sync');

                    await smartSync(client, { forceFull });
                    await updateRanksAfterSync(); // Call the new function here

                    logger.info('Smart sync completed successfully');

                    // Exit after sync if in one-time mode or explicitly configured
                    if (runMode === 'once' || exitAfterSync) {
                        logger.info('Exiting after sync completion as configured');
                        client.destroy();
                        process.exit(0);
                    }

                } catch (error) {
                    logger.error({ error }, 'Smart sync failed');

                    // Exit on sync failure if in one-time mode
                    if (runMode === 'once' || exitAfterSync) {
                        logger.error('Exiting due to sync failure in one-time mode');
                        client.destroy();
                        process.exit(1);
                    }
                }
            } else if (runMode === 'once') {
                // If running in one-time mode but no sync is enabled, log a warning and exit
                logger.warn('Running in one-time mode but ENABLE_HISTORICAL_SYNC is not true. Nothing to do.');
                client.destroy();
                process.exit(0);
            }
        });

        // Set up interaction and message handlers only in watch mode
        if (runMode === 'watch') {
            client.on('interactionCreate', async (interaction) => {
                if (interaction.isChatInputCommand()) {
                    await commandHandler.handleInteraction(interaction);
                }
            });

            client.on('messageCreate', messageHandler);
            client.on('messageUpdate', messageHandler);
            client.on('messageDelete', messageHandler);
            client.on('threadCreate', threadHandler);
            client.on('threadUpdate', threadHandler);

            logger.info('Event handlers registered for watch mode');
        } else {
            logger.info('Skipping event handler registration for one-time mode');
        }

        client.on('error', error => {
            logger.error({ error }, 'Discord client error');
        });

        // Login to Discord
        await client.login(process.env.DISCORD_TOKEN);

        // Graceful shutdown
        const shutdown = (signal: string) => {
            logger.info(`Received ${signal}, shutting down gracefully`);
            client.destroy();
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.fatal({ error }, 'Failed to start application');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
