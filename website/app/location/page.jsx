import Link from 'next/link';

export const metadata = { title: 'Getting Here — Leisureville Sigiriya' };

const DISTANCES = [
  { from: 'Colombo Airport (CMB)', time: '4–4.5 hrs', km: '~190 km', icon: '✈️', note: 'Via A1 Expressway to Kurunegala, then north' },
  { from: 'Colombo City',          time: '4 hrs',     km: '~175 km', icon: '🏙️', note: 'Via Kurunegala–Dambulla road' },
  { from: 'Kandy',                 time: '2.5 hrs',   km: '~95 km',  icon: '🏔️', note: 'Via Matale–Dambulla corridor' },
  { from: 'Sigiriya Rock Fortress',time: '5 min',     km: '~3 km',   icon: '🗿', note: '5-minute drive; local visitor parking on site' },
  { from: 'Dambulla Cave Temple',  time: '30 min',    km: '~17 km',  icon: '⛩️', note: 'Short drive south on the A9' },
  { from: 'Minneriya National Park', time: '45 min',  km: '~26 km',  icon: '🐘', note: 'Elephant gathering season Jul–Sep' },
];

const TRANSFER_OPTIONS = [
  {
    from: 'Colombo Airport',
    options: [
      { type: 'Private Sedan', price: 'LKR 25,000', seats: '1–3 pax', desc: 'Air-conditioned sedan, door to door' },
      { type: 'Private Van',   price: 'LKR 35,000', seats: '1–7 pax', desc: 'Spacious van, ideal for families' },
    ],
  },
  {
    from: 'Kandy',
    options: [
      { type: 'Private Sedan', price: 'LKR 8,000', seats: '1–3 pax', desc: 'Scenic drive through the hill country' },
    ],
  },
];

export default function LocationPage() {
  return (
    <>
      {/* Hero */}
      <div style={{
        paddingTop: 120, paddingBottom: 60,
        background: 'linear-gradient(to bottom, #1A3A2A, #2D5240)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
          <span className="section-label" style={{ color: '#86EFAC' }}>Find us</span>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 700, color: '#FFFFFF', margin: '8px 0 16px' }}>
            Getting Here
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>
            Located in the heart of Sri Lanka's Cultural Triangle,
            Leisureville Sigiriya is well connected from major cities and the airport.
          </p>
        </div>
      </div>

      <div style={{ background: '#FAF7F2' }}>
        {/* Map placeholder */}
        <div style={{
          height: 320,
          background: 'linear-gradient(135deg, #2D5240 0%, #1A3A2A 50%, #0F2419 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(134,239,172,0.08) 0%, transparent 60%)`,
          }} />
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 56, height: 56, background: '#8B6914', borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ transform: 'rotate(45deg)', color: '#FFFFFF', fontSize: '1.4rem' }}>📍</div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', margin: 0 }}>Inamaluwa - Sigiriya Rd, Kimbissa</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '4px 0 0' }}>North Central Province, Sri Lanka</p>
            <a
              href="https://maps.app.goo.gl/RZATy6u2Nme8Qkxi7"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', marginTop: 16, padding: '8px 18px',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, color: '#FFFFFF', fontSize: '0.82rem',
                textDecoration: 'none', backdropFilter: 'blur(8px)', gap: 6, alignItems: 'center',
              }}
            >
              Open in Google Maps ↗
            </a>
          </div>
        </div>

        {/* Distance table */}
        <div style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 48 }}>
              <span className="section-label">Distances</span>
              <h2 className="section-title">How far are we?</h2>
              <div className="divider-accent" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {DISTANCES.map(({ from, time, km, icon, note }) => (
                <div key={from} style={{
                  background: '#FFFFFF', border: '1px solid #E8DCC8', borderRadius: 16,
                  padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontSize: '1.6rem', flexShrink: 0, width: 44, height: 44,
                    background: '#F5EDD9', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2D1F0A', marginBottom: 4 }}>{from}</div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8B6914' }}>{time}</span>
                      <span style={{ fontSize: '0.82rem', color: '#8A7A6A' }}>{km}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#8A7A6A', margin: 0, lineHeight: 1.5 }}>{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Airport transfers */}
        <div style={{ background: '#FFFFFF', padding: '80px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ marginBottom: 48 }}>
              <span className="section-label">Transfers</span>
              <h2 className="section-title">Airport & city transfers</h2>
              <div className="divider-accent" />
              <p style={{ fontSize: '0.95rem', color: '#6B5544', lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
                We arrange private transfers to and from major transport hubs.
                Book through our AI concierge Siri when you book your room.
              </p>
            </div>

            {TRANSFER_OPTIONS.map(({ from, options }) => (
              <div key={from} style={{ marginBottom: 36 }}>
                <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 16px' }}>
                  From {from}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {options.map((o, i) => (
                    <div key={i} style={{
                      background: '#FAF7F2', border: '1px solid #E8DCC8', borderRadius: 14,
                      padding: '20px 22px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong style={{ fontSize: '0.9rem', color: '#2D1F0A' }}>{o.type}</strong>
                        <span style={{ fontWeight: 800, color: '#8B6914', fontSize: '0.9rem' }}>{o.price}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#8A7A6A', marginBottom: 6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {o.seats}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#6B5544', margin: 0, lineHeight: 1.5 }}>{o.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Self-drive directions */}
        <div style={{ background: '#FAF7F2', padding: '80px 24px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <span className="section-label">By road</span>
            <h2 className="section-title" style={{ marginBottom: 8 }}>Self-drive directions</h2>
            <div className="divider-accent" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                {
                  title: 'From Colombo Airport (BIA)',
                  steps: [
                    'Take the E01 Expressway northbound',
                    'Exit at Kurunegala and take the A6',
                    'Continue north on the A9 through Dambulla',
                    'Turn right at the Sigiriya junction — you\'ll see the Rock',
                    'Leisureville Sigiriya is 2 km from the main Sigiriya entrance',
                  ],
                },
                {
                  title: 'From Kandy',
                  steps: [
                    'Take the A9 northbound through Matale',
                    'Continue through Dambulla',
                    'Turn right at the Sigiriya junction',
                    'Follow signs to Sigiriya Rock — we\'re 2 km in',
                  ],
                },
              ].map(({ title, steps }) => (
                <div key={title} style={{ background: '#FFFFFF', border: '1px solid #E8DCC8', borderRadius: 16, padding: '24px 28px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2D1F0A', margin: '0 0 14px' }}>{title}</h3>
                  <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {steps.map((s, i) => (
                      <li key={i} style={{ fontSize: '0.88rem', color: '#6B5544', lineHeight: 1.6 }}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: '#2D1F0A', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.6rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 12px' }}>
              Arrange your transfer
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 24px' }}>
              Book a room and ask Siri to arrange your airport or city transfer at the same time.
            </p>
            <Link href="/book" className="btn-primary" style={{ background: '#D4A843', color: '#2D1F0A' }}>
              Chat with Siri →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
