import type { APIContext } from 'astro';
import { getUserBySession } from './auth';
import { createPool } from './db';

export interface AuthenticatedContext extends APIContext {
  user: any;
  isAuthenticated: boolean;
}

export async function getSessionUser(context: APIContext) {
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

export async function requireAuth(context: APIContext, redirectTo = '/login') {
  const user = await getSessionUser(context);
  
  if (!user) {
    const url = new URL(context.request.url);
    const returnTo = encodeURIComponent(url.pathname + url.search);
    return context.redirect(`${redirectTo}?returnTo=${returnTo}`);
  }
  
  return user;
}

export async function requireRole(context: APIContext, roles: string[], redirectTo = '/login') {
  const user = await requireAuth(context, redirectTo);
  
  // If requireAuth returned a Response (redirect), return it
  if (user instanceof Response) {
    return user;
  }
  
  if (!roles.includes(user.role)) {
    return context.redirect('/unauthorized');
  }
  
  return user;
}

export async function optionalAuth(context: APIContext) {
  return await getSessionUser(context);
}
