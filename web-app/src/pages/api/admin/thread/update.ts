import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/session';
import { createPool } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Require admin, moderator, or editor role
    await requireRole({ request, cookies } as any, ['admin', 'moderator', 'editor']);

    // Initialize database
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    const body = await request.json();
    const { threadId, channelId, title, author, rank, content } = body;

    if (!threadId || !title || !author) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const pool = createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    // Update thread
    await pool.execute(`
      UPDATE threads 
      SET 
        title = ?,
        author_alias = ?,
        body_html = ?,
        thread_rank = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [title, author, content || null, rank || 1, parseInt(threadId)]);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating thread:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
