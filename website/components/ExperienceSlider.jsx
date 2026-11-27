'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const INTERVAL = 5000;

function toSlug(name) {
  return name.toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const CAT_COLORS = {
  culture:   { accent: '#d97706', overlay: 'rgba(146,64,14,0.72)' },
  wildlife:  { accent: '#10b981', overlay: 'rgba(6,78,59,0.72)' },
  nature:    { accent: '#10b981', overlay: 'rgba(6,78,59,0.72)' },
  adventure: { accent: '#f87171', overlay: 'rgba(127,29,29,0.72)' },
  wellness:  { accent: '#a78bfa', overlay: 'rgba(55,48,163,0.72)' },
};
const DEFAULT_COLOR = { accent: '#D4A843', overlay: 'rgba(45,31,10,0.72)' };

export default function ExperienceSlider({ experiences }) {
  const [current, setCurrent]   = useState(0);
  const [paused, setPaused]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [animDir, setAnimDir]   = useState(1); // 1=forward, -1=back
  const timerRef    = useRef(null);
  const progressRef = useRef(null);
  const startRef    = useRef(Date.now());

  const goTo = useCallback((idx, dir = 1) => {
    setAnimDir(dir);
    setCurrent(idx);
    setProgress(0);
  }, []);

  const next = useCallback(() => goTo((current + 1) % experiences.length,  1), [current, experiences.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + experiences.length) % experiences.length, -1), [current, experiences.length, goTo]);

  useEffect(() => {
    if (paused || !experiences.length) return;
    startRef.current = Date.now();

    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - startRef.current) / INTERVAL) * 100, 100));
    }, 40);

    timerRef.current = setTimeout(next, INTERVAL);

    return () => {
      clearInterval(progressRef.current);
      clearTimeout(timerRef.current);
    };
  }, [current, paused, next, experiences.length]);

  if (!experiences.length) return null;

  const exp = experiences[current];
  const col = CAT_COLORS[exp.category] || DEFAULT_COLOR;
  const imgSrc = `/images/experiences/${toSlug(exp.name)}.png`;

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '82vh', minHeight: 540, overflow: 'hidden', userSelect: 'none' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slide backgrounds (all pre-mounted, fade in/out) ── */}
      {experiences.map((e, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', inset: 0,
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.9s cubic-bezier(0.4,0,0.2,1)',
            willChange: 'opacity',
          }}
        >
          <Image
            src={`/images/experiences/${toSlug(e.name)}.png`}
            alt={e.name}
            fill
            priority={i === 0}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
      ))}

      {/* ── Gradient overlays ── */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)', zIndex: 1 }} />

      {/* ── Slide content ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 72px 0 56px', width: '100%' }}>
          <div
            key={current}
            style={{ maxWidth: 580, animation: 'expSlideIn 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both' }}
          >
            {/* Category badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', borderRadius: 20, marginBottom: 20,
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
              border: `1px solid ${col.accent}40`, color: col.accent,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.accent, flexShrink: 0 }} />
              {exp.category}
            </span>

            {/* Title */}
            <h3 style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontWeight: 800, color: '#fff', margin: '0 0 16px', lineHeight: 1.15,
              letterSpacing: '-0.02em', textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}>
              {exp.name}
            </h3>

            {/* Meta row */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              {exp.duration && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: 'rgba(255,255,255,0.75)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {exp.duration}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>
                Nearby attraction — explore independently
              </span>
              {exp.family_friendly && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Family friendly
                </span>
              )}
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, margin: '0 0 28px', maxWidth: 480 }}>
              {exp.description.length > 140 ? exp.description.slice(0, 140) + '…' : exp.description}
            </p>

            {/* CTA */}
            <Link href="/experiences" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 26px', borderRadius: 10,
              background: col.accent, color: '#fff',
              fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: '0.88rem',
              textDecoration: 'none', transition: 'opacity 0.2s, transform 0.2s',
            }}>
              Explore experience
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Prev / Next arrows ── */}
      <button
        onClick={prev}
        aria-label="Previous experience"
        style={{
          position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
          zIndex: 3, width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.2s',
          color: '#fff',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <button
        onClick={next}
        aria-label="Next experience"
        style={{
          position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
          zIndex: 3, width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.2s',
          color: '#fff',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* ── Slide counter + dots + progress ── */}
      <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {experiences.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === current ? 28 : 8, height: 8, borderRadius: 4, border: 'none',
                background: i === current ? col.accent : 'rgba(255,255,255,0.35)',
                cursor: 'pointer', padding: 0,
                transition: 'width 0.35s, background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width: 200, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: col.accent, borderRadius: 1,
            width: `${progress}%`, transition: 'width 0.1s linear',
          }} />
        </div>

        {/* Counter */}
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
          {String(current + 1).padStart(2, '0')} / {String(experiences.length).padStart(2, '0')}
        </span>
      </div>

      {/* ── Slide-in animation keyframes ── */}
      <style>{`
        @keyframes expSlideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
