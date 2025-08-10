import { ThreadChannel } from 'discord.js';
import { query, queryOne } from '../lib/db';
import { hashUserId } from '../lib/hash';
import { sanitizeContent, convertToHtml } from '../lib/sanitizer';
import { processImages } from './image';
import { getStaffTag } from '../lib/staffLoader';
import { recordDiscordEvent, measureDbQuery } from '../lib/metrics';
import { createLogger } from '../lib/logger';

const logger = createLogger('threadHandler');

export async function threadHandler(thread: ThreadChannel): Promise<void> {
    logger.info({
        threadId: thread.id,
        threadName: thread.name,
        channelId: thread.parentId,
        channelName: thread.parent?.name
    }, 'Thread handler called');

    try {
        await measureDbQuery('thread_handler_total', async () => {
            await handleThreadUpsert(thread);
        });
    } catch (error) {
        logger.error({ error, threadId: thread.id }, 'Error in thread handler');
        throw error;
    }
}

async function handleThreadUpsert(thread: ThreadChannel): Promise<void> {
    // Get the starter message
    const starterMessage = thread.lastMessage || await thread.fetchStarterMessage();
    if (!starterMessage || starterMessage.author.bot) {
        return;
    }

    const authorAlias = hashUserId(starterMessage.author.id);
    const staffTag = await getStaffTag(starterMessage.author.id);

    // Get the maximum rank in the channel for this thread
    let rank = 0;
    try {
        const [maxRankResult] = await query(`
            SELECT COALESCE(MAX(thread_rank), 0) as max_rank 
            FROM threads 
            WHERE channel_id = ? AND thread_rank IS NOT NULL
        `, [thread.parentId]);
        
        const maxRank = (maxRankResult as any[])[0]?.max_rank || 0;
        rank = maxRank + 1; // Simple increment by 1
        
        logger.debug({
            threadId: thread.id,
            channelId: thread.parentId,
            maxRank,
            rank
        }, 'Calculated rank for thread');
    } catch (error) {
        logger.warn({ error, threadId: thread.id }, 'Failed to calculate rank, using 0');
        rank = 0;
    }

    // Create channel entry if it doesn't exist
    await measureDbQuery('upsert_channel', async () => {
        await query(`
      INSERT INTO channels (id, slug, name, description, position, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        position = VALUES(position)
    `, [
            thread.parentId!,
            thread.parent!.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            thread.parent!.name,
            thread.parent!.topic || null,
            thread.parent!.position || 0,
            new Date(),
        ]);
    });

    // Sanitize thread content
    const sanitizationResult = sanitizeContent(starterMessage.content || '');
    let htmlContent = convertToHtml(sanitizationResult.sanitizedContent);

    // Process images if any
    const imageData = await processImages(starterMessage.attachments);
    if (imageData.length > 0) {
        const imageHtml = imageData
            .map((img: any) => `<img src="${img.url}" width="${img.width}" height="${img.height}" alt="Image" />`)
            .join('<br>');
        htmlContent += '<br>' + imageHtml;
    }

    // Extract tags from thread (if any)
    const tags = thread.appliedTags || [];
    const tagNames = tags.length > 0 ?
        tags.map((tagId: string) => {
            if ('availableTags' in thread.parent! && thread.parent.availableTags) {
                const tag = thread.parent.availableTags.find((t: any) => t.id === tagId);
                return tag?.name || tagId;
            }
            return tagId;
        }).filter(Boolean) : null;

    // Get current reply count
    const replyCount = await measureDbQuery('count_replies', async () => {
        const result = await queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM posts WHERE thread_id = ?
    `, [thread.id]);
        return result?.count || 0;
    });

    // Create thread slug from title
    const slug = thread.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 255);

    // Upsert thread with rank
    await measureDbQuery('upsert_thread', async () => {
        await query(`
      INSERT INTO threads (
        id, channel_id, slug, title, author_alias, body_html, 
        tags, reply_count, thread_rank, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        body_html = VALUES(body_html),
        tags = VALUES(tags),
        reply_count = VALUES(reply_count),
        thread_rank = VALUES(thread_rank),
        updated_at = VALUES(updated_at)
    `, [
            thread.id,
            thread.parentId!,
            slug,
            thread.name,
            authorAlias,
            htmlContent,
            tagNames ? JSON.stringify(tagNames) : null,
            replyCount,
            rank, // Use the calculated rank
            starterMessage.createdAt,
            new Date(), // Use current time for updated_at since threads don't have editedTimestamp
        ]);
    });

    logger.info({
        threadId: thread.id,
        channelId: thread.parentId,
        slug,
        title: thread.name,
        authorAlias,
        staffTag,
        replyCount,
        tags: tagNames,
        rank
    }, 'Thread upserted');
}
