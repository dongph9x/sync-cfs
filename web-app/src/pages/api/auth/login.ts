import type { APIRoute } from 'astro';
import { authenticateUser, createSession } from '../../../lib/auth';
import { createPool } from '../../../lib/db';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Initialize database connection
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    const formData = await request.formData();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const returnTo = formData.get('returnTo') as string || '/dashboard';

    if (!username || !password) {
      return redirect('/login?error=missing_fields');
    }

    // Authenticate user
    const user = await authenticateUser(username, password);

    if (!user) {
      return redirect('/login?error=invalid_credentials');
    }

    // Create session
    const sessionId = await createSession(user.id);

    // Set session cookie
    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Redirect to intended page
    return redirect(returnTo);

  } catch (error) {
    console.error('Login error:', error);
    return redirect('/login?error=server_error');
  }
};
