import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function PropertyLogin({ slug, onLogin, error }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  return (
    <div className="adm-login">
      <form
        className="adm-login-card"
        onSubmit={async e => {
          e.preventDefault();
          setLoading(true);
          await onLogin(email.trim(), password);
          setLoading(false);
        }}
      >
        <div className="adm-login-logo">
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="var(--accent,#2f5d3a)"/>
            <path d="M8 26V14l8-6 8 6v12" stroke="rgba(255,255,255,0.95)" strokeWidth="2.1" strokeLinejoin="round"/>
            <rect x="13" y="18" width="6" height="8" rx="1.5" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8"/>
          </svg>
        </div>
        <h1>Staff Dashboard</h1>
        <p>Sign in with your property admin credentials to manage bookings and guests.</p>
        <div className="adm-field">
          <label htmlFor="adm-email">Email</label>
          <input
            id="adm-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@hotel.com"
            autoFocus
            autoComplete="email"
          />
        </div>
        <div className="adm-field">
          <label htmlFor="adm-pass">Password</label>
          <input
            id="adm-pass"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password…"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="adm-field-err">{error}</p>}
        <button
          className="adm-btn adm-btn-primary adm-btn-full"
          disabled={!email.trim() || !password || loading}
        >
          {loading ? "Signing in…" : "Sign in"}
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
      <div className="stat-card-body">
        <div className="stat-card-n">{value}</div>
        <div className="stat-card-l">{label}</div>
        {action && value > 0 && (
          <button className="stat-card-action" onClick={onClick}>{action} →</button>
        )}
      </div>
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

  const dateLabel = fmtDate(s.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const totalUnits = s.occupancy?.[0]?.total ?? 0;
  const occPct = totalUnits ? Math.round((s.in_house / totalUnits) * 100) : 0;
  const urgentCount = (s.pending ?? 0) + (s.open_handoffs ?? 0) + (s.open_service_requests ?? 0);

  return (
    <div className="overview-wrap">

      {/* ── Page header ── */}
      <div className="overview-head">
        <div className="overview-head-left">
          <h2 className="overview-title">Today</h2>
          <p className="overview-date">{dateLabel}</p>
        </div>
        <div className="overview-head-right">
          {totalUnits > 0 && (
            <div className="overview-occ-pill">
              <span className="overview-occ-pct">{occPct}%</span>
              <span className="overview-occ-sub">occupied · {s.in_house}/{totalUnits} rooms</span>
            </div>
          )}
          {urgentCount > 0 && (
            <div className="overview-alert-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01"/></svg>
              <span>{urgentCount} action{urgentCount !== 1 ? "s" : ""} needed</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity section ── */}
      <section className="overview-section">
        <h3 className="overview-section-label">Today's Activity</h3>
        <div className="stat-grid">
          <StatCard iconKey="arrivals"   value={s.arrivals_today}   label="Arriving today" />
          <StatCard iconKey="departures" value={s.departures_today}  label="Leaving today" />
          <StatCard iconKey="inhouse"    value={s.in_house}          label="Staying tonight" />
          <StatCard iconKey="pending"    value={s.pending}           label="Awaiting confirmation" action="Confirm now" onClick={() => goTo("bookings")}      urgent={s.pending > 0} />
          <StatCard iconKey="transfers"  value={s.transfers_48h}     label="Transfers in 48 h"     action="Review"      onClick={() => goTo("transfers")} />
          <StatCard iconKey="handoffs"   value={s.open_handoffs}     label="Guests needing staff"  action="View"        onClick={() => goTo("conversations")} urgent={s.open_handoffs > 0} />
          {s.open_service_requests > 0 && (
            <StatCard iconKey="handoffs" value={s.open_service_requests} label="Open service requests" action="View" onClick={() => goTo("requests")} urgent />
          )}
        </div>
      </section>

      {/* ── Occupancy section ── */}
      <section className="overview-section">
        <h3 className="overview-section-label">Occupancy Forecast</h3>
        <Occupancy days={s.occupancy} />
      </section>

      {/* ── Revenue section ── */}
      <section className="overview-section">
        <div className="overview-section-head-row">
          <h3 className="overview-section-label">Revenue</h3>
          <span className="overview-section-sub">month-to-date · confirmed bookings</span>
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
      </section>

    </div>
  );
}

// ── Pending booking action card ───────────────────────────────────────────────
function BookingActionCard({ b, onConfirm, onCancel, onResend }) {
  const [loading, setLoading] = useState(null);
  async function handle(action) {
    setLoading(action);
    try {
      if (action === "confirm") await onConfirm();
      else if (action === "cancel") await onCancel();
      else if (action === "resend") await onResend();
    } finally { setLoading(null); }
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
        {onResend && (
          <button
            className="adm-btn adm-btn-ghost-sm"
            onClick={() => handle("resend")}
            disabled={!!loading}
            title="Resend confirmation email to guest"
          >
            {loading === "resend" ? "Sending…" : "✉ Resend"}
          </button>
        )}
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

  async function resend(ref) {
    try {
      const r = await a.resendConfirmation(slug, ref);
      toast.success(`Confirmation email resent to ${r.sent_to}`);
    } catch (e) {
      toast.error(e.message || "Failed to resend email");
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
                onResend={()  => resend(b.reference)}
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
                    {b.status !== "cancelled" && (
                      <button className="adm-icon-btn" onClick={() => resend(b.reference)}
                        title="Resend confirmation email" aria-label="Resend confirmation email">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      </button>
                    )}
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

// ── Transfer Routes tab ───────────────────────────────────────────────────────
const TRO_EMPTY = { route: "", direction: "arrival", vehicle: "", max_pax: 4, max_bags: 4, price: 0, duration_min: 60 };

const TRO_DIR_LABEL = { arrival: "Arrival", departure: "Departure" };
const TRO_DIR_COLOR = { arrival: "#1565c0", departure: "#c66b00" };

const TRO_VEHICLES = ["Sedan", "Van", "Minibus", "Bus", "Luxury Sedan", "SUV", "Tuk Tuk"];

function TransferRoutes({ a, slug, currency, toast }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(TRO_EMPTY);
  const [busy,    setBusy]    = useState(false);

  const load = () => {
    setLoading(true);
    a.transferOptions(slug)
      .then(d => { setList(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [slug]);

  function startAdd()  { setAdding(true); setEditId(null); setForm(TRO_EMPTY); }
  function startEdit(o){ setEditId(o.id); setAdding(false); setForm({ route: o.route, direction: o.direction, vehicle: o.vehicle, max_pax: o.max_pax, max_bags: o.max_bags, price: o.price, duration_min: o.duration_min }); }
  function cancelForm(){ setAdding(false); setEditId(null); setForm(TRO_EMPTY); }

  async function save() {
    if (!form.route.trim() || !form.vehicle.trim()) return;
    setBusy(true);
    try {
      const body = {
        ...form,
        price:        parseFloat(form.price)        || 0,
        max_pax:      parseInt(form.max_pax)         || 1,
        max_bags:     parseInt(form.max_bags)         || 0,
        duration_min: parseInt(form.duration_min)     || 60,
      };
      if (editId) {
        await a.updateTransferOption(slug, editId, body);
        toast.success("Route updated");
      } else {
        await a.createTransferOption(slug, body);
        toast.success("Route added");
      }
      cancelForm();
      load();
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    if (!confirm("Delete this transfer route?")) return;
    try {
      await a.deleteTransferOption(slug, id);
      toast.success("Route deleted");
      load();
    } catch (err) { toast.error(err.message || "Error"); }
  }

  function RouteForm({ isEdit = false }) {
    return (
      <div className="sn-form">
        <div className="tro-form-grid">
          <div className="adm-field tro-field-full">
            <label className="adm-label">Route Description</label>
            <input className="adm-input" placeholder="e.g. BIA Airport (CMB) → Property"
              value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Direction</label>
            <select className="adm-input" value={form.direction}
              onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
              <option value="arrival">Arrival (Airport → Hotel)</option>
              <option value="departure">Departure (Hotel → Airport)</option>
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label">Vehicle Type</label>
            <input className="adm-input" list="tro-vehicles" placeholder="e.g. Sedan, Van, Minibus…"
              value={form.vehicle} onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))} />
            <datalist id="tro-vehicles">
              {TRO_VEHICLES.map(v => <option key={v} value={v}/>)}
            </datalist>
          </div>
          <div className="adm-field">
            <label className="adm-label">Price ({currency})</label>
            <input className="adm-input" type="number" min="0" step="0.01"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Max Passengers</label>
            <input className="adm-input" type="number" min="1" max="100"
              value={form.max_pax} onChange={e => setForm(f => ({ ...f, max_pax: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Max Bags</label>
            <input className="adm-input" type="number" min="0" max="100"
              value={form.max_bags} onChange={e => setForm(f => ({ ...f, max_bags: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Duration (minutes)</label>
            <input className="adm-input" type="number" min="1" max="1440"
              value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
          </div>
        </div>
        <div className="sn-form-actions">
          <button className="adm-btn adm-btn-primary" onClick={save}
            disabled={busy || !form.route.trim() || !form.vehicle.trim()}>
            {busy ? "Saving…" : isEdit ? "Update Route" : "Add Route"}
          </button>
          <button className="adm-btn" onClick={cancelForm}>Cancel</button>
        </div>
      </div>
    );
  }

  const formOpen = adding || editId !== null;

  return (
    <div className="sn-wrap">
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title">Transfer Routes</h2>
          <p className="adm-section-sub">Airport transfer options offered to guests during chat booking. These routes are shown by the AI concierge.</p>
        </div>
        {!formOpen && (
          <button className="adm-btn adm-btn-primary" onClick={startAdd}>+ Add Route</button>
        )}
      </div>

      {adding && <RouteForm />}

      {loading ? (
        <div className="adm-loading">Loading…</div>
      ) : list.length === 0 && !adding ? (
        <div className="adm-empty">
          No transfer routes yet. Add routes to let guests book airport transfers via the concierge.
        </div>
      ) : (
        <div className="sn-list">
          {list.map(o => {
            const dirColor = TRO_DIR_COLOR[o.direction] || "#555";
            return (
              <div key={o.id} className="sn-card">
                {editId === o.id ? (
                  <RouteForm isEdit />
                ) : (
                  <div className="sn-card-inner">
                    <div className="sn-card-left">
                      <div className="tro-dir-badge" style={{ background: `${dirColor}18`, color: dirColor }}>
                        {TRO_DIR_LABEL[o.direction] || o.direction}
                      </div>
                      <div className="sn-card-info">
                        <p className="sn-name">{o.route}</p>
                        <p className="sn-dates tro-meta">
                          {o.vehicle} · {o.max_pax} pax · {o.max_bags} bags · {o.duration_min} min
                        </p>
                      </div>
                    </div>
                    <div className="sn-card-right">
                      <span className="sn-meta-pill tro-price">
                        {money(o.price, currency)}
                      </span>
                      <button className="adm-btn-sm" onClick={() => startEdit(o)}>Edit</button>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => del(o.id)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
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
                placeholder="e.g. LV10"
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

// ── Super-admin: Properties management ───────────────────────────────────────
const KINDS     = ["hotel","villa","guesthouse","resort","apartment"];
const CURRENCIES = ["LKR","USD","EUR","GBP","AUD","SGD","AED"];

const EMPTY_PROP_FORM = {
  name: "", slug: "", kind: "villa", location: "", currency: "LKR",
  timezone: "Asia/Colombo", reference_prefix: "", check_in_time: "14:00",
  check_out_time: "11:00", assistant_name: "Concierge",
  tone: "warm, concise and professional",
  tax_pct: 0, service_charge_pct: 0, free_cancellation_days: 7,
  admin_email: "", admin_password: "",
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-");
}
function autoPrefix(slug) {
  return slug.split("-").map(w => w[0]?.toUpperCase()||"").join("").slice(0,6) || "BK";
}

function SuperProperties({ token, toast }) {
  const [rows,    setRows]    = useState(null);
  const [creating, setCreating] = useState(false);
  const [form,    setForm]    = useState(EMPTY_PROP_FORM);
  const [saving,  setSaving]  = useState(false);
  const [adv,     setAdv]     = useState(false);

  const sa = useMemo(() => api.superAdmin(token), [token]);

  const load = useCallback(() => {
    sa.listProperties().then(setRows).catch(() => setRows([]));
  }, [sa]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "name")  { next.slug = slugify(v); next.reference_prefix = autoPrefix(next.slug); }
      if (k === "slug")  { next.reference_prefix = autoPrefix(v); }
      return next;
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await sa.createProperty(form);
      toast.success(`"${res.name}" created — slug: ${res.slug}`);
      setCreating(false);
      setForm(EMPTY_PROP_FORM);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to create property");
    }
    setSaving(false);
  }

  const origin = window.location.origin;

  return (
    <>
      <div className="adm-toolbar">
        <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Properties</span>
        {rows && <span className="badge" style={{ background: "var(--line)", color: "var(--muted)" }}>{rows.length}</span>}
        <button className="adm-btn adm-btn-primary" style={{ marginLeft: "auto" }}
          onClick={() => { setCreating(c => !c); setForm(EMPTY_PROP_FORM); setAdv(false); }}>
          {creating ? "Cancel" : "+ New property"}
        </button>
      </div>

      {creating && (
        <form className="prop-form" onSubmit={handleCreate}>
          <div className="prop-form-grid">
            <div className="adm-field" style={{ gridColumn: "span 2" }}>
              <label htmlFor="pf-name">Property name *</label>
              <input id="pf-name" required value={form.name} placeholder="e.g. Kandy Hills Resort"
                onChange={e => set("name", e.target.value)} autoFocus />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-slug">Slug (URL key) *</label>
              <input id="pf-slug" required value={form.slug} placeholder="kandy-hills-resort"
                style={{ fontFamily: "monospace" }}
                onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} />
              {form.slug && <small className="adm-field-hint">/admin/{form.slug}</small>}
            </div>
            <div className="adm-field">
              <label htmlFor="pf-kind">Type *</label>
              <select id="pf-kind" value={form.kind} onChange={e => set("kind", e.target.value)}>
                {KINDS.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
              </select>
            </div>
            <div className="adm-field" style={{ gridColumn: "span 2" }}>
              <label htmlFor="pf-loc">Location *</label>
              <input id="pf-loc" required value={form.location} placeholder="Kandy, Central Province, Sri Lanka"
                onChange={e => set("location", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-cur">Currency *</label>
              <select id="pf-cur" value={form.currency} onChange={e => set("currency", e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="pf-ref">Reference prefix *</label>
              <input id="pf-ref" required value={form.reference_prefix} placeholder="KH"
                maxLength={6} style={{ fontFamily: "monospace", letterSpacing: "0.08em" }}
                onChange={e => set("reference_prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} />
              <small className="adm-field-hint">Booking refs: {form.reference_prefix || "??"}240001</small>
            </div>
            <div className="adm-field">
              <label htmlFor="pf-email">Admin email *</label>
              <input id="pf-email" type="email" required value={form.admin_email}
                placeholder="admin@hotel.com" onChange={e => set("admin_email", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="pf-pass">Admin password *</label>
              <input id="pf-pass" type="password" required value={form.admin_password}
                placeholder="Min 8 characters" minLength={8}
                onChange={e => set("admin_password", e.target.value)} />
            </div>
          </div>

          <button type="button" className="prop-adv-toggle"
            onClick={() => setAdv(a => !a)}>
            {adv ? "▾" : "▸"} Advanced settings
          </button>

          {adv && (
            <div className="prop-form-grid" style={{ marginTop: 12 }}>
              <div className="adm-field">
                <label htmlFor="pf-tz">Timezone</label>
                <input id="pf-tz" value={form.timezone}
                  onChange={e => set("timezone", e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pf-aname">AI assistant name</label>
                <input id="pf-aname" value={form.assistant_name}
                  onChange={e => set("assistant_name", e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pf-ci">Check-in time</label>
                <input id="pf-ci" type="time" value={form.check_in_time}
                  onChange={e => set("check_in_time", e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pf-co">Check-out time</label>
                <input id="pf-co" type="time" value={form.check_out_time}
                  onChange={e => set("check_out_time", e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pf-tax">Tax %</label>
                <input id="pf-tax" type="number" min="0" max="100" step="0.1" value={form.tax_pct}
                  onChange={e => set("tax_pct", parseFloat(e.target.value)||0)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pf-svc">Service charge %</label>
                <input id="pf-svc" type="number" min="0" max="100" step="0.1" value={form.service_charge_pct}
                  onChange={e => set("service_charge_pct", parseFloat(e.target.value)||0)} />
              </div>
              <div className="adm-field">
                <label htmlFor="pf-cancel">Free cancellation days</label>
                <input id="pf-cancel" type="number" min="0" value={form.free_cancellation_days}
                  onChange={e => set("free_cancellation_days", parseInt(e.target.value)||0)} />
              </div>
            </div>
          )}

          <div className="promo-form-actions" style={{ marginTop: 20 }}>
            <button type="button" className="adm-btn adm-btn-ghost-sm"
              onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
              {saving ? <><span className="adm-spinner"/><span>Creating…</span></> : "Create property"}
            </button>
          </div>
        </form>
      )}

      <div className="table-wrap" style={{ marginTop: creating ? 24 : 0 }}>
        {rows === null ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
            No properties yet. Create your first one above.
          </div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Property</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Currency</th>
                <th>Admin login</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.slug}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.location}</small>
                  </td>
                  <td><code style={{ fontSize: "0.82rem", fontFamily: "monospace" }}>{p.slug}</code></td>
                  <td><span className="status">{p.kind}</span></td>
                  <td>{p.currency}</td>
                  <td>
                    {p.has_credentials
                      ? <span style={{ fontSize: "0.84rem" }}>{p.admin_email}</span>
                      : <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Not set</span>}
                  </td>
                  <td className="actions">
                    <a href={`${origin}/admin/${p.slug}`} target="_blank" rel="noreferrer"
                      className="adm-btn adm-btn-ghost-sm">Staff login</a>
                    <a href={`${origin}/widget/${p.slug}`} target="_blank" rel="noreferrer"
                      className="adm-btn adm-btn-ghost-sm" style={{ marginLeft: 6 }}>Widget</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ── Knowledge Base editor ─────────────────────────────────────────────────────
function KnowledgeBase({ a, slug, toast }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null); // null | {id?, source, content}
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSource, setUploadSource] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setRows(null);
    a.kb(slug).then(setRows).catch(() => setRows([]));
  }, [a, slug]);
  useEffect(() => { load(); }, [load]);

  const startAdd = () => setEditing({ source: "", content: "" });
  const startEdit = (row) => setEditing({ id: row.id, source: row.source, content: row.content });
  const cancelEdit = () => setEditing(null);

  async function handleSave(e) {
    e.preventDefault();
    const { id, source, content } = editing;
    if (!source.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (id) {
        await a.updateKb(slug, id, { source: source.trim(), content: content.trim() });
        toast.success("Chunk updated");
      } else {
        await a.createKb(slug, { source: source.trim(), content: content.trim() });
        toast.success("Chunk added — AI will use it immediately");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, source) {
    if (!window.confirm(`Delete this chunk from "${source}"?`)) return;
    setDeleting(id);
    try {
      await a.deleteKb(slug, id);
      toast.success("Chunk deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !uploadSource.trim()) return;
    setUploading(true);
    try {
      const result = await a.uploadKb(slug, uploadFile, uploadSource.trim());
      toast.success(`${result.chunks_added} chunk${result.chunks_added !== 1 ? "s" : ""} added from "${uploadFile.name}"`);
      setUploadOpen(false);
      setUploadFile(null);
      setUploadSource("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  const sources = rows ? [...new Set(rows.map(r => r.source))].sort() : [];

  return (
    <>
      <div className="adm-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Knowledge Base</span>
          {rows && (
            <span className="badge badge-blue">{rows.length} chunk{rows.length !== 1 ? "s" : ""}</span>
          )}
          {rows && sources.length > 0 && (
            <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="adm-btn" onClick={() => { setUploadOpen(o => !o); setEditing(null); }}>
            {uploadOpen ? "Cancel" : "↑ Upload doc"}
          </button>
          <button
            className="adm-btn adm-btn-primary"
            onClick={() => { editing && !editing.id ? cancelEdit() : startAdd(); setUploadOpen(false); }}
          >
            {editing && !editing.id ? "Cancel" : "+ Add chunk"}
          </button>
        </div>
      </div>

      {uploadOpen && (
        <form className="kb-form kb-upload-form" onSubmit={handleUpload}>
          <div className="kb-upload-hint">
            Upload a <strong>PDF</strong> or <strong>DOCX</strong> file — it will be automatically split into chunks and added to the knowledge base.
          </div>
          <div className="adm-field">
            <label htmlFor="kb-upload-source">Source / Category *</label>
            <input
              id="kb-upload-source"
              required
              placeholder="e.g. Hotel Fact Sheet, Policies, Dining Menu"
              value={uploadSource}
              onChange={e => setUploadSource(e.target.value)}
              list="kb-sources-list"
            />
            {sources.length > 0 && (
              <datalist id="kb-sources-list">
                {sources.map(s => <option key={s} value={s} />)}
              </datalist>
            )}
          </div>
          <div className="adm-field">
            <label htmlFor="kb-upload-file">File *</label>
            <input
              id="kb-upload-file"
              ref={fileRef}
              type="file"
              required
              accept=".pdf,.docx"
              className="kb-file-input"
              onChange={e => {
                const f = e.target.files?.[0] || null;
                setUploadFile(f);
                if (f && !uploadSource.trim()) {
                  setUploadSource(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
                }
              }}
            />
            <span className="adm-field-hint">Maximum 10 MB · PDF or DOCX only</span>
          </div>
          {uploadFile && (
            <div className="kb-upload-preview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>{uploadFile.name}</span>
              <span style={{ opacity: 0.5 }}>({(uploadFile.size / 1024).toFixed(0)} KB)</span>
            </div>
          )}
          <div className="kb-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary" disabled={uploading || !uploadFile}>
              {uploading ? "Uploading & chunking…" : "Upload & add to KB"}
            </button>
            <button type="button" className="adm-btn" onClick={() => { setUploadOpen(false); setUploadFile(null); setUploadSource(""); }}>Cancel</button>
          </div>
        </form>
      )}

      {editing && (
        <form className="kb-form" onSubmit={handleSave}>
          <div className="adm-field">
            <label htmlFor="kb-source">Source / Category *</label>
            <input
              id="kb-source"
              required
              placeholder="e.g. Policies, FAQ, Dining, Rooms"
              value={editing.source}
              onChange={e => setEditing(ed => ({ ...ed, source: e.target.value }))}
              list="kb-sources-list"
            />
            {sources.length > 0 && (
              <datalist id="kb-sources-list">
                {sources.map(s => <option key={s} value={s} />)}
              </datalist>
            )}
            <span className="adm-field-hint">Group related chunks under the same source name.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="kb-content">Content *</label>
            <textarea
              id="kb-content"
              required
              rows={6}
              placeholder="Enter the knowledge chunk text. Keep each chunk focused on one topic for best retrieval."
              value={editing.content}
              onChange={e => setEditing(ed => ({ ...ed, content: e.target.value }))}
            />
            <span className="adm-field-hint">{editing.content.length} characters</span>
          </div>
          <div className="kb-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
              {saving ? "Saving…" : (editing.id ? "Update chunk" : "Add chunk")}
            </button>
            <button type="button" className="adm-btn" onClick={cancelEdit}>Cancel</button>
          </div>
        </form>
      )}

      {rows === null ? (
        <div className="adm-spinner-wrap"><span className="adm-spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="adm-empty">
          <p>No knowledge chunks yet.</p>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>Add chunks to teach the AI about your property's policies, FAQs, facilities, and more.</p>
        </div>
      ) : (
        <div className="kb-list">
          {rows.map(row => (
            <div className={`kb-chunk${editing?.id === row.id ? " kb-chunk-editing" : ""}`} key={row.id}>
              <div className="kb-chunk-header">
                <span className="kb-source-tag">{row.source}</span>
                <div className="kb-chunk-actions">
                  <button
                    className="adm-btn adm-btn-sm"
                    onClick={() => editing?.id === row.id ? cancelEdit() : startEdit(row)}
                  >
                    {editing?.id === row.id ? "Cancel" : "Edit"}
                  </button>
                  <button
                    className="adm-btn adm-btn-sm adm-btn-danger"
                    disabled={deleting === row.id}
                    onClick={() => handleDelete(row.id, row.source)}
                  >
                    {deleting === row.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
              <p className="kb-chunk-content">{row.content}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Property Settings ─────────────────────────────────────────────────────────
const DAY_LABELS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_HINTS  = { RO: "Room Only", EP: "European Plan", BB: "Bed & Breakfast", CP: "Continental Plan", HB: "Half Board", MAP: "Modified American Plan", FB: "Full Board", AI: "All Inclusive" };
const COMMON_TZ   = ["Asia/Colombo", "Asia/Bangkok", "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Jakarta", "Asia/Dubai", "Asia/Mumbai", "Asia/Tokyo", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];

function PropertySettings({ a, slug, currency, toast }) {
  const [form,   setForm]   = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    a.propertySettings(slug).then(s => {
      const plans = Object.entries(s.meal_plans || { RO: 0 }).map(([code, price]) => ({ code, price }));
      setForm({ ...s, meal_plans: plans });
    }).catch(() => toast.error("Failed to load property settings"));
  }, [a, slug]);

  function toggleDay(d) {
    setForm(f => {
      const days = f.weekend_days.includes(d)
        ? f.weekend_days.filter(x => x !== d)
        : [...f.weekend_days, d];
      return { ...f, weekend_days: days };
    });
  }

  function addMealPlan() {
    setForm(f => ({ ...f, meal_plans: [...f.meal_plans, { code: "", price: 0 }] }));
  }
  function updateMealPlan(i, patch) {
    setForm(f => {
      const plans = [...f.meal_plans];
      plans[i] = { ...plans[i], ...patch };
      return { ...f, meal_plans: plans };
    });
  }
  function deleteMealPlan(i) {
    setForm(f => ({ ...f, meal_plans: f.meal_plans.filter((_, j) => j !== i) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const meal_plans = {};
      for (const { code, price } of form.meal_plans) {
        if (code.trim()) meal_plans[code.trim().toUpperCase()] = parseFloat(price) || 0;
      }
      await a.updatePropertySettings(slug, {
        check_in_time:        form.check_in_time,
        check_out_time:       form.check_out_time,
        timezone:             form.timezone,
        tax_pct:              parseFloat(form.tax_pct)              || 0,
        service_charge_pct:   parseFloat(form.service_charge_pct)   || 0,
        weekend_uplift_pct:   parseFloat(form.weekend_uplift_pct)   || 0,
        weekend_days:         form.weekend_days,
        meal_plans,
        free_cancellation_days: parseInt(form.free_cancellation_days) || 0,
        max_stay_nights:        parseInt(form.max_stay_nights)         || 30,
      });
      toast.success("Property settings saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="adm-spinner-wrap"><span className="adm-spinner" /></div>;

  const totalFees = (parseFloat(form.tax_pct) || 0) + (parseFloat(form.service_charge_pct) || 0);

  return (
    <form className="cust-form" onSubmit={handleSave}>

      {/* ── Check-In / Check-Out ── */}
      <div className="cust-section">
        <h3 className="cust-section-title">Check-In & Check-Out</h3>
        <p className="cust-section-desc">Times displayed to guests in booking confirmations and the AI concierge.</p>
        <div className="cust-grid-3">
          <div className="adm-field">
            <label htmlFor="ps-ci">Check-In Time</label>
            <input id="ps-ci" type="time" value={form.check_in_time}
              onChange={e => set("check_in_time", e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="ps-co">Check-Out Time</label>
            <input id="ps-co" type="time" value={form.check_out_time}
              onChange={e => set("check_out_time", e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="ps-tz">Timezone</label>
            <input id="ps-tz" list="ps-tz-list" value={form.timezone}
              onChange={e => set("timezone", e.target.value)}
              placeholder="Asia/Colombo" />
            <datalist id="ps-tz-list">
              {COMMON_TZ.map(z => <option key={z} value={z} />)}
            </datalist>
            <span className="adm-field-hint">Used to calculate today's date accurately.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="ps-cancel">Free Cancellation (days before check-in)</label>
            <input id="ps-cancel" type="number" min="0" max="365" value={form.free_cancellation_days}
              onChange={e => set("free_cancellation_days", e.target.value)} />
            <span className="adm-field-hint">Set 0 to disable free cancellation.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="ps-maxstay">Max Stay (nights)</label>
            <input id="ps-maxstay" type="number" min="1" max="365" value={form.max_stay_nights}
              onChange={e => set("max_stay_nights", e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Taxes & Fees ── */}
      <div className="cust-section">
        <h3 className="cust-section-title">Taxes & Service Charge</h3>
        <p className="cust-section-desc">Applied automatically to all booking totals. Combined: <strong>{totalFees.toFixed(1)}%</strong></p>
        <div className="cust-grid-2">
          <div className="adm-field">
            <label htmlFor="ps-tax">Government Tax (%)</label>
            <input id="ps-tax" type="number" min="0" max="100" step="0.1" value={form.tax_pct}
              onChange={e => set("tax_pct", e.target.value)} />
            <span className="adm-field-hint">e.g. VAT, GST — set 0 if not applicable.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="ps-sc">Service Charge (%)</label>
            <input id="ps-sc" type="number" min="0" max="100" step="0.1" value={form.service_charge_pct}
              onChange={e => set("service_charge_pct", e.target.value)} />
            <span className="adm-field-hint">e.g. 10% service charge — set 0 if not applicable.</span>
          </div>
        </div>
      </div>

      {/* ── Weekend Pricing ── */}
      <div className="cust-section">
        <h3 className="cust-section-title">Weekend Pricing</h3>
        <p className="cust-section-desc">Room rates on selected days are multiplied by <strong>(1 + uplift%)</strong>.</p>
        <div className="cust-grid-2">
          <div className="adm-field">
            <label htmlFor="ps-wknd">Weekend Uplift (%)</label>
            <input id="ps-wknd" type="number" min="0" max="100" step="0.5" value={form.weekend_uplift_pct}
              onChange={e => set("weekend_uplift_pct", e.target.value)} />
            <span className="adm-field-hint">Set 0 to use the same rate every day.</span>
          </div>
          <div className="adm-field">
            <label>Weekend Days</label>
            <div className="ps-days">
              {DAY_LABELS.map((d, i) => (
                <button key={i} type="button"
                  className={`ps-day-btn${form.weekend_days.includes(i) ? " ps-day-active" : ""}`}
                  onClick={() => toggleDay(i)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Meal Plans ── */}
      <div className="cust-section">
        <h3 className="cust-section-title">Meal Plans</h3>
        <p className="cust-section-desc">Extra charge per person per night added on top of the room rate. Use 0 for plans included in the rate.</p>
        <div className="ps-mp-list">
          <div className="ps-mp-header">
            <span>Code</span><span>Price per person / night ({currency})</span><span/>
          </div>
          {form.meal_plans.map((p, i) => (
            <div key={i} className="ps-mp-row">
              <div className="ps-mp-code-wrap">
                <input className="adm-input ps-mp-code" value={p.code} maxLength={8}
                  onChange={e => updateMealPlan(i, { code: e.target.value.toUpperCase() })}
                  placeholder="BB" />
                {MEAL_HINTS[p.code] && (
                  <span className="ps-mp-hint">{MEAL_HINTS[p.code]}</span>
                )}
              </div>
              <input className="adm-input" type="number" min="0" step="0.01" value={p.price}
                onChange={e => updateMealPlan(i, { price: e.target.value })} />
              <button type="button" className="adm-icon-btn adm-icon-btn-cancel"
                onClick={() => deleteMealPlan(i)} title="Remove meal plan" aria-label="Remove">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
          <button type="button" className="adm-btn" onClick={addMealPlan}
            disabled={form.meal_plans.length >= 10}>
            + Add Meal Plan
          </button>
        </div>
        <div className="ps-mp-shortcuts">
          {["RO","BB","HB","FB","AI"].filter(c => !form.meal_plans.some(p => p.code === c)).map(c => (
            <button key={c} type="button" className="ps-shortcut"
              onClick={() => setForm(f => ({ ...f, meal_plans: [...f.meal_plans, { code: c, price: 0 }] }))}>
              + {c} <span>{MEAL_HINTS[c]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cust-save-row">
        <button type="submit" className="adm-btn adm-btn-primary adm-btn-full" disabled={saving}>
          {saving ? "Saving…" : "Save property settings"}
        </button>
      </div>

    </form>
  );
}

// ── Customize ─────────────────────────────────────────────────────────────────
const TONE_PRESETS = [
  { label: "Warm & Professional",   value: "warm, concise and professional" },
  { label: "Luxury & Formal",       value: "elevated, formal and sophisticated — suitable for luxury properties" },
  { label: "Casual & Friendly",     value: "casual, friendly and approachable" },
  { label: "Concise & Efficient",   value: "professional, concise and efficient" },
];

const CURRENCIES_EXT = ["LKR", "USD", "EUR", "GBP", "AUD", "SGD", "INR", "THB", "MYR", "AED"];

function Customize({ a, slug, toast }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSug = (i, v) => setForm(f => {
    const s = [...(f.suggestions || ["", "", "", ""])];
    s[i] = v;
    return { ...f, suggestions: s };
  });

  useEffect(() => {
    a.settings(slug).then(s => {
      const sugs = s.suggestions || ["", "", "", ""];
      while (sugs.length < 4) sugs.push("");
      setForm({ ...s, suggestions: sugs.slice(0, 4) });
    }).catch(() => toast.error("Failed to load settings"));
  }, [a, slug]);

  const isPreset = form ? TONE_PRESETS.some(p => p.value === form.tone) : false;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await a.updateSettings(slug, {
        ...form,
        suggestions: form.suggestions.filter(s => s.trim()),
      });
      toast.success("Settings saved — changes are live immediately");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="adm-spinner-wrap"><span className="adm-spinner" /></div>;

  const previewGreeting = form.greeting.trim() ||
    `Hello! I'm ${form.assistant_name || "Concierge"} 🙏 your AI concierge at [Property Name]. How can I help you today?`;

  return (
    <form className="cust-form" onSubmit={handleSave}>

      {/* ── AI Identity ── */}
      <div className="cust-section">
        <h3 className="cust-section-title">AI Agent Identity</h3>
        <p className="cust-section-desc">How the concierge introduces itself and communicates with guests.</p>
        <div className="cust-grid-2">
          <div className="adm-field">
            <label htmlFor="cust-name">Agent Name *</label>
            <input id="cust-name" required value={form.assistant_name}
              onChange={e => set("assistant_name", e.target.value)}
              placeholder="e.g. Aria, Kai, Concierge" />
            <span className="adm-field-hint">Name used in greetings and responses.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="cust-tone">Personality / Tone</label>
            <select id="cust-tone" value={isPreset ? form.tone : "__custom__"}
              onChange={e => { if (e.target.value !== "__custom__") set("tone", e.target.value); }}>
              {TONE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              {!isPreset && <option value="__custom__">Custom (see below)</option>}
            </select>
          </div>
        </div>
        {!isPreset && (
          <div className="adm-field">
            <label htmlFor="cust-tone-custom">Custom Tone Description</label>
            <input id="cust-tone-custom" value={form.tone} onChange={e => set("tone", e.target.value)}
              placeholder="e.g. formal and elegant with a focus on guest wellbeing" />
          </div>
        )}
        <div className="adm-field">
          <label htmlFor="cust-greeting">Custom Greeting Message</label>
          <textarea id="cust-greeting" rows={3} value={form.greeting}
            onChange={e => set("greeting", e.target.value)}
            placeholder="Leave blank to use the auto-generated greeting." />
          <span className="adm-field-hint">Leave blank to auto-generate from property name and agent name.</span>
        </div>
        <div className="cust-preview">
          <span className="cust-preview-label">Preview</span>
          <p className="cust-preview-text">"{previewGreeting}"</p>
        </div>
      </div>

      {/* ── Quick Suggestions ── */}
      <div className="cust-section">
        <h3 className="cust-section-title">Quick Suggestions</h3>
        <p className="cust-section-desc">Shortcut buttons shown when guests open the chat. Leave blank to hide a slot.</p>
        <div className="cust-grid-2">
          {[0, 1, 2, 3].map(i => (
            <div className="adm-field" key={i}>
              <label htmlFor={`cust-sug-${i}`}>Suggestion {i + 1}</label>
              <input id={`cust-sug-${i}`} value={form.suggestions[i] || ""}
                onChange={e => setSug(i, e.target.value)}
                placeholder={["Check available rooms", "Book airport transfer", "Things to do nearby", "View my booking"][i]} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className="cust-section">
        <h3 className="cust-section-title">Appearance</h3>
        <p className="cust-section-desc">Chat widget colours and embed button settings.</p>
        <div className="cust-grid-3">
          <div className="adm-field">
            <label htmlFor="cust-accent">Accent Colour</label>
            <div className="cust-color-row">
              <input id="cust-accent-picker" type="color" value={form.accent}
                onChange={e => set("accent", e.target.value)} className="cust-color-picker" />
              <input id="cust-accent" value={form.accent}
                onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set("accent", e.target.value); }}
                placeholder="#2f5d3a" style={{ fontFamily: "monospace" }} />
            </div>
            <span className="adm-field-hint">Used for buttons, chat bubble, and highlights.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="cust-label">Embed Button Label</label>
            <input id="cust-label" value={form.widget_label}
              onChange={e => set("widget_label", e.target.value)}
              placeholder="e.g. Chat with us" />
            <span className="adm-field-hint">Text on the floating chat button in embedded widgets.</span>
          </div>
          <div className="adm-field">
            <label>Embed Button Position</label>
            <div className="cust-toggle-row">
              {["left", "right"].map(pos => (
                <button key={pos} type="button"
                  className={`cust-toggle-btn${form.widget_position === pos ? " cust-toggle-active" : ""}`}
                  onClick={() => set("widget_position", pos)}>
                  {pos === "left" ? "← Left" : "Right →"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="cust-accent-preview" style={{ "--cust-accent": form.accent }}>
          <div className="cust-bubble-preview">
            <span>{form.widget_label || "Chat with us"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
        </div>
      </div>

      <div className="cust-save-row">
        <button type="submit" className="adm-btn adm-btn-primary adm-btn-full" disabled={saving}>
          {saving ? "Saving…" : "Save all settings"}
        </button>
      </div>

    </form>
  );
}

// ── Rooms & pricing ───────────────────────────────────────────────────────────
const EMPTY_ROOM = {
  code: "", name: "", description: "", beds: "", size_sqm: "",
  max_adults: 2, max_children: 0, amenities: "", base_rate: "", total_units: 1, image_url: "",
};

function RoomForm({ initial, onSave, onCancel, saving, currency }) {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <form className="room-form" onSubmit={e => { e.preventDefault(); onSave(f); }}>
      <div className="room-form-grid">
        <div className="adm-field">
          <label htmlFor="rf-code">Room Code *</label>
          <input id="rf-code" required placeholder="e.g. STD, DLX, STE"
            value={f.code} onChange={e => set("code", e.target.value.toUpperCase())}
            style={{ fontFamily: "monospace", letterSpacing: "0.05em" }} />
          <span className="adm-field-hint">Short uppercase identifier — used in bookings.</span>
        </div>
        <div className="adm-field">
          <label htmlFor="rf-name">Room Name *</label>
          <input id="rf-name" required placeholder="e.g. Deluxe Garden Suite"
            value={f.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="rf-beds">Bed Configuration *</label>
          <input id="rf-beds" required placeholder="e.g. King bed, 2 Twin beds"
            value={f.beds} onChange={e => set("beds", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="rf-size">Size (m²)</label>
          <input id="rf-size" type="number" min="1" placeholder="e.g. 32"
            value={f.size_sqm} onChange={e => set("size_sqm", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="rf-adults">Max Adults *</label>
          <input id="rf-adults" type="number" required min="1" max="20"
            value={f.max_adults} onChange={e => set("max_adults", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="rf-children">Max Children</label>
          <input id="rf-children" type="number" min="0" max="10"
            value={f.max_children} onChange={e => set("max_children", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="rf-rate">Base Rate / Night ({currency}) *</label>
          <input id="rf-rate" type="number" required min="1" step="0.01" placeholder="e.g. 15000"
            value={f.base_rate} onChange={e => set("base_rate", e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="rf-units">Total Units *</label>
          <input id="rf-units" type="number" required min="1" placeholder="e.g. 5"
            value={f.total_units} onChange={e => set("total_units", e.target.value)} />
          <span className="adm-field-hint">How many rooms of this type exist.</span>
        </div>
      </div>
      <div className="adm-field">
        <label htmlFor="rf-desc">Description</label>
        <textarea id="rf-desc" rows={3} placeholder="Short description shown to guests and the AI concierge."
          value={f.description} onChange={e => set("description", e.target.value)} />
      </div>
      <div className="adm-field">
        <label htmlFor="rf-amenities">Amenities</label>
        <input id="rf-amenities" placeholder="e.g. AC, Wi-Fi, Mini-bar, En-suite bath (comma-separated)"
          value={f.amenities} onChange={e => set("amenities", e.target.value)} />
        <span className="adm-field-hint">Comma-separated list — the AI uses this to answer guest questions.</span>
      </div>
      <div className="adm-field">
        <label htmlFor="rf-img">Image URL</label>
        <input id="rf-img" type="url" placeholder="https://…"
          value={f.image_url} onChange={e => set("image_url", e.target.value)} />
        <span className="adm-field-hint">Shown on the demo page. Use an Unsplash or similar public image URL.</span>
      </div>
      <div className="kb-form-actions">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
          {saving ? "Saving…" : (initial.id ? "Update room" : "Add room")}
        </button>
        <button type="button" className="adm-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Rooms({ a, slug, toast, currency }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null); // null | room object (id=undefined for new)
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setRows(null);
    a.rooms(slug).then(setRows).catch(() => setRows([]));
  }, [a, slug]);
  useEffect(() => { load(); }, [load]);

  function toForm(r) {
    return { ...r, size_sqm: r.size_sqm ?? "", amenities: (r.amenities || []).join(", "), image_url: r.image_url || "" };
  }
  function fromForm(f) {
    return {
      code: f.code.trim().toUpperCase(),
      name: f.name.trim(),
      description: f.description.trim(),
      beds: f.beds.trim(),
      size_sqm: f.size_sqm ? parseInt(f.size_sqm) : null,
      max_adults: parseInt(f.max_adults),
      max_children: parseInt(f.max_children) || 0,
      amenities: f.amenities.split(",").map(s => s.trim()).filter(Boolean),
      base_rate: parseFloat(f.base_rate),
      total_units: parseInt(f.total_units),
      image_url: f.image_url.trim() || null,
    };
  }

  async function handleSave(f) {
    setSaving(true);
    try {
      const body = fromForm(f);
      if (editing.id) {
        await a.updateRoom(slug, editing.id, body);
        toast.success("Room updated");
      } else {
        await a.createRoom(slug, body);
        toast.success("Room type added");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await a.deleteRoom(slug, id);
      toast.success("Room type deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="adm-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Rooms &amp; Pricing</span>
          {rows && <span className="badge badge-blue">{rows.length} room type{rows.length !== 1 ? "s" : ""}</span>}
          {rows && <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>{rows.reduce((s, r) => s + r.total_units, 0)} total units</span>}
        </div>
        <button className="adm-btn adm-btn-primary" style={{ marginLeft: "auto" }}
          onClick={() => editing && !editing.id ? setEditing(null) : setEditing({ ...EMPTY_ROOM })}>
          {editing && !editing.id ? "Cancel" : "+ Add room type"}
        </button>
      </div>

      {editing && !editing.id && (
        <RoomForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} saving={saving} currency={currency} />
      )}

      {rows === null ? (
        <div className="adm-spinner-wrap"><span className="adm-spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="adm-empty">
          <p>No room types yet.</p>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>Add room types to enable bookings and let the AI concierge quote accurate rates.</p>
        </div>
      ) : (
        <div className="room-list">
          {rows.map(row => (
            <div key={row.id}>
              {editing?.id === row.id ? (
                <div className="room-card room-card-editing">
                  <RoomForm initial={toForm(row)} onSave={handleSave} onCancel={() => setEditing(null)} saving={saving} currency={currency} />
                </div>
              ) : (
                <div className="room-card">
                  {row.image_url && (
                    <div className="room-card-img-wrap">
                      <img src={row.image_url} alt={row.name} className="room-card-img"
                        onError={e => { e.target.parentElement.style.display = "none"; }} />
                    </div>
                  )}
                  <div className="room-card-body">
                    <div className="room-card-header">
                      <div className="room-card-title-row">
                        <span className="room-card-code">{row.code}</span>
                        <h3 className="room-card-name">{row.name}</h3>
                      </div>
                      <div className="kb-chunk-actions">
                        <button className="adm-btn adm-btn-sm" onClick={() => setEditing(toForm(row))}>Edit</button>
                        <button className="adm-btn adm-btn-sm adm-btn-danger"
                          disabled={deleting === row.id}
                          onClick={() => handleDelete(row.id, row.name)}>
                          {deleting === row.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                    <div className="room-card-meta">
                      <span>{row.beds}</span>
                      {row.size_sqm && <span>{row.size_sqm} m²</span>}
                      <span>Up to {row.max_adults} adult{row.max_adults !== 1 ? "s" : ""}{row.max_children > 0 ? ` + ${row.max_children} children` : ""}</span>
                      <span className="room-card-units">{row.total_units} unit{row.total_units !== 1 ? "s" : ""}</span>
                    </div>
                    {row.description && <p className="room-card-desc">{row.description}</p>}
                    {row.amenities?.length > 0 && (
                      <div className="room-card-amenities">
                        {row.amenities.map(a => <span key={a} className="room-amenity-tag">{a}</span>)}
                      </div>
                    )}
                    <div className="room-card-rate">
                      <span className="room-rate-value">{money(row.base_rate, currency)}</span>
                      <span className="room-rate-label">per night</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Admin shell ───────────────────────────────────────────────────────────────
// ── Notifications / Email ─────────────────────────────────────────────────────

const EMAIL_FLOWS = [
  { icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6", label: "Booking received",    desc: "Guest gets an email the moment they book through the AI chat." },
  { icon: "M20 6L9 17l-5-5",                                                                                label: "Booking confirmed",   desc: "Guest gets a confirmation email when you confirm in the Bookings tab." },
  { icon: "M18 6L6 18M6 6l12 12",                                                                           label: "Booking cancelled",   desc: "Guest gets a cancellation notice when you cancel a booking." },
  { icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z", label: "Pre-arrival (48h)", desc: "Reminder sent automatically 48 h before check-in. Runs every hour." },
  { icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",  label: "Review request",      desc: "Sent after check-out (within 30 days). Runs automatically every hour." },
];

function Notifications({ a, slug, toast }) {
  const [data, setData]  = useState(null);
  const [busy, setBusy]  = useState("");

  const load = () => a.notifications(slug).then(setData).catch(() => {});
  useEffect(() => { load(); }, [slug]);

  async function sendPreArrival() {
    setBusy("pre");
    try { const r = await a.sendPreArrival(slug); toast.success(`Sent ${r.sent} pre-arrival email${r.sent !== 1 ? "s" : ""}`); load(); }
    catch (e) { toast.error(e.message || "Error"); }
    finally { setBusy(""); }
  }
  async function sendReviews() {
    setBusy("rev");
    try { const r = await a.sendReviews(slug); toast.success(`Sent ${r.sent} review request${r.sent !== 1 ? "s" : ""}`); load(); }
    catch (e) { toast.error(e.message || "Error"); }
    finally { setBusy(""); }
  }
  async function testEmail() {
    setBusy("test");
    try { const r = await a.testEmail(slug); toast.success(`Test email sent to ${r.sent_to}`); }
    catch (e) { toast.error(e.message || "SMTP error"); }
    finally { setBusy(""); }
  }

  if (!data) return <div className="adm-loading">Loading…</div>;

  const { smtp_configured, pre_arrival_pending, reviews_pending, stats } = data;
  const totalSent = stats.pre_arrival_sent_30d + stats.reviews_sent_30d;

  return (
    <div className="notif-wrap">

      {/* SMTP status banner */}
      <div className={`notif-banner ${smtp_configured ? "notif-banner-ok" : "notif-banner-warn"}`}>
        <div className="notif-banner-left">
          <div className={`notif-dot ${smtp_configured ? "notif-dot-ok" : "notif-dot-warn"}`} />
          <div>
            <strong>{smtp_configured ? "Email notifications active" : "Email not configured"}</strong>
            <p>{smtp_configured
              ? "Booking confirmations, pre-arrival messages and review requests are sent automatically."
              : "Add SMTP_HOST, SMTP_USER, SMTP_PASS and STAFF_EMAIL to your .env file to enable emails."
            }</p>
          </div>
        </div>
        {smtp_configured && (
          <button className="adm-btn" onClick={testEmail} disabled={!!busy}>
            {busy === "test" ? "Sending…" : "Send Test Email"}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="notif-stats">
        {[
          { n: pre_arrival_pending.length, l: "Pre-arrival pending",  warn: pre_arrival_pending.length > 0 },
          { n: reviews_pending.length,     l: "Review requests pending", warn: reviews_pending.length > 0 },
          { n: totalSent,                  l: "Emails sent (30 days)", warn: false },
          { n: stats.pre_arrival_sent_30d, l: "Pre-arrival sent",       warn: false },
          { n: stats.reviews_sent_30d,     l: "Review requests sent",   warn: false },
        ].map(s => (
          <div className="notif-stat" key={s.l}>
            <strong style={s.warn && s.n > 0 ? { color: "#d97706" } : {}}>{s.n}</strong>
            <span>{s.l}</span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="adm-section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="adm-section-title">Email flows</h2>
          <p className="adm-section-sub">Every trigger below fires automatically. The queues below let you send manually or catch any misses.</p>
        </div>
      </div>
      <div className="notif-flows">
        {EMAIL_FLOWS.map(f => (
          <div className="notif-flow-item" key={f.label}>
            <div className="notif-flow-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={f.icon} />
              </svg>
            </div>
            <div className="notif-flow-info">
              <strong>{f.label}</strong>
              <p>{f.desc}</p>
            </div>
            <span className="notif-auto-badge">Auto</span>
          </div>
        ))}
      </div>

      {/* Pre-arrival queue */}
      <div className="notif-section">
        <div className="notif-section-head">
          <div>
            <h3>Pre-arrival queue</h3>
            <p>Confirmed guests checking in within 48 hours who haven't been contacted yet.</p>
          </div>
          {pre_arrival_pending.length > 0 && smtp_configured && (
            <button className="adm-btn adm-btn-primary" onClick={sendPreArrival} disabled={!!busy}>
              {busy === "pre" ? "Sending…" : `Send All (${pre_arrival_pending.length})`}
            </button>
          )}
        </div>
        {pre_arrival_pending.length === 0 ? (
          <div className="adm-empty">All clear — no pending pre-arrival emails.</div>
        ) : (
          <div className="notif-queue">
            {pre_arrival_pending.map(b => (
              <div className="notif-queue-row" key={b.reference}>
                <span className="notif-q-ref">{b.reference}</span>
                <div className="notif-q-guest">
                  <strong>{b.guest_name}</strong>
                  <span>{b.email}</span>
                </div>
                <span className="notif-q-date">Check-in {fmtDate(b.check_in)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review requests queue */}
      <div className="notif-section">
        <div className="notif-section-head">
          <div>
            <h3>Review requests queue</h3>
            <p>Guests who checked out in the last 30 days and haven't received a review request.</p>
          </div>
          {reviews_pending.length > 0 && smtp_configured && (
            <button className="adm-btn adm-btn-primary" onClick={sendReviews} disabled={!!busy}>
              {busy === "rev" ? "Sending…" : `Send All (${reviews_pending.length})`}
            </button>
          )}
        </div>
        {reviews_pending.length === 0 ? (
          <div className="adm-empty">All clear — no pending review requests.</div>
        ) : (
          <div className="notif-queue">
            {reviews_pending.map(b => (
              <div className="notif-queue-row" key={b.reference}>
                <span className="notif-q-ref">{b.reference}</span>
                <div className="notif-q-guest">
                  <strong>{b.guest_name}</strong>
                  <span>{b.email}</span>
                </div>
                <span className="notif-q-date">Checked out {fmtDate(b.check_out)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Seasonal Rates ───────────────────────────────────────────────────────────

const MULT_PRESETS = [
  { label: "0.7×", value: 0.7,  hint: "Low" },
  { label: "0.8×", value: 0.8,  hint: "Shoulder" },
  { label: "1.0×", value: 1.0,  hint: "Standard" },
  { label: "1.2×", value: 1.2,  hint: "Peak" },
  { label: "1.5×", value: 1.5,  hint: "High" },
  { label: "2.0×", value: 2.0,  hint: "Premium" },
];
const SN_EMPTY = { name: "", start_date: "", end_date: "", multiplier: 1.0, min_nights: 1 };

function multColor(m) {
  if (m < 1) return "#059669";
  if (m === 1) return "var(--muted)";
  if (m < 1.4) return "#d97706";
  return "#dc2626";
}
function multLabel(m) {
  const n = parseFloat(m) || 1;
  if (n < 1) return `-${Math.round((1 - n) * 100)}%`;
  if (n === 1) return "Standard";
  return `+${Math.round((n - 1) * 100)}%`;
}

function Seasons({ a, slug, toast }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(SN_EMPTY);
  const [busy,    setBusy]    = useState(false);

  const load = () => {
    setLoading(true);
    a.seasons(slug)
      .then(d => { setList(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [slug]);

  function startAdd()  { setAdding(true); setEditId(null); setForm(SN_EMPTY); }
  function startEdit(s){ setEditId(s.id); setAdding(false); setForm({ name: s.name, start_date: s.start_date, end_date: s.end_date, multiplier: s.multiplier, min_nights: s.min_nights }); }
  function cancelForm(){ setAdding(false); setEditId(null); setForm(SN_EMPTY); }

  async function save() {
    if (!form.name.trim() || !form.start_date || !form.end_date) return;
    setBusy(true);
    try {
      const body = { ...form, multiplier: parseFloat(form.multiplier) || 1, min_nights: parseInt(form.min_nights) || 1 };
      if (editId) {
        await a.updateSeason(slug, editId, body);
        toast.success("Season updated");
      } else {
        await a.createSeason(slug, body);
        toast.success("Season added");
      }
      cancelForm();
      load();
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    if (!confirm("Delete this season?")) return;
    try {
      await a.deleteSeason(slug, id);
      toast.success("Season deleted");
      load();
    } catch (err) { toast.error(err.message || "Error"); }
  }

  function SeasonForm({ isEdit = false }) {
    const mult = parseFloat(form.multiplier) || 1;
    return (
      <div className="sn-form">
        <div className="sn-form-grid">
          <div className="adm-field sn-field-full">
            <label className="adm-label">Season Name</label>
            <input className="adm-input" placeholder="e.g. Christmas & New Year, High Season, Shoulder…"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Start Date</label>
            <input className="adm-input" type="date" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">End Date</label>
            <input className="adm-input" type="date" value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="adm-field sn-field-full">
            <label className="adm-label">
              Rate Multiplier
              <span className="sn-mult-hint"> — {mult}× base rate &nbsp;
                <span style={{ color: multColor(mult), fontWeight: 600 }}>{multLabel(mult)}</span>
              </span>
            </label>
            <div className="sn-presets">
              {MULT_PRESETS.map(p => (
                <button key={p.value} type="button"
                  className={`sn-preset${parseFloat(form.multiplier) === p.value ? " sn-preset-active" : ""}`}
                  onClick={() => setForm(f => ({ ...f, multiplier: p.value }))}>
                  <span className="sn-preset-val">{p.label}</span>
                  <span className="sn-preset-hint">{p.hint}</span>
                </button>
              ))}
              <input className="adm-input sn-preset-custom" type="number" step="0.05" min="0.1" max="10"
                value={form.multiplier}
                onChange={e => setForm(f => ({ ...f, multiplier: e.target.value }))}
                title="Custom multiplier" />
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-label">Min Nights</label>
            <input className="adm-input" type="number" min="1" max="90" value={form.min_nights}
              onChange={e => setForm(f => ({ ...f, min_nights: e.target.value }))} />
          </div>
        </div>
        <div className="sn-form-actions">
          <button className="adm-btn adm-btn-primary" onClick={save}
            disabled={busy || !form.name.trim() || !form.start_date || !form.end_date}>
            {busy ? "Saving…" : isEdit ? "Update Season" : "Add Season"}
          </button>
          <button className="adm-btn" onClick={cancelForm}>Cancel</button>
        </div>
      </div>
    );
  }

  const formOpen = adding || editId !== null;

  return (
    <div className="sn-wrap">
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title">Seasonal Rates</h2>
          <p className="adm-section-sub">Date ranges that multiply the base room rate. Overlapping seasons use the higher multiplier.</p>
        </div>
        {!formOpen && (
          <button className="adm-btn adm-btn-primary" onClick={startAdd}>+ Add Season</button>
        )}
      </div>

      {adding && <SeasonForm />}

      {loading ? (
        <div className="adm-loading">Loading…</div>
      ) : list.length === 0 && !adding ? (
        <div className="adm-empty">
          No seasonal rates yet. Add one to override the base rate for specific date ranges.
        </div>
      ) : (
        <div className="sn-list">
          {list.map(s => {
            const color = multColor(s.multiplier);
            return (
              <div key={s.id} className="sn-card">
                {editId === s.id ? (
                  <SeasonForm isEdit />
                ) : (
                  <div className="sn-card-inner">
                    <div className="sn-card-left">
                      <div className="sn-mult-badge" style={{ background: `${color}1a`, color }}>
                        {s.multiplier}×
                      </div>
                      <div className="sn-card-info">
                        <p className="sn-name">{s.name}</p>
                        <p className="sn-dates">
                          {fmtDate(s.start_date)} – {fmtDate(s.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="sn-card-right">
                      <span className="sn-meta-pill" style={{ color, background: `${color}12` }}>
                        {multLabel(s.multiplier)}
                      </span>
                      {s.min_nights > 1 && (
                        <span className="sn-meta-pill">Min {s.min_nights} nights</span>
                      )}
                      <button className="adm-btn-sm" onClick={() => startEdit(s)}>Edit</button>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => del(s.id)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────────
function OccupancyTrend({ months }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...months.map(m => m.occupancy_pct), 1);
  return (
    <figure className="rev-chart">
      <figcaption>
        <strong>Occupancy — last 6 months</strong>
        <span>avg room nights per month</span>
      </figcaption>
      <div className="rev-plot" onMouseLeave={() => setHover(null)}>
        {months.map((m, i) => {
          const pct = (m.occupancy_pct / 100) * 100;
          return (
            <button key={m.month_full} className="rev-col"
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              aria-label={`${m.month_full}: ${m.occupancy_pct}% occupied`}>
              <span className="rev-bar" style={{
                height: `${Math.max(pct, m.occupancy_pct > 0 ? 4 : 0)}%`,
                opacity: m.is_current ? 1 : 0.65,
              }}/>
              <span className="rev-x" style={{ fontWeight: m.is_current ? 700 : 400 }}>{m.month}</span>
              {hover === i && (
                <span className="rev-tip" role="tooltip">
                  {m.month_full}
                  <b>{m.occupancy_pct}% occupied</b>
                  <small>{m.room_nights} / {m.available} room-nights</small>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </figure>
  );
}

function HBarChart({ title, subtitle, rows, valueKey, labelKey, pctKey, formatVal }) {
  const maxPct = Math.max(...rows.map(r => r[pctKey] || 0), 1);
  return (
    <figure className="anl-hbar-chart">
      <figcaption>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </figcaption>
      <div className="anl-hbar-list">
        {rows.map((r, i) => (
          <div key={i} className="anl-hbar-row">
            <span className="anl-hbar-label">{r[labelKey]}</span>
            <div className="anl-hbar-track">
              <div className="anl-hbar-fill" style={{ width: `${Math.max((r[pctKey] || 0) / maxPct * 100, r[pctKey] > 0 ? 2 : 0)}%` }}/>
            </div>
            <span className="anl-hbar-val">{formatVal ? formatVal(r[valueKey], r) : r[valueKey]}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="anl-empty">No data yet.</p>}
      </div>
    </figure>
  );
}

function Analytics({ a, slug }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    a.analytics(slug).then(setData).catch(() => setData({}));
  }, [a, slug]);

  if (!data) return <div className="adm-loading">Loading analytics…</div>;

  const s        = data.summary  || {};
  const currency = data.currency || "USD";

  return (
    <div className="anl-wrap">

      {/* ── KPI strip ── */}
      <div className="rev-kpis">
        <div className="rev-kpi">
          <div className="rev-kpi-label">Total Revenue</div>
          <div className="rev-kpi-value">{money(s.total_revenue ?? 0, currency)}</div>
          <div className="rev-kpi-sub">all confirmed bookings</div>
        </div>
        <div className="rev-kpi">
          <div className="rev-kpi-label">Confirmed Bookings</div>
          <div className="rev-kpi-value">{s.total_bookings ?? 0}</div>
          <div className="rev-kpi-sub">all time</div>
        </div>
        <div className="rev-kpi">
          <div className="rev-kpi-label">Avg Booking Value</div>
          <div className="rev-kpi-value">{money(s.avg_booking_value ?? 0, currency)}</div>
          <div className="rev-kpi-sub">per confirmed booking</div>
        </div>
        <div className="rev-kpi">
          <div className="rev-kpi-label">Avg Stay</div>
          <div className="rev-kpi-value">{s.avg_nights ?? 0} <small>nights</small></div>
          <div className="rev-kpi-sub">per booking</div>
        </div>
        <div className="rev-kpi">
          <div className="rev-kpi-label">Avg Lead Time</div>
          <div className="rev-kpi-value">{s.avg_lead_days ?? 0} <small>days</small></div>
          <div className="rev-kpi-sub">advance booking window</div>
        </div>
        <div className="rev-kpi" style={{ '--urgent-color': (s.cancellation_rate ?? 0) > 20 ? '#ef4444' : undefined }}>
          <div className="rev-kpi-label">Cancellation Rate</div>
          <div className="rev-kpi-value" style={{ color: (s.cancellation_rate ?? 0) > 20 ? '#ef4444' : undefined }}>
            {s.cancellation_rate ?? 0}%
          </div>
          <div className="rev-kpi-sub">of all bookings</div>
        </div>
      </div>

      {/* ── 12-month revenue ── */}
      {data.revenue_12m?.length > 0 && (
        <div className="anl-section">
          <RevenueTrend months={data.revenue_12m} currency={currency} />
        </div>
      )}

      {/* ── 2-col: occupancy + sources ── */}
      <div className="anl-row-2">
        {data.occupancy_6m?.length > 0 && (
          <div className="anl-section">
            <OccupancyTrend months={data.occupancy_6m} />
          </div>
        )}
        {data.by_source?.length > 0 && (
          <div className="anl-section">
            <HBarChart
              title="Booking Sources"
              subtitle="confirmed bookings"
              rows={data.by_source}
              labelKey="label"
              valueKey="count"
              pctKey="pct"
              formatVal={(v, r) => `${v} (${r.pct}%)`}
            />
          </div>
        )}
      </div>

      {/* ── 2-col: room performance + lead time ── */}
      <div className="anl-row-2">
        {data.by_room?.length > 0 && (
          <div className="anl-section">
            <HBarChart
              title="Room Type Performance"
              subtitle="by revenue"
              rows={data.by_room}
              labelKey="name"
              valueKey="revenue"
              pctKey="revenue"
              formatVal={(v) => money(v, currency)}
            />
          </div>
        )}
        {data.lead_time && (
          <div className="anl-section">
            <HBarChart
              title="Booking Lead Time"
              subtitle="how far in advance guests book"
              rows={data.lead_time}
              labelKey="label"
              valueKey="count"
              pctKey="pct"
              formatVal={(v, r) => `${v} (${r.pct}%)`}
            />
          </div>
        )}
      </div>

      {/* ── Room detail table ── */}
      {data.by_room?.length > 0 && (
        <div className="anl-section">
          <figure className="anl-hbar-chart">
            <figcaption><strong>Room Type Detail</strong></figcaption>
          </figure>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Room Type</th>
                  <th className="num">Bookings</th>
                  <th className="num">Room Nights</th>
                  <th className="num">Revenue</th>
                  <th className="num">Avg per Booking</th>
                </tr>
              </thead>
              <tbody>
                {data.by_room.map(r => (
                  <tr key={r.code}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "0.8em", opacity: 0.6, marginRight: 6 }}>{r.code}</span>
                      {r.name}
                    </td>
                    <td className="num">{r.bookings}</td>
                    <td className="num">{r.nights}</td>
                    <td className="num">{money(r.revenue, currency)}</td>
                    <td className="num">{money(r.avg_rate, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Embed Widget tab ──────────────────────────────────────────────────────────
function Embed({ a, slug }) {
  const [settings, setSettings] = useState(null);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    a.settings(slug).then(setSettings).catch(() => {});
  }, [a, slug]);

  const host     = window.location.origin;
  const accent   = settings?.accent           || "#2f5d3a";
  const position = settings?.widget_position  || "right";
  const label    = settings?.widget_label     || "Chat with us";

  const snippet = [
    `<script src="${host}/embed.js"`,
    `        data-property="${slug}"`,
    `        data-accent="${accent}"`,
    `        data-position="${position}"`,
    `        data-label="${label}"`,
    `        defer><\/script>`,
  ].join("\n");

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  return (
    <div className="emb-wrap">
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title">Embed Widget</h2>
          <p className="adm-section-sub">Add the AI concierge to your hotel website with a single line of code.</p>
        </div>
        <a href={`/widget/${slug}`} target="_blank" rel="noreferrer" className="adm-btn">
          Preview widget →
        </a>
      </div>

      {/* ── Snippet ── */}
      <div className="emb-card">
        <div className="emb-card-head">
          <span className="emb-card-title">Your embed snippet</span>
          <button className={`emb-copy-btn${copied ? " emb-copy-done" : ""}`} onClick={copy}>
            {copied
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg> Copied!</>
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
            }
          </button>
        </div>
        <pre className="emb-snippet">{snippet}</pre>
        <p className="emb-hint">
          Paste this just before the <code>&lt;/body&gt;</code> tag on every page of your website.
          Replace <code>{host}</code> with your production domain when you go live.
        </p>
      </div>

      {/* ── Button preview ── */}
      <div className="emb-card emb-preview-card">
        <span className="emb-card-title">Button preview</span>
        <div className="emb-preview-row">
          <div className="emb-btn-demo" style={{ background: accent }} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div className="emb-preview-meta">
            <strong>Colour</strong> <code>{accent}</code>
            <strong>Position</strong> <code>{position}</code>
            <strong>Label</strong> <code>{label}</code>
          </div>
        </div>
        <p className="emb-hint">To change colour, position, or label go to the <strong>Customize</strong> tab.</p>
      </div>

      {/* ── Install steps ── */}
      <div className="emb-card">
        <span className="emb-card-title">How to install</span>
        <ol className="emb-steps">
          <li>Copy the snippet above using the <strong>Copy</strong> button.</li>
          <li>Open your website's HTML file or CMS template (e.g. WordPress footer.php, Wix Custom Code, Webflow Page Settings → Custom Code).</li>
          <li>Paste it just before the closing <code>&lt;/body&gt;</code> tag.</li>
          <li>Replace the host URL with your production domain when deploying.</li>
          <li>Save and publish — the chat button appears on every page automatically.</li>
        </ol>
        <div className="emb-platforms">
          {["WordPress","Wix","Squarespace","Webflow","Shopify","Custom HTML"].map(p => (
            <span key={p} className="emb-platform">{p}</span>
          ))}
        </div>
      </div>

      {/* ── Test page ── */}
      <div className="emb-card emb-test-card">
        <span className="emb-card-title">Test pages</span>
        <div className="emb-test-links">
          <a href={`/widget/${slug}`} target="_blank" rel="noreferrer" className="emb-test-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            Widget standalone — <code>/widget/{slug}</code>
          </a>
          <a href="/embed-test.html" target="_blank" rel="noreferrer" className="emb-test-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            Demo hotel website with embed — <code>/embed-test.html</code>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Experiences tab ───────────────────────────────────────────────────────────
const EXP_EMPTY = { name: "", category: "", description: "", duration: "", price: "", tags: "", family_friendly: true };
const EXP_CATEGORIES = ["adventure", "cultural", "culinary", "wellness", "nature", "water sports", "sightseeing", "family"];
const EXP_CAT_COLORS = { adventure:"#c66b00", cultural:"#7c3aed", culinary:"#c2410c", wellness:"#0d9488", nature:"#15803d", "water sports":"#1d4ed8", sightseeing:"#0369a1", family:"#be185d" };
function expCatColor(cat) { return EXP_CAT_COLORS[cat] || "#555"; }

function Experiences({ a, slug, currency, toast }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(EXP_EMPTY);
  const [busy,    setBusy]    = useState(false);

  const load = () => {
    setLoading(true);
    a.experiences(slug).then(d => { setList(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, [slug]);

  function startAdd()   { setAdding(true);  setEditId(null); setForm(EXP_EMPTY); }
  function startEdit(e) { setEditId(e.id);  setAdding(false); setForm({ name: e.name, category: e.category, description: e.description, duration: e.duration, price: e.price ?? "", tags: (e.tags || []).join(", "), family_friendly: e.family_friendly }); }
  function cancelForm() { setAdding(false); setEditId(null); setForm(EXP_EMPTY); }

  async function save() {
    if (!form.name.trim() || !form.category.trim() || !form.description.trim() || !form.duration.trim()) return;
    setBusy(true);
    try {
      const body = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        duration: form.duration.trim(),
        price: form.price !== "" && form.price !== null ? parseFloat(form.price) : null,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        family_friendly: form.family_friendly,
      };
      if (editId) {
        await a.updateExperience(slug, editId, body);
        toast.success("Experience updated");
      } else {
        await a.createExperience(slug, body);
        toast.success("Experience added");
      }
      cancelForm(); load();
    } catch (err) { toast.error(err.message || "Save failed"); }
    finally { setBusy(false); }
  }

  async function del(id) {
    if (!confirm("Delete this experience?")) return;
    try { await a.deleteExperience(slug, id); toast.success("Deleted"); load(); }
    catch (err) { toast.error(err.message || "Error"); }
  }

  function ExpForm({ isEdit = false }) {
    return (
      <div className="sn-form">
        <div className="tro-form-grid">
          <div className="adm-field tro-field-full">
            <label className="adm-label">Experience Name</label>
            <input className="adm-input" placeholder="e.g. Sunrise Safari at Minneriya"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Category</label>
            <input className="adm-input" list="exp-categories" placeholder="e.g. adventure"
              value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            <datalist id="exp-categories">{EXP_CATEGORIES.map(c => <option key={c} value={c}/>)}</datalist>
          </div>
          <div className="adm-field">
            <label className="adm-label">Duration</label>
            <input className="adm-input" placeholder="e.g. 3 hours, Half day"
              value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Price per person ({currency}) — leave blank if free / on request</label>
            <input className="adm-input" type="number" min="0" step="0.01" placeholder="Leave blank = free / on request"
              value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="adm-field tro-field-full">
            <label className="adm-label">Description</label>
            <textarea className="adm-input" rows={3} placeholder="Describe the experience for guests…"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="adm-field tro-field-full">
            <label className="adm-label">Tags (comma-separated)</label>
            <input className="adm-input" placeholder="e.g. wildlife, jeep, early morning"
              value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Family Friendly</label>
            <label className="exp-toggle">
              <input type="checkbox" checked={form.family_friendly}
                onChange={e => setForm(f => ({ ...f, family_friendly: e.target.checked }))} />
              <span>{form.family_friendly ? "Yes — suitable for children" : "No — adults only"}</span>
            </label>
          </div>
        </div>
        <div className="sn-form-actions">
          <button className="adm-btn adm-btn-primary" onClick={save}
            disabled={busy || !form.name.trim() || !form.category.trim() || !form.description.trim() || !form.duration.trim()}>
            {busy ? "Saving…" : isEdit ? "Update Experience" : "Add Experience"}
          </button>
          <button className="adm-btn" onClick={cancelForm}>Cancel</button>
        </div>
      </div>
    );
  }

  const formOpen = adding || editId !== null;

  return (
    <div className="sn-wrap">
      <div className="adm-section-head">
        <div>
          <h2 className="adm-section-title">Experiences</h2>
          <p className="adm-section-sub">Activities and experiences the AI concierge recommends to guests.</p>
        </div>
        {!formOpen && <button className="adm-btn adm-btn-primary" onClick={startAdd}>+ Add Experience</button>}
      </div>

      {adding && <ExpForm />}

      {loading ? (
        <div className="adm-loading">Loading…</div>
      ) : list.length === 0 && !adding ? (
        <div className="adm-empty">No experiences yet. Add activities for the AI to recommend to guests.</div>
      ) : (
        <div className="sn-list">
          {list.map(e => {
            const color = expCatColor(e.category);
            return (
              <div key={e.id} className="sn-card">
                {editId === e.id ? <ExpForm isEdit /> : (
                  <div className="sn-card-inner">
                    <div className="sn-card-left">
                      <div className="tro-dir-badge" style={{ background: `${color}18`, color }}>{e.category}</div>
                      <div className="sn-card-info">
                        <p className="sn-name">{e.name}</p>
                        <p className="sn-dates tro-meta">
                          {e.duration}
                          {e.family_friendly && <span className="exp-family-pill">Family friendly</span>}
                        </p>
                        {e.tags.length > 0 && (
                          <div className="exp-tags">
                            {e.tags.map(t => <span key={t} className="exp-tag">{t}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sn-card-right">
                      <span className="sn-meta-pill tro-price">
                        {e.price != null ? money(e.price, currency) + "/person" : "Free / on request"}
                      </span>
                      <button className="adm-btn-sm" onClick={() => startEdit(e)}>Edit</button>
                      <button className="adm-btn-sm adm-btn-danger" onClick={() => del(e.id)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TABS = [
  ["overview",      "Today",         "M3 22V10l9-7 9 7v12M9 22v-7h6v7"],
  ["bookings",      "Bookings",      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"],
  ["transfers",       "Transfers",       "M17 8l4 4-4 4M3 12h18"],
  ["transfer-routes", "Transfer Routes", "M2 11V17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V11M18 7H6L3 11h18L18 7zM8 17a1 1 0 1 0 2 0M14 17a1 1 0 1 0 2 0"],
  ["experiences",    "Experiences",    "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"],
  ["conversations", "Conversations", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  ["promos",        "Promo Codes",   "M9 14l6-6M9.5 8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM14.5 13.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"],
  ["requests",      "Requests",      "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"],
  ["calendar",      "Calendar",      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"],
  ["kb",            "Knowledge Base","M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"],
  ["rooms",         "Rooms",         "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10"],
  ["seasons",       "Seasons",       "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2"],
  ["notifications", "Notifications", "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"],
  ["customize",     "Customize",     "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
  ["property",      "Property",      "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"],
  ["embed",         "Embed",         "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"],
  ["analytics",     "Analytics",     "M18 20V10M12 20V4M6 20v-6"],
];

export default function Admin({ urlSlug = null }) {
  const isPropertyMode = !!urlSlug;
  const JWT_KEY = urlSlug ? `hc-jwt-${urlSlug}` : null;

  const [token,       setToken]       = useState(() => !isPropertyMode ? (store.get(TOKEN_KEY) || "") : "");
  const [jwt,         setJwt]         = useState(() => isPropertyMode  ? (store.get(JWT_KEY)   || "") : "");
  const [loginErr,    setLoginErr]    = useState("");
  const [props,       setProps]       = useState([]);
  const [slug,        setSlug]        = useState(urlSlug || "");
  const [tab,         setTab]         = useState(isPropertyMode ? "overview" : "properties");
  const [handoffs,    setHandoffs]    = useState(0);
  const [pending,     setPending]     = useState(0);
  const [openSRs,     setOpenSRs]     = useState(0);
  const [currency,    setCurrency]    = useState("USD");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [tick,        setTick]        = useState(0);   // drives timeSince re-render
  const toast = useToast();

  const authToken = isPropertyMode ? jwt : token;
  const isJwt     = isPropertyMode;
  const a = useMemo(() => api.admin(authToken, isJwt), [authToken, isJwt]);

  const clearAuth = useCallback(() => {
    if (isPropertyMode) { store.del(JWT_KEY); setJwt(""); }
    else { store.del(TOKEN_KEY); setToken(""); }
  }, [isPropertyMode, JWT_KEY]);

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
    if (!authToken || !slug) return;
    const id = setInterval(() => { if (!document.hidden) refreshBadges(); }, POLL_MS);
    const onVis = () => { if (!document.hidden) refreshBadges(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [authToken, slug, refreshBadges]);

  // Tick every 15 s so timeSince() text stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isPropertyMode && urlSlug) {
      // Property mode: fetch only this property's public data
      api.property(urlSlug).then(p => {
        setProps([p]);
        setCurrency(p.currency);
      }).catch(() => {});
      return;
    }
    // Super-admin: fetch all properties
    api.properties().then(list => {
      setProps(list);
      setSlug(s => {
        const chosen = s || list[0]?.slug || "";
        const cur = list.find(p => p.slug === chosen)?.currency;
        if (cur) setCurrency(cur);
        return chosen;
      });
    });
  }, [isPropertyMode, urlSlug]);

  useEffect(() => {
    if (!authToken || !slug) return;
    a.summary(slug)
      .then(s => {
        setHandoffs(s.open_handoffs);
        setPending(s.pending);
        setCurrency(s.currency);
        setLastRefresh(Date.now());
      })
      .catch(e => {
        if (e.status === 401 || e.status === 403) {
          clearAuth();
          setLoginErr(isPropertyMode
            ? "Session expired. Please sign in again."
            : "That token wasn't accepted. Check your ADMIN_TOKEN setting.");
        }
      });
  }, [a, authToken, slug, clearAuth, isPropertyMode]);

  if (!authToken) {
    if (isPropertyMode) {
      return (
        <PropertyLogin
          slug={urlSlug}
          error={loginErr}
          onLogin={async (email, password) => {
            setLoginErr("");
            try {
              const result = await api.auth.login(urlSlug, email, password);
              store.set(JWT_KEY, result.token);
              setJwt(result.token);
            } catch (err) {
              setLoginErr(err.message || "Invalid email or password");
            }
          }}
        />
      );
    }
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
  }

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

        {isPropertyMode && (
          <div className="adm-sidebar-prop">
            <div className="adm-prop-name">{current?.name || urlSlug}</div>
            {current && <span className="adm-sidebar-location">{current.location}</span>}
          </div>
        )}

        <nav className="adm-sidebar-nav" aria-label="Admin navigation">
          {!isPropertyMode && (
            <button
              className={`adm-nav-item${tab === "properties" ? " adm-nav-active" : ""}`}
              onClick={() => setTab("properties")}
              aria-current={tab === "properties" ? "page" : undefined}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10"/>
                <circle cx="19" cy="7" r="4" fill="currentColor" stroke="none" opacity="0.25"/>
                <path d="M17 7h4M19 5v4"/>
              </svg>
              <span>Properties</span>
            </button>
          )}
          {isPropertyMode && TABS.map(([id, label, iconPath]) => (
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
          <button className="link" onClick={clearAuth}>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="adm-content">
        <main className="admin-main" key={slug}>
          {!isPropertyMode && tab === "properties" && <SuperProperties token={token} toast={toast}/>}
          {slug && tab === "overview"      && <Overview      a={a} slug={slug} goTo={setTab}/>}
          {slug && tab === "bookings"      && <Bookings      a={a} slug={slug} toast={toast} onRefresh={refreshBadges}/>}
          {slug && tab === "transfers"       && <Transfers       a={a} slug={slug} currency={currency} toast={toast} onRefresh={refreshBadges}/>}
          {slug && tab === "transfer-routes" && <TransferRoutes  a={a} slug={slug} currency={currency} toast={toast}/>}
          {slug && tab === "experiences"    && <Experiences     a={a} slug={slug} currency={currency} toast={toast}/>}
          {slug && tab === "conversations" && <Conversations   a={a} slug={slug} onChange={refreshBadges}/>}
          {slug && tab === "promos"        && <PromoCodes      a={a} slug={slug} toast={toast}/>}
          {slug && tab === "requests"      && <ServiceRequests a={a} slug={slug} toast={toast} onRefresh={refreshBadges}/>}
          {slug && tab === "calendar"      && <CalendarView    a={a} slug={slug}/>}
          {slug && tab === "kb"            && <KnowledgeBase   a={a} slug={slug} toast={toast}/>}
          {slug && tab === "rooms"         && <Rooms           a={a} slug={slug} toast={toast} currency={currency}/>}
          {slug && tab === "seasons"       && <Seasons         a={a} slug={slug} toast={toast}/>}
          {slug && tab === "notifications" && <Notifications   a={a} slug={slug} toast={toast}/>}
          {slug && tab === "customize"     && <Customize        a={a} slug={slug} toast={toast}/>}
          {slug && tab === "property"      && <PropertySettings a={a} slug={slug} currency={currency} toast={toast}/>}
          {slug && tab === "embed"         && <Embed            a={a} slug={slug}/>}
          {slug && tab === "analytics"    && <Analytics        a={a} slug={slug}/>}
        </main>
      </div>
    </div>
  );
}
