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

// ── 6-month revenue trend chart ───────────────────────────────────────────────
function RevenueTrend({ months, currency }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...months.map(m => m.revenue), 1);
  return (
    <figure className="rev-chart">
      <figcaption>
        <strong>Revenue trend — last 6 months</strong>
        <span>confirmed bookings by check-in month</span>
      </figcaption>
      <div className="rev-plot" onMouseLeave={() => setHover(null)}>
        {months.map((m, i) => {
          const pct = (m.revenue / max) * 100;
          return (
            <button
              key={m.month_full}
              className="rev-col"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${m.month_full}: ${money(m.revenue, currency)}`}
            >
              <span className="rev-bar" style={{
                height: `${Math.max(pct, m.revenue ? 4 : 0)}%`,
                opacity: m.is_current ? 1 : 0.65,
              }}/>
              <span className="rev-x" style={{ fontWeight: m.is_current ? 700 : 400 }}>{m.month}</span>
              {hover === i && m.revenue > 0 && (
                <span className="rev-tip" role="tooltip">
                  {m.month_full}
                  <b>{money(m.revenue, currency)}</b>
                </span>
              )}
            </button>
          );
        })}
      </div>
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
        {s.open_service_requests > 0 && (
          <StatCard iconKey="handoffs" value={s.open_service_requests} label="Open service requests" action="View" onClick={() => goTo("requests")} urgent />
        )}
      </div>

      <Occupancy days={s.occupancy} />

      <div className="rev-section">
        <div className="rev-section-head">
          <h3>Revenue</h3>
          <span>month-to-date confirmed bookings</span>
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
          <div className="rev-kpi">
            <span className="rev-kpi-label">ADR (MTD)</span>
            <span className="rev-kpi-value">{money(s.adr_mtd, s.currency)}</span>
            <span className="rev-kpi-sub">avg daily rate</span>
          </div>
          <div className="rev-kpi">
            <span className="rev-kpi-label">RevPAR (MTD)</span>
            <span className="rev-kpi-value">{money(s.revpar_mtd, s.currency)}</span>
            <span className="rev-kpi-sub">rev per available room</span>
          </div>
          <div className="rev-kpi">
            <span className="rev-kpi-label">Occupancy (MTD)</span>
            <span className="rev-kpi-value">{s.occupancy_pct_mtd ?? 0}%</span>
            <span className="rev-kpi-sub">room nights sold</span>
          </div>
        </div>
        {s.revenue_trend && s.revenue_trend.some(m => m.revenue > 0) ? (
          <RevenueTrend months={s.revenue_trend} currency={s.currency} />
        ) : (
          <RevenueForecast days={s.revenue_forecast} currency={s.currency} />
        )}
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
  const [pendingReviews, setPendingReviews] = useState(0);
  const [sendingReviews, setSendingReviews] = useState(false);
  const [pendingPreArrival, setPendingPreArrival] = useState(0);
  const [sendingPreArrival, setSendingPreArrival] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    a.bookings(slug, filter).then(setRows).catch(() => setRows([]));
  }, [a, slug, filter]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    a.reviewsPending(slug).then(r => setPendingReviews(r.pending)).catch(() => {});
    a.preArrivalPending(slug).then(r => setPendingPreArrival(r.pending)).catch(() => {});
  }, [a, slug]);

  async function sendReviewEmails() {
    setSendingReviews(true);
    try {
      const r = await a.sendReviews(slug);
      toast.success(r.sent > 0 ? `${r.sent} review email${r.sent !== 1 ? "s" : ""} sent` : "No pending review emails");
      if (r.sent > 0) { setPendingReviews(0); load(); }
    } catch (e) { toast.error(`Failed: ${e.message}`); }
    finally { setSendingReviews(false); }
  }

  async function sendPreArrivalEmails() {
    setSendingPreArrival(true);
    try {
      const r = await a.sendPreArrival(slug);
      toast.success(r.sent > 0 ? `${r.sent} pre-arrival email${r.sent !== 1 ? "s" : ""} sent` : "No pending pre-arrival emails");
      if (r.sent > 0) { setPendingPreArrival(0); load(); }
    } catch (e) { toast.error(`Failed: ${e.message}`); }
    finally { setSendingPreArrival(false); }
  }

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
        {pendingPreArrival > 0 && (
          <button className="adm-btn adm-btn-ghost-sm" onClick={sendPreArrivalEmails} disabled={sendingPreArrival}
            title={`Send pre-arrival emails to ${pendingPreArrival} guest${pendingPreArrival !== 1 ? "s" : ""} arriving in 48 hours`}>
            {sendingPreArrival ? <><span className="adm-spinner"/><span>Sending…</span></> : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>Pre-arrival emails ({pendingPreArrival})</span>
              </>
            )}
          </button>
        )}
        {pendingReviews > 0 && (
          <button
            className="adm-btn adm-btn-ghost-sm"
            onClick={sendReviewEmails}
            disabled={sendingReviews}
            title={`Send review request emails to ${pendingReviews} guest${pendingReviews !== 1 ? "s" : ""} who checked out recently`}
          >
            {sendingReviews ? (
              <><span className="adm-spinner" /><span>Sending…</span></>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>Send review emails ({pendingReviews})</span>
              </>
            )}
          </button>
        )}
        <button
          className="adm-btn adm-btn-ghost-sm"
          style={{ marginLeft: (pendingReviews > 0 || pendingPreArrival > 0) ? 0 : "auto" }}
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
                    {b.pre_arrival_email_sent && (
                      <small title="Pre-arrival email sent" style={{ color: "#3b82f6", display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Pre-arrival sent
                      </small>
                    )}
                    {b.review_email_sent && (
                      <small title="Review request email sent" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Review sent
                      </small>
                    )}
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

// ── Service Requests tab ──────────────────────────────────────────────────────
const SR_CATEGORY_LABEL = {
  housekeeping: "Housekeeping", room_service: "Room Service", maintenance: "Maintenance",
  late_checkout: "Late Checkout", early_checkin: "Early Check-in", concierge: "Concierge", other: "Other",
};
const SR_CATEGORY_COLOR = {
  housekeeping: "#f59e0b", room_service: "#f97316", maintenance: "#ef4444",
  late_checkout: "#3b82f6", early_checkin: "#3b82f6", concierge: "var(--accent)", other: "#6b7280",
};
const SR_STATUS_LABEL = { open: "Open", in_progress: "In progress", done: "Done" };

function ServiceRequests({ a, slug, toast, onRefresh }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("open");

  const load = useCallback(() => {
    setRows(null);
    a.serviceRequests(slug, filter || undefined).then(setRows).catch(() => setRows([]));
  }, [a, slug, filter]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(ref, status) {
    try {
      await a.setServiceRequest(slug, ref, status);
      toast.success(`Request ${ref} marked ${SR_STATUS_LABEL[status]}`);
      load();
      onRefresh?.();
    } catch (e) { toast.error(e.message); }
  }

  function timeSinceISO(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <>
      <div className="adm-toolbar">
        <div className="seg" role="tablist" aria-label="Filter requests">
          {[["open","Open"],["in_progress","In progress"],["done","Done"],["","All"]].map(([v,l]) => (
            <button key={l} role="tab" aria-selected={filter===v} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>
      {!rows ? (
        <div className="adm-loading">Loading service requests…</div>
      ) : rows.length === 0 ? (
        <p className="empty">No service requests{filter ? ` with status "${SR_STATUS_LABEL[filter] || filter}"` : ""}. Guests can make in-stay requests via the concierge chat.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Reference</th><th>Category</th><th>Guest</th><th>Request</th><th>Status</th><th>Time</th><th/></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.reference} className={r.status === "open" ? "row-pending" : ""}>
                  <td className="ref">{r.reference}</td>
                  <td>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 99,
                      fontSize: "0.75rem", fontWeight: 600,
                      background: `${SR_CATEGORY_COLOR[r.category]}22`,
                      color: SR_CATEGORY_COLOR[r.category],
                    }}>
                      {SR_CATEGORY_LABEL[r.category] || r.category}
                    </span>
                  </td>
                  <td>{r.guest_name || <span style={{color:"var(--muted)"}}>Unknown</span>}</td>
                  <td style={{maxWidth: 260, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{r.details}</td>
                  <td><Status value={r.status === "done" ? "confirmed" : r.status === "in_progress" ? "pending" : "pending"} />&nbsp;<small>{SR_STATUS_LABEL[r.status]}</small></td>
                  <td style={{color:"var(--muted)",fontSize:"0.8rem"}}>{timeSinceISO(r.created_at)}</td>
                  <td className="actions">
                    {r.status === "open" && (
                      <button className="adm-icon-btn adm-icon-btn-confirm" title="Mark in progress"
                        onClick={() => setStatus(r.reference, "in_progress")}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </button>
                    )}
                    {r.status !== "done" && (
                      <button className="adm-icon-btn adm-icon-btn-confirm" title="Mark done"
                        onClick={() => setStatus(r.reference, "done")}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
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

// ── Calendar tab ──────────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEK_DAYS   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Colours assigned to room types in order of base_rate (cheapest first)
const RT_COLORS = ["#2f5d3a", "#3b82f6", "#f59e0b", "#8b5cf6"];

function CalendarView({ a, slug }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState(null);
  const [sel,   setSel]   = useState(null);

  useEffect(() => {
    setData(null);
    a.calendar(slug, year, month).then(setData).catch(() => setData({ days: [], total_units: 0, room_type_index: [] }));
  }, [a, slug, year, month]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
    setSel(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
    setSel(null);
  }

  const todayStr = now.toISOString().slice(0, 10);
  const firstDow = data ? (new Date(year, month - 1, 1).getDay() + 6) % 7 : 0;
  const selDay   = data?.days.find(d => d.date === sel);
  const rtIndex  = data?.room_type_index || [];

  if (!data) return <div className="adm-loading">Loading calendar…</div>;

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <button className="adm-btn adm-btn-ghost-sm" onClick={prevMonth}>← Prev</button>
        <h3 className="cal-title">{MONTH_NAMES[month - 1]} {year}</h3>
        <button className="adm-btn adm-btn-ghost-sm" onClick={nextMonth}>Next →</button>
      </div>

      {/* Room type legend */}
      {rtIndex.length > 0 && (
        <div className="cal-legend">
          {rtIndex.map((rt, i) => (
            <span key={rt.code} className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: RT_COLORS[i % RT_COLORS.length] }} />
              {rt.code}
            </span>
          ))}
        </div>
      )}

      <div className="cal-grid">
        {WEEK_DAYS.map(d => <div key={d} className="cal-weekday">{d}</div>)}
        {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} className="cal-day cal-day-empty" />)}
        {data.days.map(day => {
          const num     = parseInt(day.date.slice(8), 10);
          const isToday = day.date === todayStr;
          const isSel   = day.date === sel;
          const rtBars  = day.room_types || [];
          return (
            <button
              key={day.date}
              className={`cal-day${isToday ? " cal-today" : ""}${isSel ? " cal-selected" : ""}`}
              onClick={() => setSel(isSel ? null : day.date)}
              title={rtBars.map(rt => `${rt.code}: ${rt.occupied}/${rt.total}`).join("  ")}
            >
              <span className="cal-day-num">{num}</span>
              {day.arrivals?.length > 0 && (
                <span className="cal-arrival-badge">{day.arrivals.length}</span>
              )}
              {/* Per-room-type mini bars */}
              {rtBars.length > 0 && (
                <div className="cal-rt-bars">
                  {rtBars.map((rt, i) => (
                    <div key={rt.code} className="cal-rt-bar-wrap">
                      <div
                        className="cal-rt-bar-fill"
                        style={{
                          height: rt.pct > 0 ? `${Math.max(rt.pct, 12)}%` : "0%",
                          background: RT_COLORS[i % RT_COLORS.length],
                          opacity: rt.pct >= 100 ? 1 : 0.65 + rt.pct / 300,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <span className="cal-occ-txt">{day.occupied}/{data.total_units}</span>
            </button>
          );
        })}
      </div>

      {selDay && (
        <div className="cal-detail">
          <div className="cal-detail-head">
            <strong>{fmtDate(selDay.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {selDay.occupied}/{data.total_units} rooms occupied
            </span>
          </div>

          {/* Per-room-type occupancy breakdown */}
          <div className="cal-detail-section">
            <span className="cal-section-lbl">Room availability</span>
            {(selDay.room_types || []).map((rt, i) => {
              const info = rtIndex.find(x => x.code === rt.code);
              const free = rt.total - rt.occupied;
              const color = RT_COLORS[i % RT_COLORS.length];
              return (
                <div key={rt.code} className="cal-rt-row">
                  <span className="cal-rt-dot" style={{ background: color }} />
                  <span className="cal-rt-name">{info?.name || rt.code}</span>
                  <div className="cal-rt-track">
                    <div className="cal-rt-track-fill"
                      style={{ width: `${rt.pct}%`, background: color }} />
                  </div>
                  <span className={`cal-rt-count${rt.occupied >= rt.total ? " cal-rt-full" : free === 1 ? " cal-rt-low" : ""}`}>
                    {rt.occupied}/{rt.total}
                    {rt.occupied >= rt.total && <span className="cal-rt-badge">FULL</span>}
                    {rt.occupied < rt.total && free === 1 && <span className="cal-rt-badge cal-rt-badge-amber">1 left</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {selDay.arrivals?.length > 0 && (
            <div className="cal-detail-section">
              <span className="cal-section-lbl">Check-ins ({selDay.arrivals.length})</span>
              {selDay.arrivals.map(b => (
                <div key={b.reference} className="cal-booking-row">
                  <span className="ref">{b.reference}</span>
                  <span>{b.guest_name}</span>
                  <small>{b.room} · {b.nights}n</small>
                  <Status value={b.status} />
                </div>
              ))}
            </div>
          )}
          {selDay.inhouse?.length > 0 && (
            <div className="cal-detail-section">
              <span className="cal-section-lbl">In house ({selDay.inhouse.length})</span>
              {selDay.inhouse.map(b => (
                <div key={b.reference} className="cal-booking-row">
                  <span className="ref">{b.reference}</span>
                  <span>{b.guest_name}</span>
                  <small>{b.room}</small>
                </div>
              ))}
            </div>
          )}
          {selDay.departures?.length > 0 && (
            <div className="cal-detail-section">
              <span className="cal-section-lbl">Check-outs ({selDay.departures.length})</span>
              {selDay.departures.map(b => (
                <div key={b.reference} className="cal-booking-row">
                  <span className="ref">{b.reference}</span>
                  <span>{b.guest_name}</span>
                </div>
              ))}
            </div>
          )}
          {!selDay.arrivals?.length && !selDay.inhouse?.length && !selDay.departures?.length && (
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "8px 0 0" }}>No check-ins, in-house, or check-outs on this day.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Promo Codes tab ───────────────────────────────────────────────────────────
const EMPTY_PROMO = { code: "", description: "", discount_type: "pct", discount_value: "", valid_from: "", valid_to: "", min_nights: 1, max_uses: "" };

function PromoCodes({ a, slug, toast }) {
  const [rows, setRows] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_PROMO);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    a.promos(slug).then(setRows).catch(() => setRows([]));
  }, [a, slug]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) return;
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        min_nights: parseInt(form.min_nights) || 1,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      };
      await a.createPromo(slug, body);
      toast.success(`Code ${body.code} created`);
      setCreating(false);
      setForm(EMPTY_PROMO);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(code) {
    try {
      await a.togglePromo(slug, code);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function discountLabel(p) {
    return p.discount_type === "pct"
      ? `${p.discount_value}% off`
      : `${Number(p.discount_value).toLocaleString()} off`;
  }

  function validLabel(p) {
    if (!p.valid_from && !p.valid_to) return "Any time";
    if (p.valid_from && p.valid_to) return `${fmtDate(p.valid_from)} – ${fmtDate(p.valid_to)}`;
    if (p.valid_from) return `From ${fmtDate(p.valid_from)}`;
    return `Until ${fmtDate(p.valid_to)}`;
  }

  const activeCount = (rows || []).filter(r => r.active).length;

  return (
    <>
      <div className="adm-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Promo Codes</span>
          {rows && activeCount > 0 && (
            <span className="badge badge-amber">{activeCount} active</span>
          )}
        </div>
        <button
          className="adm-btn adm-btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => { setCreating(c => !c); setForm(EMPTY_PROMO); }}
        >
          {creating ? "Cancel" : "+ New code"}
        </button>
      </div>

      {creating && (
        <form className="promo-form" onSubmit={handleCreate}>
          <div className="promo-form-grid">
            <div className="adm-field">
              <label htmlFor="pf-code">Code *</label>
              <input
                id="pf-code" required
                placeholder="e.g. KANDY10"
                value={form.code}
                onChange={e => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
              />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-desc">Description</label>
              <input
                id="pf-desc"
                placeholder="Shown to guest as discount label"
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-type">Type *</label>
              <select id="pf-type" value={form.discount_type} onChange={e => set("discount_type", e.target.value)}>
                <option value="pct">Percentage (%)</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="pf-val">{form.discount_type === "pct" ? "Discount %" : "Discount amount"} *</label>
              <input
                id="pf-val" required type="number" min="0.01" step="0.01"
                placeholder={form.discount_type === "pct" ? "e.g. 10" : "e.g. 2000"}
                value={form.discount_value}
                onChange={e => set("discount_value", e.target.value)}
              />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-from">Valid from</label>
              <input id="pf-from" type="date" value={form.valid_from} onChange={e => set("valid_from", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-to">Valid to</label>
              <input id="pf-to" type="date" value={form.valid_to} onChange={e => set("valid_to", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-nights">Min nights</label>
              <input id="pf-nights" type="number" min="1" value={form.min_nights} onChange={e => set("min_nights", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-uses">Max uses (blank = unlimited)</label>
              <input id="pf-uses" type="number" min="1" placeholder="Unlimited" value={form.max_uses} onChange={e => set("max_uses", e.target.value)} />
            </div>
          </div>
          <div className="promo-form-actions">
            <button type="button" className="adm-btn adm-btn-ghost-sm" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
              {saving ? <><span className="adm-spinner" /><span>Creating…</span></> : "Create code"}
            </button>
          </div>
        </form>
      )}

      {!rows ? (
        <div className="adm-loading">Loading promo codes…</div>
      ) : rows.length === 0 ? (
        <p className="empty">No promo codes yet. Click "+ New code" to create one and offer guests a discount.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th><th>Description</th><th className="num">Discount</th>
                <th>Valid</th><th className="num">Min nights</th>
                <th className="num">Uses</th><th>Status</th><th/>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.code} style={{ opacity: p.active ? 1 : 0.5 }}>
                  <td className="ref" style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>{p.code}</td>
                  <td>{p.description || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  <td className="num" style={{ fontWeight: 600, color: "var(--accent)" }}>{discountLabel(p)}</td>
                  <td style={{ fontSize: "0.8rem" }}>{validLabel(p)}</td>
                  <td className="num">{p.min_nights}</td>
                  <td className="num">{p.used_count}{p.max_uses != null ? `/${p.max_uses}` : ""}</td>
                  <td>
                    <span className={`status status-${p.active ? "confirmed" : "cancelled"}`}>
                      {p.active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="adm-btn adm-btn-ghost-sm"
                      onClick={() => toggle(p.code)}
                      title={p.active ? "Pause this code" : "Re-activate this code"}
                    >
                      {p.active ? "Pause" : "Activate"}
                    </button>
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

// ── Admin shell ───────────────────────────────────────────────────────────────
const TABS = [
  ["overview",      "Today",         "M3 22V10l9-7 9 7v12M9 22v-7h6v7"],
  ["bookings",      "Bookings",      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"],
  ["transfers",     "Transfers",     "M17 8l4 4-4 4M3 12h18"],
  ["conversations", "Conversations", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  ["promos",        "Promo Codes",   "M9 14l6-6M9.5 8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM14.5 13.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"],
  ["requests",      "Requests",      "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"],
  ["calendar",      "Calendar",      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"],
];

export default function Admin() {
  const [token,       setToken]       = useState(() => store.get(TOKEN_KEY) || "");
  const [loginErr,    setLoginErr]    = useState("");
  const [props,       setProps]       = useState([]);
  const [slug,        setSlug]        = useState("");
  const [tab,         setTab]         = useState("overview");
  const [handoffs,    setHandoffs]    = useState(0);
  const [pending,     setPending]     = useState(0);
  const [openSRs,     setOpenSRs]     = useState(0);
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
      setOpenSRs(s.open_service_requests ?? 0);
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
              {id === "bookings"      && pending   > 0 && <span className="badge badge-amber">{pending}</span>}
              {id === "conversations" && handoffs  > 0 && <span className="badge">{handoffs}</span>}
              {id === "requests"      && openSRs   > 0 && <span className="badge badge-red">{openSRs}</span>}
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
          {slug && tab === "conversations" && <Conversations   a={a} slug={slug} onChange={refreshBadges}/>}
          {slug && tab === "promos"        && <PromoCodes      a={a} slug={slug} toast={toast}/>}
          {slug && tab === "requests"      && <ServiceRequests a={a} slug={slug} toast={toast} onRefresh={refreshBadges}/>}
          {slug && tab === "calendar"      && <CalendarView    a={a} slug={slug}/>}
        </main>
      </div>
    </div>
  );
}
