import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import Demo from "./Demo.jsx";
import Admin from "./Admin.jsx";
import ChatPanel from "./ChatPanel.jsx";
import VoiceAgent from "./VoiceAgent.jsx";
import BookingLookup from "./BookingLookup.jsx";
import "./styles.css";

function WidgetPage({ slug }) {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const embedded = window.parent !== window;
  const onClose = embedded ? () => window.parent.postMessage({ type: "hc-close" }, "*") : undefined;
  return (
    <>
      <ChatPanel
        slug={slug}
        fill
        onClose={onClose}
        onOpenVoice={() => setVoiceOpen(true)}
      />
      {voiceOpen && (
        <VoiceAgent key={slug} slug={slug} onClose={() => setVoiceOpen(false)} />
      )}
    </>
  );
}

// Tiny path router: /admin, /booking, /widget/<slug>, / (demo host site)
function App() {
  const path = window.location.pathname;
  if (path.startsWith("/admin")) {
    const m = path.match(/^\/admin\/([\w-]+)/);
    return <Admin urlSlug={m ? m[1] : null} />;
  }
  if (path.startsWith("/booking")) return <BookingLookup />;
  const m = path.match(/^\/widget\/([\w-]+)/);
  if (m) return <WidgetPage slug={m[1]} />;
  return <Demo />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
