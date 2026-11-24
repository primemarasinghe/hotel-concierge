'use client';
import { signIn } from 'next-auth/react';

export default function LoginGate() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#FAF7F2',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        background: 'linear-gradient(to bottom, #2D1F0A, #5C3D1E)',
        padding: '88px 24px 32px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4A843', display: 'block', marginBottom: 6 }}>
          AI Concierge
        </span>
        <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px' }}>
          Chat with Siri
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
          Check availability, get a quote, and book your stay — instantly.
        </p>
      </div>

      {/* Sign-in card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 4px 32px rgba(45,31,10,0.10)',
          padding: '48px 40px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
        }}>
          {/* Lock icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#F5EDD9',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.6rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 10px' }}>
            Sign in to book
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6B7280', lineHeight: 1.6, margin: '0 0 32px' }}>
            Sign in with your Google account to chat with Siri and complete your booking at Leisureville Sigiriya.
          </p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/book' })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '14px 24px',
              border: '1.5px solid #E0D5C5',
              borderRadius: 12,
              background: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#2D1F0A',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B6914'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(139,105,20,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0D5C5'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {/* Google "G" logo */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 20, lineHeight: 1.5 }}>
            Your information is only used to pre-fill your booking details and is not stored or shared.
          </p>
        </div>
      </div>
    </div>
  );
}
