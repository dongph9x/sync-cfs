import type { APIRoute } from 'astro';
import { requireRole } from '../../../lib/session';
import { createPool } from '../../../lib/db';
import { smartSync, updateRanksAfterSync } from '../../../lib/smartSync';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Require admin role only
    await requireRole({ request, cookies } as any, ['admin']);

    const body = await request.json();
    const { forceFull = false } = body;

    // Initialize database connection
    createPool({
      host: import.meta.env.MYSQL_HOST || 'localhost',
      port: parseInt(import.meta.env.MYSQL_PORT || '3306'),
      user: import.meta.env.MYSQL_USER || 'root',
      password: import.meta.env.MYSQL_PASSWORD || '',
      database: import.meta.env.MYSQL_DATABASE || 'forum'
    });

    console.log('🔄 Starting manual sync...');
    console.log('Force full sync:', forceFull);

    // Execute sync operations
    // Note: In web-app, we don't have Discord client, so we pass null
    // The smartSync function will work with existing database data
    await smartSync(null, { forceFull });
    await updateRanksAfterSync();

    console.log('✅ Manual sync completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Sync completed successfully',
      forceFull 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
