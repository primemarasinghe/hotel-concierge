// Admin API client for the Next.js website.
// All calls go through /api/admin/proxy which adds X-Admin-Token server-side.
// Shape matches frontend/src/api.js so AdminPanel.jsx requires minimal changes.

function proxyUrl(path) {
  return `/api/admin/proxy?path=${encodeURIComponent(path)}`;
}

async function request(path, { method = "GET", body } = {}) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(proxyUrl(path), opts);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    const err = new Error(typeof detail === "string" ? detail : "Request failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Matches the shape returned by api.admin(token, isJwt) in frontend/src/api.js
export const adminApiClient = {
  summary:     (slug) => request(`/api/admin/${slug}/summary`),
  bookings:    (slug, { status, search, dateFrom, dateTo, page = 1, pageSize = 50 } = {}) => {
    const p = new URLSearchParams({ page, page_size: pageSize });
    if (status)   p.set("status",    status);
    if (search)   p.set("search",    search.trim());
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to",   dateTo);
    return request(`/api/admin/${slug}/bookings?${p}`);
  },
  setBooking:         (slug, ref, status) => request(`/api/admin/${slug}/bookings/${ref}`, { method: "PATCH", body: { status } }),
  transfers:          (slug) => request(`/api/admin/${slug}/transfers`),
  setTransfer:        (slug, ref, status) => request(`/api/admin/${slug}/transfers/${ref}`, { method: "PATCH", body: { status } }),
  conversations:      (slug) => request(`/api/admin/${slug}/conversations`),
  conversation:       (slug, id) => request(`/api/admin/${slug}/conversations/${id}`),
  resolve:            (slug, id) => request(`/api/admin/${slug}/conversations/${id}/resolve`, { method: "POST" }),
  reviewsPending:     (slug) => request(`/api/admin/${slug}/reviews/pending`),
  sendReviews:        (slug) => request(`/api/admin/${slug}/reviews/send`, { method: "POST" }),
  preArrivalPending:  (slug) => request(`/api/admin/${slug}/pre-arrival/pending`),
  sendPreArrival:     (slug) => request(`/api/admin/${slug}/pre-arrival/send`, { method: "POST" }),
  notifications:      (slug) => request(`/api/admin/${slug}/notifications`),
  testEmail:          (slug) => request(`/api/admin/${slug}/notifications/test`, { method: "POST" }),
  resendConfirmation: (slug, ref) => request(`/api/admin/${slug}/bookings/${ref}/resend`, { method: "POST" }),
  serviceRequests:    (slug, status) =>
    request(`/api/admin/${slug}/service-requests${status ? `?status=${status}` : ""}`),
  setServiceRequest:  (slug, ref, update) => request(`/api/admin/${slug}/service-requests/${ref}`, { method: "PATCH", body: update }),
  calendar:           (slug, year, month) => request(`/api/admin/${slug}/calendar?year=${year}&month=${month}`),
  setCredentials:     (slug, email, password) => request(`/api/admin/${slug}/set-credentials`, { method: "POST", body: { email, password } }),
  kb:                 (slug) => request(`/api/admin/${slug}/kb`),
  uploadKb: async (slug, file, source) => {
    const form = new FormData();
    form.append("file", file);
    form.append("source", source);
    // KB upload goes through a separate proxy path that handles multipart
    const res = await fetch(`/api/admin/upload?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try { detail = (await res.json()).detail || detail; } catch {}
      const err = new Error(typeof detail === "string" ? detail : "Upload failed");
      err.status = res.status;
      throw err;
    }
    return res.json();
  },
  createKb:    (slug, body) => request(`/api/admin/${slug}/kb`, { method: "POST", body }),
  updateKb:    (slug, id, body) => request(`/api/admin/${slug}/kb/${id}`, { method: "PATCH", body }),
  deleteKb:    (slug, id) => request(`/api/admin/${slug}/kb/${id}`, { method: "DELETE" }),
  settings:    (slug) => request(`/api/admin/${slug}/settings`),
  updateSettings: (slug, body) => request(`/api/admin/${slug}/settings`, { method: "PATCH", body }),
  rooms:          (slug) => request(`/api/admin/${slug}/rooms`),
  createRoom:     (slug, body) => request(`/api/admin/${slug}/rooms`, { method: "POST", body }),
  updateRoom:     (slug, id, body) => request(`/api/admin/${slug}/rooms/${id}`, { method: "PATCH", body }),
  deleteRoom:     (slug, id) => request(`/api/admin/${slug}/rooms/${id}`, { method: "DELETE" }),
  seasons:        (slug) => request(`/api/admin/${slug}/seasons`),
  createSeason:   (slug, body) => request(`/api/admin/${slug}/seasons`, { method: "POST", body }),
  updateSeason:   (slug, id, body) => request(`/api/admin/${slug}/seasons/${id}`, { method: "PATCH", body }),
  deleteSeason:   (slug, id) => request(`/api/admin/${slug}/seasons/${id}`, { method: "DELETE" }),
  analytics:      (slug) => request(`/api/admin/${slug}/analytics`),
  experiences:    (slug) => request(`/api/admin/${slug}/experiences`),
  createExperience: (slug, body) => request(`/api/admin/${slug}/experiences`, { method: "POST", body }),
  updateExperience: (slug, id, body) => request(`/api/admin/${slug}/experiences/${id}`, { method: "PATCH", body }),
  deleteExperience: (slug, id) => request(`/api/admin/${slug}/experiences/${id}`, { method: "DELETE" }),
  transferOptions: (slug) => request(`/api/admin/${slug}/transfer-options`),
  createTransferOption: (slug, body) => request(`/api/admin/${slug}/transfer-options`, { method: "POST", body }),
  updateTransferOption: (slug, id, body) => request(`/api/admin/${slug}/transfer-options/${id}`, { method: "PATCH", body }),
  deleteTransferOption: (slug, id) => request(`/api/admin/${slug}/transfer-options/${id}`, { method: "DELETE" }),
  blockedDates: (slug, { from: f, to: t } = {}) => {
    const p = new URLSearchParams();
    if (f) p.set("from_date", f);
    if (t) p.set("to_date",   t);
    return request(`/api/admin/${slug}/blocked-dates${p.toString() ? `?${p}` : ""}`);
  },
  addBlockedDates:  (slug, body) => request(`/api/admin/${slug}/blocked-dates`, { method: "POST", body }),
  deleteBlockedDate:(slug, id) => request(`/api/admin/${slug}/blocked-dates/${id}`, { method: "DELETE" }),
  syncBlockedDates: (slug, body) => request(`/api/admin/${slug}/blocked-dates/sync`, { method: "POST", body }),
};

// Matches api.superAdmin(token) in api.js
export const superAdminApiClient = {
  listProperties:  () => request("/api/super/properties"),
  createProperty:  (body) => request("/api/super/properties", { method: "POST", body }),
  setCredentials:  (slug, email, password) =>
    request(`/api/admin/${slug}/set-credentials`, { method: "POST", body: { email, password } }),
};

// Public endpoints (no auth needed)
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_URL || "";
async function publicRequest(path) {
  const res = await fetch(`${PUBLIC_BASE}${path}`);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}
export const publicApi = {
  properties: () => publicRequest("/api/properties"),
  property:   (slug) => publicRequest(`/api/properties/${slug}`),
};

// localStorage helpers (same as frontend/src/api.js — safe in private/blocked storage)
export const store = {
  get(k)    { try { return localStorage.getItem(k);       } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v);           } catch {}              },
  del(k)    { try { localStorage.removeItem(k);           } catch {}              },
};

const CURRENCY_LOCALE = { USD: "en-US", LKR: "en-LK", EUR: "en-DE", GBP: "en-GB", AUD: "en-AU" };
export function money(amount, currency) {
  if (amount == null) return "Free";
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] || "en-US", {
      style: "currency", currency, maximumFractionDigits: currency === "LKR" ? 0 : 2,
    }).format(amount);
  } catch { return `${currency} ${amount}`; }
}

export function fmtDate(iso, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-GB", opts);
}
