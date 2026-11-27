import AskConciergeButton from '../../components/AskConciergeButton';

export const metadata = { title: 'Getting Here — Leisureville Sigiriya' };

const DISTANCES = [
  {
    from: 'Sigiriya Rock Fortress', time: '5 min', km: '~3 km',
    note: 'A 5-minute drive; visitor parking available on site.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11"/>
      </svg>
    ),
    color: '#d97706',
  },
  {
    from: 'Dambulla Cave Temple', time: '30 min', km: '~17 km',
    note: 'Short drive south on the A9 highway.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
    color: '#d97706',
  },
  {
    from: 'Minneriya National Park', time: '45 min', km: '~26 km',
    note: 'Elephant gathering season July – September.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    color: '#059669',
  },
  {
    from: 'Kandy', time: '2.5 hrs', km: '~95 km',
    note: 'Via the Matale–Dambulla corridor.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3l4 8 5-5 5 15H2L8 3z"/>
      </svg>
    ),
    color: '#7c3aed',
  },
  {
    from: 'Colombo City', time: '4 hrs', km: '~175 km',
    note: 'Via Kurunegala–Dambulla road.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="12.01"/>
      </svg>
    ),
    color: '#2563eb',
  },
  {
    from: 'Colombo Airport (CMB)', time: '4–4.5 hrs', km: '~190 km',
    note: 'Via A1 Expressway to Kurunegala, then north.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2 3.3 6.7l4 3-2 3-3-1-1.5 1.5 3 3 3-1 3 4 1.5-1.5-1-3z"/>
      </svg>
    ),
    color: '#0891b2',
  },
];

const DIRECTIONS = [
  {
    title: 'From Colombo Airport (BIA)',
    steps: [
      'Take the E01 Expressway northbound',
      'Exit at Kurunegala and join the A6',
      'Continue north on the A9 through Dambulla',
      'Turn right at the Sigiriya junction — you\'ll see the Rock',
      'Leisureville Sigiriya is 2 km from the main entrance',
    ],
  },
  {
    title: 'From Kandy',
    steps: [
      'Take the A9 northbound through Matale',
      'Continue through Dambulla town',
      'Turn right at the Sigiriya junction',
      'Follow signs to Sigiriya Rock — we\'re 2 km in',
    ],
  },
];

