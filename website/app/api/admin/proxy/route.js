import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function adminHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Token': ADMIN_TOKEN,
    ...extra,
  };
}

async function proxyRequest(request, method) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path || !path.startsWith('/api/')) {
    return Response.json({ error: 'Invalid path' }, { status: 400 });
  }

  const upstream = `${API_BASE}${path}`;

  const init = { method, headers: adminHeaders() };
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const body = await request.text();
      if (body) init.body = body;
    } catch {}
  }

  try {
    const res = await fetch(upstream, init);
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return Response.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}

export const GET    = (req) => proxyRequest(req, 'GET');
export const POST   = (req) => proxyRequest(req, 'POST');
export const PATCH  = (req) => proxyRequest(req, 'PATCH');
export const DELETE = (req) => proxyRequest(req, 'DELETE');
