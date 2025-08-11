import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { createLogger } from '../lib/logger';
import { initializeDatabase } from '../lib/db';
import { runScheduledSync } from '../lib/worker';

const logger = createLogger('test-worker');

async function main() {
    try {
        logger.info('🚀 Starting test worker...');

        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized');

        // Initialize Discord client
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.Message, Partials.Channel, Partials.Reaction],
        });

        // Login to Discord
        await client.login(process.env.DISCORD_TOKEN);
        logger.info('Discord client logged in');

        // Wait a moment for client to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Run scheduled sync
        logger.info('🔄 Running test scheduled sync...');
        await runScheduledSync(client);
        logger.info('✅ Test scheduled sync completed!');

        // Cleanup
        client.destroy();
        process.exit(0);

    } catch (error) {
        logger.error('❌ Test worker failed:', error);
        process.exit(1);
    }
}

main();
