import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { initializeDatabase, query } from './src/lib/db.js';
import { createLogger } from './src/lib/logger.js';

const logger = createLogger('fix-empty-body');

async function fixEmptyBodyThreads() {
    try {
        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized');

        // Get threads with empty body_html
        const emptyThreads = await query(`
            SELECT id, title, channel_id, created_at 
            FROM threads 
            WHERE body_html IS NULL OR body_html = '' OR LENGTH(body_html) = 0
            ORDER BY created_at DESC
        `);

        logger.info({ count: emptyThreads.length }, 'Found threads with empty body_html');

        if (emptyThreads.length === 0) {
            logger.info('No threads with empty body_html found');
            return;
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

        await client.login(process.env.DISCORD_TOKEN);
        logger.info('Discord client logged in');

        let fixedCount = 0;
        let errorCount = 0;

        for (const thread of emptyThreads) {
            try {
                logger.info({ 
                    threadId: thread.id, 
                    title: thread.title 
                }, 'Processing thread');

                // Get thread from Discord
                const discordThread = client.channels.cache.get(thread.id);
                if (!discordThread || !discordThread.isThread()) {
                    logger.warn({ threadId: thread.id }, 'Thread not found in Discord');
                    continue;
                }

                // Fetch starter message
                const starterMessage = await discordThread.fetchStarterMessage();
                if (!starterMessage) {
                    logger.warn({ threadId: thread.id }, 'No starter message found');
                    continue;
                }

                logger.debug({
                    threadId: thread.id,
                    hasStarterMessage: !!starterMessage,
                    isBotMessage: starterMessage.author.bot,
                    hasContent: !!starterMessage.content,
                    contentLength: starterMessage.content?.length || 0
                }, 'Fetched starter message');

                // Process content
                let bodyHtml = '';
                if (starterMessage && starterMessage.content) {
                    const { sanitizeContent, convertToHtml } = await import('./src/lib/sanitizer.js');
                    const sanitizationResult = sanitizeContent(starterMessage.content);
                    bodyHtml = convertToHtml(sanitizationResult.sanitizedContent);

                    // Process images
                    const { processImageUrls } = await import('./src/handlers/image.js');
                    const imageUrls = starterMessage.attachments.map(att => att.url);
                    if (imageUrls.length > 0) {
                        try {
                            const imageData = await processImageUrls(imageUrls);
                            if (imageData.length > 0) {
                                const imageHtml = imageData
                                    .map(img => `<img src="${img.url}" width="${img.width}" height="${img.height}" alt="Image" />`)
                                    .join('<br>');
                                bodyHtml += '<br>' + imageHtml;
                            }
                        } catch (error) {
                            logger.warn({ error, threadId: thread.id }, 'Failed to process images');
                        }
                    }

                    // Update database
                    await query(`
                        UPDATE threads 
                        SET body_html = ?, updated_at = NOW()
                        WHERE id = ?
                    `, [bodyHtml, thread.id]);

                    logger.info({
                        threadId: thread.id,
                        title: thread.title,
                        bodyHtmlLength: bodyHtml.length,
                        isBotMessage: starterMessage.author.bot
                    }, 'Fixed thread body_html');

                    fixedCount++;
                } else {
                    logger.warn({
                        threadId: thread.id,
                        title: thread.title,
                        isBotMessage: starterMessage.author.bot,
                        hasContent: !!starterMessage.content
                    }, 'Skipping thread - no content in starter message');
                }

            } catch (error) {
                logger.error({ error, threadId: thread.id }, 'Error processing thread');
                errorCount++;
            }
        }

        logger.info({
            totalThreads: emptyThreads.length,
            fixedCount,
            errorCount
        }, 'Fix empty body threads completed');

        client.destroy();
        process.exit(0);

    } catch (error) {
        logger.error({ error }, 'Failed to fix empty body threads');
        process.exit(1);
    }
}

fixEmptyBodyThreads();
