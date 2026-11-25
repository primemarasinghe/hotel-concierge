import Link from 'next/link';
import { fetchRooms } from '../../lib/api';
import AskConciergeButton from '../../components/AskConciergeButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rooms — Leisureville Sigiriya' };

async function getRooms() {
  try { return await fetchRooms(); } catch { return []; }
}

function AmenityTag({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', background: '#F5EDD9', borderRadius: 20,
      fontSize: '0.78rem', fontWeight: 500, color: '#6B4F0F',
      border: '1px solid #E8D9B8',
    }}>
      {label}
    </span>
  );
}

function RoomCard({ room, index }) {
  const isEven = index % 2 === 0;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 0,
      background: '#FFFFFF',
      border: '1px solid #E8DCC8',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 2px 20px rgba(139,105,20,0.07)',
    }}>
      {/* Image */}
      <div style={{
        minHeight: 280,
        background: `linear-gradient(${isEven ? '135deg' : '225deg'}, ${isEven ? '#E8D5A8 0%, #C9A84C 50%, #8B6914 100%' : '#5C3D1E 0%, #8B6914 50%, #D4A843 100%'})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        {/* Code badge */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          padding: '4px 12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
          color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {room.code}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#2D1F0A' }}>
            {room.name}
          </h2>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#8B6914' }}>
              LKR {(+room.base_rate).toLocaleString('en-LK')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8A7A6A' }}>per night</div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16, fontSize: '0.84rem', color: '#8A7A6A' }}>
          {room.beds && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16M22 4v16M2 8h20M2 16h20"/></svg>
              {room.beds}
            </span>
          )}
          {room.size_sqm && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              {room.size_sqm} m²
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Up to {room.max_adults} adult{room.max_adults > 1 ? 's' : ''}{room.max_children > 0 ? ` + ${room.max_children} child` : ''}
          </span>
        </div>

        {room.description && (
          <p style={{ fontSize: '0.9rem', color: '#6B5544', lineHeight: 1.7, margin: '0 0 20px', flex: 1 }}>
            {room.description}
          </p>
        )}

        {(room.amenities || []).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A7A6A', marginBottom: 10 }}>
              Amenities
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {room.amenities.map((a, i) => <AmenityTag key={i} label={a} />)}
            </div>
          </div>
        )}

        <Link href="/book" className="btn-primary" style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: '0.9rem' }}>
          Book this room →
        </Link>
      </div>
    </div>
  );
}

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <>
      {/* Page hero */}
      <div style={{
        paddingTop: 120, paddingBottom: 60, background: 'linear-gradient(to bottom, #2D1F0A, #5C3D1E)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
          <span className="section-label" style={{ color: '#D4A843' }}>Accommodation</span>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 700, color: '#FFFFFF', margin: '8px 0 16px' }}>
            Our Rooms
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>
            Three private rooms, each designed for comfort in the heart of Sri Lanka's jungle.
          </p>
        </div>
      </div>

      {/* Rooms list */}
      <div style={{ background: '#FAF7F2', padding: '60px 24px 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#8A7A6A' }}>
              <p style={{ fontSize: '1rem' }}>Unable to load rooms right now. Please try again later.</p>
              <Link href="/book" className="btn-primary" style={{ marginTop: 20 }}>Chat with Siri to book</Link>
            </div>
          ) : (
            rooms.map((r, i) => <RoomCard key={r.id} room={r} index={i} />)
          )}
        </div>
      </div>

      {/* Pricing note */}
      <div style={{ background: '#FFFFFF', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: '0.88rem', color: '#8A7A6A', lineHeight: 1.7, margin: '0 0 20px' }}>
            All rates are per room per night, subject to seasonal adjustments. Service charge 10%
            and government taxes 18% are additional. Weekend premium may apply.
          </p>
          <AskConciergeButton
            message="I'd like to get an exact quote for a room"
            label="Get an exact quote →"
          />
        </div>
      </div>
    </>
  );
}
