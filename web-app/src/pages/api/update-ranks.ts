import { updateThreadRanks } from '../../lib/db';

export async function POST({ request }: { request: Request }) {
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

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Thread ranks updated successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating thread ranks:', error);
    
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
}
