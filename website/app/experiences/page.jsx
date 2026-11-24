import Link from 'next/link';
import { fetchExperiences } from '../../lib/api';

export const metadata = { title: 'Experiences — Leisureville Sigiriya' };

async function getExperiences() {
  try { return await fetchExperiences(); } catch { return []; }
}

const CAT_META = {
  culture:   { label: 'Culture',   bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A', icon: '🏛️' },
  wildlife:  { label: 'Wildlife',  bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', icon: '🐘' },
  adventure: { label: 'Adventure', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', icon: '🚵' },
  wellness:  { label: 'Wellness',  bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE', icon: '🌿' },
};

function getCatMeta(cat) {
  return CAT_META[cat] || { label: cat, bg: '#F5EDD9', text: '#6B4F0F', border: '#E8D9B8', icon: '✨' };
}

function ExperienceCard({ exp }) {
  const c = getCatMeta(exp.category);
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          background: c.bg, color: c.text, border: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span>{c.icon}</span> {c.label}
        </span>
        {exp.family_friendly && (
          <span style={{ fontSize: '0.72rem', color: '#8A7A6A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Family friendly
          </span>
        )}
      </div>

      <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 8px', lineHeight: 1.3, flex: 0 }}>
        {exp.name}
      </h3>

      {/* Duration + Price row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {exp.duration && (
          <span style={{ fontSize: '0.78rem', color: '#8A7A6A', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {exp.duration}
          </span>
        )}
        {exp.price > 0 ? (
          <span style={{ fontWeight: 700, color: '#8B6914', fontSize: '0.9rem' }}>
            LKR {(+exp.price).toLocaleString('en-LK')}
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#8A7A6A' }}>/person</span>
          </span>
        ) : (
          <span style={{ fontSize: '0.8rem', color: '#8A7A6A' }}>Complimentary</span>
        )}
      </div>

      <p style={{ fontSize: '0.84rem', color: '#6B5544', lineHeight: 1.65, margin: '0 0 14px', flex: 1 }}>
        {exp.description}
      </p>

      {(exp.tags || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {exp.tags.map((t, i) => (
            <span key={i} style={{ padding: '2px 8px', background: '#F1F5F9', borderRadius: 20, fontSize: '0.7rem', color: '#475569' }}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <button
        style={{
          padding: '10px 16px', background: 'transparent', border: '1.5px solid #E8DCC8',
          borderRadius: 10, fontSize: '0.82rem', fontWeight: 600, color: '#8B6914',
          cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s, border-color 0.15s',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}
        onClick={() => {}}
      >
        Ask Siri about this →
      </button>
    </div>
  );
}

export default async function ExperiencesPage() {
  const experiences = await getExperiences();

  const categories = [...new Set(experiences.map(e => e.category))].sort();

  return (
    <>
      {/* Hero */}
      <div style={{
        paddingTop: 120, paddingBottom: 60,
        background: 'linear-gradient(to bottom, #1A1209, #3D2B1A)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
          <span className="section-label" style={{ color: '#D4A843' }}>Discover</span>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 700, color: '#FFFFFF', margin: '8px 0 16px' }}>
            Experiences
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>
            Explore Sri Lanka's Cultural Triangle with curated experiences — ancient ruins,
            wildlife safaris, Ayurvedic walks, and village life.
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ background: '#FAF7F2', padding: '60px 24px 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {experiences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#8A7A6A' }}>
              <p>Unable to load experiences right now.</p>
              <Link href="/book" className="btn-primary" style={{ marginTop: 20 }}>Chat with Siri</Link>
            </div>
          ) : categories.length > 0 ? (
            categories.map(cat => {
              const catExps = experiences.filter(e => e.category === cat);
              const cm = getCatMeta(cat);
              return (
                <div key={cat} style={{ marginBottom: 56 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <span style={{ fontSize: '1.4rem' }}>{cm.icon}</span>
                    <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#2D1F0A', margin: 0 }}>
                      {cm.label}
                    </h2>
                    <span style={{
                      padding: '2px 10px', background: cm.bg, color: cm.text,
                      border: `1px solid ${cm.border}`, borderRadius: 20,
                      fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {catExps.length} {catExps.length === 1 ? 'experience' : 'experiences'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    {catExps.map(e => <ExperienceCard key={e.id} exp={e} />)}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {experiences.map(e => <ExperienceCard key={e.id} exp={e} />)}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: '#FFFFFF', padding: '60px 24px', textAlign: 'center', borderTop: '1px solid #E8DCC8' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.6rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 12px' }}>
            Build your itinerary
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#8A7A6A', lineHeight: 1.7, margin: '0 0 24px' }}>
            Chat with Siri to mix and match experiences into the perfect Sri Lanka itinerary.
          </p>
          <Link href="/book" className="btn-primary">Start planning with Siri →</Link>
        </div>
      </div>
    </>
  );
}
