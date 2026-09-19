export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST') {
      try {
        const file = await request.arrayBuffer();
        const contentType = request.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.split('/')[1] || 'jpg';
        const key = `cards/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        await env.R2_BUCKET.put(key, file, {
          httpMetadata: { contentType },
        });

        const publicUrl = `https://pub-6efe88e5a166469d8ad09ff9fe226ec7.r2.dev/${key}`;

        return new Response(JSON.stringify({ url: publicUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (request.method === 'DELETE') {
      try {
        const { keys } = await request.json();
        if (!keys || !Array.isArray(keys) || keys.length === 0) {
          return new Response(JSON.stringify({ error: 'No keys provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const deleted = [];
        for (const key of keys) {
          await env.R2_BUCKET.delete(key);
          deleted.push(key);
        }

        return new Response(JSON.stringify({ deleted }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Method not allowed', { status: 405 });
  },
};
