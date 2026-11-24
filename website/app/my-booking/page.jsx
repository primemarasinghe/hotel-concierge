'use client';
import { useState } from 'react';
import Link from 'next/link';
import { lookupBooking } from '../../lib/api';

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
}

function fmtMoney(n) {
  if (n == null) return '—';
  return `LKR ${(+n).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

function StatusPill({ status }) {
  const map = {
    confirmed: { bg: '#D1FAE5', text: '#065F46' },
    pending:   { bg: '#FEF9C3', text: '#854D0E' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  };
  const s = map[status] || { bg: '#F1F5F9', text: '#475569' };
  return (
    <span className={`booking-status-pill ${status}`}>
      {status?.charAt(0).toUpperCase()}{status?.slice(1)}
    </span>
  );
}

function BookingResult({ booking }) {
  const rows = [
    ['Room',              booking.room_name],
    ['Check-in',          fmtDate(booking.check_in)],
    ['Check-out',         fmtDate(booking.check_out)],
    ['Nights',            booking.nights],
    ['Guests',            booking.adults != null ? `${booking.adults} adult${booking.adults > 1 ? 's' : ''}${booking.children ? ` + ${booking.children} children` : ''}` : null],
    ['Meal plan',         booking.meal_plan],
    ['Total amount',      fmtMoney(booking.total_price)],
    ['Special requests',  booking.special_requests],
  ].filter(([, v]) => v != null && v !== '' && v !== 0);

  return (
    <div className="booking-result">
      <div style={{ marginBottom: 16 }}>
        <div className="booking-result-ref">{booking.reference}</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusPill status={booking.status} />
          <span style={{ fontSize: '0.78rem', color: '#8A7A6A' }}>
            Booked {fmtDate(booking.created_at)}
          </span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #E8DCC8', paddingTop: 16 }}>
        {rows.map(([label, value]) => (
          <div key={label} className="booking-detail-row">
            <span className="booking-detail-label">{label}</span>
            <span className="booking-detail-value">{String(value)}</span>
          </div>
        ))}
      </div>

      {booking.status !== 'cancelled' && (
        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/book" className="btn-primary" style={{ fontSize: '0.88rem', padding: '11px 20px' }}>
            Modify with Siri
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MyBookingPage() {
  const [reference, setReference] = useState('');
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [booking, setBooking]     = useState(null);
  const [error, setError]         = useState('');

  async function handleLookup(e) {
    e.preventDefault();
    if (!reference.trim() || !email.trim()) {
      setError('Please enter both your booking reference and email address.');
      return;
    }
    setError('');
    setBooking(null);
    setLoading(true);
    try {
      const result = await lookupBooking(reference.trim().toUpperCase(), email.trim().toLowerCase());
      setBooking(result);
    } catch (err) {
      setError(err.message || 'Booking not found. Please check your reference and email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <div style={{
        paddingTop: 120, paddingBottom: 60,
        background: 'linear-gradient(to bottom, #2D1F0A, #5C3D1E)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 500, margin: '0 auto', padding: '0 24px' }}>
          <span className="section-label" style={{ color: '#D4A843' }}>Manage</span>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 700, color: '#FFFFFF', margin: '8px 0 12px' }}>
            My Booking
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
            Enter your booking reference and email address to view or manage your reservation.
          </p>
        </div>
      </div>

      <div style={{ background: '#FAF7F2', padding: '60px 24px 100px' }}>
        {/* Lookup form */}
        <div className="lookup-wrap">
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.3rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 24px' }}>
            Find your booking
          </h2>

          <form onSubmit={handleLookup}>
            <div className="lookup-field">
              <label htmlFor="ref">Booking reference</label>
              <input
                id="ref"
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. HC-XXXXXXXX"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="lookup-field">
              <label htmlFor="email-lookup">Email address</label>
              <input
                id="email-lookup"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 12, padding: '10px 14px', background: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.84rem',
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="lookup-submit" disabled={loading}>
              {loading ? 'Looking up…' : 'Find booking →'}
            </button>
          </form>
        </div>

        {/* Result */}
        {booking && <BookingResult booking={booking} />}

        {/* Need help */}
        <div style={{ textAlign: 'center', marginTop: 40, padding: '0 24px' }}>
          <p style={{ fontSize: '0.88rem', color: '#8A7A6A', margin: '0 0 12px' }}>
            Can't find your booking? Chat with Siri for help.
          </p>
          <Link href="/book" className="btn-outline-dark" style={{ fontSize: '0.88rem', padding: '10px 20px' }}>
            Chat with Siri
          </Link>
        </div>
      </div>
    </>
  );
}
