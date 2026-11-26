import Link from 'next/link';

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.59 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const MailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const PersonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function Footer() {
  return (
    <footer style={{ background: '#140C04', color: 'rgba(255,255,255,0.7)', paddingTop: 72, paddingBottom: 36 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48, marginBottom: 56 }}>

          {/* Brand */}
          <div>
            <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.4rem', color: '#F5EDD9', marginBottom: 4, letterSpacing: '-0.01em' }}>
              Leisureville
            </div>
            <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#8B6914', marginBottom: 20 }}>
              Sigiriya
            </div>
            <p style={{ fontSize: '0.84rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
              A boutique holiday bungalow in the heart of Sri Lanka's Cultural Triangle, 5 minutes from Sigiriya Rock.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Available to book now</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B6914', marginBottom: 20 }}>
              Explore
            </div>
            {[
              { href: '/rooms',       label: 'Our Rooms' },
              { href: '/experiences', label: 'Experiences' },
              { href: '/location',    label: 'Getting Here' },
              { href: '/my-booking',  label: 'My Booking' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.86rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={undefined}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#8B6914', flexShrink: 0 }} />
                {label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B6914', marginBottom: 20 }}>
              Contact
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)', alignItems: 'flex-start' }}>
                <PersonIcon />
                <span>Susantha (Caretaker)</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)', alignItems: 'flex-start' }}>
                <PhoneIcon />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <a href="tel:+94662286241" style={{ color: 'inherit', textDecoration: 'none' }}>+94 66 228 6241</a>
                  <a href="tel:+94711410549" style={{ color: 'inherit', textDecoration: 'none' }}>+94 71 141 0549</a>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)', alignItems: 'flex-start' }}>
                <MailIcon />
                <a href="mailto:leisureville@sltmobitel.lk" style={{ color: 'inherit', textDecoration: 'none', wordBreak: 'break-all' }}>leisureville@sltmobitel.lk</a>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: '0.84rem', color: 'rgba(255,255,255,0.55)', alignItems: 'flex-start' }}>
                <PinIcon />
                <span style={{ lineHeight: 1.55 }}>Inamaluwa - Sigiriya Rd,<br />Kimbissa, Sri Lanka</span>
              </div>
            </div>
          </div>

          {/* Quick info */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B6914', marginBottom: 20 }}>
              Property Info
            </div>
            {[
              { label: 'Check-in', value: 'From 2:00 PM' },
              { label: 'Check-out', value: 'By 11:00 AM' },
              { label: 'Rate', value: 'LKR 6,900 / night' },
              { label: 'Rooms', value: '3 (all A/C)' },
              { label: 'Capacity', value: 'Up to 4 per room' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{label}</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 28, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          <span>© {new Date().getFullYear()} Leisureville Sigiriya. All rights reserved.</span>
          <span>Powered by Hotel Concierge AI</span>
        </div>
      </div>
    </footer>
  );
}
