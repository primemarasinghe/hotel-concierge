'use client';
import { signIn } from 'next-auth/react';

export default function MyBookingSignIn({ mode = 'signin' }) {
  if (mode === 'chat') {
    return (
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('openChatWidget'))}
        className="btn-primary"
        style={{ padding: '12px 28px', fontSize: '0.9rem' }}
      >
        Chat with our concierge to book →
      </button>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 4px 32px rgba(45,31,10,0.10)',
        padding: '44px 36px',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: '#F5EDD9',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 8px' }}>
          Sign in to continue
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#6B7280', lineHeight: 1.6, margin: '0 0 28px' }}>
          Sign in with your Google account to view your reservations at Leisureville Sigiriya.
        </p>

        <button
          onClick={() => signIn('google', { callbackUrl: '/my-booking' })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 20px', border: '1.5px solid #E0D5C5', borderRadius: 12,
            background: '#fff', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 600, color: '#2D1F0A',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B6914'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(139,105,20,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0D5C5'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.7 0 20-7.8 20-20.5 0-1.4-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4.5 24 4.5c-7.6 0-14.1 4.4-17.7 10.2z"/>
            <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 37.1 26.8 38 24 38c-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.9 41.1 16.5 45.5 24 45.5z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.5l6.2 5.2c3.6-3.3 5.9-8.3 5.9-13.7 0-1.4-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
