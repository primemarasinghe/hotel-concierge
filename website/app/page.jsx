import Link from 'next/link';
import { fetchRooms, fetchExperiences } from '../lib/api';

export const dynamic = 'force-dynamic';

async function getData() {
  try {
    const [rooms, experiences] = await Promise.all([fetchRooms(), fetchExperiences()]);
    return { rooms, experiences };
  } catch {
    return { rooms: [], experiences: [] };
  }
}

const AMENITY_ICONS = {
  'Air conditioning': '❄️', 'WiFi': '📶', 'Hot water': '🚿', 'Mini fridge': '🧊',
  'Safe': '🔒', 'TV': '📺', 'Balcony': '🌿', 'Pool access': '🏊',
};

function AmenityTag({ label }) {
  const icon = AMENITY_ICONS[label] || '✓';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', background: '#F5EDD9', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 500, color: '#6B4F0F',
    }}>
      {icon} {label}
    </span>
  );
}

function RoomCardPreview({ room }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Image placeholder */}
      <div style={{
        height: 200, background: 'linear-gradient(135deg, #E8D5A8 0%, #C9A84C 50%, #8B6914 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }} />
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>

      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#2D1F0A' }}>
            {room.name}
          </h3>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#8B6914' }}>
              LKR {(+room.base_rate).toLocaleString('en-LK')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8A7A6A' }}>/night</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#8A7A6A', marginBottom: 12 }}>
          {room.beds && <span>🛏 {room.beds}</span>}
          {room.size_sqm && <span>📐 {room.size_sqm} m²</span>}
          <span>👥 {room.max_adults} adult{room.max_adults > 1 ? 's' : ''}</span>
        </div>

        {room.description && (
          <p style={{ fontSize: '0.84rem', color: '#6B5544', lineHeight: 1.6, margin: '0 0 14px', flex: 1 }}>
            {room.description.length > 110 ? room.description.slice(0, 110) + '…' : room.description}
          </p>
        )}

        {(room.amenities || []).slice(0, 3).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {room.amenities.slice(0, 3).map((a, i) => <AmenityTag key={i} label={a} />)}
          </div>
        )}

        <Link href="/book" className="btn-outline-dark" style={{ marginTop: 'auto', justifyContent: 'center', fontSize: '0.85rem', padding: '10px 18px' }}>
          Book this room
        </Link>
      </div>
    </div>
  );
}

