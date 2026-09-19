const ALLOWED_ORIGINS = [
  'https://sistemavalentina.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST') {
      try {
        const contentType = request.headers.get('content-type') || '';
        if (!ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
          return new Response(JSON.stringify({ error: 'Invalid file type' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const file = await request.arrayBuffer();
        if (file.byteLength > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({ error: 'File too large. Max 10MB' }), {
            status: 413,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

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

        if (keys.length > 50) {
          return new Response(JSON.stringify({ error: 'Max 50 keys per request' }), {
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
