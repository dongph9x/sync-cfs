import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/session';
import { createPool } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Require admin role only
    await requireRole({ request, cookies } as any, ['admin']);

    // Initialize database
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    const body = await request.json();
    const { threadId, published } = body;

    if (threadId === undefined || published === undefined) {
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

    // Update thread published status
    await pool.execute(`
      UPDATE threads 
      SET published = ?, updated_at = NOW()
      WHERE id = ?
    `, [published ? 1 : 0, threadId]);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Thread ${published ? 'published' : 'unpublished'} successfully` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error toggling thread published status:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
