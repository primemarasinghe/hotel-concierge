import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../../lib/auth';
import LoginGate from '../../components/LoginGate';
import BookPageClient from '../../components/BookPageClient';

export const metadata = { title: 'Book a Stay — Leisureville Sigiriya' };

export default async function BookPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LoginGate />;
  }

  if (session.user?.isAdmin) {
    redirect('/admin');
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF7F2', display: 'flex', flexDirection: 'column' }}>
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

      <BookPageClient />
    </div>
  );
}
