import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import VoiceOrb from "./VoiceOrb.jsx";

// Float32 PCM → base64 Int16 PCM (24kHz mono)
function f32ToB64(f32arr) {
  const i16 = new Int16Array(f32arr.length);
  for (let i = 0; i < f32arr.length; i++) {
    i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32arr[i] * 32767)));
  }
  const bytes = new Uint8Array(i16.buffer);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// base64 Int16 PCM → Float32 for AudioBuffer playback
function b64ToF32(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(bytes.buffer);
  const f32 = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
  return f32;
}

function fmt(n) {
  return n?.toLocaleString() ?? "—";
}

// ── Inline cards ──────────────────────────────────────────────────────────────

function VoiceAvailabilityCard({ data, accent, onSelect }) {
  return (
    <div className="va-event-card">
      <p className="va-event-card-title">Available Rooms</p>
      {(data.rooms || []).map((r) => (
        <div key={r.room_type} className="va-room-row">
          <div className="va-room-info">
            <span className="va-room-name">{r.name}</span>
            <span className="va-room-rate">
              {data.currency} {fmt(r.rate_per_night)}<small>/night</small>
            </span>
          </div>
          <button
            className="va-room-select"
            style={{ background: accent }}
            onClick={() => onSelect(r, data)}
          >
            Select
          </button>
        </div>
      ))}
    </div>
  );
}

function VoiceQuoteCard({ data, accent, onConfirm }) {
  const nights = data.nights || 1;
  return (
    <div className="va-event-card">
      <p className="va-event-card-title">Booking Quote</p>
      <div className="va-quote-rows">
        <div className="va-quote-row"><span>Room</span><span>{data.room_name}</span></div>
        <div className="va-quote-row"><span>Check-in</span><span>{data.check_in}</span></div>
        <div className="va-quote-row"><span>Check-out</span><span>{data.check_out}</span></div>
        <div className="va-quote-row"><span>Nights</span><span>{nights}</span></div>
        <div className="va-quote-row va-quote-total">
          <span>Total</span>
          <span>{data.currency} {fmt(data.total)}</span>
        </div>
      </div>
      <button
        className="va-confirm-btn"
        style={{ background: accent }}
        onClick={() => onConfirm(data)}
      >
        ✓ Confirm Booking
      </button>
    </div>
  );
}

function VoiceGuestForm({ accent, onSubmit }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errs,  setErrs]  = useState({});
  const [done,  setDone]  = useState(false);

  function validate() {
    const e = {};
    if (name.trim().length < 2)  e.name  = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = "Enter a valid email";
    if (phone.trim().replace(/[\s\-+()\d]/g, "").length > 0 || phone.trim().replace(/\D/g, "").length < 7)
      e.phone = "Enter a valid phone number";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    setDone(true);
    onSubmit(name.trim(), email.trim(), phone.trim());
  }

  if (done) {
    return (
      <div className="va-event-card">
        <p className="va-event-card-title" style={{ color: accent }}>✓ Details submitted</p>
      </div>
    );
  }

  return (
    <div className="va-event-card">
      <p className="va-event-card-title">Your Details</p>
      <div className="va-form-field">
        <label>Full Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
        {errs.name && <span className="va-form-err">{errs.name}</span>}
      </div>
      <div className="va-form-field">
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
        {errs.email && <span className="va-form-err">{errs.email}</span>}
      </div>
      <div className="va-form-field">
        <label>Phone</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 77 123 4567" />
        {errs.phone && <span className="va-form-err">{errs.phone}</span>}
      </div>
      <button className="va-confirm-btn" style={{ background: accent }} onClick={handleSubmit}>
        Continue →
      </button>
    </div>
  );
}

