export const SLUG = 'leisureville-sigiriya';

// Server components (Node.js) need an absolute URL; browser can use relative URLs
// which are proxied through Next.js rewrites to the backend.
const API_BASE = typeof window === 'undefined'
  ? (process.env.API_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_URL || '');

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    const err = new Error(typeof detail === 'string' ? detail : 'Request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchProperty() {
  return apiFetch(`/api/properties/${SLUG}`, { next: { revalidate: 3600 } });
}

export async function fetchRooms() {
  return apiFetch(`/api/properties/${SLUG}/rooms`, { next: { revalidate: 3600 } });
}

export async function fetchExperiences() {
  return apiFetch(`/api/properties/${SLUG}/experiences`, { next: { revalidate: 3600 } });
}

export async function lookupBooking(reference, email) {
  return apiFetch('/api/booking/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, email }),
    cache: 'no-store',
  });
}

export async function* streamChat(sessionId, message) {
  const url = `${API_BASE}/api/properties/${SLUG}/chat/stream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message, lang: 'en' }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    const err = new Error(typeof detail === 'string' ? detail : 'Request failed');
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          yield ev;
          if (ev.type === 'done' || ev.type === 'error') return;
        } catch {}
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
