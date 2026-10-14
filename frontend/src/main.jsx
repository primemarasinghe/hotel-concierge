import React from "react";
import { createRoot } from "react-dom/client";
import Demo from "./Demo.jsx";
import Admin from "./Admin.jsx";
import ChatPanel from "./ChatPanel.jsx";
import BookingLookup from "./BookingLookup.jsx";
import "./styles.css";

// Tiny path router: /admin, /booking, /widget/<slug>, / (demo host site)
function App() {
  const path = window.location.pathname;
  if (path.startsWith("/admin"))   return <Admin />;
  if (path.startsWith("/booking")) return <BookingLookup />;
  const m = path.match(/^\/widget\/([\w-]+)/);
  if (m) {
    const embedded = window.parent !== window;
    return (
      <ChatPanel
        slug={m[1]}
        fill
        onClose={embedded ? () => window.parent.postMessage({ type: "hc-close" }, "*") : undefined}
      />
    );
  }
  return <Demo />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
