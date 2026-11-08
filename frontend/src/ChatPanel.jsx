import { useEffect, useRef, useState, useCallback } from "react";
import { api, store, money, fmtDate, chatStream } from "./api.js";

function newSessionId() {
  return (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 36);
}

function groupByDate(items) {
  const todayStr = new Date().toDateString();
  const yestStr  = new Date(Date.now() - 86400000).toDateString();
  const out = [
    { label: "Today",     items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier",   items: [] },
  ];
  for (const s of items) {
    const d = new Date(s.ts).toDateString();
    if      (d === todayStr) out[0].items.push(s);
    else if (d === yestStr)  out[1].items.push(s);
    else                     out[2].items.push(s);
  }
  return out.filter(g => g.items.length > 0);
}

function fmtTs(ts) {
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Rich text renderer (bold + bullets) ──────────────────────────────────────
export function RichText({ text }) {
  const inline = (s, key) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
        : part
    );
  const blocks = [];
  let list = null;
  text.split("\n").forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^!\[.*?\]\(.*?\)$/.test(line.trim())) return; // skip bare markdown images
    const bullet = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      if (!list) blocks.push((list = { type: "ul", items: [] }));
      list.items.push(inline(bullet[1], i));
    } else {
      list = null;
      if (line.trim()) blocks.push({ type: "p", content: inline(line, i) });
    }
  });
  return blocks.map((b, i) =>
    b.type === "ul"
      ? <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
      : <p key={i}>{b.content}</p>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [state, setState] = useState("idle"); // idle | copied | error
  function copy() {
    const finish = (s) => { setState(s); setTimeout(() => setState("idle"), 2200); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => finish("copied")).catch(() => finish("error"));
    } else {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed"; el.style.opacity = "0";
        document.body.appendChild(el); el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        finish("copied");
      } catch { finish("error"); }
    }
  }
  const copied = state === "copied";
  const label = state === "copied" ? "Copied!" : state === "error" ? "Copy failed" : "Copy reference";
  return (
    <button className="folio-copy" onClick={copy} aria-label={label} title={label}>
      {state === "copied"
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
        : state === "error"
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
      }
    </button>
  );
}

