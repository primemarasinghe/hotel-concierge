'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import dynamic from 'next/dynamic';

const ChatPanel  = dynamic(() => import('./ChatPanel'),  { ssr: false });
const VoiceAgent = dynamic(() => import('./VoiceAgent'), { ssr: false });

const SLUG = 'leisureville-sigiriya';

export default function ChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [open,      setOpen]      = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [pendingMsg, setPendingMsg] = useState("");

  // Redirect admin users to the admin panel immediately after login
  useEffect(() => {
    if (session?.user?.isAdmin) {
      router.push('/admin');
    }
  }, [session]);

  // Auto-open if returning from Google OAuth with ?chat=open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('chat') === 'open') {
      setOpen(true);
      params.delete('chat');
      const q = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''));
    }
  }, []);

  // Open on custom event (from "Book Now" or "Ask about this" buttons)
  useEffect(() => {
    const handler = (e) => {
      setPendingMsg(e.detail?.message || "");
      setOpen(true);
    };
    window.addEventListener('openChatWidget', handler);
    return () => window.removeEventListener('openChatWidget', handler);
  }, []);

  // Full-page chat already on /book
  if (pathname === '/book') return null;

  function handleSignIn() {
    const url = new URL(window.location.href);
    url.searchParams.set('chat', 'open');
    signIn('google', { callbackUrl: url.toString() });
  }

  return (
    <>
      {/* Floating launcher */}
      {!open && !voiceOpen && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with Siri — AI Concierge"
          title="Chat with Siri — AI Concierge"
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B6914, #B8921C)',
            boxShadow: '0 4px 20px rgba(139,105,20,0.45)',
            border: 'none', cursor: 'pointer', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(139,105,20,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,105,20,0.45)'; }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      {/* Widget popup */}
      {open && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>
          {status === 'loading' ? null : !session ? (
            /* ── Inline login card ── */
            <div style={{
              width: 340,
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              fontFamily: 'var(--ui, system-ui, sans-serif)',
            }}>
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #2D1F0A, #5C3D1E)',
                padding: '20px 20px 18px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A843', marginBottom: 4 }}>
                    AI Concierge
                  </div>
                  <div style={{ color: '#fff', fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.1rem', fontWeight: 700 }}>
                    Chat with Siri
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '1rem', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '24px 24px 28px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F5EDD9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B6914" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#5C4A38', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Sign in to check availability, get a quote, and book your stay instantly.
                </p>
                <button
                  onClick={handleSignIn}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: '#fff', color: '#1a1a1a',
                    border: '1.5px solid #E0D5C5', borderRadius: 10,
                    padding: '12px 20px', fontSize: '0.9rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#faf7f2'; e.currentTarget.style.borderColor = '#C8B89A'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff';    e.currentTarget.style.borderColor = '#E0D5C5'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.7 0 20-7.8 20-20.5 0-1.4-.1-2.7-.4-4z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4.5 24 4.5c-7.6 0-14.1 4.4-17.7 10.2z"/>
                    <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.3 37.1 26.8 38 24 38c-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.9 41.1 16.5 45.5 24 45.5z"/>
                    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.5l6.2 5.2c3.6-3.3 5.9-8.3 5.9-13.7 0-1.4-.1-2.7-.4-4z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>
          ) : (
            /* ── Chat panel ── */
            <ChatPanel
              slug={SLUG}
              onClose={() => { setOpen(false); setPendingMsg(""); }}
              fill={false}
              onOpenVoice={() => { setOpen(false); setVoiceOpen(true); }}
              guestEmail={session?.user?.email ?? null}
              initialMessage={pendingMsg}
            />
          )}
        </div>
      )}

      {voiceOpen && (
        <VoiceAgent
          slug={SLUG}
          onClose={() => { setVoiceOpen(false); setOpen(true); }}
        />
      )}
    </>
  );
}
