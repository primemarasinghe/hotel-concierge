import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) {
    return Response.json({ error: 'Missing slug' }, { status: 400 });
  }

  const formData = await request.formData();
  const upstream = `${API_BASE}/api/admin/${slug}/kb/upload`;

  try {
    const res = await fetch(upstream, {
      method: 'POST',
      headers: { 'X-Admin-Token': ADMIN_TOKEN },
      body: formData,
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return Response.json({ error: 'Backend unreachable' }, { status: 502 });
  }
}
