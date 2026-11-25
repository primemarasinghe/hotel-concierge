// Next.js compatible version of frontend/src/api.js
// Uses relative URLs — Next.js rewrites proxy /api/properties/* to the backend

async function request(path, { method = "GET", body, token, isJwt = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    if (isJwt) headers["Authorization"] = `Bearer ${token}`;
    else headers["X-Admin-Token"] = token;
  }
  const res = await fetch(path, {
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
  property: (slug) => request(`/api/properties/${slug}`),
  history: (slug, sid) => request(`/api/properties/${slug}/chat/${sid}`),
  sessionByEmail: (slug, email) =>
    request(`/api/properties/${slug}/chat/by-guest?email=${encodeURIComponent(email)}`),
  blockedDates: (slug) => request(`/api/properties/${slug}/blocked-dates`),
  fullyBookedDates: (slug) => request(`/api/properties/${slug}/fully-booked-dates`),
};

export async function* chatStream(slug, sid, message, lang = "en", guestEmail = null) {
  const res = await fetch(`/api/properties/${slug}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, message, lang, ...(guestEmail ? { guest_email: guestEmail } : {}) }),
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
      const parts = buf.split("\n\n");
      buf = parts.pop();
      for (const part of parts) {
        const line = part.trim();
        if (line.startsWith("data: ")) {
          try { yield JSON.parse(line.slice(6)); } catch {}
        }
      }
    }
    const tail = buf.trim();
    if (tail.startsWith("data: ")) {
      try { yield JSON.parse(tail.slice(6)); } catch {}
    }
  } finally {
    reader.cancel();
  }
}

export const store = {
  get(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); } catch {}
  },
  del(k) {
    try { localStorage.removeItem(k); } catch {}
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
