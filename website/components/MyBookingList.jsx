'use client';
import { useState, useEffect, useCallback } from 'react';
import MyBookingSignIn from './MyBookingSignIn';

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function fmtMoney(n, currency = 'LKR') {
  if (n == null) return '—';
  try { return new Intl.NumberFormat('en-LK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `${currency} ${n}`; }
}

const STATUS_STYLES = {
  confirmed:  { bg: '#D1FAE5', text: '#065F46', label: 'Confirmed' },
  pending:    { bg: '#FEF9C3', text: '#854D0E', label: 'Pending' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
  checked_in: { bg: '#DBEAFE', text: '#1E40AF', label: 'Checked In' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#F1F5F9', text: '#475569', label: status };
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function BookingCard({ booking, email, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nights = booking.nights ?? Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000);
  const roomName = booking.room || booking.room_name || '—';
  const total    = booking.total ?? booking.total_price;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/booking/${booking.reference}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { onDelete(booking.reference); return; }
    } catch {}
    setDeleting(false);
    setConfirmDelete(false);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8DCC8', overflow: 'hidden', boxShadow: '0 2px 12px rgba(45,31,10,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #2D1F0A, #5C3D1E)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4A843', marginBottom: 4 }}>Booking Reference</div>
          <div style={{ fontFamily: '"Plus Jakarta Sans", monospace', fontSize: '1.05rem', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>{booking.reference}</div>
          {booking.created_at && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Booked {fmtDate(booking.created_at)} · {new Date(booking.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <StatusPill status={booking.status} />
      </div>

      {/* Pending notice */}
      {booking.status === 'pending' && (
        <div style={{ padding: '10px 24px', background: '#FFFBEB', borderBottom: '1px solid #FDE68A', fontSize: '0.82rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Awaiting confirmation from our team — we'll email you shortly.
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: '#2D1F0A', marginBottom: 6 }}>{roomName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.88rem', color: '#6B5D4F' }}>
            <span>{fmtDate(booking.check_in)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span>{fmtDate(booking.check_out)}</span>
            <span style={{ color: '#B8921C', fontWeight: 600 }}>· {nights} night{nights !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', borderTop: '1px solid #F0E8D8', paddingTop: 16 }}>
          {booking.adults != null && (<><div style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guests</div><div style={{ fontSize: '0.88rem', color: '#2D1F0A', fontWeight: 500 }}>{booking.adults} adult{booking.adults > 1 ? 's' : ''}{booking.children ? ` + ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}</div></>)}
          {booking.meal_plan && (<><div style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meal Plan</div><div style={{ fontSize: '0.88rem', color: '#2D1F0A', fontWeight: 500 }}>{booking.meal_plan}</div></>)}
          {booking.check_in_time && (<><div style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check-in from</div><div style={{ fontSize: '0.88rem', color: '#2D1F0A', fontWeight: 500 }}>{booking.check_in_time}</div></>)}
          {booking.check_out_time && (<><div style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check-out by</div><div style={{ fontSize: '0.88rem', color: '#2D1F0A', fontWeight: 500 }}>{booking.check_out_time}</div></>)}
          {booking.guest_name && (<><div style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guest name</div><div style={{ fontSize: '0.88rem', color: '#2D1F0A', fontWeight: 500 }}>{booking.guest_name}</div></>)}
          {total != null && (<><div style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div><div style={{ fontSize: '0.95rem', color: '#2D1F0A', fontWeight: 700 }}>{fmtMoney(total, booking.currency)}</div></>)}
          {booking.contact_phone && (<><div style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hotel contact</div><div style={{ fontSize: '0.88rem', color: '#2D1F0A', fontWeight: 500 }}>{booking.contact_phone}</div></>)}
        </div>

        {booking.special_requests && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#FAF7F2', borderRadius: 8, fontSize: '0.84rem', color: '#6B5D4F', borderLeft: '3px solid #D4A843' }}>
            <span style={{ fontWeight: 600, color: '#8B6914' }}>Requests: </span>{booking.special_requests}
          </div>
        )}

        {booking.status === 'cancelled' ? (
          <div style={{ marginTop: 18 }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1.5px solid #FCA5A5', borderRadius: 8, background: '#FFF5F5', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#991B1B' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Remove from list
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FCA5A5' }}>
                <span style={{ fontSize: '0.82rem', color: '#7F1D1D', flex: 1 }}>Remove this cancelled booking?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ padding: '6px 14px', background: '#DC2626', border: 'none', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, color: '#fff', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? 'Removing…' : 'Yes, remove'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={{ padding: '6px 14px', background: '#fff', border: '1px solid #E0D5C5', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600, color: '#6B4F0F', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openChatWidget', { detail: { message: `I have a question about my booking ${booking.reference} (email: ${email})` } }))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', border: '1.5px solid #E0D5C5', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#6B4F0F', transition: 'border-color 0.15s, background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B6914'; e.currentTarget.style.background = '#FAF7F2'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0D5C5'; e.currentTarget.style.background = '#fff'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Need help with this booking?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const POLL_INTERVAL = 60000;

export default function MyBookingList({ email }) {
  const [bookings, setBookings] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`/api/booking/by-guest?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setLastUpdated(new Date());
      }
    } catch {}
    if (showSpinner) setRefreshing(false);
  }, [email]);

  useEffect(() => {
    fetchBookings();
    const timer = setInterval(() => fetchBookings(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchBookings]);

  if (bookings === null) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E8DCC8', borderTopColor: '#8B6914', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '0.9rem', color: '#8A7A6A' }}>Loading your bookings…</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '20px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F5EDD9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 10px' }}>No bookings yet</h2>
        <p style={{ fontSize: '0.9rem', color: '#8A7A6A', lineHeight: 1.7, margin: '0 0 28px' }}>
          You haven't made any reservations with us yet. Chat with our concierge to check availability and book your stay.
        </p>
        <MyBookingSignIn mode="chat" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: '0.84rem', color: '#8A7A6A', margin: 0 }}>
          {bookings.length} reservation{bookings.length !== 1 ? 's' : ''}
          {lastUpdated && <span> · updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
        </p>
        <button
          onClick={() => fetchBookings(true)}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1.5px solid #E0D5C5', borderRadius: 8, background: '#fff', cursor: refreshing ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#6B4F0F', opacity: refreshing ? 0.6 : 1 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {bookings.map(b => (
          <BookingCard
            key={b.reference}
            booking={b}
            email={email}
            onDelete={(ref) => setBookings(prev => prev.filter(x => x.reference !== ref))}
          />
        ))}
      </div>
    </div>
  );
}
