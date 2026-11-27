import Image from 'next/image';
import Link from 'next/link';
import { fetchRooms, fetchExperiences } from '../lib/api';
import AskConciergeButton from '../components/AskConciergeButton';
import ExperienceSlider from '../components/ExperienceSlider';

export const dynamic = 'force-dynamic';

async function getData() {
  try {
    const [rooms, experiences] = await Promise.all([fetchRooms(), fetchExperiences()]);
    return { rooms, experiences };
  } catch {
    return { rooms: [], experiences: [] };
  }
}

function RoomCard({ room }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 220,
        background: 'linear-gradient(135deg, #3D2B1A 0%, #8B6914 60%, #C9A84C 100%)',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 16, left: 16, padding: '4px 12px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {room.code}
        </div>
        <svg style={{ position: 'absolute', bottom: 20, right: 20, opacity: 0.2 }} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>

      <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#2D1F0A' }}>
            {room.name}
          </h3>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#8B6914' }}>
              LKR {(+room.base_rate).toLocaleString('en-LK')}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#8A7A6A' }}>per night</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#8A7A6A', marginBottom: 14, flexWrap: 'wrap' }}>
          {room.beds && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16M22 4v16M2 8h20M2 16h20"/></svg>
              {room.beds}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            Up to {room.max_adults} guests
          </span>
        </div>

        {room.description && (
          <p style={{ fontSize: '0.84rem', color: '#6B5544', lineHeight: 1.65, margin: '0 0 18px', flex: 1 }}>
            {room.description.length > 110 ? room.description.slice(0, 110) + '…' : room.description}
          </p>
        )}

        <Link href="/rooms" className="btn-outline-dark" style={{ marginTop: 'auto', justifyContent: 'center', fontSize: '0.85rem', padding: '10px 18px' }}>
          View room
        </Link>
      </div>
    </div>
  );
}