export default function LocationPage() {
  return (
    <>
      {/* ── Hero ── */}
      <div style={{
        paddingTop: 130, paddingBottom: 70,
        background: 'linear-gradient(160deg, #0F0A04 0%, #2D1F0A 60%, #3D2B1A 100%)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(212,168,67,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <span className="section-label" style={{ color: '#D4A843' }}>Find Us</span>
          <h1 style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            fontWeight: 700, color: '#fff', margin: '10px 0 20px', lineHeight: 1.15,
          }}>
            Getting Here
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: 0 }}>
            Located in the heart of Sri Lanka's Cultural Triangle —
            5 minutes from Sigiriya Rock Fortress and well connected from major cities.
          </p>
        </div>
      </div>

      {/* ── Map + Address ── */}
      <div style={{ position: 'relative', background: '#FAF7F2' }}>
        {/* Embedded Google Map */}
        <div style={{ width: '100%', height: 480, position: 'relative' }}>
          <iframe
            src="https://maps.google.com/maps?q=Leisureville+Sigiriya+Kimbissa+Sri+Lanka&output=embed&z=15"
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Leisureville Sigiriya location"
          />
        </div>

        {/* Address card — floating over map bottom edge */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            background: '#fff',
            border: '1px solid #EDE3D4',
            borderRadius: 20,
            padding: '28px 32px',
            marginTop: -60,
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 8px 40px rgba(45,31,10,0.12)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 28,
          }}>
            {/* Address */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FDF8EF', border: '1px solid #EDE3D4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8B6914' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7A6A', marginBottom: 4 }}>Address</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2D1F0A', lineHeight: 1.5 }}>
                  Inamaluwa – Sigiriya Rd<br />Kimbissa, North Central Province<br />Sri Lanka
                </div>
              </div>
            </div>

            {/* Contact */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FDF8EF', border: '1px solid #EDE3D4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8B6914' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.35 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.4a16 16 0 0 0 5.69 5.69l1-1.01a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7A6A', marginBottom: 4 }}>Caretaker — Susantha</div>
                <a href="tel:+94662286241" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#2D1F0A', textDecoration: 'none', lineHeight: 1.7 }}>066-228 6241</a>
                <a href="tel:+94711410549" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#2D1F0A', textDecoration: 'none', lineHeight: 1.7 }}>071-141 0549</a>
              </div>
            </div>

            {/* Distance highlight */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FDF8EF', border: '1px solid #EDE3D4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8B6914' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7A6A', marginBottom: 4 }}>Distance</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2D1F0A', lineHeight: 1.6 }}>5 min to Sigiriya Rock</div>
                <div style={{ fontSize: '0.82rem', color: '#8A7A6A' }}>~3 km from the main entrance</div>
              </div>
            </div>

            {/* Google Maps link */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FDF8EF', border: '1px solid #EDE3D4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8B6914' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A7A6A', marginBottom: 6 }}>Navigation</div>
                <a
                  href="https://maps.app.goo.gl/RZATy6u2Nme8Qkxi7"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    background: '#FDF8EF', border: '1px solid #EDE3D4',
                    fontSize: '0.82rem', fontWeight: 700, color: '#8B6914',
                    textDecoration: 'none',
                  }}
                >
                  Open in Google Maps
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Distances ── */}
        <div style={{ padding: '80px 24px 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 40 }}>
              <span className="section-label">Distances</span>
              <h2 className="section-title">How far are we?</h2>
              <div className="divider-accent" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
              {DISTANCES.map(({ from, time, km, note, icon, color }) => (
                <div key={from} style={{
                  background: '#fff', border: '1px solid #EDE3D4', borderRadius: 16,
                  padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start',
                  borderLeft: `4px solid ${color}`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `${color}12`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color,
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2D1F0A', marginBottom: 5 }}>{from}</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 5, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color }}>{time}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D4C4A8' }} />
                      <span style={{ fontSize: '0.82rem', color: '#8A7A6A' }}>{km}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#8A7A6A', margin: 0, lineHeight: 1.5 }}>{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Self-drive directions ── */}
        <div style={{ background: '#fff', padding: '80px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: 40 }}>
              <span className="section-label">By Road</span>
              <h2 className="section-title">Self-drive directions</h2>
              <div className="divider-accent" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
              {DIRECTIONS.map(({ title, steps }) => (
                <div key={title} style={{ background: '#FAF7F2', border: '1px solid #EDE3D4', borderRadius: 18, padding: '28px 30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDF8EF', border: '1px solid #EDE3D4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6914', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2D1F0A', margin: 0 }}>{title}</h3>
                  </div>
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {steps.map((s, i) => (
                      <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: '#D4A843', color: '#fff',
                          fontSize: '0.68rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 1,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '0.88rem', color: '#6B5544', lineHeight: 1.6 }}>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ background: 'linear-gradient(135deg, #1A1209 0%, #3D2B1A 100%)', padding: '72px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <span className="section-label" style={{ color: '#D4A843', marginBottom: 12, display: 'block' }}>Need More Help?</span>
            <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.9rem', fontWeight: 700, color: '#fff', margin: '0 0 14px' }}>
              Plan your arrival
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, margin: '0 0 28px' }}>
              Ask our concierge for directions, transfer options, or the best route from your city.
            </p>
            <AskConciergeButton
              message="How do I get to Leisureville Sigiriya from the airport?"
              label="Ask our concierge →"
            />
          </div>
        </div>
      </div>
    </>
  );
}
