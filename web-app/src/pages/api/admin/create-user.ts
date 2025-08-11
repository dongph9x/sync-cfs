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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const dbPool = createPool();
    
    const body = await request.json();
    const { username, role } = body;

    // Validation
    if (!username || !role) {
      return new Response(JSON.stringify({ success: false, error: 'Vui lòng điền đầy đủ thông tin' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Auto-generate email and password
    const email = `${username}@gmail.com`;
    const password = '112233';

    // Validate role
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ success: false, error: 'Role không hợp lệ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists
    const [existingUsers] = await dbPool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'Username đã tồn tại' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    console.log('Creating user with data:', { username, email, role });
    
    const [result] = await dbPool.execute(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())',
      [username, email, passwordHash, role]
    );

    console.log('Insert result:', result);

    // Check if insert was successful
    if (result && typeof result === 'object' && 'insertId' in result) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Tạo user thành công! Username: ${username}, Email: ${email}, Password: ${password}`,
        userId: result.insertId,
        userInfo: { username, email, password, role }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('Unexpected result format:', result);
      throw new Error('Failed to create user');
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Lỗi server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
