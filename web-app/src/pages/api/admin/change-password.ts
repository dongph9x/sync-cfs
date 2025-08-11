import type { APIRoute } from 'astro';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

let pool: mysql.Pool | null = null;

function createPool() {
  if (pool) return pool;
  
  pool = mysql.createPool({
    host: import.meta.env.MYSQL_HOST || 'localhost',
    port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
    user: import.meta.env.MYSQL_USER || 'root',
    password: import.meta.env.MYSQL_PASSWORD || '',
    database: import.meta.env.MYSQL_DATABASE || 'forum',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  return pool;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const dbPool = createPool();
    
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Vui lòng điền đầy đủ thông tin' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Mật khẩu mới không khớp' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionId = cookies.get('session_id')?.value;
    if (!sessionId) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy phiên đăng nhập' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [sessions] = await dbPool.execute(
      'SELECT user_id FROM sessions WHERE session_id = ? AND expires_at > NOW()',
      [sessionId]
    );

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Phiên đăng nhập đã hết hạn' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = (sessions[0] as any).user_id;

    const [users] = await dbPool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Không tìm thấy người dùng' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isValidPassword = verifyPassword(currentPassword, (users[0] as any).password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Mật khẩu hiện tại không đúng' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newPasswordHash = hashPassword(newPassword);

    await dbPool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, userId]
    );

    return new Response(JSON.stringify({ success: true, message: 'Đổi mật khẩu thành công' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error changing password:', error);
    return new Response(JSON.stringify({ success: false, error: 'Lỗi server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
