import Chat from '../../components/Chat';

export const metadata = { title: 'Book a Stay — Leisureville Sigiriya' };

export default function BookPage() {
  return (
    <div style={{ minHeight: '100dvh', background: '#FAF7F2', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        paddingTop: 68,
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

      {/* Chat panel */}
      <div style={{ flex: 1, padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: 720, height: 'calc(100dvh - 240px)', minHeight: 480 }}>
          <Chat />
        </div>
      </div>
    </div>
  );
}
