import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/session';
import { createPool, createPodcastSchedule } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Require admin or editor role
    await requireRole({ request, cookies } as any, ['admin', 'editor']);

    const body = await request.json();
    const { title, description } = body;

    // Validate input
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tiêu đề không được để trống'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize database
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum',
    });

    // Create podcast schedule
    const scheduleId = await createPodcastSchedule(title.trim(), description?.trim() || null);

    return new Response(JSON.stringify({
      success: true,
      message: 'Tạo podcast schedule thành công',
      scheduleId
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating podcast schedule:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Lỗi server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