function ExperienceCardPreview({ exp }) {
  const categoryColors = {
    culture:   { bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A' },
    wildlife:  { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    adventure: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
    wellness:  { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' },
  };
  const c = categoryColors[exp.category] || { bg: '#F5EDD9', text: '#6B4F0F', border: '#E8D9B8' };

  return (
    <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          background: c.bg, color: c.text, border: `1px solid ${c.border}`,
        }}>
          {exp.category}
        </span>
        {exp.price > 0 && (
          <span style={{ fontWeight: 700, color: '#8B6914', fontSize: '0.9rem' }}>
            LKR {(+exp.price).toLocaleString('en-LK')}
          </span>
        )}
      </div>

      <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#2D1F0A', lineHeight: 1.3 }}>
        {exp.name}
      </h3>

      {exp.duration && (
        <div style={{ fontSize: '0.78rem', color: '#8A7A6A', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {exp.duration}
        </div>
      )}

      <p style={{ fontSize: '0.83rem', color: '#6B5544', lineHeight: 1.6, margin: 0, flex: 1 }}>
        {exp.description.length > 100 ? exp.description.slice(0, 100) + '…' : exp.description}
      </p>
    </div>
  );
}

export default async function HomePage() {
  const { rooms, experiences } = await getData();
  const previewRooms = rooms.slice(0, 3);
  const previewExps  = experiences.slice(0, 4);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #2D1F0A 0%, #5C3D1E 40%, #8B6914 100%)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(245,237,217,0.06) 0%, transparent 40%)`,
        }} />
        {/* Rock silhouette shape */}
        <div style={{
          position: 'absolute', right: '-5%', bottom: 0,
          width: '50%', height: '90%',
          background: 'linear-gradient(to top left, rgba(139,105,20,0.25) 0%, transparent 70%)',
          borderRadius: '60% 0 0 0',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 24px 80px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 640 }}>
            <span className="section-label" style={{ color: '#D4A843' }}>Sigiriya, Sri Lanka</span>
            <h1 style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 0 20px',
            }}>
              Where the Rock<br />
              <em style={{ color: '#D4A843', fontStyle: 'italic' }}>Meets the Sky</em>
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 36px', maxWidth: 520 }}>
              A boutique bungalow in Kimbissa, just 5 minutes from Sri Lanka's iconic
              Sigiriya Rock Fortress. Warm hospitality, home-cooked meals, and three
              spacious rooms in the heart of the Cultural Triangle.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/book" className="btn-primary" style={{ fontSize: '1rem', padding: '15px 30px' }}>
                Book a Stay
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link href="/rooms" className="btn-outline" style={{ fontSize: '1rem', padding: '14px 30px' }}>
                Explore Rooms
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 32, marginTop: 52, flexWrap: 'wrap' }}>
              {[
                { num: '3', label: 'Private Rooms' },
                { num: '8+', label: 'Experiences' },
                { num: '5★', label: 'Rated Stay' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', fontWeight: 800, color: '#D4A843', lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)' }} />
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────── */}
      <section style={{ background: '#FFFFFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 60, alignItems: 'center' }}>
          <div>
            <span className="section-label">Our Story</span>
            <h2 className="section-title" style={{ marginBottom: 8 }}>A sanctuary<br />in the jungle</h2>
            <div className="divider-accent" />
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#6B5544', margin: '0 0 20px' }}>
              Located on the Inamaluwa–Sigiriya road in Kimbissa, just a 5-minute drive
              from the iconic Sigiriya Rock Fortress, this boutique bungalow offers
              genuine Sri Lankan hospitality in a quiet village setting.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#6B5544', margin: '0 0 28px' }}>
              Three spacious rooms, each with a private attached bathroom, looked after
              by a friendly in-house caretaker who can prepare home-cooked Sri Lankan
              meals. Small shops for essentials are just minutes away.
            </p>
            <Link href="/experiences" className="btn-outline-dark">
              Explore Experiences
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { icon: '🗿', title: '5 min to Sigiriya', desc: 'Sigiriya Rock Fortress just a short drive away' },
              { icon: '🌾', title: 'Village setting', desc: 'Quiet Kimbissa village surrounded by paddy fields' },
              { icon: '🍛', title: 'Home-cooked meals', desc: 'Friendly caretaker prepares tasty Sri Lankan food' },
              { icon: '🛁', title: 'Attached bathrooms', desc: 'All 3 rooms have private en-suite bathrooms' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                padding: '20px', background: '#FAF7F2', borderRadius: 14,
                border: '1px solid #E8DCC8', display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <span style={{ fontSize: '1.6rem' }}>{icon}</span>
                <strong style={{ fontSize: '0.9rem', color: '#2D1F0A' }}>{title}</strong>
                <p style={{ fontSize: '0.8rem', color: '#8A7A6A', margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rooms ───────────────────────────────────────────── */}
      {previewRooms.length > 0 && (
        <section style={{ background: '#FAF7F2', padding: '100px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <span className="section-label">Accommodation</span>
              <h2 className="section-title">Your private retreat</h2>
              <div className="divider-accent" style={{ margin: '16px auto 0' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24 }}>
              {previewRooms.map(r => <RoomCardPreview key={r.id} room={r} />)}
            </div>
            <div style={{ textAlign: 'center', marginTop: 36 }}>
              <Link href="/rooms" className="btn-outline-dark">View all rooms</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Experiences ─────────────────────────────────────── */}
      {previewExps.length > 0 && (
        <section style={{ background: '#FFFFFF', padding: '100px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 20 }}>
              <div>
                <span className="section-label">Experiences</span>
                <h2 className="section-title">Discover the Cultural Triangle</h2>
                <div className="divider-accent" />
              </div>
              <Link href="/experiences" className="btn-outline-dark" style={{ flexShrink: 0 }}>
                All experiences →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {previewExps.map(e => <ExperienceCardPreview key={e.id} exp={e} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #2D1F0A 0%, #8B6914 100%)',
        padding: '100px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <span className="section-label" style={{ color: '#D4A843' }}>Ready to visit?</span>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700, color: '#FFFFFF', margin: '8px 0 16px' }}>
            Start planning your<br />perfect escape
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 36px' }}>
            Chat with our AI concierge Siri to check availability, get a custom quote,
            and book your stay in minutes.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/book" className="btn-primary" style={{ fontSize: '1rem', padding: '15px 32px', background: '#D4A843', color: '#2D1F0A' }}>
              Chat with Siri
            </Link>
            <Link href="/location" className="btn-outline" style={{ fontSize: '1rem', padding: '14px 32px' }}>
              How to get here
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