// ── Room cards (list_room_types event) ────────────────────────────────────────
function RoomCardsCard({ data, onSend }) {
  return (
    <div className="room-cards-wrap">
      <p className="room-cards-title">Our rooms &amp; suites</p>
      <div className="room-cards-scroll">
        {data.rooms.map((room) => (
          <div className="room-card" key={room.code}>
            {room.image_url
              ? <img src={room.image_url} alt={room.name} className="room-card-img" loading="lazy"
                  onError={(e) => { e.target.style.display = "none"; }} />
              : <div className="room-card-img-placeholder" />
            }
            <div className="room-card-body">
              <strong className="room-card-name">{room.name}</strong>
              <p className="room-card-desc">{room.description}</p>
              <div className="room-card-meta">
                <span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  {room.beds}
                </span>
                <span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {room.sleeps}
                </span>
                {room.size_sqm && (
                  <span>{room.size_sqm} m²</span>
                )}
              </div>
              <div className="room-card-footer">
                <div className="room-card-rate">
                  <small>From</small>
                  <strong>{money(room.rate_from, room.currency)}</strong>
                  <small>/ night</small>
                </div>
                <button className="room-card-btn"
                  onClick={() => onSend(`Tell me more about the ${room.name} and I'd like to book it`)}>
                  Select →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Availability results card ─────────────────────────────────────────────────
function AvailabilityCard({ data, onSend }) {
  const available = data.rooms.filter((r) => r.available);
  const unavailable = data.rooms.filter((r) => !r.available);
  const ci = fmtDate(data.check_in, { day: "numeric", month: "short" });
  const co = fmtDate(data.check_out, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="avail-card">
      <div className="avail-header">
        <div className="avail-dates">
          <span className="avail-date">{ci}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          <span className="avail-date">{co}</span>
        </div>
        <span className="avail-meta">
          {data.nights} night{data.nights !== 1 ? "s" : ""} · {data.adults} adult{data.adults !== 1 ? "s" : ""}
          {data.children ? ` · ${data.children} child${data.children !== 1 ? "ren" : ""}` : ""}
        </span>
      </div>

      {available.length === 0 && (
        <p className="avail-empty">No rooms available for these dates.</p>
      )}

      {available.map((room) => (
        <div className="avail-row" key={room.room_type}>
          {room.image_url
            ? <img src={room.image_url} alt={room.name} className="avail-row-img" loading="lazy"
                onError={(e) => { e.target.style.display = "none"; }} />
            : <div className="avail-row-dot" aria-hidden="true" />
          }
          <div className="avail-row-info">
            <strong>{room.name}</strong>
            <span>{room.sleeps}</span>
          </div>
          <div className="avail-row-right">
            <div className="avail-row-price">
              <span>{money(room.total, data.currency)}</span>
              <small>total incl. tax</small>
            </div>
            <button className="avail-select-btn" onClick={() =>
              onSend(`I'd like to book the ${room.name} (room type: ${room.room_type}) — ${data.check_in} to ${data.check_out}, ${data.adults} adult${data.adults !== 1 ? "s" : ""}${data.children ? ` and ${data.children} child${data.children !== 1 ? "ren" : ""}` : ""}, ${data.meal_plan || "RO"}.`)
            }>
              Select →
            </button>
          </div>
        </div>
      ))}

      {unavailable.length > 0 && (
        <details className="avail-unavail">
          <summary>{unavailable.length} room{unavailable.length !== 1 ? "s" : ""} unavailable for these dates</summary>
          {unavailable.map((room) => (
            <div className="avail-row avail-row-dim" key={room.room_type}>
              <div className="avail-row-info">
                <span>{room.name}</span>
                <small>{room.reason || "Not available"}</small>
              </div>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

// ── Quote result card ─────────────────────────────────────────────────────────
function QuoteCard({ data, onSend }) {
  const ci = fmtDate(data.check_in, { day: "numeric", month: "short" });
  const co = fmtDate(data.check_out, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="quote-card">
      {data.image_url && (
        <img src={data.image_url} alt={data.room_name} className="quote-img" loading="lazy"
          onError={(e) => { e.target.style.display = "none"; }} />
      )}
      <div className="quote-header">
        <div>
          <strong>{data.room_name}</strong>
          <span className="quote-dates">{ci} – {co} · {data.nights} night{data.nights !== 1 ? "s" : ""}</span>
        </div>
        <span className="quote-plan">{data.meal_plan}</span>
      </div>
      <div className="quote-breakdown">
        <div className="quote-line">
          <span>Room ({data.nights} nights × {data.units} unit{data.units > 1 ? "s" : ""})</span>
          <span>{money(data.subtotal, data.currency)}</span>
        </div>
        {data.service_charge > 0 && (
          <div className="quote-line quote-line-muted">
            <span>Service charge</span>
            <span>{money(data.service_charge, data.currency)}</span>
          </div>
        )}
        {data.taxes > 0 && (
          <div className="quote-line quote-line-muted">
            <span>Taxes</span>
            <span>{money(data.taxes, data.currency)}</span>
          </div>
        )}
      </div>
      <div className="quote-total-row">
        <span>Total</span>
        <span className="quote-total">{money(data.total, data.currency)}</span>
      </div>
      <button className="avail-select-btn quote-book-btn quote-confirm-btn" onClick={() =>
        onSend(`Please go ahead and book the ${data.room_name} (room type: ${data.room_type_code}) — ${data.check_in} to ${data.check_out}, ${data.adults} adult${data.adults !== 1 ? "s" : ""}${data.children ? ` and ${data.children} child${data.children !== 1 ? "ren" : ""}` : ""}, ${data.meal_plan || "RO"}, total ${money(data.total, data.currency)}.`)
      }>
        ✓ Confirm Booking
      </button>
    </div>
  );
}

// ── Transfer options card ─────────────────────────────────────────────────────
const DIR_ORDER = ["arrival", "departure", "local", "other"];
const DIR_LABEL = { arrival: "Arrival", departure: "Departure", local: "Local transfer", other: "Transfer" };

function TransferOptionsCard({ data, onSend }) {
  // Group by direction so arrival + departure sedans don't appear as duplicates
  const groups = {};
  for (const opt of data.options) {
    const key = opt.direction || "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(opt);
  }
  const keys = DIR_ORDER.filter(k => groups[k]);

  return (
    <div className="avail-card">
      {keys.map((dir, gi) => (
        <div key={dir}>
          {keys.length > 1 && (
            <div className={`avail-header${gi > 0 ? " avail-header-sep" : ""}`}>
              <span className="avail-date">{DIR_LABEL[dir]}</span>
              <span className="avail-meta">{groups[dir][0]?.route}</span>
            </div>
          )}
          {keys.length === 1 && (
            <div className="avail-header">
              <span className="avail-date">{groups[dir][0]?.route || DIR_LABEL[dir]}</span>
            </div>
          )}
          {groups[dir].map((opt) => (
            <div className="avail-row" key={opt.option_id}>
              <div className="avail-row-dot avail-row-dot-blue" aria-hidden="true" />
              <div className="avail-row-info">
                <strong>{opt.vehicle}</strong>
                <span>Up to {opt.max_passengers} pax · {opt.max_bags} bags · ~{Math.round(opt.duration_min / 60 * 10) / 10} hrs</span>
              </div>
              <div className="avail-row-right">
                <div className="avail-row-price">
                  <span>{money(opt.price, data.currency)}</span>
                  <small>per vehicle</small>
                </div>
                <button className="avail-select-btn" onClick={() =>
                  onSend(`I'd like to book the ${opt.vehicle} transfer on route ${opt.route} (option ID: ${opt.option_id}, price: ${money(opt.price, data.currency)}).`)
                }>
                  Book →
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Guest details form card ───────────────────────────────────────────────────
function GuestDetailsCard({ onSend }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    const e = {};
    if (name.trim().length < 2) e.name = "Please enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = "Please enter a valid email address";
    if (phone.trim().replace(/[\s\-+()\d]/g, "").length > 0 || phone.trim().replace(/\D/g, "").length < 7) e.phone = "Please enter a valid phone number";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitted(true);
    onSend(`Name: ${name.trim()}\nEmail: ${email.trim()}\nPhone: ${phone.trim()}`);
  }

  if (submitted) {
    return (
      <div className="guest-form-card guest-form-done">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
        Details submitted
      </div>
    );
  }

  return (
    <div className="guest-form-card">
      <p className="guest-form-title">Your details</p>
      <div className="guest-form-field">
        <label htmlFor="gf-name">Full name</label>
        <input id="gf-name" type="text" autoComplete="name" value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. Kasun Perera" />
        {errors.name && <span className="guest-form-error">{errors.name}</span>}
      </div>
      <div className="guest-form-field">
        <label htmlFor="gf-email">Email address</label>
        <input id="gf-email" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="you@example.com" />
        {errors.email && <span className="guest-form-error">{errors.email}</span>}
      </div>
      <div className="guest-form-field">
        <label htmlFor="gf-phone">Phone number</label>
        <input id="gf-phone" type="tel" autoComplete="tel" value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="+94 77 000 0000" />
        {errors.phone && <span className="guest-form-error">{errors.phone}</span>}
      </div>
      <button className="guest-form-submit" onClick={handleSubmit}>Continue →</button>
    </div>
  );
}

// ── Existing event cards (booking / transfer confirmed / handoff) ─────────────
const STATUS_LABEL = { pending: "Awaiting confirmation", confirmed: "Confirmed", cancelled: "Cancelled" };

export function EventCard({ event, onSend = () => {} }) {
  const d = event.data;

  if (event.type === "room_cards") {
    return <RoomCardsCard data={d} onSend={onSend} />;
  }
  if (event.type === "availability_results") {
    return <AvailabilityCard data={d} onSend={onSend} />;
  }
  if (event.type === "quote_result") {
    return <QuoteCard data={d} onSend={onSend} />;
  }
  if (event.type === "transfer_options") {
    return <TransferOptionsCard data={d} onSend={onSend} />;
  }
  if (event.type === "guest_details_form") {
    return <GuestDetailsCard onSend={onSend} />;
  }

  if (event.type === "booking_created" || event.type === "booking_modified") {
    return (
      <div className="folio" role="group" aria-label={`Booking ${d.reference}`}>
        <div className="folio-head">
          <span>{event.type === "booking_created" ? "Booking reference" : "Booking updated"}</span>
          <span className={`status status-${d.status}`}>{STATUS_LABEL[d.status] || d.status}</span>
        </div>
        <div className="folio-ref-row">
          <div className="folio-ref">{d.reference}</div>
          <CopyButton text={d.reference} />
        </div>
        <div className="folio-tear" aria-hidden="true" />
        <dl className="folio-grid">
          <dt>Room</dt>
          <dd>{d.units > 1 ? `${d.units} × ` : ""}{d.room}</dd>
          <dt>Stay</dt>
          <dd>{fmtDate(d.check_in, { day: "numeric", month: "short" })} – {fmtDate(d.check_out)} ({d.nights} {d.nights === 1 ? "night" : "nights"})</dd>
          <dt>Guests</dt>
          <dd>{d.adults} adult{d.adults > 1 ? "s" : ""}{d.children ? `, ${d.children} child${d.children > 1 ? "ren" : ""}` : ""} · {d.meal_plan}</dd>
          <dt>Total</dt>
          <dd className="folio-total">{money(d.total, d.currency)}</dd>
        </dl>
        {d.status === "pending" && (
          <p className="folio-note">We'll email {d.guest_name.split(" ")[0]} to confirm and arrange payment.</p>
        )}
      </div>
    );
  }
  if (event.type === "booking_cancelled") {
    return (
      <div className="folio folio-quiet">
        <div className="folio-head">
          <span>Booking cancelled</span>
          <span className="status status-cancelled">Cancelled</span>
        </div>
        <div className="folio-ref-row">
          <div className="folio-ref folio-ref-struck">{d.reference}</div>
        </div>
        <p className="folio-note">{d.note}</p>
      </div>
    );
  }
  if (event.type === "transfer_requested") {
    return (
      <div className="folio">
        <div className="folio-head">
          <span>Transfer confirmed</span>
          <span className="status status-pending">Requested</span>
        </div>
        <div className="folio-ref-row">
          <div className="folio-ref">{d.reference}</div>
          <CopyButton text={d.reference} />
        </div>
        <div className="folio-tear" aria-hidden="true" />
        <dl className="folio-grid">
          <dt>Route</dt><dd>{d.route}</dd>
          <dt>Pickup</dt>
          <dd>{fmtDate(d.pickup_at, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{d.flight_number ? ` · ${d.flight_number}` : ""}</dd>
          <dt>Vehicle</dt><dd>{d.vehicle}</dd>
          <dt>Price</dt><dd className="folio-total">{money(d.price, d.currency)}</dd>
        </dl>
      </div>
    );
  }
  if (event.type === "handoff") {
    return (
      <div className="handoff">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        A team member has been notified and will follow up with you shortly.
      </div>
    );
  }
  return null;
}

// ── Date range picker (inline, between list and input) ───────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function buildCal(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDow).fill(null);
  for (let d = 1; d <= days; d++) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  return cells;
}

function DateRangePicker({ onSelect, onClose }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const [vy, setVy] = useState(now.getFullYear());
  const [vm, setVm] = useState(now.getMonth());
  const [start, setStart] = useState(null);
  const [end,   setEnd]   = useState(null);
  const [hover, setHover] = useState(null);

  function prevM() {
    if (vm === 0) { setVy(y => y - 1); setVm(11); }
    else setVm(m => m - 1);
  }
  function nextM() {
    if (vm === 11) { setVy(y => y + 1); setVm(0); }
    else setVm(m => m + 1);
  }

  function pick(iso) {
    if (!start || end) {
      setStart(iso); setEnd(null);
    } else {
      if (iso === start) return;
      const [ci, co] = iso < start ? [iso, start] : [start, iso];
      setEnd(co);
      onSelect(ci, co);
    }
  }

  const cells = buildCal(vy, vm);
  const effEnd = end || hover;
  const rLo = start && effEnd ? (start < effEnd ? start : effEnd) : null;
  const rHi = start && effEnd ? (start < effEnd ? effEnd : start) : null;

  return (
    <div className="drp" role="dialog" aria-label="Pick date range">
      <div className="drp-nav">
        <button type="button" className="drp-nav-btn" onClick={prevM} aria-label="Previous month">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="drp-month-label">{MONTH_NAMES[vm]} {vy}</span>
        <button type="button" className="drp-nav-btn" onClick={nextM} aria-label="Next month">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div className="drp-grid">
        {DOW_LABELS.map(d => <div key={d} className="drp-dow">{d}</div>)}
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`e${idx}`} className="drp-empty" />;
          const past  = iso < todayIso;
          const isSel = iso === start || iso === end;
          const inRng = rLo && rHi && iso > rLo && iso < rHi;
          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              className={`drp-day${past ? " drp-past" : ""}${isSel ? " drp-sel" : ""}${inRng ? " drp-rng" : ""}`}
              onClick={() => !past && pick(iso)}
              onMouseEnter={() => start && !end && !past && setHover(iso)}
              onMouseLeave={() => setHover(null)}
              aria-label={iso}
              aria-pressed={isSel}
            >
              {parseInt(iso.slice(8), 10)}
            </button>
          );
        })}
      </div>

      <div className="drp-footer">
        <span className="drp-hint">
          {!start
            ? "Select check-in date"
            : !end
            ? `${fmtDate(start, { day: "numeric", month: "short" })} → select check-out`
            : `${fmtDate(start, { day: "numeric", month: "short" })} – ${fmtDate(end, { day: "numeric", month: "short" })}`}
        </span>
        <button type="button" className="drp-close" onClick={onClose} aria-label="Close date picker">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── ChatPanel ─────────────────────────────────────────────────────────────────
const MAXIMIZE_PATH = "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3";
const MINIMIZE_PATH = "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3";
const RESTART_PATH = "M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4";
const CLOSE_PATH   = "M6 6l12 12M18 6L6 18";
const SEND_PATH    = "M4 12h14M13 6l6 6-6 6";

function UserAvatar() {
  return (
    <div className="msg-ava msg-ava-user" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

// ── Sinhala / Tamil helpers ───────────────────────────────────────────────────
const SI_RE = /[඀-෿]/;
const TA_RE = /[஀-௿]/;
const hasSinhala = (text) => SI_RE.test(text ?? "");
const hasTamil   = (text) => TA_RE.test(text ?? "");
const scriptClass = (text) =>
  hasSinhala(text) ? " si-text" : hasTamil(text) ? " ta-text" : "";

const SI_CHIPS = [
  "කාමරයක් තිබේද?",
  "ගාස්තු කොපමණද?",
  "ගුවන්තොටුපළ ගමනාගමනය",
  "ළඟ ඇති ආකර්ෂණ",
];

const TA_CHIPS = [
  "அறை கிடைக்குமா?",
  "விலை என்ன?",
  "விமான நிலைய போக்குவரத்து",
  "அருகிலுள்ள இடங்கள்",
];

function siGreeting(prop) {
  return `ආයුබෝවන්! 🙏 මම ${prop.assistant_name}, ${prop.name} හි AI concierge. කාමර වෙන් කිරීම, ගාස්තු, ගුවන්තොටුපළ ගමනාගමනය සහ ළඟ ඇති ආකර්ෂණ ගැන ඔබට සහාය කළ හැකිය. කෙසේ ද?`;
}

function taGreeting(prop) {
  return `வணக்கம்! 🙏 நான் ${prop.assistant_name}, ${prop.name}-இன் AI concierge. அறை முன்பதிவு, விலை விவரங்கள், விமான நிலைய போக்குவரத்து மற்றும் அருகிலுள்ள இடங்கள் பற்றி உதவ முடியும். எப்படி உதவட்டுமா?`;
}

const LANG_CYCLE = { en: "si", si: "ta", ta: "en" };
const LANG_LABEL = { en: "EN", si: "සිං", ta: "தமிழ்" };
const LANG_TITLE = {
  en: "සිංහලෙන් / தமிழில் — switch language",
  si: "தமிழில் மாற",
  ta: "Switch to English",
};

// ── Chat history panel (list of past sessions) ───────────────────────────────
function HistoryPanel({ sessions, currentSid, onSelect, onNewChat, onDelete }) {
  const groups = groupByDate(sessions);
  return (
    <div className="chat-hist-panel">
      <button className="chat-hist-new" onClick={onNewChat}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New conversation
      </button>
      {groups.length === 0 ? (
        <p className="chat-hist-empty">No previous conversations yet.<br/>Start chatting and your history will appear here.</p>
      ) : (
        groups.map(({ label, items }) => (
          <div key={label}>
            <div className="chat-hist-group-label">{label}</div>
            {items.map(s => (
              <div
                key={s.id}
                className={`chat-hist-item${s.id === currentSid ? " chat-hist-item-active" : ""}`}
                onClick={() => onSelect(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect(s.id)}
              >
                <div className="chat-hist-item-body">
                  <span className="chat-hist-time">{fmtTs(s.ts)}</span>
                  <span className="chat-hist-preview">{s.preview || "Conversation"}</span>
                </div>
                <button
                  className="chat-hist-del"
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  aria-label="Delete this conversation"
                  title="Delete conversation"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default function ChatPanel({ slug, onClose, fill = false, initialMessage = "", onOpenVoice = null }) {
  const [prop, setProp]         = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");
  const [maximize, setMaximize] = useState(false);
  const [lang, setLang]         = useState("en"); // "en" | "si" | "ta"
  const [pickerDismissedAtLength, setPickerDismissedAtLength] = useState(-1);
  const [historyCount, setHistoryCount] = useState(0); // messages loaded from server on open
  const [showHistory,  setShowHistory]  = useState(false);
  const [sessions,     setSessions]     = useState([]);
  // Streaming state — accumulated while a response is in flight
  const [streamContent, setStreamContent] = useState("");
  const [streamEvents,  setStreamEvents]  = useState([]);
  const streamContentRef = useRef("");
  const streamEventsRef  = useRef([]);
  // Voice state
  const [recording,    setRecording]    = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const lastWasVoiceRef  = useRef(false);
  const audioContextRef  = useRef(null);
  const analyserRef      = useRef(null);
  const animFrameRef     = useRef(null);
  const [audioLevels, setAudioLevels] = useState([]);
  const BAR_COUNT = 16;
  const sessionKey  = `hc-session-${slug}`;
  const sessionsKey = `hc-sessions-${slug}`;
  const [sid, setSid] = useState("");
  const listRef  = useRef(null);
  const inputRef = useRef(null);

  // Derived: show inline date picker when last AI message is asking for dates
  const needsDates = (() => {
    if (busy || messages.length === 0 || messages.length === pickerDismissedAtLength) return false;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return false;
    return /check[- ]?in|check[- ]?out|arrival date|which dates?|what dates?|when.*you.*think|when.*are you|when.*would you|when.*you.*like|what.*dates|dates.*thinking|dates.*have in mind|how many nights|looking to book|book for|your stay|planning to stay|thinking of staying/i.test(last.content || "");
  })();

  // Derived: show inline guest-details form after room selection, until details are submitted
  const needsGuestForm = (() => {
    if (messages.length === 0) return false;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "user" && /^I'd like to book the /.test(m.content || "")) {
        // Hide once details have been submitted
        if (messages.slice(i + 1).some((m2) => m2.role === "user" && /^Name:/i.test(m2.content || ""))) return false;
        // Hide if the agent already emitted a guest_details_form event card
        const inMsgs   = messages.slice(i).some((m2) => m2.events?.some((e) => e.type === "guest_details_form"));
        const inStream = streamEvents.some((e) => e.type === "guest_details_form");
        return !inMsgs && !inStream;
      }
    }
    return false;
  })();

  useEffect(() => {
    let live = true;
    setProp(null); setError("");
    const id = store.get(sessionKey) || newSessionId();
    store.set(sessionKey, id);
    setSid(id);
    Promise.all([api.property(slug), api.history(slug, id).catch(() => ({ messages: [] }))])
      .then(([p, h]) => {
        if (!live) return;
        setProp(p);
        setMessages(h.messages);
        setHistoryCount(h.messages.length);
      })
      .catch(() => live && setError("This property's assistant isn't available right now."));
    return () => { live = false; };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Auto-send initial message once prop is loaded (e.g. from "Ask the concierge →" buttons)
  const initialMsgSentRef = useRef(false);
  useEffect(() => {
    if (!prop || !initialMessage || initialMsgSentRef.current) return;
    initialMsgSentRef.current = true;
    setTimeout(() => send(initialMessage), 350);
  }, [prop]); // eslint-disable-line react-hooks/exhaustive-deps

  // scroll calendar into view when it appears
  useEffect(() => {
    if (!needsDates) return;
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 80);
  }, [needsDates]); // eslint-disable-line react-hooks/exhaustive-deps

  // scroll guest form into view when it appears
  useEffect(() => {
    if (!needsGuestForm) return;
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 80);
  }, [needsGuestForm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!maximize) return;
    const onKey = (e) => { if (e.key === "Escape") setMaximize(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maximize]);


  // Load session list for this property from localStorage
  useEffect(() => {
    setSessions([]);
    const raw = store.get(sessionsKey);
    if (raw) {
      try { setSessions(JSON.parse(raw)); } catch {}
    }
  }, [slug]); // eslint-disable-line

  const autoGrow = useCallback((el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, []);

  // ── Voice helpers ────────────────────────────────────────────────────────────
  function _bestMime() {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: _bestMime() });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(100);
      mediaRecorderRef.current = mr;

      // Web Audio visualizer
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArr);
        setAudioLevels(Array.from({ length: BAR_COUNT }, (_, i) => dataArr[i + 1] / 255));
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      setRecording(true);
    } catch {
      setError("Microphone access denied. Please allow mic access and try again.");
    }
  }

  async function stopAndTranscribe() {
    if (!mediaRecorderRef.current) return;
    cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    setAudioLevels([]);
    setRecording(false);
    const blob = await new Promise(resolve => {
      mediaRecorderRef.current.onstop = () => {
        const mime = mediaRecorderRef.current.mimeType || "audio/webm";
        resolve(new Blob(audioChunksRef.current, { type: mime }));
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    });
    if (blob.size < 500) return;
    setTranscribing(true);
    try {
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `recording.${ext}`);
      const res = await fetch(`/api/properties/${slug}/voice/stt`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("stt failed");
      const { text } = await res.json();
      if (text.trim()) {
        lastWasVoiceRef.current = true;
        await send(text.trim());
      }
    } catch {
      setError("Could not understand audio. Please try again.");
    } finally {
      setTranscribing(false);
    }
  }

  async function speakText(text) {
    if (!text.trim()) return;
    try {
      const res = await fetch(`/api/properties/${slug}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1200) }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(() => {});
      audio.onended = () => URL.revokeObjectURL(url);
    } catch {}
  }

  async function send(text) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
    setError("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    upsertSession(sid, msg);
    setBusy(true);
    _clearStream();

    const msg503    = "The assistant isn't configured yet (missing API key).";
    const msgTimeout = "The assistant took too long to respond — please try again.";
    const msgNet    = "Couldn't reach the server. Check your connection and try again.";
    const msgRate   = "You're sending messages too quickly. Please wait a moment.";

    let gotContent = false;
    let gotDone    = false;

    try {
      for await (const ev of chatStream(slug, sid, msg, lang)) {
        if (ev.type === "token") {
          streamContentRef.current += ev.content;
          setStreamContent(streamContentRef.current);
          if (!gotContent) { gotContent = true; setBusy(false); }

        } else if (ev.type === "event") {
          streamEventsRef.current = [...streamEventsRef.current, ev.event];
          setStreamEvents([...streamEventsRef.current]);
          if (!gotContent) { gotContent = true; setBusy(false); }

        } else if (ev.type === "done") {
          gotDone = true;
          // Snapshot refs NOW — _clearStream() runs next and zeros them.
          // If we let the functional updater read streamContentRef.current
          // lazily (when React calls it), it would get "" instead of the text.
          const finalContent = streamContentRef.current;
          const finalEvents  = streamEventsRef.current;
          setMessages((m) => [...m, {
            role: "assistant",
            content: finalContent,
            events: finalEvents,
          }]);
          if (lastWasVoiceRef.current && finalContent) {
            lastWasVoiceRef.current = false;
            speakText(finalContent);
          }
          _clearStream();

        } else if (ev.type === "error") {
          throw new Error(ev.message);
        }
      }

      // Stream ended without a done frame (server closed early)
      if (!gotDone) {
        const finalContent = streamContentRef.current;
        const finalEvents  = streamEventsRef.current;
        if (finalContent || finalEvents.length) {
          setMessages((m) => [...m, {
            role: "assistant",
            content: finalContent,
            events: finalEvents,
          }]);
        } else {
          setMessages((m) => m.slice(0, -1));
          setError(msgNet);
          setInput(msg);
        }
        _clearStream();
      }

    } catch (e) {
      const isNetDrop = !e.status && (e instanceof TypeError || /socket|network|fetch/i.test(e.message ?? ""));
      setError(e.status === 503 ? msg503 : e.status === 429 ? msgRate : isNetDrop ? msgTimeout : e.message || msgNet);
      setMessages((m) => m.slice(0, -1));
      setInput(msg);
      _clearStream();
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function _clearStream() {
    streamContentRef.current = "";
    streamEventsRef.current  = [];
    setStreamContent("");
    setStreamEvents([]);
  }

  function applyDates(ci, co) {
    const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
    const text = `${fmtDate(ci, { day: "numeric", month: "short" })} – ${fmtDate(co, { day: "numeric", month: "short" })} (${nights} night${nights !== 1 ? "s" : ""})`;
    send(text);
  }

  function restart() {
    const id = newSessionId();
    store.set(sessionKey, id);
    setSid(id);
    setMessages([]);
    setHistoryCount(0);
    setError("");
    setLang("en");
    _clearStream();
  }

  function upsertSession(id, preview) {
    setSessions(prev => {
      const exists = prev.some(s => s.id === id);
      const next = exists
        ? prev.map(s => s.id === id ? { ...s, ts: Date.now() } : s)
               .sort((a, b) => b.ts - a.ts)
        : [{ id, preview: String(preview || "").slice(0, 100), ts: Date.now() }, ...prev];
      const capped = next.slice(0, 30);
      store.set(sessionsKey, JSON.stringify(capped));
      return capped;
    });
  }

  function deleteSession(id) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      store.set(sessionsKey, JSON.stringify(next));
      return next;
    });
    if (id === sid) restart();
  }

  async function openSession(id) {
    if (id === sid) { setShowHistory(false); return; }
    setShowHistory(false);
    store.set(sessionKey, id);
    setSid(id);
    setMessages([]);
    setHistoryCount(0);
    setError("");
    _clearStream();
    setBusy(true);
    try {
      const h = await api.history(slug, id);
      setMessages(h.messages);
      setHistoryCount(h.messages.length);
    } catch {}
    setBusy(false);
  }

  function newChat() {
    setShowHistory(false);
    restart();
  }

  const accent       = prop?.accent || "#2f5d3a";
  const initials     = (prop?.assistant_name || "C")[0];
  const isSriLankan  = prop?.currency === "LKR";
  const chips    = lang === "si" ? SI_CHIPS : lang === "ta" ? TA_CHIPS : (prop?.suggestions || []);
  const greeting = prop ? (lang === "si" ? siGreeting(prop) : lang === "ta" ? taGreeting(prop) : prop.greeting) : null;

  const panel = (
    <section
      className={`chat${fill ? " chat-fill" : ""}${maximize ? " chat-max" : ""}${showHistory ? " chat-hist-open" : ""}`}
      style={{ "--accent": accent }}
      aria-label="Concierge chat"
    >
      {/* top accent stripe */}
      <div className="chat-stripe" aria-hidden="true"
        style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 55%, #000))` }} />

      {/* header */}
      <header className="chat-head">
        <div className="chat-avatar" aria-hidden="true">{initials}</div>
        <div className="chat-title">
          <strong>{prop?.assistant_name || "Concierge"}</strong>
          <span className="chat-subtitle">
            <span className="chat-online" aria-label="Online" />
            {prop ? prop.name : "Loading…"}
          </span>
        </div>

        {prop && (
          <button
            className={`lang-toggle${lang !== "en" ? ` lang-toggle-active lang-toggle-${lang}` : ""}`}
            onClick={() => setLang(l => LANG_CYCLE[l])}
            title={LANG_TITLE[lang]}
            aria-label={LANG_TITLE[lang]}
          >
            {LANG_LABEL[lang]}
          </button>
        )}

        <button
          className={`icon-btn${showHistory ? " icon-btn-active" : ""}`}
          onClick={() => setShowHistory(h => !h)}
          title={showHistory ? "Back to chat" : "Chat history"}
          aria-label={showHistory ? "Back to chat" : "View chat history"}
          aria-pressed={showHistory}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
        </button>
        <button className="icon-btn" onClick={restart} title="New conversation" aria-label="Start a new conversation">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={RESTART_PATH} /></svg>
        </button>
        {!fill && (
          <button className="icon-btn" onClick={() => setMaximize((m) => !m)}
            title={maximize ? "Minimize" : "Expand"} aria-label={maximize ? "Minimize chat" : "Expand chat"}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={maximize ? MINIMIZE_PATH : MAXIMIZE_PATH} />
            </svg>
          </button>
        )}
        {onClose && (
          <button className="icon-btn" onClick={onClose} aria-label="Close chat">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={CLOSE_PATH} /></svg>
          </button>
        )}
      </header>

      {/* history panel — overlays the message list */}
      {showHistory && (
        <HistoryPanel
          sessions={sessions}
          currentSid={sid}
          onSelect={openSession}
          onNewChat={newChat}
          onDelete={deleteSession}
        />
      )}

      {/* message list */}
      <div className={`chat-list${showHistory ? " d-none" : ""}`} ref={listRef} aria-live="polite">

        {/* previous-session separator */}
        {historyCount > 0 && (
          <div className="chat-hist-sep" role="separator" aria-label="Previous conversation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span>Previous conversation</span>
          </div>
        )}

        {/* welcome screen — greeting only, no chips */}
        {prop && historyCount === 0 && messages.length === 0 && !busy && (
          <div className="chat-welcome">
            <div className="chat-welcome-ava" aria-hidden="true">{initials}</div>
            <p className="chat-welcome-name">{prop.assistant_name}</p>
            <p className="chat-welcome-sub">{prop.name}</p>
            <p className="chat-welcome-greeting">{greeting || "Ayubowan 🙏"}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}${i >= historyCount ? " msg-in" : ""}`}>
            {m.role === "assistant" && (
              <div className="msg-ava" aria-hidden="true">{initials}</div>
            )}
            <div className="msg-body">
              {m.content && (
                <div className={`bubble${scriptClass(m.content)}`}>
                  {m.role === "assistant" ? <RichText text={m.content} /> : <p>{m.content}</p>}
                </div>
              )}
              {m.events?.map((e, j) => <EventCard key={j} event={e} onSend={send} />)}
            </div>
            {m.role === "user" && <UserAvatar />}
          </div>
        ))}

        {/* Streaming in-progress message — appears as tokens/events arrive */}
        {(streamContent || streamEvents.length > 0) && (
          <div className="msg msg-assistant msg-in">
            <div className="msg-ava" aria-hidden="true">{initials}</div>
            <div className="msg-body">
              {streamContent && (
                <div className={`bubble bubble-streaming${scriptClass(streamContent)}`}>
                  <RichText text={streamContent} />
                </div>
              )}
              {streamEvents.map((e, j) => <EventCard key={j} event={e} onSend={send} />)}
            </div>
          </div>
        )}

        {/* Typing dots — only while waiting for first token/event */}
        {busy && !streamContent && !streamEvents.length && (
          <div className="msg msg-assistant msg-in">
            <div className="msg-ava" aria-hidden="true">{initials}</div>
            <div className="msg-body">
              <div className="bubble typing" aria-label={`${prop?.assistant_name || "Concierge"} is typing`}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        {needsDates && (
          <div className="chat-inline-picker">
            <DateRangePicker
              onSelect={applyDates}
              onClose={() => setPickerDismissedAtLength(messages.length)}
            />
          </div>
        )}

        {needsGuestForm && <GuestDetailsCard onSend={send} />}
      </div>

      {error && <p className="chat-error" role="alert">{error}</p>}

      {/* quick suggestion chips — shown only on empty chat */}
      {chips.length > 0 && messages.length === 0 && historyCount === 0 && !busy && (
        <div className="chat-chips" role="group" aria-label="Suggested questions">
          {chips.map((c) => (
            <button key={c} className="chat-chip" type="button" onClick={() => send(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* input bar */}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        {recording ? (
          <div className="voice-visualizer-wrap" aria-label="Listening, tap mic to stop">
            <div className="voice-bars" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="voice-bar"
                  style={{ height: `${Math.max(3, (audioLevels[i] || 0) * 44)}px` }}
                />
              ))}
            </div>
            <span className="voice-listening-label">Listening…</span>
          </div>
        ) : (
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={2000}
            placeholder={
              lang === "si" ? "ලියන්න… (සිංහල හෝ ඉංග්‍රීසි)" :
              lang === "ta" ? "தட்டச்சு செய்யுங்கள்… (தமிழ் அல்லது ஆங்கிலம்)" :
              "Ask about rooms, dates, transfers…"
            }
            aria-label="Your message"
            lang={hasSinhala(input) ? "si" : hasTamil(input) ? "ta" : undefined}
            onChange={(e) => { setInput(e.target.value); autoGrow(e.target); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            disabled={!prop}
          />
        )}
        {!recording && input.length > 1700 && (
          <span className="char-count" aria-live="polite">{2000 - input.length}</span>
        )}
        <button
          type="button"
          className={`mic-btn${recording ? " mic-btn-recording" : ""}${transcribing ? " mic-btn-busy" : ""}`}
          onClick={() => onOpenVoice ? onOpenVoice() : (recording ? stopAndTranscribe() : startRecording())}
          disabled={!prop || busy || transcribing}
          aria-label={onOpenVoice ? "Open voice agent" : (recording ? "Stop recording" : "Speak your message")}
          title={onOpenVoice ? "Talk to AI voice agent" : (recording ? "Tap to stop" : "Voice input")}
        >
          {transcribing ? (
            <span className="adm-spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} />
          ) : recording ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg>
          )}
        </button>
        <button className="send" type="submit" disabled={!input.trim() || busy || !prop} aria-label="Send">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SEND_PATH} /></svg>
        </button>
      </form>
      <p className="chat-foot">AI concierge · never share card details in chat</p>
    </section>
  );

  if (fill) return panel;

  return (
    <>
      {maximize && (
        <div className="chat-backdrop" onClick={() => setMaximize(false)} aria-hidden="true" />
      )}
      {panel}
    </>
  );
}
