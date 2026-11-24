'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/',             label: 'Home' },
  { href: '/rooms',        label: 'Rooms' },
  { href: '/experiences',  label: 'Experiences' },
  { href: '/location',     label: 'Location' },
  { href: '/my-booking',   label: 'My Booking' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  const solid = !isHome || scrolled || open;

  return (
    <header
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        transition: 'background 0.3s, box-shadow 0.3s',
        background: solid ? 'rgba(250,247,242,0.97)' : 'transparent',
        boxShadow: solid ? '0 1px 0 #E8DCC8' : 'none',
        backdropFilter: solid ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: solid ? 'blur(12px)' : 'none',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: solid ? '#8B6914' : '#FFFFFF',
            transition: 'color 0.3s',
            letterSpacing: '-0.01em',
          }}>
            Leisureville
          </span>
          <span style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontWeight: 500,
            fontSize: '0.68rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: solid ? '#8A7A6A' : 'rgba(255,255,255,0.75)',
            transition: 'color 0.3s',
          }}>
            Sigiriya
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hide-mobile">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  color: solid
                    ? (active ? '#8B6914' : '#2D1F0A')
                    : (active ? '#FFFFFF' : 'rgba(255,255,255,0.85)'),
                  transition: 'color 0.2s, background 0.2s',
                  background: active && solid ? '#F5EDD9' : 'transparent',
                }}
              >
                {label}
              </Link>
            );
          })}
          <Link href="/book" className="btn-primary" style={{ marginLeft: 8, padding: '10px 22px', fontSize: '0.85rem' }}>
            Book Now
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="show-mobile"
          style={{
            width: 42, height: 42, borderRadius: 10, border: 'none',
            background: solid ? '#F5EDD9' : 'rgba(255,255,255,0.15)',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 20, height: 2, borderRadius: 1,
              background: solid ? '#8B6914' : '#FFFFFF',
              display: 'block',
              transform: open && i === 0 ? 'rotate(45deg) translate(5px, 5px)' : open && i === 2 ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
              opacity: open && i === 1 ? 0 : 1,
              transition: 'transform 0.2s, opacity 0.2s',
            }} />
          ))}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          background: 'rgba(250,247,242,0.98)',
          borderTop: '1px solid #E8DCC8',
          padding: '12px 24px 20px',
        }}>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '12px 0',
                fontWeight: pathname === href ? 700 : 500,
                fontSize: '1rem',
                color: pathname === href ? '#8B6914' : '#2D1F0A',
                textDecoration: 'none',
                borderBottom: '1px solid #F0E8D8',
              }}
            >
              {label}
            </Link>
          ))}
          <Link href="/book" className="btn-primary" style={{ marginTop: 16, display: 'inline-flex', fontSize: '0.95rem' }}>
            Book Now
          </Link>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .hide-mobile { display: flex !important; } .show-mobile { display: none !important; } }
        @media (max-width: 767px) { .hide-mobile { display: none !important; } .show-mobile { display: flex !important; } }
      `}</style>
    </header>
  );
}
