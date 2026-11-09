const BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, { method = "GET", body, token, isJwt = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    if (isJwt) headers["Authorization"] = `Bearer ${token}`;
    else headers["X-Admin-Token"] = token;
  }
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
  superAdmin: (adminToken) => ({
    listProperties: () => request("/api/super/properties", { token: adminToken }),
    createProperty: (body) => request("/api/super/properties", { method: "POST", body, token: adminToken }),
    setCredentials: (slug, email, password) =>
      request(`/api/admin/${slug}/set-credentials`, { method: "POST", body: { email, password }, token: adminToken }),
  }),
  auth: {
    login: (slug, email, password) =>
      request(`/api/auth/${slug}/login`, { method: "POST", body: { email, password } }),
    setCredentials: (slug, email, password, adminToken) =>
      request(`/api/admin/${slug}/set-credentials`, {
        method: "POST", body: { email, password }, token: adminToken,
      }),
  },
  admin: (token, isJwt = false) => ({
    summary: (slug) => request(`/api/admin/${slug}/summary`, { token, isJwt }),
    bookings: (slug, status) =>
      request(`/api/admin/${slug}/bookings${status ? `?status=${status}` : ""}`, { token, isJwt }),
    setBooking: (slug, ref, status) =>
      request(`/api/admin/${slug}/bookings/${ref}`, { method: "PATCH", body: { status }, token, isJwt }),
    transfers: (slug) => request(`/api/admin/${slug}/transfers`, { token, isJwt }),
    setTransfer: (slug, ref, status) =>
      request(`/api/admin/${slug}/transfers/${ref}`, { method: "PATCH", body: { status }, token, isJwt }),
    conversations: (slug) => request(`/api/admin/${slug}/conversations`, { token, isJwt }),
    conversation: (slug, id) => request(`/api/admin/${slug}/conversations/${id}`, { token, isJwt }),
    resolve: (slug, id) =>
      request(`/api/admin/${slug}/conversations/${id}/resolve`, { method: "POST", token, isJwt }),
    promos: (slug) => request(`/api/admin/${slug}/promos`, { token, isJwt }),
    createPromo: (slug, body) => request(`/api/admin/${slug}/promos`, { method: "POST", body, token, isJwt }),
    togglePromo: (slug, code) => request(`/api/admin/${slug}/promos/${code}/toggle`, { method: "PATCH", token, isJwt }),
    reviewsPending: (slug) => request(`/api/admin/${slug}/reviews/pending`, { token, isJwt }),
    sendReviews: (slug) => request(`/api/admin/${slug}/reviews/send`, { method: "POST", token, isJwt }),
    preArrivalPending: (slug) => request(`/api/admin/${slug}/pre-arrival/pending`, { token, isJwt }),
    sendPreArrival: (slug) => request(`/api/admin/${slug}/pre-arrival/send`, { method: "POST", token, isJwt }),
    notifications: (slug) => request(`/api/admin/${slug}/notifications`, { token, isJwt }),
    testEmail: (slug) => request(`/api/admin/${slug}/notifications/test`, { method: "POST", token, isJwt }),
    resendConfirmation: (slug, ref) => request(`/api/admin/${slug}/bookings/${ref}/resend`, { method: "POST", token, isJwt }),
    serviceRequests: (slug, status) =>
      request(`/api/admin/${slug}/service-requests${status ? `?status=${status}` : ""}`, { token, isJwt }),
    setServiceRequest: (slug, ref, status) =>
      request(`/api/admin/${slug}/service-requests/${ref}`, { method: "PATCH", body: { status }, token, isJwt }),
    calendar: (slug, year, month) =>
      request(`/api/admin/${slug}/calendar?year=${year}&month=${month}`, { token, isJwt }),
    setCredentials: (slug, email, password) =>
      request(`/api/admin/${slug}/set-credentials`, { method: "POST", body: { email, password }, token, isJwt }),
    kb: (slug) => request(`/api/admin/${slug}/kb`, { token, isJwt }),
    uploadKb: async (slug, file, source) => {
      const form = new FormData();
      form.append("file", file);
      form.append("source", source);
      const headers = {};
      if (token) {
        if (isJwt) headers["Authorization"] = `Bearer ${token}`;
        else headers["X-Admin-Token"] = token;
      }
      const res = await fetch(`${BASE}/api/admin/${slug}/kb/upload`, { method: "POST", headers, body: form });
      if (!res.ok) {
        let detail = res.statusText;
        try { detail = (await res.json()).detail || detail; } catch {}
        const err = new Error(typeof detail === "string" ? detail : "Upload failed");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    createKb: (slug, body) => request(`/api/admin/${slug}/kb`, { method: "POST", body, token, isJwt }),
    updateKb: (slug, id, body) => request(`/api/admin/${slug}/kb/${id}`, { method: "PATCH", body, token, isJwt }),
    deleteKb: (slug, id) => request(`/api/admin/${slug}/kb/${id}`, { method: "DELETE", token, isJwt }),
    settings: (slug) => request(`/api/admin/${slug}/settings`, { token, isJwt }),
    updateSettings: (slug, body) => request(`/api/admin/${slug}/settings`, { method: "PATCH", body, token, isJwt }),
    propertySettings: (slug) => request(`/api/admin/${slug}/property-settings`, { token, isJwt }),
    updatePropertySettings: (slug, body) => request(`/api/admin/${slug}/property-settings`, { method: "PATCH", body, token, isJwt }),
    rooms: (slug) => request(`/api/admin/${slug}/rooms`, { token, isJwt }),
    createRoom: (slug, body) => request(`/api/admin/${slug}/rooms`, { method: "POST", body, token, isJwt }),
    updateRoom: (slug, id, body) => request(`/api/admin/${slug}/rooms/${id}`, { method: "PATCH", body, token, isJwt }),
    deleteRoom: (slug, id) => request(`/api/admin/${slug}/rooms/${id}`, { method: "DELETE", token, isJwt }),
    seasons: (slug) => request(`/api/admin/${slug}/seasons`, { token, isJwt }),
    createSeason: (slug, body) => request(`/api/admin/${slug}/seasons`, { method: "POST", body, token, isJwt }),
    updateSeason: (slug, id, body) => request(`/api/admin/${slug}/seasons/${id}`, { method: "PATCH", body, token, isJwt }),
    deleteSeason: (slug, id) => request(`/api/admin/${slug}/seasons/${id}`, { method: "DELETE", token, isJwt }),
    analytics: (slug) => request(`/api/admin/${slug}/analytics`, { token, isJwt }),
    transferOptions: (slug) => request(`/api/admin/${slug}/transfer-options`, { token, isJwt }),
    createTransferOption: (slug, body) => request(`/api/admin/${slug}/transfer-options`, { method: "POST", body, token, isJwt }),
    updateTransferOption: (slug, id, body) => request(`/api/admin/${slug}/transfer-options/${id}`, { method: "PATCH", body, token, isJwt }),
    deleteTransferOption: (slug, id) => request(`/api/admin/${slug}/transfer-options/${id}`, { method: "DELETE", token, isJwt }),
  }),
};

/**
 * Async generator for the SSE streaming chat endpoint.
 * Yields objects: {type:"token",content} | {type:"event",event} | {type:"done"} | {type:"error",message}
 */
export async function* chatStream(slug, sid, message, lang = "en") {
  const res = await fetch(`${BASE}/api/properties/${slug}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sid, message, lang }),
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
