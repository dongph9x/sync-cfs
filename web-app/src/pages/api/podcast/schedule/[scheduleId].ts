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
  
  if (!roles.includes((user as any).role)) {
    return context.redirect('/unauthorized');
  }
  
  return user;
}

async function updatePodcastSchedule(id: number, title: string, description?: string): Promise<void> {
  const pool = getPool();
  await pool.execute(`
    UPDATE podcast_schedules 
    SET title = ?, description = ?, updated_at = NOW()
    WHERE id = ?
  `, [title, description || null, id]);
}

async function deletePodcastSchedule(id: number): Promise<void> {
  const pool = getPool();
  await pool.execute(`
    DELETE FROM podcast_schedules WHERE id = ?
  `, [id]);
}

export const PUT: APIRoute = async ({ request, cookies, params }) => {
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
