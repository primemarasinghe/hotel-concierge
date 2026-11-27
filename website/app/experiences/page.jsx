import Image from 'next/image';
import { fetchExperiences } from '../../lib/api';
import AskConciergeButton from '../../components/AskConciergeButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Explore Nearby — Leisureville Sigiriya' };

async function getExperiences() {
  try { return await fetchExperiences(); } catch { return []; }
}

function toSlug(name) {
  return name.toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const CAT_META = {
  culture: {
    label: 'Culture & Heritage', accent: '#d97706',
    bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.25)',
    overlay: 'rgba(120,53,15,0.55)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11"/>
      </svg>
    ),
  },
  wildlife: {
    label: 'Wildlife & Nature', accent: '#059669',
    bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.25)',
    overlay: 'rgba(6,78,59,0.55)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  adventure: {
    label: 'Adventure', accent: '#dc2626',
    bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)',
    overlay: 'rgba(127,29,29,0.55)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l4-8 4 4 4-6 4 10"/><path d="M3 21h18"/>
      </svg>
    ),
  },
  wellness: {
    label: 'Wellness', accent: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)',
    overlay: 'rgba(55,48,163,0.55)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12M12 12C12 7 7 3 2 3c0 5 4 9 10 9zM12 12c0-5 5-9 10-9-1 5-5 9-10 9z"/>
      </svg>
    ),
  },
};

function getCatMeta(cat) {
  return CAT_META[cat] || {
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    accent: '#D4A843', bg: 'rgba(212,168,67,0.1)', border: 'rgba(212,168,67,0.25)',
    overlay: 'rgba(45,31,10,0.55)',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
  };
}

function ExperienceCard({ exp }) {
  const c = getCatMeta(exp.category);
  const slug = toSlug(exp.name);

  return (
    <div className="exp-img-card" style={{
      background: '#fff', borderRadius: 18,
      border: '1px solid #EDE3D4',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(45,31,10,0.06)',
    }}>
      {/* Image */}
      <div style={{ position: 'relative', height: 220, overflow: 'hidden', flexShrink: 0 }}>
        <Image
          src={`/images/experiences/${slug}.png`}
          alt={exp.name}
          fill
          className="exp-img-card-photo"
          style={{ objectFit: 'cover', objectPosition: 'center', transition: 'transform 0.5s ease' }}
        />
        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Category badge on image */}
        <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            border: `1px solid ${c.accent}60`,
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: c.accent,
          }}>
            {c.icon} {c.label}
          </span>
        </div>
        {/* Family friendly badge */}
        {exp.family_friendly && (
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 20,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Family
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '1.1rem', fontWeight: 700, color: '#2D1F0A',
          margin: '0 0 10px', lineHeight: 1.3,
        }}>
          {exp.name}
        </h3>

        {exp.duration && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{ fontSize: '0.78rem', color: '#8A7A6A', fontWeight: 500 }}>{exp.duration}</span>
          </div>
        )}

        <p style={{ fontSize: '0.84rem', color: '#6B5544', lineHeight: 1.65, margin: '0 0 16px', flex: 1 }}>
          {exp.description.length > 120 ? exp.description.slice(0, 120) + '…' : exp.description}
        </p>

        {(exp.tags || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
            {exp.tags.slice(0, 3).map((t, i) => (
              <span key={i} style={{
                padding: '2px 8px', background: c.bg, borderRadius: 20,
                fontSize: '0.68rem', color: c.accent, fontWeight: 600,
                border: `1px solid ${c.border}`,
              }}>
                {t}
              </span>
            ))}
          </div>
        )}

        <AskConciergeButton
          message={`Tell me more about "${exp.name}" near the villa`}
          label="Learn more →"
          className=""
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 10,
            background: c.bg, border: `1px solid ${c.border}`,
            color: c.accent, fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            transition: 'background 0.2s',
            width: 'fit-content',
          }}
        />
      </div>
    </div>
  );
}

export default async function ExperiencesPage() {
  const experiences = await getExperiences();
  const categories = [...new Set(experiences.map(e => e.category))].sort();

  return (
    <>
      {/* ── Hero ── */}
      <div style={{
        paddingTop: 130, paddingBottom: 70,
        background: 'linear-gradient(160deg, #0F0A04 0%, #2D1F0A 60%, #3D2B1A 100%)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 700, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(212,168,67,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <span className="section-label" style={{ color: '#D4A843' }}>Around the Villa</span>
          <h1 style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            fontWeight: 700, color: '#fff', margin: '10px 0 20px', lineHeight: 1.15,
          }}>
            Explore What's Nearby
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 36px' }}>
            Leisureville sits in the heart of Sri Lanka's Cultural Triangle. Within a short drive
            you'll find ancient rock fortresses, wildlife parks, cave temples, and village
            backwaters — all independent to explore at your own pace.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
            {[
              { num: String(experiences.length || 8), label: 'Nearby Attractions' },
              { num: '5 min', label: 'to Sigiriya Rock' },
              { num: 'Free', label: 'Local Guidance' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.6rem', fontWeight: 700, color: '#D4A843' }}>{s.num}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div style={{ background: '#FDF8EF', borderBottom: '1px solid #EDE3D4', padding: '14px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#8B6914', lineHeight: 1.5 }}>
            These are independent nearby attractions — not booked through the hotel. Our caretaker <strong>Susantha</strong> is happy to share local tips, directions, and recommendations.
          </p>
        </div>
      </div>

      {/* ── Cards ── */}
      <div style={{ background: '#FAF7F2', padding: '60px 24px 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {experiences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#8A7A6A' }}>
              <p>Unable to load attractions right now.</p>
              <AskConciergeButton message="What can I explore near Leisureville Sigiriya?" label="Ask our concierge →" />
            </div>
          ) : (
            categories.map(cat => {
              const catExps = experiences.filter(e => e.category === cat);
              const cm = getCatMeta(cat);
              return (
                <div key={cat} style={{ marginBottom: 64 }}>
                  {/* Category header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid #EDE3D4' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: cm.bg, border: `1px solid ${cm.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: cm.accent,
                    }}>
                      <span style={{ transform: 'scale(1.3)' }}>{cm.icon}</span>
                    </div>
                    <div>
                      <h2 style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        fontSize: '1.5rem', fontWeight: 700, color: '#2D1F0A', margin: 0,
                      }}>
                        {cm.label}
                      </h2>
                      <span style={{ fontSize: '0.76rem', color: '#8A7A6A' }}>
                        {catExps.length} {catExps.length === 1 ? 'attraction' : 'attractions'} nearby
                      </span>
                    </div>
                  </div>

                  {/* Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                    {catExps.map(e => <ExperienceCard key={e.id} exp={e} />)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ background: 'linear-gradient(135deg, #1A1209 0%, #3D2B1A 100%)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <span className="section-label" style={{ color: '#D4A843', marginBottom: 12, display: 'block' }}>Need Help Planning?</span>
          <h3 style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '1.9rem', fontWeight: 700, color: '#fff', margin: '0 0 14px',
          }}>
            Ask our concierge
          </h3>
          <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, margin: '0 0 28px' }}>
            Not sure where to start? Ask for the best time to visit, how to get there, or which attractions suit your group best.
          </p>
          <AskConciergeButton
            message="What attractions can I explore near the villa and how do I get there?"
            label="Chat with our concierge →"
          />
        </div>
      </div>
    </>
  );
}
