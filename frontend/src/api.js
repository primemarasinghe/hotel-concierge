const BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Admin-Token"] = token;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {}
    const err = new Error(typeof detail === "string" ? detail : "Request failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  properties: () => request("/api/properties"),
  property: (slug) => request(`/api/properties/${slug}`),
  history: (slug, sid) => request(`/api/properties/${slug}/chat/${sid}`),
  chat: (slug, sid, message) =>
    request(`/api/properties/${slug}/chat`, { method: "POST", body: { session_id: sid, message } }),
  lookupBooking: (reference, email) =>
    request("/api/booking/lookup", { method: "POST", body: { reference, email } }),
  cancelBooking: (reference, email) =>
    request(`/api/booking/${reference}/cancel`, { method: "POST", body: { email } }),
  admin: (token) => ({
    summary: (slug) => request(`/api/admin/${slug}/summary`, { token }),
    bookings: (slug, status) =>
      request(`/api/admin/${slug}/bookings${status ? `?status=${status}` : ""}`, { token }),
    setBooking: (slug, ref, status) =>
      request(`/api/admin/${slug}/bookings/${ref}`, { method: "PATCH", body: { status }, token }),
    transfers: (slug) => request(`/api/admin/${slug}/transfers`, { token }),
    setTransfer: (slug, ref, status) =>
      request(`/api/admin/${slug}/transfers/${ref}`, { method: "PATCH", body: { status }, token }),
    conversations: (slug) => request(`/api/admin/${slug}/conversations`, { token }),
    conversation: (slug, id) => request(`/api/admin/${slug}/conversations/${id}`, { token }),
    resolve: (slug, id) =>
      request(`/api/admin/${slug}/conversations/${id}/resolve`, { method: "POST", token }),
  }),
};

/**
 * Async generator for the SSE streaming chat endpoint.
 * Yields objects: {type:"token",content} | {type:"event",event} | {type:"done"} | {type:"error",message}
 */
export async function* chatStream(slug, sid, message) {
  const res = await fetch(`${BASE}/api/properties/${slug}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, message }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    const err = new Error(typeof detail === "string" ? detail : "Request failed");
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE events are delimited by \n\n
      const parts = buf.split("\n\n");
      buf = parts.pop(); // hold the (possibly incomplete) last chunk
      for (const part of parts) {
        const line = part.trim();
        if (line.startsWith("data: ")) {
          try { yield JSON.parse(line.slice(6)); } catch {}
        }
      }
    }
    // flush any remainder
    const tail = buf.trim();
    if (tail.startsWith("data: ")) {
      try { yield JSON.parse(tail.slice(6)); } catch {}
    }
  } finally {
    reader.cancel();
  }
}

// localStorage can throw (private mode, blocked storage) — never let that break the widget
export const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

const CURRENCY_LOCALE = { USD: "en-US", LKR: "en-LK", EUR: "en-DE", GBP: "en-GB", AUD: "en-AU" };

export function money(amount, currency) {
  if (amount == null) return "Free";
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "LKR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function fmtDate(iso, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-GB", opts);
}
