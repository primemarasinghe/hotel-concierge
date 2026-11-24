import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: '#1A1209', color: 'rgba(255,255,255,0.75)', paddingTop: 60, paddingBottom: 32 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.3rem', color: '#F5EDD9', marginBottom: 6 }}>
              Leisureville
            </div>
            <div style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 500, fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8B6914', marginBottom: 16 }}>
              Sigiriya
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              A boutique villa retreat in the heart of Sri Lanka's Cultural Triangle.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B6914', marginBottom: 16 }}>
              Explore
            </div>
            {[
              { href: '/rooms',       label: 'Our Rooms' },
              { href: '/experiences', label: 'Experiences' },
              { href: '/location',    label: 'Getting Here' },
              { href: '/book',        label: 'Book a Stay' },
              { href: '/my-booking',  label: 'My Booking' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ display: 'block', marginBottom: 10, fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', textDecoration: 'none', transition: 'color 0.15s' }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B6914', marginBottom: 16 }}>
              Contact
            </div>
            {[
              { icon: '📍', text: 'Inamaluwa - Sigiriya Rd, Kimbissa, Sri Lanka' },
              { icon: '📞', text: '+94 66 228 6241' },
              { icon: '✉️', text: 'leisureville@sltmobitel.lk' },
            ].map(({ icon, text }, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: '0.84rem', color: 'rgba(255,255,255,0.6)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <span style={{ lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
          <span>© {new Date().getFullYear()} Leisureville Sigiriya. All rights reserved.</span>
          <span>Powered by Hotel Concierge AI</span>
        </div>
      </div>
    </footer>
  );
}
