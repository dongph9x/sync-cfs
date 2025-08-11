import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/session';
import { getThreadById } from '../../../../lib/db';
import { createPool } from '../../../../lib/db';

export const GET: APIRoute = async ({ params, request, cookies }) => {
  try {
    // Require admin role
    await requireRole({ request, cookies } as any, ['admin', 'moderator']);

    // Initialize database
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    const { threadId } = params;

    if (!threadId) {
      return new Response(JSON.stringify({ success: false, error: 'Thread ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get thread by ID (we need to find the channel first)
    const pool = createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    const [rows] = await pool.execute(`
      SELECT t.*, c.id as channel_id 
      FROM threads t 
      JOIN channels c ON t.channel_id = c.id 
      WHERE t.id = ?
    `, [threadId]);

    if ((rows as any[]).length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Thread not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const thread = (rows as any[])[0];

    return new Response(JSON.stringify({
      success: true,
      thread: {
        id: thread.id,
        title: thread.title,
        author_alias: thread.author_alias,
        body_html: thread.body_html,
        thread_rank: thread.thread_rank,
        slug: thread.slug,
        channel_id: thread.channel_id,
        reply_count: thread.reply_count,
        created_at: thread.created_at,
        updated_at: thread.updated_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting thread:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
