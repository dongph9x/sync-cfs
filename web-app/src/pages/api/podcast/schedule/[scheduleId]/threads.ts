import type { APIRoute } from 'astro';
import { requireRole } from '../../../../../lib/session';
import { createPool, getThreadsByPodcastSchedule, addThreadToPodcastSchedule, removeThreadFromPodcastSchedule } from '../../../../../lib/db';

export const GET: APIRoute = async ({ request, cookies, params }) => {
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

    // Get threads by podcast schedule
    const threads = await getThreadsByPodcastSchedule(scheduleId);

    return new Response(JSON.stringify({
      success: true,
      threads
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting podcast schedule threads:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Lỗi server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies, params }) => {
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
    const { threadId } = body;

    // Validate input
    if (!threadId || typeof threadId !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Thread ID không hợp lệ'
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

    // Add thread to podcast schedule
    await addThreadToPodcastSchedule(scheduleId, threadId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Thêm thread vào podcast schedule thành công'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error adding thread to podcast schedule:', error);
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

    const body = await request.json();
    const { threadId } = body;

    // Validate input
    if (!threadId || typeof threadId !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Thread ID không hợp lệ'
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

    // Remove thread from podcast schedule
    await removeThreadFromPodcastSchedule(scheduleId, threadId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Gỡ bỏ thread khỏi podcast schedule thành công'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error removing thread from podcast schedule:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Lỗi server'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
