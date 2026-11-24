'use client';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

const SLUG = 'leisureville-sigiriya';
const ADMIN_PANEL_URL = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || 'http://localhost:5173';

function proxy(path) {
  return `/api/admin/proxy?path=${encodeURIComponent(path)}`;
}

function fmt(n, currency) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function StatCard({ label, value, sub, warn }) {
  return (
    <div style={{
      background: warn ? '#FFFBEB' : '#fff',
      borderRadius: 10,
      padding: '18px 22px',
      border: `1px solid ${warn ? '#FDE68A' : '#EDE3D8'}`,
      flex: '1 1 140px',
    }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C7B6A', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: warn ? '#B45309' : '#2D1F0A', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: '0.76rem', color: '#8C7B6A', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C7B6A', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function RevenueTrend({ data, currency }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.month_full}: ${fmt(d.revenue, currency)}`}
            style={{
              flex: 1,
              height: `${Math.max((d.revenue / max) * 60, 4)}px`,
              background: d.is_current ? '#D4A843' : '#C5B49A',
              borderRadius: '3px 3px 0 0',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.62rem', color: '#8C7B6A', fontWeight: d.is_current ? 700 : 400 }}>
            {d.month}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, properties }) {
  const [summary, setSummary] = useState(null);
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    fetch(proxy(`/api/admin/${SLUG}/summary`))
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setSummary)
      .catch(() => setLoadErr(true));
  }, []);

  const cur = summary?.currency;
  const loading = !summary && !loadErr;
  const spin = loading ? '…' : '—';

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF7F2', fontFamily: 'var(--ui, system-ui, sans-serif)' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #2D1F0A 0%, #5C3D1E 100%)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}>
        {user?.image && (
          <img
            src={user.image}
            alt=""
            referrerPolicy="no-referrer"
            style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid rgba(212,168,67,0.4)', flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A843', marginBottom: 2 }}>
            Hotel Admin
          </div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || user?.email}
          </div>
        </div>
        <a
          href={ADMIN_PANEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#D4A843',
            color: '#1A0F05',
            padding: '9px 18px',
            borderRadius: 7,
            fontWeight: 700,
            fontSize: '0.82rem',
            textDecoration: 'none',
            letterSpacing: '0.03em',
            flexShrink: 0,
          }}
        >
          Full Admin Panel →
        </a>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.65)',
            padding: '8px 14px',
            borderRadius: 7,
            cursor: 'pointer',
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          Sign out
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px' }}>

        {/* Property title */}
        {properties?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.55rem', color: '#2D1F0A', margin: '0 0 3px' }}>
              {properties[0].name}
            </h1>
            <div style={{ color: '#8C7B6A', fontSize: '0.85rem' }}>
              {properties[0].location}
              {properties[0].currency && (
                <span style={{ marginLeft: 8, padding: '1px 7px', background: '#EDE3D8', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700 }}>
                  {properties[0].currency}
                </span>
              )}
            </div>
          </div>
        )}

        {loadErr && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#B91C1C', fontSize: '0.85rem' }}>
            Could not load live data — make sure the backend is running and <code>ADMIN_TOKEN</code> is set in <code>.env.local</code>.
          </div>
        )}

        {/* Today stats */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Today</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Arrivals" value={loading ? spin : (summary?.arrivals_today ?? 0)} />
            <StatCard label="Departures" value={loading ? spin : (summary?.departures_today ?? 0)} />
            <StatCard label="In House" value={loading ? spin : (summary?.in_house ?? 0)} />
            <StatCard label="Pending" value={loading ? spin : (summary?.pending ?? 0)} warn={summary?.pending > 0} />
            <StatCard label="Open Handoffs" value={loading ? spin : (summary?.open_handoffs ?? 0)} warn={summary?.open_handoffs > 0} />
            <StatCard label="Service Requests" value={loading ? spin : (summary?.open_service_requests ?? 0)} warn={summary?.open_service_requests > 0} />
          </div>
        </div>

        {/* Revenue stats */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Month to Date</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Revenue MTD" value={loading ? spin : fmt(summary?.revenue_mtd, cur)} />
            <StatCard label="Avg Daily Rate" value={loading ? spin : fmt(summary?.adr_mtd, cur)} sub="per room night" />
            <StatCard label="RevPAR" value={loading ? spin : fmt(summary?.revpar_mtd, cur)} sub="per available room" />
            <StatCard label="Occupancy %" value={loading ? spin : (summary?.occupancy_pct_mtd != null ? `${summary.occupancy_pct_mtd}%` : '—')} />
            <StatCard label="Next 30 Days" value={loading ? spin : fmt(summary?.revenue_next30, cur)} sub="confirmed + pending" />
          </div>
        </div>

        {/* Revenue trend mini-bar */}
        {summary?.revenue_trend?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>6-Month Revenue Trend</SectionLabel>
            <div style={{ background: '#fff', border: '1px solid #EDE3D8', borderRadius: 10, padding: '16px 20px' }}>
              <RevenueTrend data={summary.revenue_trend} currency={cur} />
            </div>
          </div>
        )}

        {/* Launch panel CTA */}
        <div style={{
          background: '#fff',
          border: '1px solid #EDE3D8',
          borderRadius: 10,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, color: '#2D1F0A', marginBottom: 3, fontSize: '0.95rem' }}>
              Full Admin Panel
            </div>
            <div style={{ fontSize: '0.82rem', color: '#8C7B6A', lineHeight: 1.5 }}>
              Manage rooms, availability, pricing, bookings, conversations, knowledge base and more.
            </div>
          </div>
          <a
            href={ADMIN_PANEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#2D1F0A',
              color: '#D4A843',
              padding: '11px 22px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '0.03em',
            }}
          >
            Launch Admin Panel →
          </a>
        </div>

      </div>
    </div>
  );
}
