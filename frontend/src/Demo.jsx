import { useEffect, useRef, useState } from "react";
import ChatPanel from "./ChatPanel.jsx";
import VoiceAgent from "./VoiceAgent.jsx";
import { api } from "./api.js";

const CONTENT = {
  "leisureville-sigiriya": {
    tagline: "Awaken to the ancient rock. Unwind in the jungle.",
    subtitle: "Three-bedroom holiday bungalow · Steps from the UNESCO Lion Rock Fortress",
    kind: "Holiday Bungalow",
    highlights: [
      { label: "Location", value: "Sigiriya, North Central Province, Sri Lanka", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
      { label: "Check-in / out", value: "14:00 · 11:00", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" },
      { label: "Free Cancellation", value: "Up to 7 days before arrival", icon: "M12 2L4 6v6c0 5.52 3.4 10.74 8 12 4.6-1.26 8-6.48 8-12V6L12 2z" },
    ],
    rooms: [
      { name: "Master Bedroom", size: "24 m²", beds: "King bed", from: "LKR 10,000 /night", tag: "En-suite Bath", desc: "Spacious air-conditioned master bedroom with a king bed, en-suite bathroom and a private veranda overlooking the tropical garden.", image_url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80" },
      { name: "Bedroom 2", size: "20 m²", beds: "2 Twin beds", from: "LKR 10,000 /night", tag: "", desc: "Comfortable air-conditioned bedroom with twin beds — ideal for friends or family sharing a room.", image_url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80" },
      { name: "Bedroom 3", size: "20 m²", beds: "2 Twin beds", from: "LKR 10,000 /night", tag: "Garden Views", desc: "Air-conditioned twin bedroom overlooking the tropical garden and the surrounding paddy fields.", image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80" },
    ],
    experiences: [
      { name: "Sigiriya Rock Fortress", desc: "Guided climb of the UNESCO Lion Rock — ancient frescoes, the mirror wall and spectacular views from the summit.", tag: "Culture · 3 hrs" },
      { name: "Minneriya Elephant Safari", desc: "Jeep safari to witness Sri Lanka's famous elephant gathering — often 200+ wild elephants around the ancient tank.", tag: "Nature · 4 hrs" },
      { name: "Hiriwadunna Village Tour", desc: "Bullock-cart ride, boat trip on the reservoir and a home-cooked Sri Lankan lunch with a local family.", tag: "Culture · 4 hrs" },
    ],
  },
};

function SvgIcon({ d, size = 20, strokeWidth = 1.75 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ARROW = "M5 12h14M12 5l7 7-7 7";
const SCROLL_DOWN = "M12 5v14M6 13l6 6 6-6";
const CHECK_PATH = "M20 6L9 17l-5-5";

const TICKER_ITEMS = [
  "Live availability check",
  "Exact rate quotes",
  "Instant booking",
  "Airport transfers",
  "Local experiences",
  "Modify or cancel anytime",
  "Human handoff",
  "Available 24 / 7",
];

const AI_FEATURES = [
  { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z", title: "Live Availability", desc: "Checks real room inventory in real time — no stale data, no false hope." },
  { icon: "M12 8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM3 11H1m22 0h-2M12 3V1m0 22v-2m-7.07-2.93-1.41-1.41M20.49 3.51l-1.41 1.41M3.51 20.49l1.41-1.41M18.07 5.93l1.41-1.41", title: "Exact Quotes", desc: "Full price breakdown — service charge and taxes included. The AI never guesses a rate." },
  { icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", title: "Instant Booking", desc: "Creates a confirmed reservation with a reference number. Pending until staff arrange payment." },
  { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", title: "Secure & Private", desc: "Never asks for card details. No PII stored in chat. Payment handled offline by staff." },
  { icon: "M17 8l4 4-4 4M3 12h18", title: "Airport Transfers", desc: "Books vehicles for arrivals and departures. Multiple options, exact pricing." },
  { icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", title: "Human Handoff", desc: "Flags complaints and complex cases to staff instantly — with full context." },
];

const HOW_STEPS = [
  { n: "01", title: "Describe your stay", body: "Tell the concierge your dates, room type, and group size. Ask anything — policies, transfers, what to do nearby." },
  { n: "02", title: "Get an exact quote", body: "Real-time pricing with all taxes and charges included. The AI reads live inventory and never invents a rate." },
  { n: "03", title: "Confirm and arrive", body: "Your booking reference is instant. Staff confirm and arrange payment by email before you check in." },
];

export default function Demo() {
  const [props, setProps] = useState([]);
  const [slug, setSlug] = useState(() => new URLSearchParams(window.location.search).get("p") || "");
  const [open, setOpen] = useState(false);
  const [chatInitialMsg, setChatInitialMsg] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);

  function openChat(msg = "") {
    setChatInitialMsg(msg);
    setOpen(true);
  }
  function closeChat() {
    setOpen(false);
    setChatInitialMsg("");
  }
  const [err, setErr] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    api.properties()
      .then((list) => {
        setProps(list);
        if (!slug && list[0]) setSlug(list[0].slug);
      })
      .catch(() => setErr("Can't reach the API. Start the backend and seed the demo data."));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const current = props.find((p) => p.slug === slug);
  const content = CONTENT[slug] || null;
  const accent = current?.accent || "#2f5d3a";
  const origin = window.location.origin;

  function switchProp(val) {
    setSlug(val);
    history.replaceState(null, "", `?p=${val}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="hp" style={{ "--accent": accent }}>

      {/* ── Navbar ── */}
      <nav className={`hp-nav${scrolled ? " hp-nav-solid" : ""}`} aria-label="Main navigation">
        <div className="hp-nav-inner">
          <div className="hp-nav-brand">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="var(--accent)" />
              <path d="M8 26V14l8-6 8 6v12" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinejoin="round" />
              <rect x="13" y="18" width="6" height="8" rx="1.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            </svg>
            <div className="hp-prop-picker">
              <select
                value={slug}
                aria-label="Select property"
                onChange={(e) => switchProp(e.target.value)}
              >
                {props.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
          <div className="hp-nav-links">
            <a href="#rooms" onClick={(e) => { e.preventDefault(); document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" }); }}>Rooms</a>
            <a href="#experiences" onClick={(e) => { e.preventDefault(); document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth" }); }}>Experiences</a>
            <a href="/booking" className="hp-nav-mybooking">My Booking</a>
            <button className="hp-nav-chat" onClick={() => openChat()}>Chat with Concierge</button>
            <a href="/admin" className="hp-nav-admin">Staff →</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={`hp-hero hp-hero-${slug}`} aria-labelledby="hero-heading">
        <div className="hp-hero-grain" aria-hidden="true" />
        <div className="hp-hero-inner">
          {current && (
            <p className="hp-hero-eyebrow">{content?.kind || current.kind} · {current.location}</p>
          )}
          <h1 id="hero-heading" className="hp-hero-name">{current?.name || " "}</h1>
          {content && (
            <>
              <p className="hp-hero-tagline">{content.tagline}</p>
              <p className="hp-hero-sub">{content.subtitle}</p>
            </>
          )}
          <div className="hp-hero-actions">
            <button className="hp-btn-primary" onClick={() => openChat()}>
              Check Availability
              <SvgIcon d={ARROW} size={17} strokeWidth={2} />
            </button>
            <button className="hp-btn-ghost" onClick={() => openChat()}>
              Ask the Concierge
            </button>
          </div>
        </div>
        <img
          src="/White%20Line-Art%20Hand%20Holding%20Lotus.png"
          alt=""
          aria-hidden="true"
          className="hp-hero-art"
        />
        <button className="hp-hero-scroll" aria-label="Scroll down"
          onClick={() => document.getElementById("highlights")?.scrollIntoView({ behavior: "smooth" })}>
          <SvgIcon d={SCROLL_DOWN} size={22} strokeWidth={1.5} />
        </button>
      </section>

      {/* ── Feature ticker ── */}
      <div className="hp-ticker" aria-hidden="true">
        <div className="hp-ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="hp-ticker-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={CHECK_PATH} /></svg>
              {item}
            </span>
          ))}
        </div>
      </div>

      {err && <p className="hp-err" role="alert">{err}</p>}

      {/* ── SaaS stats strip ── */}
      <div className="hp-saas-stats" aria-label="Product statistics">
        <div className="hp-saas-stats-inner">
          {[
            { n: "2,400+", l: "Guest interactions monthly" },
            { n: "< 2 s",  l: "Average AI response time" },
            { n: "3",      l: "Languages — EN, සිං, தமிழ்" },
            { n: "24 / 7", l: "Always available, never on hold" },
          ].map(s => (
            <div className="hp-saas-stat" key={s.l}>
              <strong>{s.n}</strong>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {content && (
        <>
          {/* ── Highlights strip ── */}
          <div className="hp-highlights" id="highlights">
            {content.highlights.map((h) => (
              <div className="hp-highlight" key={h.label}>
                <div className="hp-highlight-icon">
                  <SvgIcon d={h.icon} size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="hp-highlight-label">{h.label}</p>
                  <p className="hp-highlight-value">{h.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Rooms ── */}
          <section className="hp-section" id="rooms" aria-labelledby="rooms-heading">
            <header className="hp-section-head">
              <p className="hp-section-eyebrow">Accommodation</p>
              <h2 id="rooms-heading">Rooms &amp; Suites</h2>
              <p>All rates are per room per night. Service charge and taxes are included as quoted by the concierge.</p>
            </header>
            <div className="hp-rooms">
              {content.rooms.map((r) => (
                <article className="hp-room" key={r.name}>
                  <div className="hp-room-visual" aria-hidden="true">
                    {r.image_url
                      ? <img src={r.image_url} alt={r.name} className="hp-room-visual-inner hp-room-img"
                          loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                      : <div className="hp-room-visual-inner" />
                    }
                  </div>
                  <div className="hp-room-content">
                    <div className="hp-room-meta">
                      <span>{r.size}</span>
                      <span aria-label={`Beds: ${r.beds}`}>{r.beds}</span>
                    </div>
                    <h3>{r.name}</h3>
                    <p>{r.desc}</p>
                    <div className="hp-room-footer">
                      <div>
                        {r.tag && <span className="hp-room-tag">{r.tag}</span>}
                        <span className="hp-room-rate">{r.from}</span>
                      </div>
                      <button className="hp-room-book" onClick={() => openChat(`I'd like to book the ${r.name}`)} aria-label={`Book ${r.name}`}>
                        Book <SvgIcon d={ARROW} size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ── Experiences ── */}
          <section className="hp-section hp-section-tinted" id="experiences" aria-labelledby="exp-heading">
            <header className="hp-section-head">
              <p className="hp-section-eyebrow">Local Experiences</p>
              <h2 id="exp-heading">Things to Do</h2>
              <p>Tell the concierge what interests you — we'll arrange the details.</p>
            </header>
            <div className="hp-experiences">
              {content.experiences.map((e) => (
                <article className="hp-exp" key={e.name}>
                  <p className="hp-exp-tag">{e.tag}</p>
                  <h3>{e.name}</h3>
                  <p>{e.desc}</p>
                  <button className="hp-exp-link" onClick={() => openChat(`I'm interested in the ${e.name}. Can you tell me more and help me arrange it?`)}
                    aria-label={`Ask the concierge about ${e.name}`}>
                    Ask the concierge →
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* ── AI Features ── */}
          <section className="hp-section" id="features" aria-labelledby="feat-heading">
            <header className="hp-section-head">
              <p className="hp-section-eyebrow">Powered by AI</p>
              <h2 id="feat-heading">Everything the concierge can do</h2>
              <p>The AI handles the full booking journey — it never guesses availability or invents prices.</p>
            </header>
            <div className="hp-features-grid">
              {AI_FEATURES.map((f) => (
                <div className="hp-feature-card" key={f.title}>
                  <div className="hp-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={f.icon} />
                    </svg>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── How it works ── */}
          <section className="hp-section hp-section-tinted" id="how-it-works" aria-labelledby="how-heading">
            <header className="hp-section-head">
              <p className="hp-section-eyebrow">Simple &amp; Fast</p>
              <h2 id="how-heading">How it works</h2>
              <p>No waiting, no hold music. The concierge is available around the clock.</p>
            </header>
            <div className="hp-steps">
              {HOW_STEPS.map((s) => (
                <div className="hp-step" key={s.n}>
                  <span className="hp-step-n" aria-hidden="true">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
              <div className="hp-step hp-step-cta">
                <span className="hp-step-n" aria-hidden="true">→</span>
                <h3>Try it now</h3>
                <p>Open the chat and ask anything — availability, rates, experiences.</p>
                <button className="hp-btn-primary hp-step-btn" onClick={() => openChat()}>
                  Chat with {current?.assistant_name || "Concierge"}
                  <SvgIcon d={ARROW} size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          </section>

        </>
      )}

      {/* ── Footer ── */}
      <footer className="hp-footer">
        <p className="hp-footer-brand">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--accent)" />
            <path d="M8 26V14l8-6 8 6v12" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinejoin="round" />
            <rect x="13" y="18" width="6" height="8" rx="1.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
          </svg>
          {current?.name || "Hotel Concierge"}
        </p>
        <nav className="hp-footer-links" aria-label="Footer">
          {props.map((p) => (
            <button key={p.slug} onClick={() => switchProp(p.slug)}
              className={slug === p.slug ? "hp-footer-prop-active" : ""}>
              {p.name}
            </button>
          ))}
          <a href="/booking">My Booking</a>
          <a href="/admin">Staff Dashboard</a>
        </nav>
        <p className="hp-footer-copy">© {new Date().getFullYear()} AI Hotel Concierge · Demo build</p>
      </footer>

      {/* ── Voice agent popup ── */}
      {voiceOpen && slug && (
        <VoiceAgent key={slug} slug={slug} onClose={() => setVoiceOpen(false)} />
      )}

      {/* ── Floating chat + voice ── */}
      {slug && (
        <div className={`dock${open ? " dock-open" : ""}`}>
          {open && <ChatPanel key={slug} slug={slug} onClose={closeChat} initialMessage={chatInitialMsg} />}
          {!open && (
            <>
              <button
                className="voice-launcher"
                onClick={() => setVoiceOpen(true)}
                aria-label="Voice concierge"
                title="Talk to the concierge"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="2" width="6" height="13" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" />
                </svg>
              </button>
              <button className="launcher" onClick={() => openChat()} aria-label="Chat with the concierge">
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