const CAT_STYLES = {
  culture:   { grad: 'linear-gradient(135deg,#92400e,#d97706)', badge: '#FEF9C3', badgeText: '#854D0E', badgeBorder: '#FDE68A',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="20" width="20" height="2"/><rect x="4" y="14" width="2" height="6"/><rect x="18" y="14" width="2" height="6"/><rect x="11" y="14" width="2" height="6"/><polygon points="12 2 2 12 22 12"/></svg> },
  wildlife:  { grad: 'linear-gradient(135deg,#064e3b,#059669)', badge: '#D1FAE5', badgeText: '#065F46', badgeBorder: '#A7F3D0',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.07a1 1 0 0 0 1.42 1.4C7 19 7.5 18 9 18c2 0 3 1 5 1s3-1 4.5-1c1.5 0 2.5 1 3 1.5a1 1 0 0 0 1.5-1.3C20 15 19 10 17 8z"/><path d="M9.5 7.5A6.5 6.5 0 0 1 16 1c0 3.6-2.9 6.5-6.5 6.5z"/></svg> },
  adventure: { grad: 'linear-gradient(135deg,#7f1d1d,#dc2626)', badge: '#FEE2E2', badgeText: '#991B1B', badgeBorder: '#FCA5A5',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 17 9 3 15 13 19 7 21 17"/></svg> },
  wellness:  { grad: 'linear-gradient(135deg,#3730a3,#7c3aed)', badge: '#EDE9FE', badgeText: '#5B21B6', badgeBorder: '#DDD6FE',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
};
const CAT_DEFAULT = { grad: 'linear-gradient(135deg,#2D1F0A,#8B6914)', badge: '#F5EDD9', badgeText: '#6B4F0F', badgeBorder: '#E8D9B8',
  icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> };

function ExperienceCard({ exp }) {
  const c = CAT_STYLES[exp.category] || CAT_DEFAULT;
  return (
    <div className="exp-card">
      {/* Coloured header */}
      <div className="exp-header" style={{ background: c.grad }}>
        {/* Subtle pattern overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        <div className="exp-header-icon">{c.icon}</div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', position: 'relative' }}>
          {exp.category}
        </span>
        {exp.price > 0 && (
          <span style={{ position: 'absolute', top: 14, right: 14, fontSize: '0.78rem', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '3px 10px', borderRadius: 20 }}>
            LKR {(+exp.price).toLocaleString('en-LK')}
          </span>
        )}
        {exp.family_friendly && (
          <span style={{ position: 'absolute', top: 14, left: 14, fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 20 }}>
            Family friendly
          </span>
        )}
      </div>

      {/* Body */}
      <div className="exp-body">
        <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#2D1F0A', lineHeight: 1.35 }}>
          {exp.name}
        </h3>
        {exp.duration && (
          <div style={{ fontSize: '0.76rem', color: '#8A7A6A', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {exp.duration}
          </div>
        )}
        <p style={{ fontSize: '0.82rem', color: '#6B5544', lineHeight: 1.65, margin: '4px 0 0' }}>
          {exp.description.length > 110 ? exp.description.slice(0, 110) + '…' : exp.description}
        </p>
      </div>

      {/* Hover reveal link */}
      <Link href="/experiences" className="exp-link">
        Explore experience
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const { rooms, experiences } = await getData();
  const previewRooms = rooms.slice(0, 3);
  const hasHeroImage = true; // set false if image not yet added

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Background */}
        {hasHeroImage ? (
          <Image
            src="/images/sigiriya-hero.png"
            alt="Sigiriya Rock Fortress at sunrise"
            fill
            priority
            style={{ objectFit: 'cover', objectPosition: '35% center' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #2D1F0A 0%, #5C3D1E 40%, #8B6914 100%)' }} />
        )}

        {/* Gradient overlay — dark left, transparent right */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(20,12,4,0.88) 0%, rgba(20,12,4,0.65) 45%, rgba(20,12,4,0.25) 100%)',
        }} />
        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to top, rgba(20,12,4,0.6), transparent)' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '130px 24px 100px', position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{ maxWidth: 620 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4A843', marginBottom: 20 }}>
              <span style={{ width: 28, height: 1, background: '#D4A843', display: 'inline-block' }} />
              Sigiriya, Sri Lanka
            </span>

            <h1 style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(2.8rem, 6vw, 4.8rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              margin: '0 0 24px',
            }}>
              Where the Rock<br />
              <em style={{ color: '#D4A843', fontStyle: 'italic' }}>Meets the Sky</em>
            </h1>

            <p style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, margin: '0 0 36px', maxWidth: 500 }}>
              A boutique holiday bungalow in Kimbissa — 5 minutes from Sri Lanka's
              iconic Sigiriya Rock Fortress. Three rooms, attached bathrooms, and
              genuine village hospitality.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 56 }}>
              <AskConciergeButton message="I'd like to book a room at Leisureville Sigiriya" label="Book a Stay →" />
              <Link href="/rooms" className="btn-outline" style={{ fontSize: '0.95rem', padding: '14px 28px' }}>
                View Rooms
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap' }}>
              {[
                { num: '3', label: 'Private Rooms' },
                { num: 'LKR 6,900', label: 'Per night from' },
                { num: '5 min', label: 'To Sigiriya Rock' },
              ].map(({ num, label }) => (
                <div key={label} style={{ borderLeft: '2px solid rgba(212,168,67,0.4)', paddingLeft: 16 }}>
                  <div style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.6rem', fontWeight: 800, color: '#D4A843', lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Scroll</span>
          <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)' }} />
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────── */}
      <section style={{ background: '#FFFFFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 72, alignItems: 'center' }}>
          <div>
            <span className="section-label">Our Story</span>
            <h2 className="section-title" style={{ marginBottom: 8 }}>A sanctuary<br />in the jungle</h2>
            <div className="divider-accent" />
            <p style={{ fontSize: '1rem', lineHeight: 1.85, color: '#6B5544', margin: '0 0 20px' }}>
              Located on the Inamaluwa–Sigiriya road in Kimbissa, just a 5-minute drive
              from the iconic Sigiriya Rock Fortress, this boutique bungalow offers
              genuine Sri Lankan hospitality in a quiet village setting.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.85, color: '#6B5544', margin: '0 0 32px' }}>
              Three spacious rooms, each with a private attached bathroom, looked after
              by a friendly in-house caretaker who can arrange home-cooked Sri Lankan
              meals. Small shops and essentials are just minutes away.
            </p>
            <Link href="/experiences" className="btn-outline-dark">
              Explore Experiences →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              {
                title: '5 min to Sigiriya',
                desc: 'Rock Fortress — a UNESCO World Heritage Site just a short drive away',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                ),
              },
              {
                title: 'Village setting',
                desc: 'Quiet Kimbissa village surrounded by paddy fields and jungle',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                ),
              },
              {
                title: 'Home-cooked meals',
                desc: 'Friendly caretaker can prepare tasty authentic Sri Lankan food',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
                  </svg>
                ),
              },
              {
                title: 'Attached bathrooms',
                desc: 'All 3 rooms have private en-suite bathrooms with hot water',
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/>
                  </svg>
                ),
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ padding: '22px', background: '#FAF7F2', borderRadius: 16, border: '1px solid #E8DCC8', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F5EDD9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </div>
                <strong style={{ fontSize: '0.9rem', color: '#2D1F0A', fontWeight: 700 }}>{title}</strong>
                <p style={{ fontSize: '0.8rem', color: '#8A7A6A', margin: 0, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rooms ─────────────────────────────────────────────── */}
      {previewRooms.length > 0 && (
        <section style={{ background: '#FAF7F2', padding: '100px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <span className="section-label">Accommodation</span>
              <h2 className="section-title">Your private retreat</h2>
              <div className="divider-accent" style={{ margin: '16px auto 0' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24 }}>
              {previewRooms.map(r => <RoomCard key={r.id} room={r} />)}
            </div>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link href="/rooms" className="btn-outline-dark">View all rooms →</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Experiences ───────────────────────────────────────── */}
      {experiences.length > 0 && (
        <section style={{ background: '#0F0A04' }}>
          {/* Section header */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <span className="section-label" style={{ color: '#D4A843' }}>Around the Villa</span>
              <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 700, color: '#fff', margin: '8px 0 0', lineHeight: 1.2 }}>
                Explore What's Nearby
              </h2>
            </div>
            <Link href="/experiences" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.86rem', fontWeight: 600, color: '#D4A843', textDecoration: 'none', flexShrink: 0, padding: '10px 0' }}>
              View all experiences
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {/* Full-width slider */}
          <ExperienceSlider experiences={experiences} />

          <div style={{ height: 72, background: '#0F0A04' }} />
        </section>
      )}

      {/* ── Everything you need ───────────────────────────────── */}
      <section style={{ background: '#FAF7F2', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <span className="section-label">Why Leisureville</span>
            <h2 className="section-title">Everything you need</h2>
            <div className="divider-accent" style={{ margin: '16px auto 24px' }} />
            <p style={{ fontSize: '1rem', color: '#8A7A6A', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              A complete holiday bungalow experience — comfort, convenience,
              and culture all in one place.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              {
                title: 'Air Conditioned Rooms',
                desc: 'All 3 bedrooms have air conditioning to keep you cool in Sri Lanka\'s tropical heat. Sleep comfortably all year round.',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v20M16 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07"/>
                  </svg>
                ),
              },
              {
                title: '2 Double Beds Per Room',
                desc: 'Each room has two double beds, comfortably sleeping up to 4 guests — ideal for families, couples, or groups.',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 4v16M22 4v16M2 8h20M2 16h20"/><rect x="5" y="8" width="6" height="8" rx="1"/><rect x="13" y="8" width="6" height="8" rx="1"/>
                  </svg>
                ),
              },
              {
                title: 'Private Attached Bathrooms',
                desc: 'Every room has its own en-suite bathroom with hot water — no sharing, full privacy for each group.',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/>
                  </svg>
                ),
              },
              {
                title: '5 Minutes to Sigiriya Rock',
                desc: 'The iconic UNESCO World Heritage Sigiriya Rock Fortress is just a 5-minute drive from the bungalow.',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                ),
              },
              {
                title: 'On-site Caretaker',
                desc: 'Susantha, our resident caretaker, is always on hand for meals, local tips, transport arrangements, and anything you need.',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                ),
              },
              {
                title: 'Up to 12 Guests Total',
                desc: 'Book one room or the whole bungalow. With 3 rooms at 4 guests each, Leisureville fits families and groups of up to 12.',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                display: 'flex', gap: 20, padding: '28px 24px',
                background: '#fff', borderRadius: 16, border: '1px solid #E8DCC8',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={undefined}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F5EDD9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#2D1F0A', fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{title}</strong>
                  <p style={{ fontSize: '0.82rem', color: '#8A7A6A', margin: 0, lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #2D1F0A 0%, #6B4F0F 50%, #8B6914 100%)', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4A843', marginBottom: 20 }}>
            <span style={{ width: 20, height: 1, background: '#D4A843', display: 'inline-block' }} />
            Ready to visit?
            <span style={{ width: 20, height: 1, background: '#D4A843', display: 'inline-block' }} />
          </span>
          <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', lineHeight: 1.2 }}>
            Start planning your<br />perfect escape
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, margin: '0 0 36px' }}>
            Chat with our AI concierge to check availability, get a custom quote,
            and book your stay in minutes.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <AskConciergeButton message="I'd like to book a room at Leisureville Sigiriya" label="Book a Stay →" />
            <Link href="/location" className="btn-outline" style={{ fontSize: '0.95rem', padding: '14px 28px' }}>
              How to get here
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
