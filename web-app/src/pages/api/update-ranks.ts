import { updateThreadRanks } from '../../lib/db';

// Đảm bảo route này là server-rendered
export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    // Log request details for debugging
    console.log('API route called: /api/update-ranks');
    console.log('Request method:', request.method);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));

    // Check if request has body
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type:', contentType);
      return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let body;
    try {
      const text = await request.text();
      console.log('Request body text:', text);
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { rankUpdates } = body;
    console.log('Parsed rankUpdates:', rankUpdates);

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
    
    return new Response(JSON.stringify({ error: 'Failed to update thread ranks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
