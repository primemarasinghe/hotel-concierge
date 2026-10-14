import { useCallback, useEffect, useMemo, useState } from "react";
import { api, store, money, fmtDate } from "./api.js";
import { RichText, EventCard } from "./ChatPanel.jsx";

const TOKEN_KEY = "hc-admin-token";
const POLL_MS   = 30_000; // badge refresh interval

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

const STATUS_LABEL = {
  pending:   "Awaiting confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  requested: "Requested",
};
function Status({ value }) {
  return <span className={`status status-${value}`}>{STATUS_LABEL[value] || value}</span>;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [items, setItems] = useState([]);
  const show = useCallback((type, msg) => {
    const id = Date.now() + Math.random();
    setItems(prev => [...prev, { id, type, msg }]);
    setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 3800);
  }, []);
  return {
    items,
    success: msg => show("success", msg),
    error:   msg => show("error",   msg),
  };
}
function ToastStack({ items }) {
  if (!items.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === "success"
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          }
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin, error }) {
  const [t, setT] = useState("");
  return (
    <div className="adm-login">
      <form className="adm-login-card" onSubmit={e => { e.preventDefault(); onLogin(t.trim()); }}>
        <div className="adm-login-logo">
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="var(--accent,#2f5d3a)"/>
            <path d="M8 26V14l8-6 8 6v12" stroke="rgba(255,255,255,0.95)" strokeWidth="2.1" strokeLinejoin="round"/>
            <rect x="13" y="18" width="6" height="8" rx="1.5" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8"/>
          </svg>
        </div>
        <h1>Staff Dashboard</h1>
        <p>Sign in with your admin token to manage bookings, transfers, and guest conversations.</p>
        <div className="adm-field">
          <label htmlFor="adm-token">Admin token</label>
          <input
            id="adm-token"
            type="password"
            value={t}
            onChange={e => setT(e.target.value)}
            placeholder="Enter token…"
            autoFocus
            autoComplete="current-password"
          />
        </div>
        {error && <p className="adm-field-err">{error}</p>}
        <button className="adm-btn adm-btn-primary adm-btn-full" disabled={!t.trim()}>
          Sign in
        </button>
      </form>
    </div>
  );
}

// ── Stat cards ────────────────────────────────────────────────────────────────
const ICONS = {
  arrivals:   "M5 12h14M12 5l7 7-7 7",
  departures: "M19 12H5M12 5l-7 7 7 7",
  inhouse:    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  pending:    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  transfers:  "M1 3h15v13H1zM16 8l4 4-4 4M5.5 16a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12.5 16a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  handoffs:   "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13.09a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.26 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.37a16 16 0 0 0 6.72 6.72l1.73-1.73a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
};
function StatCard({ iconKey, value, label, action, onClick, urgent }) {
  const clickable = onClick && value > 0;
  return (
    <div className={`stat-card${urgent ? " stat-card-urgent" : ""}${clickable ? " stat-card-link-wrap" : ""}`}>
      <div className="stat-card-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[iconKey]}/>
        </svg>
      </div>
      <div className="stat-card-n">{value}</div>
      <div className="stat-card-l">{label}</div>
      {action && value > 0 && (
        <button className="stat-card-action" onClick={onClick}>{action} →</button>
      )}
    </div>
  );
}

