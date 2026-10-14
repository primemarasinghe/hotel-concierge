import { useState } from "react";
import { api, money, fmtDate } from "./api.js";

const STATUS_LABEL = {
  pending:   "Awaiting confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export default function BookingLookup() {
  const params = new URLSearchParams(window.location.search);

  const [ref,   setRef]   = useState(params.get("ref") || "");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  // cancel flow: idle → confirm → cancelling → done
  const [cancelPhase, setCancelPhase] = useState("idle");

  const accent = booking?.property_accent || "#2f5d3a";

  async function lookup(e) {
    e.preventDefault();
    if (!ref.trim() || !email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const b = await api.lookupBooking(ref.trim(), email.trim());
      setBooking(b);
      setCancelPhase("idle");
    } catch (err) {
      setError(err.message || "No booking found with those details.");
    } finally {
      setLoading(false);
    }
  }

  async function doCancel() {
    setCancelPhase("cancelling");
    try {
      const result = await api.cancelBooking(booking.reference, email.trim());
      setBooking(b => ({ ...b, status: "cancelled", cancel_note: result.note }));
      setCancelPhase("done");
    } catch (err) {
      setError(err.message || "Cancellation failed. Please try again.");
      setCancelPhase("idle");
    }
  }

  const nights = booking
    ? Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000)
    : 0;
  const canCancel = booking && booking.status !== "cancelled";

  return (
    <div className="blk" style={{ "--accent": accent }}>
      <div className="blk-card">

        {/* ── Header logo ── */}
        <div className="blk-logo" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 22V10l9-7 9 7v12M9 22v-7h6v7"/>
          </svg>
        </div>

        {!booking ? (
          /* ── Lookup form ── */
          <>
            <h1>Find my booking</h1>
            <p className="blk-intro">
              Enter your booking reference and the email address used when you booked.
            </p>
            <form onSubmit={lookup} noValidate>
              <div className="blk-field">
                <label htmlFor="blk-ref">Booking reference</label>
                <input
                  id="blk-ref"
                  value={ref}
                  onChange={e => setRef(e.target.value.toUpperCase())}
                  placeholder="e.g. KH-ABCDEF"
                  autoComplete="off"
                  autoFocus={!ref}
                  spellCheck={false}
                />
              </div>
              <div className="blk-field">
                <label htmlFor="blk-email">Email address</label>
                <input
                  id="blk-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  autoFocus={!!ref}
                />
              </div>
              {error && <p className="blk-error" role="alert">{error}</p>}
              <button
                type="submit"
                className="blk-btn-primary"
                disabled={loading || !ref.trim() || !email.trim()}
              >
                {loading ? "Looking up…" : "Find booking →"}
              </button>
            </form>
          </>
        ) : (
          /* ── Booking result ── */
          <>
            <div className="blk-prop-head">
              <span className="blk-prop-name">{booking.property_name}</span>
              <span className="blk-prop-kind">{booking.property_kind} · {booking.property_location}</span>
            </div>

            {/* Folio card */}
            <div className="folio">
              <div className="folio-head">
                <span>Booking reference</span>
                <span className={`status status-${booking.status}`}>
                  {STATUS_LABEL[booking.status] || booking.status}
                </span>
              </div>
              <div className="folio-ref-row">
                <div className="folio-ref">{booking.reference}</div>
              </div>
              <div className="folio-tear" aria-hidden="true" />
              <dl className="folio-grid">
                <dt>Guest</dt>
                <dd>{booking.guest_name}</dd>
                <dt>Room</dt>
                <dd>{booking.units > 1 ? `${booking.units} × ` : ""}{booking.room}</dd>
                <dt>Stay</dt>
                <dd>
                  {fmtDate(booking.check_in, { day: "numeric", month: "short" })} –{" "}
                  {fmtDate(booking.check_out, { day: "numeric", month: "short", year: "numeric" })}
                  {" "}· {nights} night{nights !== 1 ? "s" : ""}
                </dd>
                <dt>Guests</dt>
                <dd>
                  {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                  {booking.children ? ` + ${booking.children} child${booking.children !== 1 ? "ren" : ""}` : ""}
                  {" · "}{booking.meal_plan}
                </dd>
                <dt>Total</dt>
                <dd className="folio-total">{money(booking.total, booking.currency)}</dd>
              </dl>
              {booking.special_requests && (
                <p className="blk-requests">"{booking.special_requests}"</p>
              )}
            </div>

            {/* Policy info */}
            {booking.status !== "cancelled" && (
              <div className="blk-policy">
                <p>Check-in from {booking.check_in_time} · Check-out by {booking.check_out_time}</p>
                <p>Free cancellation up to {booking.free_cancellation_days} day{booking.free_cancellation_days !== 1 ? "s" : ""} before arrival.</p>
              </div>
            )}

            {/* Cancel flow */}
            {canCancel && cancelPhase === "idle" && (
              <button className="blk-cancel-btn" onClick={() => setCancelPhase("confirm")}>
                Cancel this booking
              </button>
            )}

            {cancelPhase === "confirm" && (
              <div className="blk-confirm" role="alertdialog" aria-label="Confirm cancellation">
                <p>Cancel booking <strong>{booking.reference}</strong>?</p>
                <div className="blk-confirm-actions">
                  <button onClick={() => setCancelPhase("idle")}>Keep my booking</button>
                  <button className="blk-btn-danger" onClick={doCancel}>
                    Yes, cancel it
                  </button>
                </div>
              </div>
            )}

            {cancelPhase === "cancelling" && (
              <p className="blk-working" aria-live="polite">Cancelling…</p>
            )}

            {cancelPhase === "done" && (
              <div className="blk-cancel-done" role="status">
                <p>{booking.cancel_note || "Your booking has been cancelled."}</p>
                {booking.contact_phone && (
                  <p>Questions? Call us at <strong>{booking.contact_phone}</strong></p>
                )}
              </div>
            )}

            {error && <p className="blk-error" role="alert">{error}</p>}

            {/* Footer links */}
            <div className="blk-footer">
              <a href={`/?p=${booking.property_slug}`} className="blk-back">
                Return to {booking.property_name} →
              </a>
              <button
                className="blk-new-lookup"
                onClick={() => { setBooking(null); setError(""); setRef(""); setEmail(""); setCancelPhase("idle"); }}
              >
                Look up a different booking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