function VoiceBookingDone({ data, accent }) {
  return (
    <div className="va-event-card">
      <p className="va-event-card-title" style={{ color: accent }}>✓ Booking Confirmed</p>
      <div className="va-quote-rows">
        <div className="va-quote-row"><span>Reference</span><span style={{ fontWeight: 700 }}>{data.reference}</span></div>
        <div className="va-quote-row"><span>Room</span><span>{data.room}</span></div>
        <div className="va-quote-row"><span>Check-in</span><span>{data.check_in}</span></div>
        <div className="va-quote-row"><span>Check-out</span><span>{data.check_out}</span></div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VoiceAgent({ slug, onClose }) {
  const [prop,       setProp]       = useState(null);
  const [status,     setStatus]     = useState("idle");
  const [messages,   setMessages]   = useState([]);
  const [activeCard, setActiveCard] = useState(null); // {type, data}
  const [error,      setError]      = useState("");
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef          = useRef(null);
  const audioCtxRef    = useRef(null);
  const playCtxRef     = useRef(null);
  const streamRef      = useRef(null);
  const processorRef   = useRef(null);
  const analyserRef    = useRef(null);
  const nextStartRef   = useRef(0);
  const animFrameRef   = useRef(null);
  const transcriptRef  = useRef(null);
  const pendingAsstRef = useRef("");

  useEffect(() => {
    api.property(slug).then(setProp).catch(() => setError("Could not load property."));
  }, [slug]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeCard]);

  useEffect(() => () => { _disconnect(); }, []);

  // ── Audio helpers ─────────────────────────────────────────────────────────────

  function _enqueue(b64) {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    const f32 = b64ToF32(b64);
    if (!f32.length) return;
    const buf = ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    const at  = Math.max(now + 0.05, nextStartRef.current);
    src.start(at);
    nextStartRef.current = at + buf.duration;
  }

  function _stopAudio() {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    playCtxRef.current?.close().catch(() => {});
    playCtxRef.current = null;
    nextStartRef.current = 0;
  }

  function _disconnect() {
    const ws = wsRef.current;
    wsRef.current = null;
    ws?.close(1000);
    _stopAudio();
    setStatus("idle");
  }

  // ── Send text to OpenAI (card button interactions) ────────────────────────────

  function sendText(text) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    setMessages(m => [...m, { role: "user", text }]);
    ws.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    }));
    ws.send(JSON.stringify({ type: "response.create" }));
  }

  // ── Event handler ─────────────────────────────────────────────────────────────

  function _handleEvent(raw) {
    let ev;
    try { ev = JSON.parse(raw); } catch { return; }

    switch (ev.type) {
      case "session.created":
      case "session.updated":
        setStatus("ready");
        break;

      case "input_audio_buffer.speech_started":
        pendingAsstRef.current = "";
        setStatus("listening");
        break;

      case "input_audio_buffer.speech_stopped":
        setStatus("thinking");
        break;

      case "conversation.item.done":
        if (ev.item?.role === "user") {
          const transcript = ev.item?.content?.[0]?.transcript;
          if (transcript?.trim()) {
            setMessages(m => [...m, { role: "user", text: transcript.trim() }]);
          }
        }
        break;

      case "response.output_audio.delta":
        if (ev.delta) {
          setStatus("speaking");
          _enqueue(ev.delta);
        }
        break;

      case "response.output_audio_transcript.delta":
        pendingAsstRef.current += ev.delta || "";
        break;

      case "response.output_audio_transcript.done":
        if (pendingAsstRef.current.trim()) {
          setMessages(m => [...m, { role: "assistant", text: pendingAsstRef.current.trim() }]);
          pendingAsstRef.current = "";
        }
        break;

      case "response.done":
        setStatus("ready");
        nextStartRef.current = 0;
        break;

      // Backend-injected events from tool execution
      case "agent.event": {
        const aev = ev.event;
        if (!aev) break;
        if (aev.type === "availability_results") setActiveCard({ type: "availability", data: aev.data });
        else if (aev.type === "quote_result")    setActiveCard({ type: "quote",        data: aev.data });
        else if (aev.type === "guest_details_form") setActiveCard({ type: "guest_form", data: {} });
        else if (aev.type === "booking_created") setActiveCard({ type: "booking_done", data: aev.data });
        break;
      }

      case "error":
        setError(ev.error?.message || "Something went wrong.");
        setStatus("idle");
        break;

      default:
        break;
    }
  }

  // ── Connect ───────────────────────────────────────────────────────────────────

  async function connect() {
    if (wsRef.current || !prop) return;
    setError("");
    setActiveCard(null);
    setMessages([]);
    setStatus("connecting");

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
    } catch {
      setError("Microphone access denied.");
      setStatus("idle");
      return;
    }
    streamRef.current = stream;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    if (audioCtx.state === "suspended") await audioCtx.resume();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    analyserRef.current = analyser;
    source.connect(analyser);

    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    source.connect(processor);
    processor.connect(audioCtx.destination);

    const dataArr = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      animFrameRef.current = requestAnimationFrame(tick);
      analyser.getByteFrequencyData(dataArr);
      let sum = 0;
      for (let i = 0; i < dataArr.length; i++) sum += (dataArr[i] / 255) ** 2;
      setAudioLevel(Math.min(Math.sqrt(sum / dataArr.length) * 3.5, 1));
    };
    tick();

    const playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    playCtxRef.current = playCtx;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/api/properties/${slug}/voice/realtime`);
    wsRef.current = ws;

    ws.onopen = () => {
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: f32ToB64(e.inputBuffer.getChannelData(0)),
        }));
      };
    };

    ws.onmessage = (evt) => _handleEvent(evt.data);

    ws.onerror = () => {
      setError("Connection failed. Please try again.");
      _disconnect();
    };

    ws.onclose = (ev) => {
      if (ev.code !== 1000 && ev.code !== 1001 && wsRef.current) {
        setError("Session ended unexpectedly.");
      }
      wsRef.current = null;
      _stopAudio();
      setStatus("idle");
    };
  }

  // ── Card interaction handlers ─────────────────────────────────────────────────

  function handleSelectRoom(room, data) {
    setActiveCard(null);
    sendText(
      `I'd like to book the ${room.name} (room type: ${room.room_type}) — ` +
      `${data.check_in} to ${data.check_out}, ${data.adults} adult${data.adults !== 1 ? "s" : ""}` +
      `${data.children ? ` and ${data.children} child${data.children !== 1 ? "ren" : ""}` : ""}, ` +
      `${data.meal_plan || "RO"}.`
    );
  }

  function handleConfirmBooking(data) {
    setActiveCard(null);
    sendText(`Yes, please confirm my booking for ${data.room_name}, ` +
      `${data.check_in} to ${data.check_out}. Total: ${data.currency} ${fmt(data.total)}.`);
  }

  function handleGuestSubmit(name, email, phone) {
    sendText(`Name: ${name}\nEmail: ${email}\nPhone: ${phone}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const connected     = status !== "idle" && status !== "connecting";
  const accent        = prop?.accent || "#2f5d3a";
  const assistantName = prop?.assistant_name || "Concierge";

  const orbLevel =
    status === "listening" ? audioLevel :
    status === "speaking"  ? 0.45 :
    status === "thinking"  ? 0.15 : 0;

  const statusLabel = {
    idle:       "Tap mic to start",
    connecting: "Connecting...",
    ready:      "Listening for your voice...",
    listening:  "I hear you...",
    thinking:   "Thinking...",
    speaking:   "Speaking...",
  }[status] || " ";

  return (
    <div
      className="va-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="Voice concierge"
    >
      <div className="va-card" style={{ "--accent": accent }}>

        <button className="va-close" onClick={onClose} aria-label="Close voice agent">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="va-orb-wrap" aria-hidden="true">
          <VoiceOrb audioLevel={orbLevel} hue={status === "speaking" ? 40 : 0} />
        </div>
        <p className="va-name">{assistantName}</p>
        <p className="va-hotel">{prop?.name || "\xa0"}</p>
        <p className={`va-status${status !== "idle" ? " va-status-active" : ""}`}>
          {statusLabel}
        </p>

        {/* Transcript + inline cards */}
        <div className="va-transcript" ref={transcriptRef} aria-live="polite">
          {messages.length === 0 && !activeCard ? (
            <p className="va-transcript-empty">Your conversation will appear here</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`va-msg va-msg-${m.role}`}>
                <span className="va-msg-text">{m.text}</span>
              </div>
            ))
          )}

          {activeCard?.type === "availability" && (
            <VoiceAvailabilityCard
              data={activeCard.data}
              accent={accent}
              onSelect={handleSelectRoom}
            />
          )}
          {activeCard?.type === "quote" && (
            <VoiceQuoteCard
              data={activeCard.data}
              accent={accent}
              onConfirm={handleConfirmBooking}
            />
          )}
          {activeCard?.type === "guest_form" && (
            <VoiceGuestForm accent={accent} onSubmit={handleGuestSubmit} />
          )}
          {activeCard?.type === "booking_done" && (
            <VoiceBookingDone data={activeCard.data} accent={accent} />
          )}
        </div>

        {error && <p className="va-error" role="alert">{error}</p>}

        <button
          className={`va-mic${connected ? " va-mic-recording" : ""}${status === "connecting" ? " va-mic-busy" : ""}`}
          onClick={() => connected ? _disconnect() : connect()}
          disabled={status === "connecting" || !prop}
          aria-label={connected ? "End voice session" : "Start voice session"}
        >
          {status === "connecting" ? (
            <span className="va-spinner" aria-hidden="true" />
          ) : connected ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" stroke="none" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2" width="6" height="13" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" />
            </svg>
          )}
        </button>

        <p className="va-hint" aria-live="polite">
          {connected ? "Tap to end session" : "Tap to start voice session"}
        </p>

      </div>
    </div>
  );
}
