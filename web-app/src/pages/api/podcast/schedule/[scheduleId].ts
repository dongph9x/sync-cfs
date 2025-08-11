import type { APIRoute } from 'astro';
import { requireRole } from '../../../../../lib/session';
import { createPool, updatePodcastSchedule, deletePodcastSchedule } from '../../../../../lib/db';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  try {
    // Require admin or editor role
    await requireRole({ request, cookies } as any, ['admin', 'editor']);

    const scheduleId = parseInt(params.scheduleId!);
    if (isNaN(scheduleId)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ID schedule không hợp lệ'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    // Update podcast schedule
    await updatePodcastSchedule(scheduleId, title.trim(), description?.trim() || null);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cập nhật podcast schedule thành công'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating podcast schedule:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Lỗi server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies, params }) => {
  try {
    // Require admin or editor role
    await requireRole({ request, cookies } as any, ['admin', 'editor']);

    const scheduleId = parseInt(params.scheduleId!);
    if (isNaN(scheduleId)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ID schedule không hợp lệ'
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

    // Delete podcast schedule
    await deletePodcastSchedule(scheduleId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Xóa podcast schedule thành công'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting podcast schedule:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Lỗi server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
