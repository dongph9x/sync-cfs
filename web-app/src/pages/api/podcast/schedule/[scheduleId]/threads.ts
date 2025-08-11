import type { APIRoute } from 'astro';
import type { APIContext } from 'astro';
import mysql from 'mysql2/promise';

// Database and session functions (copied directly to avoid import issues)
interface DatabaseConfig {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
}

let pool: mysql.Pool | null = null;

function createPool(config: DatabaseConfig): mysql.Pool {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: config.host,
    port: config.port || 3306,
    user: config.user,
    password: config.password || "",
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    supportBigNumbers: true,
    bigNumberStrings: true
  } as mysql.PoolOptions);
  return pool;
}

function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createPool first.');
  }
  return pool;
}

async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  const results = rows as T[];
  return results.length > 0 ? results[0] : null;
}

interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
  role: string;
}

async function getUserBySession(sessionId: string): Promise<User | null> {
  const user = await queryOne<User>(`
    SELECT u.* FROM users u
    JOIN sessions s ON u.id = s.user_id
    WHERE s.session_id = ? AND s.expires_at > NOW() AND s.is_active = TRUE
  `, [sessionId]);

  return user;
}

async function getSessionUser(context: APIContext) {
  const sessionId = context.cookies.get('session_id')?.value;
  
  if (!sessionId) {
    return null;
  }

  try {
    // Initialize database connection
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    const user = await getUserBySession(sessionId);
    return user;
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

async function requireAuth(context: APIContext, redirectTo = '/login') {
  const user = await getSessionUser(context);
  
  if (!user) {
    const url = new URL(context.request.url);
    const returnTo = encodeURIComponent(url.pathname + url.search);
    return context.redirect(`${redirectTo}?returnTo=${returnTo}`);
  }
  
  return user;
}

async function requireRole(context: APIContext, roles: string[], redirectTo = '/login') {
  const user = await requireAuth(context, redirectTo);
  
  if (!roles.includes(user.role)) {
    return context.redirect('/unauthorized');
  }
  
  return user;
}

interface Thread {
  id: string;
  channel_id: string;
  slug: string;
  title: string;
  author_alias: string;
  body_html: string;
  tags: string[];
  reply_count: number;
  thread_rank: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
  channel_name?: string;
  channel_slug?: string;
}

async function getThreadsByPodcastSchedule(podcastScheduleId: number): Promise<Thread[]> {
  const pool = getPool();
  const [rows] = await pool.execute(`
    SELECT t.*, c.name as channel_name, c.slug as channel_slug
    FROM threads t
    JOIN channels c ON t.channel_id = c.id
    JOIN podcast_threads pt ON t.id = pt.thread_id
    WHERE pt.podcast_schedule_id = ? AND t.published = TRUE
    ORDER BY t.thread_rank DESC, t.created_at DESC
  `, [podcastScheduleId]);
  
  return (rows as any[]).map(row => {
    let tags: string[] = [];
    if (row.tags) {
      try {
        tags = JSON.parse(row.tags);
      } catch (error) {
        console.warn(`Failed to parse tags JSON for thread ${row.id}:`, row.tags);
        tags = [];
      }
    }
    
    return {
      id: String(row.id),
      channel_id: String(row.channel_id),
      slug: row.slug,
      title: row.title,
      author_alias: row.author_alias,
      body_html: row.body_html,
      tags: tags,
      reply_count: row.reply_count,
      thread_rank: row.thread_rank,
      published: row.published === 1 || row.published === true,
      created_at: row.created_at,
      updated_at: row.updated_at,
      channel_name: row.channel_name,
      channel_slug: row.channel_slug
    };
  });
}

async function addThreadToPodcastSchedule(podcastScheduleId: number, threadId: string): Promise<void> {
  const pool = getPool();
  await pool.execute(`
    INSERT INTO podcast_threads (podcast_schedule_id, thread_id)
    VALUES (?, ?)
  `, [podcastScheduleId, threadId]);
}

async function removeThreadFromPodcastSchedule(podcastScheduleId: number, threadId: string): Promise<void> {
  const pool = getPool();
  await pool.execute(`
    DELETE FROM podcast_threads 
    WHERE podcast_schedule_id = ? AND thread_id = ?
  `, [podcastScheduleId, threadId]);
}

export const GET: APIRoute = async ({ request, cookies, params }) => {
  try {
    // Initialize database
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum',
    });

    // Require admin, editor, or presenter role
    await requireRole({ request, cookies } as any, ['admin', 'editor', 'presenter']);

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
    // Initialize database
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum',
    });

    // Require admin, editor, or presenter role
    await requireRole({ request, cookies } as any, ['admin', 'editor', 'presenter']);

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
    // Initialize database
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum',
    });

    // Require admin, editor, or presenter role
    await requireRole({ request, cookies } as any, ['admin', 'editor', 'presenter']);

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