// ── Occupancy chart ───────────────────────────────────────────────────────────
function Occupancy({ days }) {
  const [hover, setHover] = useState(null);
  const total = days[0]?.total || 1;
  return (
    <figure className="occ">
      <figcaption>
        <strong>Occupancy forecast — next 14 nights</strong>
        <span>{total} total units</span>
      </figcaption>
      <div className="occ-plot" onMouseLeave={() => setHover(null)}>
        {[100, 50].map(g => (
          <div key={g} className="occ-grid" style={{ bottom: `${g}%` }}>
            <span>{Math.round((total * g) / 100)}</span>
          </div>
        ))}
        {days.map((d, i) => {
          const pct = (d.occupied / total) * 100;
          return (
            <button
              key={d.date}
              className="occ-col"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${fmtDate(d.date)}: ${d.occupied} of ${d.total} occupied`}
            >
              <span
                className="occ-bar"
                style={{
                  height: `${Math.max(pct, d.occupied ? 3 : 0)}%`,
                  opacity: pct > 75 ? 1 : pct > 45 ? 0.78 : 0.55,
                }}
              />
              <span className="occ-x">{fmtDate(d.date, { day: "numeric" })}</span>
              {hover === i && (
                <span className="occ-tip" role="tooltip">
                  {fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}
                  <b>{d.occupied}/{d.total} · {Math.round(pct)}%</b>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <details className="occ-table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr><th>Night of</th><th>Occupied</th><th>Available</th></tr>
          </thead>
          <tbody>
            {days.map(d => (
              <tr key={d.date}>
                <td>{fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="num">{d.occupied}</td>
                <td className="num">{d.total - d.occupied}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// ── Revenue forecast chart ────────────────────────────────────────────────────
function RevenueForecast({ days, currency }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...days.map(d => d.revenue), 1);
  const hasAny = days.some(d => d.revenue > 0);
  return (
    <figure className="rev-chart">
      <figcaption>
        <strong>Revenue forecast — next 14 days</strong>
        <span>confirmed + pending check-ins</span>
      </figcaption>
      {!hasAny ? (
        <p className="rev-empty">No confirmed or pending check-ins in the next 14 days.</p>
      ) : (
        <div className="rev-plot" onMouseLeave={() => setHover(null)}>
          {days.map((d, i) => {
            const pct = (d.revenue / max) * 100;
            return (
              <button
                key={d.date}
                className="rev-col"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${fmtDate(d.date)}: ${money(d.revenue, currency)}`}
              >
                <span
                  className="rev-bar"
                  style={{ height: `${Math.max(pct, d.revenue ? 4 : 0)}%` }}
                />
                <span className="rev-x">{fmtDate(d.date, { day: "numeric" })}</span>
                {hover === i && d.revenue > 0 && (
                  <span className="rev-tip" role="tooltip">
                    {fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}
                    <b>{money(d.revenue, currency)}</b>
                    <small>{d.bookings} booking{d.bookings !== 1 ? "s" : ""}</small>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </figure>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ a, slug, goTo }) {
  const [s, setS] = useState(null);
  useEffect(() => {
    a.summary(slug).then(setS).catch(() => setS(null));
  }, [a, slug]);
  if (!s) return <div className="adm-loading">Loading overview…</div>;
  return (
    <>
      <div className="stat-grid">
        <StatCard iconKey="arrivals"   value={s.arrivals_today}  label="Arriving today" />
        <StatCard iconKey="departures" value={s.departures_today} label="Leaving today" />
        <StatCard iconKey="inhouse"    value={s.in_house}         label="Staying tonight" />
        <StatCard iconKey="pending"    value={s.pending}          label="Awaiting confirmation" action="Confirm now" onClick={() => goTo("bookings")} urgent={s.pending > 0} />
        <StatCard iconKey="transfers"  value={s.transfers_48h}    label="Transfers in 48 h"    action="Review"      onClick={() => goTo("transfers")} />
        <StatCard iconKey="handoffs"   value={s.open_handoffs}    label="Guests asking for staff" action="View"     onClick={() => goTo("conversations")} urgent={s.open_handoffs > 0} />
      </div>

      <Occupancy days={s.occupancy} />

      <div className="rev-section">
        <div className="rev-section-head">
          <h3>Revenue</h3>
          <span>booking totals by check-in date</span>
        </div>
        <div className="rev-kpis">
          <div className="rev-kpi">
            <span className="rev-kpi-label">This month</span>
            <span className="rev-kpi-value">{money(s.revenue_mtd, s.currency)}</span>
            <span className="rev-kpi-sub">confirmed check-ins</span>
          </div>
          <div className="rev-kpi">
            <span className="rev-kpi-label">Next 30 days</span>
            <span className="rev-kpi-value">{money(s.revenue_next30, s.currency)}</span>
            <span className="rev-kpi-sub">confirmed + pending</span>
          </div>
        </div>
        <RevenueForecast days={s.revenue_forecast} currency={s.currency} />
      </div>
    </>
  );
}

// ── Pending booking action card ───────────────────────────────────────────────
function BookingActionCard({ b, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(null);
  async function handle(action) {
    setLoading(action);
    try { await (action === "confirm" ? onConfirm() : onCancel()); }
    finally { setLoading(null); }
  }
  return (
    <div className="bac">
      <div className="bac-head">
        <span className="bac-ref">{b.reference}</span>
        <Status value={b.status}/>
        <span className="bac-check-in">Check-in {fmtDate(b.check_in, { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
      <div className="bac-body">
        <div className="bac-guest">
          <strong>{b.guest_name}</strong>
          <a href={`mailto:${b.email}`}>{b.email}</a>
          {b.phone && <span>{b.phone}</span>}
        </div>
        <div className="bac-stay">
          <div className="bac-room-line">
            {b.units > 1 ? `${b.units} × ` : ""}{b.room}
            <span className="bac-meal">{b.meal_plan}</span>
          </div>
          <div className="bac-dates-line">
            {fmtDate(b.check_in, { day: "numeric", month: "short" })} → {fmtDate(b.check_out, { day: "numeric", month: "short" })}
            <span>· {b.nights} night{b.nights !== 1 ? "s" : ""}</span>
            <span>· {b.adults} adult{b.adults !== 1 ? "s" : ""}{b.children ? ` + ${b.children} child${b.children !== 1 ? "ren" : ""}` : ""}</span>
          </div>
          {b.special_requests && (
            <div className="bac-requests">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {b.special_requests}
            </div>
          )}
        </div>
        <div className="bac-price">{money(b.total, b.currency)}</div>
      </div>
      <div className="bac-actions">
        <button
          className="adm-btn adm-btn-ghost-sm"
          onClick={() => handle("cancel")}
          disabled={!!loading}
        >
          {loading === "cancel" ? "Cancelling…" : "Cancel"}
        </button>
        <button
          className="adm-btn adm-btn-confirm"
          onClick={() => handle("confirm")}
          disabled={!!loading}
        >
          {loading === "confirm"
            ? <><span className="adm-spinner"/><span>Confirming…</span></>
            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span>Confirm booking</span></>
          }
        </button>
      </div>
    </div>
  );
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function toCSV(rows) {
  const headers = [
    "Reference", "Status", "Guest Name", "Email", "Phone",
    "Room", "Meal Plan", "Check-in", "Check-out", "Nights",
    "Adults", "Children", "Units", "Total", "Currency",
    "Special Requests", "Source", "Booked At",
  ];
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map(b => [
      b.reference, b.status, b.guest_name, b.email, b.phone,
      b.room, b.meal_plan, b.check_in, b.check_out, b.nights,
      b.adults, b.children ?? 0, b.units ?? 1, b.total, b.currency,
      b.special_requests || "", b.source || "chat", b.created_at || "",
    ].map(esc).join(",")),
  ];
  return lines.join("\r\n");
}

function downloadCSV(content, filename) {
  // ﻿ = UTF-8 BOM so Excel opens the file without garbled characters
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url; el.download = filename; el.click();
  URL.revokeObjectURL(url);
}

// ── Bookings tab ──────────────────────────────────────────────────────────────
function Bookings({ a, slug, toast, onRefresh }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setRows(null);
    a.bookings(slug, filter).then(setRows).catch(() => setRows([]));
  }, [a, slug, filter]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(ref, status) {
    try {
      await a.setBooking(slug, ref, status);
      toast.success(status === "confirmed" ? `Booking ${ref} confirmed` : `Booking ${ref} cancelled`);
      load();
      onRefresh?.();
    } catch (e) {
      toast.error(`Failed to update ${ref}: ${e.message}`);
    }
  }

  const pending = useMemo(() => (rows || []).filter(b => b.status === "pending"), [rows]);
  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(b =>
      b.guest_name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.reference?.toLowerCase().includes(q) ||
      b.room?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <>
      {(filter === "pending" || filter === "") && pending.length > 0 && (
        <div className="bac-section">
          <h3 className="bac-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01"/>
            </svg>
            {pending.length} booking{pending.length !== 1 ? "s" : ""} need{pending.length === 1 ? "s" : ""} your confirmation
          </h3>
          <div className="bac-grid">
            {pending.map(b => (
              <BookingActionCard
                key={b.reference}
                b={b}
                onConfirm={() => setStatus(b.reference, "confirmed")}
                onCancel={()  => setStatus(b.reference, "cancelled")}
              />
            ))}
          </div>
        </div>
      )}

      <div className="adm-toolbar">
        <div className="seg" role="tablist" aria-label="Filter bookings">
          {[["pending", "Pending"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"], ["", "All"]].map(([v, l]) => (
            <button key={l} role="tab" aria-selected={filter === v} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <label className="adm-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="search"
            placeholder="Name, email or reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <button
          className="adm-btn adm-btn-ghost-sm"
          style={{ marginLeft: "auto" }}
          disabled={!filtered.length}
          onClick={() => {
            const tag = filter || "all";
            const date = new Date().toISOString().slice(0, 10);
            downloadCSV(toCSV(filtered), `${slug}-bookings-${tag}-${date}.csv`);
          }}
          title={filtered.length ? `Export ${filtered.length} row${filtered.length !== 1 ? "s" : ""} as CSV` : "No rows to export"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {!rows ? (
        <div className="adm-loading">Loading bookings…</div>
      ) : filtered.length === 0 ? (
        <p className="empty">
          {search ? `No bookings match "${search}".` : "No bookings in this category. New chat reservations arrive here as Awaiting confirmation."}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th><th>Guest</th><th>Room</th><th>Stay</th>
                <th>Guests</th><th className="num">Total</th><th>Status</th><th/>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.reference} className={b.status === "pending" ? "row-pending" : ""}>
                  <td className="ref">{b.reference}</td>
                  <td>
                    {b.guest_name}
                    <small><a href={`mailto:${b.email}`}>{b.email}</a></small>
                    <small>{b.phone}</small>
                  </td>
                  <td>
                    {b.units > 1 ? `${b.units} × ` : ""}{b.room}
                    <small>{b.meal_plan}</small>
                  </td>
                  <td>
                    {fmtDate(b.check_in, { day: "numeric", month: "short" })} – {fmtDate(b.check_out, { day: "numeric", month: "short" })}
                    <small>{b.nights} night{b.nights !== 1 ? "s" : ""}</small>
                  </td>
                  <td>{b.adults}{b.children ? ` + ${b.children}` : ""}</td>
                  <td className="num">{money(b.total, b.currency)}</td>
                  <td>
                    <Status value={b.status}/>
                    {b.special_requests && <small title={b.special_requests} style={{ cursor: "help" }}>Has requests</small>}
                  </td>
                  <td className="actions">
                    {b.status === "pending" && (
                      <button className="adm-icon-btn adm-icon-btn-confirm" onClick={() => setStatus(b.reference, "confirmed")} title="Confirm booking" aria-label="Confirm booking">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                    )}
                    {b.status !== "cancelled" && (
                      <button className="adm-icon-btn adm-icon-btn-cancel" onClick={() => setStatus(b.reference, "cancelled")} title="Cancel booking" aria-label="Cancel booking">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Transfers tab ─────────────────────────────────────────────────────────────
function Transfers({ a, slug, currency, toast, onRefresh }) {
  const [rows, setRows] = useState(null);
  const load = useCallback(() => {
    setRows(null);
    a.transfers(slug).then(setRows).catch(() => setRows([]));
  }, [a, slug]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(ref, status) {
    try {
      await a.setTransfer(slug, ref, status);
      toast.success(status === "confirmed" ? `Transfer ${ref} confirmed` : `Transfer ${ref} cancelled`);
      load();
      onRefresh?.();
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    }
  }

  const pending = (rows || []).filter(t => t.status === "requested");

  if (!rows) return <div className="adm-loading">Loading transfers…</div>;
  if (!rows.length) return (
    <p className="empty">No transfer requests yet. Guests can arrange airport transfers via the concierge chat.</p>
  );
  return (
    <>
      {pending.length > 0 && (
        <div className="bac-section bac-section-sm">
          <h3 className="bac-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01"/>
            </svg>
            {pending.length} transfer{pending.length !== 1 ? "s" : ""} awaiting confirmation
          </h3>
        </div>
      )}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Reference</th><th>Pickup</th><th>Route</th>
              <th>Guest</th><th>Party</th><th className="num">Price</th><th>Status</th><th/>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.reference} className={t.status === "requested" ? "row-pending" : ""}>
                <td className="ref">{t.reference}</td>
                <td>
                  {fmtDate(t.pickup_at, { weekday: "short", day: "numeric", month: "short" })}
                  <small>{t.pickup_at.slice(11, 16)}{t.flight_number ? ` · ✈ ${t.flight_number}` : ""}</small>
                </td>
                <td>
                  {t.route}
                  <small>{t.vehicle}</small>
                </td>
                <td>
                  {t.guest_name}
                  <small>{t.phone}</small>
                </td>
                <td>{t.passengers} pax, {t.bags} bags</td>
                <td className="num">{money(t.price, currency)}</td>
                <td><Status value={t.status}/></td>
                <td className="actions">
                  {t.status === "requested" && (
                    <button className="adm-icon-btn adm-icon-btn-confirm" onClick={() => setStatus(t.reference, "confirmed")} title="Confirm transfer" aria-label="Confirm transfer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
                    </button>
                  )}
                  {t.status !== "cancelled" && (
                    <button className="adm-icon-btn adm-icon-btn-cancel" onClick={() => setStatus(t.reference, "cancelled")} title="Cancel transfer" aria-label="Cancel transfer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Conversations tab ─────────────────────────────────────────────────────────
function Conversations({ a, slug, onChange }) {
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const load = useCallback(() => a.conversations(slug).then(setList), [a, slug]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setDetail(null);
    if (sel) a.conversation(slug, sel).then(setDetail);
  }, [a, slug, sel]);

  if (!list) return <div className="adm-loading">Loading conversations…</div>;
  if (!list.length) return (
    <p className="empty">No conversations yet. Open the demo site and start chatting with the concierge.</p>
  );
  return (
    <div className="convs">
      <ul className="conv-list">
        {list.map(c => (
          <li key={c.id}>
            <button className={`conv-item ${sel === c.id ? "is-sel" : ""}`} onClick={() => setSel(c.id)}>
              <span className="conv-meta">
                {c.handoff_requested && <span className="status status-handoff">Needs staff</span>}
                <span>{fmtDate(c.last_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span>{c.messages} msgs</span>
              </span>
              <span className="conv-preview">{c.preview}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="transcript">
        {!sel && <p className="empty">Select a conversation to view the full transcript.</p>}
        {sel && !detail && <div className="adm-loading">Loading transcript…</div>}
        {detail && (
          <>
            {detail.handoff_requested && (
              <div className="handoff-bar">
                <div>
                  <strong>Guest requested a staff member</strong>
                  <p>{detail.handoff_reason}</p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    a.resolve(slug, detail.id).then(() => {
                      load();
                      onChange();
                      setDetail({ ...detail, handoff_requested: false });
                    })
                  }
                >
                  Mark resolved
                </button>
              </div>
            )}
            {detail.messages.map((m, i) => (
              <div key={i} className={`t-msg t-${m.role}`}>
                <span className="t-who">{m.role === "user" ? "Guest" : "Concierge AI"}</span>
                {m.role === "assistant" ? <RichText text={m.content}/> : <p>{m.content}</p>}
                {m.events?.map((e, j) => <EventCard key={j} event={e}/>)}
                {m.tools_used?.length > 0 && <small className="t-tools">Tools: {m.tools_used.join(", ")}</small>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Admin shell ───────────────────────────────────────────────────────────────
const TABS = [
  ["overview",      "Today",         "M3 22V10l9-7 9 7v12M9 22v-7h6v7"],
  ["bookings",      "Bookings",      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"],
  ["transfers",     "Transfers",     "M17 8l4 4-4 4M3 12h18"],
  ["conversations", "Conversations", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
];

export default function Admin() {
  const [token,       setToken]       = useState(() => store.get(TOKEN_KEY) || "");
  const [loginErr,    setLoginErr]    = useState("");
  const [props,       setProps]       = useState([]);
  const [slug,        setSlug]        = useState("");
  const [tab,         setTab]         = useState("overview");
  const [handoffs,    setHandoffs]    = useState(0);
  const [pending,     setPending]     = useState(0);
  const [currency,    setCurrency]    = useState("USD");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [tick,        setTick]        = useState(0);   // drives timeSince re-render
  const toast = useToast();
  const a = useMemo(() => api.admin(token), [token]);

  const refreshBadges = useCallback(() => {
    if (!slug) return;
    a.summary(slug).then(s => {
      setHandoffs(s.open_handoffs);
      setPending(s.pending);
      setLastRefresh(Date.now());
    }).catch(() => {});
  }, [a, slug]);

  const manualRefresh = useCallback(async () => {
    if (!slug || refreshing) return;
    setRefreshing(true);
    try {
      const s = await a.summary(slug);
      setHandoffs(s.open_handoffs);
      setPending(s.pending);
      setLastRefresh(Date.now());
    } catch {}
    setRefreshing(false);
  }, [a, slug, refreshing]);

  // Auto-poll every 30 s; pause when the browser tab is hidden
  useEffect(() => {
    if (!token || !slug) return;
    const id = setInterval(() => { if (!document.hidden) refreshBadges(); }, POLL_MS);
    const onVis = () => { if (!document.hidden) refreshBadges(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [token, slug, refreshBadges]);

  // Tick every 15 s so timeSince() text stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.properties().then(list => {
      setProps(list);
      setSlug(s => {
        const chosen = s || list[0]?.slug || "";
        // Init currency immediately from the list so Transfers never flickers "USD"
        const cur = list.find(p => p.slug === chosen)?.currency;
        if (cur) setCurrency(cur);
        return chosen;
      });
    });
  }, []);

  useEffect(() => {
    if (!token || !slug) return;
    a.summary(slug)
      .then(s => {
        setHandoffs(s.open_handoffs);
        setPending(s.pending);
        setCurrency(s.currency);
        setLastRefresh(Date.now());
      })
      .catch(e => {
        if (e.status === 401) {
          store.del(TOKEN_KEY);
          setToken("");
          setLoginErr("That token wasn't accepted. Check your ADMIN_TOKEN setting.");
        }
      });
  }, [a, token, slug]);

  if (!token)
    return (
      <Login
        error={loginErr}
        onLogin={t => {
          store.set(TOKEN_KEY, t);
          setLoginErr("");
          setToken(t);
        }}
      />
    );

  const current = props.find(p => p.slug === slug);

  return (
    <div className="admin adm-layout">
      <ToastStack items={toast.items}/>

      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 22V10l9-7 9 7v12M9 22v-7h6v7"/>
          </svg>
          <span>Concierge</span>
        </div>

        <div className="adm-sidebar-prop">
          <select value={slug} onChange={e => {
            const next = e.target.value;
            setSlug(next);
            const cur = props.find(p => p.slug === next)?.currency;
            if (cur) setCurrency(cur);
          }} aria-label="Select property">
            {props.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          {current && <span className="adm-sidebar-location">{current.location}</span>}
        </div>

        <nav className="adm-sidebar-nav" aria-label="Admin navigation">
          {TABS.map(([id, label, iconPath]) => (
            <button
              key={id}
              className={`adm-nav-item${tab === id ? " adm-nav-active" : ""}`}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={iconPath}/>
              </svg>
              <span>{label}</span>
              {id === "bookings"      && pending  > 0 && <span className="badge badge-amber">{pending}</span>}
              {id === "conversations" && handoffs > 0  && <span className="badge">{handoffs}</span>}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-foot">
          {lastRefresh && (
            <div className="adm-live" title="Badges auto-refresh every 30 seconds">
              <span className="adm-live-dot" aria-hidden="true" />
              <span aria-live="polite" aria-label={`Data updated ${timeSince(lastRefresh)}`}>
                {tick >= 0 && timeSince(lastRefresh)}
              </span>
              <button
                className={`adm-refresh-btn${refreshing ? " spinning" : ""}`}
                onClick={manualRefresh}
                aria-label="Refresh now"
                disabled={refreshing}
                title="Refresh now"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            </div>
          )}
          <a href={`/?p=${slug}`} className="adm-ghost-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
            Guest site
          </a>
          <button className="link" onClick={() => { store.del(TOKEN_KEY); setToken(""); }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="adm-content">
        <main className="admin-main" key={slug}>
          {slug && tab === "overview"      && <Overview      a={a} slug={slug} goTo={setTab}/>}
          {slug && tab === "bookings"      && <Bookings      a={a} slug={slug} toast={toast} onRefresh={refreshBadges}/>}
          {slug && tab === "transfers"     && <Transfers     a={a} slug={slug} currency={currency} toast={toast} onRefresh={refreshBadges}/>}
          {slug && tab === "conversations" && <Conversations a={a} slug={slug} onChange={refreshBadges}/>}
        </main>
      </div>
    </div>
  );
}
