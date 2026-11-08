import { useEffect, useRef, useState } from "react";
import ChatPanel from "./ChatPanel.jsx";
import VoiceAgent from "./VoiceAgent.jsx";
import { api } from "./api.js";

const AMENITY_ICON = {
  wifi:     "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  pool:     "M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 13c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 19c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
  dining:   "M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3",
  transfer: "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3m0 0h4l1.5 3v3h-1.5M17 11H9M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  nature:   "M17 18a5 5 0 0 0-10 0M12 2v7M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1M8 6l4-4 4 4",
  tea:      "M17 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3",
  shuttle:  "M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3M9 17h6M17 17h2a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-6M7 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  trail:    "M3 17l4-8 4 4 3-6 4 4M21 20H3",
};

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
    amenities: [
      { icon: AMENITY_ICON.wifi,     label: "Free Wi-Fi" },
      { icon: AMENITY_ICON.pool,     label: "Private Pool" },
      { icon: AMENITY_ICON.dining,   label: "In-house Dining" },
      { icon: AMENITY_ICON.transfer, label: "Airport Transfers" },
      { icon: AMENITY_ICON.nature,   label: "Garden Views" },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=900&auto=format&fit=crop&q=80",
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
    testimonials: [
      { name: "James & Sarah", origin: "United Kingdom", stars: 5, text: "The AI concierge booked our room, arranged a safari and a guided Sigiriya climb — all in one conversation. Arrived to everything perfectly arranged." },
      { name: "Priya Nair", origin: "India", stars: 5, text: "Asked about vegetarian options at 2 am. Got a full menu, confirmed our meal plan and had breakfast ready when we landed. Impressive." },
      { name: "Lars Eriksson", origin: "Sweden", stars: 5, text: "No calls, no waiting. Exact price with taxes, instant reference number. This is what hotel booking should feel like." },
    ],
  },
  "kandy-hills-resort": {
    tagline: "Breathe the highland air. Wake up to the cloud forest.",
    subtitle: "Boutique hill resort · In the heart of Kandy, Central Sri Lanka",
    kind: "Boutique Resort",
    highlights: [
      { label: "Location", value: "Kandy, Central Province, Sri Lanka", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
      { label: "Check-in / out", value: "14:00 · 11:00", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" },
      { label: "Free Cancellation", value: "Up to 7 days before arrival", icon: "M12 2L4 6v6c0 5.52 3.4 10.74 8 12 4.6-1.26 8-6.48 8-12V6L12 2z" },
    ],
    amenities: [
      { icon: AMENITY_ICON.wifi,    label: "Free Wi-Fi" },
      { icon: AMENITY_ICON.pool,    label: "Heated Pool" },
      { icon: AMENITY_ICON.tea,     label: "Tea Lounge" },
      { icon: AMENITY_ICON.shuttle, label: "Shuttle Service" },
      { icon: AMENITY_ICON.trail,   label: "Forest Trails" },
    ],
    gallery: [
      "https://images.unsplash.com/photo-1562768304-e2ce9ec24e5a?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518733057094-95b53143d2a7?w=900&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=900&auto=format&fit=crop&q=80",
    ],
    rooms: [
      { name: "Forest Suite", size: "36 m²", beds: "King bed", from: "LKR 18,000 /night", tag: "Garden View", desc: "Spacious suite with a king bed, private balcony overlooking the forest canopy and a rainfall shower.", image_url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80" },
      { name: "Hill View Room", size: "26 m²", beds: "Queen bed", from: "LKR 12,000 /night", tag: "Mountain View", desc: "Comfortable room with a queen bed and panoramic views of the Kandyan hills and tea estates.", image_url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80" },
      { name: "Garden Cottage", size: "30 m²", beds: "2 Twin beds", from: "LKR 14,000 /night", tag: "Private Garden", desc: "Freestanding cottage nestled in the tropical garden — ideal for families or friends.", image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80" },
    ],
    experiences: [
      { name: "Temple of the Tooth", desc: "Visit Sri Lanka's most sacred Buddhist shrine — home to the relic of the tooth of the Buddha in the heart of Kandy.", tag: "Culture · 2 hrs" },
      { name: "Kandy Tea Trail", desc: "Guided walk through working tea estates above Kandy — tea tasting and spectacular highland views included.", tag: "Nature · 3 hrs" },
      { name: "Peradeniya Botanical Gardens", desc: "Explore one of Asia's finest botanical gardens — over 4,000 species of plants and an iconic suspension bridge.", tag: "Nature · 2 hrs" },
    ],
    testimonials: [
      { name: "Emily Chen", origin: "Australia", stars: 5, text: "Booked in 3 messages. The AI knew exactly what room I'd love — forest-facing, king bed, ground floor. All confirmed without a single phone call." },
      { name: "Rahul & Meera", origin: "Singapore", stars: 5, text: "The Tea Trail was arranged within minutes of asking. Driver, guide and lunch — all confirmed through the chat. Absolutely seamless." },
      { name: "Anneke de Vries", origin: "Netherlands", stars: 5, text: "We asked if the pool was heated in December. Instant answer, with water temperature. That detail made us trust this place completely." },
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

const ARROW      = "M5 12h14M12 5l7 7-7 7";
const SCROLL_DOWN = "M12 5v14M6 13l6 6 6-6";
const CHECK_PATH  = "M20 6L9 17l-5-5";
const STAR_PATH   = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
const MIC_PATH    = "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8";
const MENU_PATH   = "M3 12h18M3 6h18M3 18h18";
const CLOSE_PATH  = "M18 6L6 18M6 6l12 12";

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
  const [props, setProps]           = useState([]);
  const [slug, setSlug]             = useState(() => new URLSearchParams(window.location.search).get("p") || "");
  const [open, setOpen]             = useState(false);
  const [chatInitialMsg, setChatInitialMsg] = useState("");
  const [voiceOpen, setVoiceOpen]   = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [err, setErr]               = useState("");
  const [scrolled, setScrolled]     = useState(false);

  function openChat(msg = "") {
    setChatInitialMsg(msg);
    setOpen(true);
    setMenuOpen(false);
  }
  function closeChat() {
    setOpen(false);
    setChatInitialMsg("");
  }

  useEffect(() => {
    api.properties()
      .then((list) => {
        setProps(list);
        if (!slug) {
          const preferred = list.find(p => CONTENT[p.slug]) || list[0];
          if (preferred) setSlug(preferred.slug);
        }
      })
      .catch(() => setErr("Can't reach the API. Start the backend and seed the demo data."));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* close mobile menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!e.target.closest(".hp-nav-inner")) setMenuOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpen]);

  const current = props.find((p) => p.slug === slug);
  const content = CONTENT[slug] || null;
  const accent  = current?.accent || "#2f5d3a";

  function switchProp(val) {
    setSlug(val);
    setMenuOpen(false);
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

          {/* Desktop links */}
          <div className="hp-nav-links">
            <a href="#rooms" onClick={(e) => { e.preventDefault(); document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" }); }}>Rooms</a>
            <a href="#experiences" onClick={(e) => { e.preventDefault(); document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth" }); }}>Experiences</a>
            <a href="/booking" className="hp-nav-mybooking">My Booking</a>
            <button className="hp-nav-chat" onClick={() => openChat()}>Chat with Concierge</button>
            <a href={`/admin/${slug}`} className="hp-nav-admin">Staff →</a>
          </div>

          {/* Hamburger (mobile) */}
          <button
            className={`hp-hamburger${menuOpen ? " hp-hamburger-open" : ""}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <SvgIcon d={menuOpen ? CLOSE_PATH : MENU_PATH} size={22} strokeWidth={2} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="hp-mobile-menu" role="menu">
            <a role="menuitem" href="#rooms"
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" }); }}>
              Rooms
            </a>
            <a role="menuitem" href="#experiences"
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth" }); }}>
              Experiences
            </a>
            <a role="menuitem" href="/booking">My Booking</a>
            {props.length > 1 && (
              <div className="hp-mobile-props">
                <p className="hp-mobile-props-label">Switch property</p>
                {props.map(p => (
                  <button key={p.slug} role="menuitem"
                    className={p.slug === slug ? "hp-mobile-prop-active" : ""}
                    onClick={() => switchProp(p.slug)}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <div className="hp-mobile-actions">
              <button className="hp-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => openChat()}>
                Chat with Concierge
                <SvgIcon d={ARROW} size={16} strokeWidth={2} />
              </button>
              <a href={`/admin/${slug}`} className="hp-mobile-staff">Staff Dashboard →</a>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className={`hp-hero hp-hero-${slug}`} aria-labelledby="hero-heading">
        <div className="hp-hero-grain" aria-hidden="true" />
        <div className="hp-hero-inner">
          {current && (
            <p className="hp-hero-eyebrow">{content?.kind || current.kind} · {current.location}</p>
          )}
          <h1 id="hero-heading" className="hp-hero-name">{current?.name || " "}</h1>
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

          {/* ── Amenities strip ── */}
          {content.amenities && (
            <div className="hp-amenities" aria-label="Property amenities">
              <div className="hp-amenities-inner">
                {content.amenities.map((a) => (
                  <div className="hp-amenity" key={a.label}>
                    <div className="hp-amenity-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
                        strokeLinejoin="round" aria-hidden="true">
                        <path d={a.icon} />
                      </svg>
                    </div>
                    <span>{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Photo Gallery ── */}
          {content.gallery && (
            <div className="hp-gallery-wrap" aria-label="Property photos">
              <div className="hp-gallery">
                {content.gallery.map((src, i) => (
                  <div key={i} className={`hp-gallery-cell${i === 0 ? " hp-gallery-main" : ""}`}>
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      className="hp-gallery-img"
                      onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* ── Testimonials ── */}
          {content.testimonials && (
            <section className="hp-section" aria-labelledby="reviews-heading">
              <header className="hp-section-head">
                <p className="hp-section-eyebrow">Guest Reviews</p>
                <h2 id="reviews-heading">What guests are saying</h2>
                <p>Genuine reviews from guests who booked through our AI concierge.</p>
              </header>
              <div className="hp-testimonials">
                {content.testimonials.map((t) => (
                  <article className="hp-testimonial" key={t.name}>
                    <div className="hp-testimonial-stars" aria-label={`${t.stars} out of 5 stars`}>
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24"
                          fill="currentColor" stroke="none" aria-hidden="true">
                          <path d={STAR_PATH} />
                        </svg>
                      ))}
                    </div>
                    <blockquote className="hp-testimonial-text">"{t.text}"</blockquote>
                    <footer className="hp-testimonial-author">
                      <strong>{t.name}</strong>
                      <span>{t.origin}</span>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ── AI Features ── */}
          <section className="hp-section hp-section-tinted" id="features" aria-labelledby="feat-heading">
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
          <section className="hp-section" id="how-it-works" aria-labelledby="how-heading">
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

          {/* ── CTA Banner ── */}
          <section className="hp-cta-banner" aria-labelledby="cta-heading">
            <div className="hp-cta-inner">
              <div className="hp-cta-badge">AI-Powered · Available 24 / 7</div>
              <h2 id="cta-heading">Your concierge is ready</h2>
              <p className="hp-cta-sub">Live room availability · Exact rates with taxes · Instant booking reference</p>
              <div className="hp-cta-actions">
                <button className="hp-cta-btn" onClick={() => openChat()}>
                  Start Chatting
                  <SvgIcon d={ARROW} size={16} strokeWidth={2.5} />
                </button>
                <button className="hp-cta-btn-ghost" onClick={() => setVoiceOpen(true)}>
                  <SvgIcon d={MIC_PATH} size={16} strokeWidth={2} />
                  Try Voice Agent
                </button>
              </div>
              <div className="hp-cta-chips">
                <span>No registration needed</span>
                <span>Answers in under 2 seconds</span>
                <span>EN · සිං · தமிழ்</span>
              </div>
            </div>
            <div className="hp-cta-deco" aria-hidden="true" />
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
          <a href={`/admin/${slug}`}>Staff Dashboard</a>
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
          {open && <ChatPanel key={slug} slug={slug} onClose={closeChat} initialMessage={chatInitialMsg} onOpenVoice={() => setVoiceOpen(true)} />}
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
