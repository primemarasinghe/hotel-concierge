'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { streamChat } from '../lib/api';

function newSid() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 36);
}

function RichText({ text }) {
  const inline = (s, k) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={`${k}-${i}`}>{p.slice(2, -2)}</strong>
        : p
    );
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^!\[.*?\]\(.*?\)$/.test(line.trim())) return;
    const bullet = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      if (!list) blocks.push((list = { type: 'ul', items: [] }));
      list.items.push(inline(bullet[1], i));
    } else {
      list = null;
      if (line.trim()) blocks.push({ type: 'p', content: inline(line, i) });
    }
  });
  return blocks.map((b, i) =>
    b.type === 'ul'
      ? <ul key={i} style={{ margin: '6px 0', paddingLeft: 20 }}>{b.items.map((it, j) => <li key={j} style={{ marginBottom: 2 }}>{it}</li>)}</ul>
      : <p key={i} style={{ margin: '0 0 6px' }}>{b.content}</p>
  );
}

function GuestForm({ onSend, prefill = {} }) {
  const [name, setName] = useState(prefill.name ?? '');
  const [email, setEmail] = useState(prefill.email ?? '');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  function validate() {
    const e = {};
    if (name.trim().length < 2) e.name = 'Please enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = 'Please enter a valid email';
    if (phone.trim().replace(/\D/g, '').length < 7) e.phone = 'Please enter a valid phone number';
    return e;
  }

  function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setDone(true);
    onSend(`Name: ${name.trim()}\nEmail: ${email.trim()}\nPhone: ${phone.trim()}`);
  }

  if (done) {
    return (
      <div className="guest-form-done">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        Details submitted
      </div>
    );
  }

  return (
    <div className="guest-form">
      <p className="guest-form-title">Your details</p>
      {[
        { id: 'gf-name',  label: 'Full name',     type: 'text',  val: name,  set: setName,  ph: 'e.g. Kasun Perera',  err: errors.name },
        { id: 'gf-email', label: 'Email address', type: 'email', val: email, set: setEmail, ph: 'you@example.com',    err: errors.email },
        { id: 'gf-phone', label: 'Phone number',  type: 'tel',   val: phone, set: setPhone, ph: '+94 77 000 0000',    err: errors.phone },
      ].map(({ id, label, type, val, set, ph, err }) => (
        <div key={id} className="guest-form-field">
          <label htmlFor={id}>{label}</label>
          <input id={id} type={type} value={val} placeholder={ph}
            onChange={e => set(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          {err && <div className="guest-form-err">{err}</div>}
        </div>
      ))}
      <button className="guest-form-submit" onClick={submit}>Continue →</button>
    </div>
  );
}

function DateRangePicker({ onSend }) {
  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })();
  const [checkIn,  setCheckIn]  = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  function fmt(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function submit() {
    if (!checkIn)  { setErr('Please select a check-in date');  return; }
    if (!checkOut) { setErr('Please select a check-out date'); return; }
    if (checkOut <= checkIn) { setErr('Check-out must be after check-in'); return; }
    setDone(true);
    onSend(`Check-in: ${fmt(checkIn)}, Check-out: ${fmt(checkOut)}`);
  }

  if (done) {
    return (
      <div className="guest-form-done">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        {fmt(checkIn)} → {fmt(checkOut)}
      </div>
    );
  }

  const inputStyle = {
    width: '100%', border: '1.5px solid #E8DCC8', borderRadius: 8,
    padding: '9px 10px', fontSize: '0.85rem', background: '#FFFFFF',
    color: '#2D1F0A', boxSizing: 'border-box',
  };

  return (
    <div className="ev-card" style={{ background: '#FAF7F2' }}>
      <div className="ev-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Select Dates
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8A7A6A', display: 'block', marginBottom: 4 }}>Check-in</label>
          <input type="date" value={checkIn} min={today} max={maxDate} style={inputStyle}
            onChange={e => { setCheckIn(e.target.value); setErr(''); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8A7A6A', display: 'block', marginBottom: 4 }}>Check-out</label>
          <input type="date" value={checkOut} min={checkIn || today} max={maxDate} style={inputStyle}
            onChange={e => { setCheckOut(e.target.value); setErr(''); }}
          />
        </div>
      </div>
      {err && <div style={{ fontSize: '0.78rem', color: '#DC2626', marginBottom: 8 }}>{err}</div>}
      <button className="ev-card-action" onClick={submit} style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>
        Check Availability →
      </button>
    </div>
  );
}

const DATE_ASK_RE = /what dates are you thinking|which dates|when would you like to (stay|check.?in|arrive)|what.*check.?in.*date|check.?in.*check.?out.*date|tell me the dates|dates.*thinking|looking to (stay|visit|book)/i;
function asksDates(text) { return DATE_ASK_RE.test(text || ''); }

const fmtMoney = (n, cur = 'LKR') =>
  `${cur} ${(+n).toLocaleString('en-LK', { minimumFractionDigits: 0 })}`;

function EventCard({ ev, onSend, user }) {
  const d = ev.data || {};

  if (ev.type === 'date_picker') {
    return <DateRangePicker onSend={onSend} />;
  }

  if (ev.type === 'guest_details_prefill') {
    return <GuestForm onSend={onSend} prefill={{ ...user, ...d }} />;
  }

  if (ev.type === 'guest_details_form') {
    return <GuestForm onSend={onSend} prefill={user ?? {}} />;
  }

  if (ev.type === 'booking_created' || ev.type === 'booking_modified') {
    const label = ev.type === 'booking_created' ? 'Booking Confirmed' : 'Booking Updated';
    return (
      <div className="ev-card">
        <div className="ev-card-title">{label}</div>
        <div className="ev-card-ref">{d.reference || d.ref}</div>
        {[
          ['Guest',    d.guest_name],
          ['Room',     d.room_name],
          ['Check-in', d.check_in],
          ['Check-out',d.check_out],
          ['Nights',   d.nights],
          ['Total',    d.total_price != null ? fmtMoney(d.total_price) : null],
          ['Status',   d.status],
        ].filter(([, v]) => v != null).map(([lbl, val]) => (
          <div key={lbl} className="ev-card-row">
            <span className="ev-card-label">{lbl}</span>
            <span className="ev-card-value">{String(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (ev.type === 'booking_cancelled') {
    return (
      <div className="ev-card">
        <div className="ev-card-title" style={{ color: '#DC2626' }}>Booking Cancelled</div>
        <div className="ev-card-ref">{d.reference || d.ref}</div>
        {d.message && <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>{d.message}</p>}
      </div>
    );
  }

  if (ev.type === 'quote_result') {
    return (
      <div className="ev-card">
        <div className="ev-card-title">Price Quote</div>
        {[
          ['Room',         d.room_name],
          ['Check-in',     d.check_in],
          ['Check-out',    d.check_out],
          ['Nights',       d.nights],
          ['Guests',       d.adults != null ? `${d.adults} adult${d.adults > 1 ? 's' : ''}${d.children ? ` + ${d.children} child` : ''}` : null],
          ['Subtotal',     d.subtotal != null ? fmtMoney(d.subtotal) : null],
          ['Discount',     d.discount ? `-${fmtMoney(d.discount)}` : null],
          ['Service charge', d.service_charge != null ? fmtMoney(d.service_charge) : null],
          ['Tax',          d.tax != null ? fmtMoney(d.tax) : null],
          ['Total',        d.total != null ? fmtMoney(d.total) : null],
        ].filter(([, v]) => v != null).map(([lbl, val]) => (
          <div key={lbl} className="ev-card-row" style={lbl === 'Total' ? { fontWeight: 700 } : {}}>
            <span className="ev-card-label">{lbl}</span>
            <span className="ev-card-value">{String(val)}</span>
          </div>
        ))}
        {d.total != null && (
          <button className="ev-card-action" onClick={() => onSend('Yes, I would like to book this')}>
            Book this room →
          </button>
        )}
      </div>
    );
  }

  if (ev.type === 'availability_results') {
    const rooms = Array.isArray(d.rooms) ? d.rooms : [];
    return (
      <div className="ev-card">
        <div className="ev-card-title">Available Rooms</div>
        {rooms.length === 0 && <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280' }}>No rooms available for those dates.</p>}
        {rooms.map((r, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < rooms.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{r.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>{r.beds} · {r.available} available</div>
            {r.rate && <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>{fmtMoney(r.rate)}/night</div>}
            <button className="ev-card-action" style={{ marginTop: 6 }} onClick={() => onSend(`I'd like to book the ${r.name}`)}>
              Select →
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (ev.type === 'room_cards') {
    const rooms = Array.isArray(d.rooms) ? d.rooms : (Array.isArray(d) ? d : []);
    return (
      <div className="ev-card">
        <div className="ev-card-title">Our Rooms</div>
        {rooms.map((r, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < rooms.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{r.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>{r.beds}{r.size_sqm ? ` · ${r.size_sqm} m²` : ''}</div>
            {r.base_rate && <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>{fmtMoney(r.base_rate)}/night</div>}
            <button className="ev-card-action" style={{ marginTop: 6 }} onClick={() => onSend(`Tell me more about the ${r.name}`)}>
              Learn more →
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (ev.type === 'transfer_options') {
    const opts = Array.isArray(d.options) ? d.options : (Array.isArray(d) ? d : []);
    return (
      <div className="ev-card">
        <div className="ev-card-title">Transfer Options</div>
        {opts.map((o, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < opts.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{o.name || o.vehicle_type}</div>
            <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>{o.description}</div>
            {o.price && <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>{fmtMoney(o.price)}</div>}
            <button className="ev-card-action" style={{ marginTop: 6 }} onClick={() => onSend(`Book the ${o.vehicle_type || o.name} transfer`)}>
              Book →
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (ev.type === 'handoff') {
    return (
      <div className="ev-card" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
        <div className="ev-card-title" style={{ color: '#D97706' }}>Connecting to Staff</div>
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#78350F' }}>
          {d.message || 'A staff member will be in touch with you shortly.'}
        </p>
      </div>
    );
  }

  return null;
}

const DEFAULT_SUGGESTIONS = [
  'Check room availability',
  'What experiences do you offer?',
  'Book airport transfer',
  'View my booking',
];

export default function Chat({ suggestions = DEFAULT_SUGGESTIONS, greeting = "Hello! I'm Siri 🙏 your AI concierge at Leisureville Sigiriya. How can I help you today?", user = null }) {
  const sidRef = useRef(newSid());
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState('');
  const [streamContent, setStreamContent] = useState('');
  const [streamEvents, setStreamEvents]   = useState([]);
  const [recording, setRecording]     = useState(false);
  const streamContentRef = useRef('');
  const streamEventsRef  = useRef([]);
  const recognitionRef   = useRef(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent, streamEvents, busy]);

  function clearStream() {
    streamContentRef.current = '';
    streamEventsRef.current  = [];
    setStreamContent('');
    setStreamEvents([]);
  }

  const send = useCallback(async (text) => {
    const msg = (typeof text === 'string' ? text : input).trim();
    if (!msg || busy) return;
    setInput('');
    setError('');
    setShowSuggestions(false);
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setBusy(true);
    clearStream();

    let gotDone = false;

    try {
      for await (const ev of streamChat(sidRef.current, msg)) {
        if (ev.type === 'token') {
          streamContentRef.current += ev.content;
          setStreamContent(streamContentRef.current);
          if (busy) setBusy(false);
        } else if (ev.type === 'event') {
          streamEventsRef.current = [...streamEventsRef.current, ev.event];
          setStreamEvents([...streamEventsRef.current]);
          if (busy) setBusy(false);
        } else if (ev.type === 'done') {
          gotDone = true;
          const fc = streamContentRef.current;
          const fe = streamEventsRef.current;
          setMessages(m => [...m, { role: 'assistant', content: fc, events: fe }]);
          clearStream();
        } else if (ev.type === 'error') {
          throw new Error(ev.message);
        }
      }
      if (!gotDone) {
        const fc = streamContentRef.current;
        const fe = streamEventsRef.current;
        if (fc || fe.length) {
          setMessages(m => [...m, { role: 'assistant', content: fc, events: fe }]);
        } else {
          setMessages(m => m.slice(0, -1));
          setError("Couldn't reach the server. Check your connection.");
          setInput(msg);
        }
        clearStream();
      }
    } catch (e) {
      setError(e.status === 503 ? 'The assistant is not configured yet.' : e.message || "Couldn't reach the server.");
      setMessages(m => m.slice(0, -1));
      setInput(msg);
      clearStream();
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [busy, input]);

  function toggleVoice() {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const SR = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput(prev => (prev ? prev + ' ' : '') + t);
      setRecording(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    rec.onerror = () => setRecording(false);
    rec.onend   = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }

  const hasSpeechAPI = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const hasGuestForm =
    messages.some(m => m.events?.some(e => e.type === 'guest_details_form')) ||
    streamEvents.some(e => e.type === 'guest_details_form');

  return (
    <div className="chat-wrap" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-av">S</div>
        <div className="chat-header-info">
          <strong>Siri</strong>
          <span>AI Concierge · Leisureville Sigiriya</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'block' }} />
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {/* Greeting */}
        <div className="chat-msg chat-msg-ai">
          <div className="chat-msg-ava">S</div>
          <div className="chat-msg-bubble">
            <p style={{ margin: 0 }}>{greeting}</p>
          </div>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role === 'user' ? 'user' : 'ai'}`}>
            <div className="chat-msg-ava">
              {m.role === 'user'
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                : 'S'
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {m.content && (
                <div className="chat-msg-bubble">
                  <RichText text={m.content} />
                </div>
              )}
              {m.role === 'assistant' && asksDates(m.content) && (
                <DateRangePicker key={`dp-${i}`} onSend={send} />
              )}
              {m.events?.map((ev, j) => (
                <EventCard key={j} ev={ev} onSend={send} user={user} />
              ))}
            </div>
          </div>
        ))}

        {/* Streaming AI message */}
        {(streamContent || streamEvents.length > 0) && (
          <div className="chat-msg chat-msg-ai">
            <div className="chat-msg-ava">S</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {streamContent && (
                <div className="chat-msg-bubble">
                  <RichText text={streamContent} />
                </div>
              )}
              {streamEvents.map((ev, j) => (
                <EventCard key={j} ev={ev} onSend={send} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {busy && !streamContent && streamEvents.length === 0 && (
          <div className="chat-typing">
            <span /><span /><span />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {showSuggestions && messages.length === 0 && (
        <div className="chat-suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="chat-chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* Guest form injected above input */}
      {hasGuestForm && (
        <div style={{ padding: '0 16px 8px' }}>
          <GuestForm onSend={send} prefill={user ?? {}} />
        </div>
      )}

      {/* Error */}
      {error && <div className="chat-error">{error}</div>}

      {/* Input */}
      <div className="chat-input-wrap">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          rows={1}
          placeholder={recording ? 'Listening…' : 'Ask me anything…'}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = '';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          disabled={busy}
        />
        {hasSpeechAPI && (
          <button
            onClick={toggleVoice}
            aria-label={recording ? 'Stop recording' : 'Voice input'}
            title={recording ? 'Stop recording' : 'Speak your message'}
            style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', flexShrink: 0,
              background: recording ? '#FEE2E2' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: recording ? '#DC2626' : '#8A7A6A',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {recording ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        )}
        <button
          className="chat-send"
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
