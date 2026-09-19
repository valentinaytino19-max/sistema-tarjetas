export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

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
  },
};
