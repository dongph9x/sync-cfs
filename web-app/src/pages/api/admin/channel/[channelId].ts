import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/session';
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

    const { channelId } = params;

    if (!channelId) {
      return new Response(JSON.stringify({ success: false, error: 'Channel ID is required' }), {
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

    const [rows] = await pool.execute(`
      SELECT * FROM channels WHERE id = ?
    `, [channelId]);

    if ((rows as any[]).length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Channel not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const channel = (rows as any[])[0];

    return new Response(JSON.stringify({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        position: channel.position
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting channel:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
