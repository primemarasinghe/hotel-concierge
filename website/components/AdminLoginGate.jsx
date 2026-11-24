'use client';
import { signIn } from 'next-auth/react';

export default function AdminLoginGate({ unauthorized = false }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0F1B12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--ui, system-ui, sans-serif)',
    }}>
      <div style={{
        background: '#1A2B1E',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 52,
          height: 52,
          background: 'rgba(212,168,67,0.12)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 22V10l9-7 9 7v12M9 22v-7h6v7"/>
          </svg>
        </div>

        <h1 style={{ color: '#fff', fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.35rem', fontWeight: 700, margin: '0 0 6px' }}>
          Staff Dashboard
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.84rem', margin: '0 0 28px', lineHeight: 1.5 }}>
          Leisureville Sigiriya
        </p>

        {unauthorized ? (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#FCA5A5',
            fontSize: '0.84rem',
            lineHeight: 1.5,
          }}>
            That Google account isn't authorised as an admin.
            <br/>
            Sign in with the correct account.
          </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginBottom: 20 }}>
            Sign in with your authorised Google account to continue.
          </p>
        )}

        <button
          onClick={() => signIn('google', { callbackUrl: '/admin' })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: '#fff',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: 8,
            padding: '12px 20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          {/* Google logo */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.7 0 20-7.8 20-20.5 0-1.4-.1-2.7-.4-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4.5 24 4.5c-7.6 0-14.1 4.4-17.7 10.2z"/>
            <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 37.1 26.8 38 24 38c-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.9 41.1 16.5 45.5 24 45.5z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.5l6.2 5.2c3.6-3.3 5.9-8.3 5.9-13.7 0-1.4-.1-2.7-.4-4z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
