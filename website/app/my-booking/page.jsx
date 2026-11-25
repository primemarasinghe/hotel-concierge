import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import MyBookingSignIn from '../../components/MyBookingSignIn';
import MyBookingList from '../../components/MyBookingList';

export const metadata = { title: 'My Bookings — Leisureville Sigiriya' };

export default async function MyBookingPage() {
  const session = await getServerSession(authOptions);

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
            {session
              ? `Signed in as ${session.user?.name ?? session.user?.email}`
              : 'Sign in to view and manage your reservations.'}
          </p>
        </div>
      </div>

      <div style={{ background: '#FAF7F2', padding: '60px 24px 100px' }}>
        {!session ? (
          <MyBookingSignIn />
        ) : (
          <MyBookingList email={session.user?.email} />
        )}
      </div>
    </>
  );
}

