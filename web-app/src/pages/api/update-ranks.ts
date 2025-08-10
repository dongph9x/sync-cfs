import type { APIRoute } from 'astro';
import { updateThreadRanks } from '../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { rankUpdates } = body;

    if (!rankUpdates || !Array.isArray(rankUpdates)) {
      return new Response(JSON.stringify({ error: 'Invalid rank updates data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await updateThreadRanks(rankUpdates);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating thread ranks:', error);
    
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Failed to update thread ranks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
