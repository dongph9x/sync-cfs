import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/auth';
import { createPool } from '../../../lib/db';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Initialize database connection
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    const sessionId = cookies.get('session_id')?.value;
    
    if (sessionId) {
      // Delete session from database
      await deleteSession(sessionId);
    }

    // Clear session cookie
    cookies.delete('session_id', { path: '/' });

    return redirect('/');

  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookie even if database operation fails
    cookies.delete('session_id', { path: '/' });
    return redirect('/');
  }
};
