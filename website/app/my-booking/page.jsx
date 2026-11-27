'use client';
import { useSession, signIn } from 'next-auth/react';
import MyBookingList from '../../components/MyBookingList';

export default function MyBookingPage() {
  const { data: session, status } = useSession();

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
            My Bookings
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>
            {status === 'authenticated'
              ? `Signed in as ${session.user?.name ?? session.user?.email}`
              : 'Sign in to view and manage your reservations.'}
          </p>
        </div>
      </div>

      <div style={{ background: '#FAF7F2', padding: '60px 24px 100px' }}>
        {status === 'loading' ? (
          <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #E8DCC8', borderTopColor: '#8B6914', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '0.9rem', color: '#8A7A6A' }}>Loading…</p>
          </div>
        ) : status === 'authenticated' ? (
          <MyBookingList email={session.user?.email} />
        ) : (
          <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 32px rgba(45,31,10,0.10)', padding: '44px 36px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#F5EDD9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 8px' }}>Sign in to continue</h2>
              <p style={{ fontSize: '0.88rem', color: '#6B7280', lineHeight: 1.6, margin: '0 0 28px' }}>
                Sign in with your Google account to view your reservations at Leisureville Sigiriya.
              </p>
              <button
                onClick={() => signIn('google')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 20px', border: '1.5px solid #E0D5C5', borderRadius: 12, background: '#fff', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 600, color: '#2D1F0A' }}
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
        )}
      </div>
    </>
  );
}
