/* Hotel Concierge — embeddable widget loader
 *
 * Usage (paste before </body> on any website):
 *   <script src="https://YOUR-HOST/embed.js"
 *           data-property="your-property-slug"
 *           data-accent="#2f5d3a"
 *           data-position="right"
 *           defer></script>
 *
 * Attributes:
 *   data-property  (required) — your property slug
 *   data-accent    — button/theme colour  (default: #2f5d3a)
 *   data-position  — "right" | "left"     (default: right)
 *   data-label     — aria-label text      (default: "Chat with us")
 */
(function () {
  if (window.__hcLoaded) return;
  window.__hcLoaded = true;

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();

  var slug     = script.getAttribute("data-property");
  var accent   = script.getAttribute("data-accent")   || "#2f5d3a";
  var pos      = script.getAttribute("data-position") || "right";
  var label    = script.getAttribute("data-label")    || "Chat with us";
  var origin   = new URL(script.src).origin;

  if (!slug) { console.warn("[HotelConcierge] data-property is required"); return; }

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  var side = pos === "left" ? "left" : "right";
  var css = [
    "#hc-btn{position:fixed;bottom:24px;" + side + ":24px;z-index:2147483000;",
    "width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;",
    "background:" + accent + ";color:#fff;",
    "box-shadow:0 4px 20px rgba(0,0,0,.26);",
    "display:grid;place-items:center;",
    "transition:transform .18s,box-shadow .18s;}",

    "#hc-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,.32);}",
    "#hc-btn svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;",
    "stroke-linecap:round;stroke-linejoin:round;}",

    "#hc-badge{position:absolute;top:-3px;" + (side === "right" ? "left" : "right") + ":-3px;",
    "min-width:18px;height:18px;padding:0 4px;border-radius:9px;",
    "background:#ef4444;color:#fff;font:600 11px/18px system-ui,sans-serif;",
    "text-align:center;display:none;pointer-events:none;}",

    "#hc-wrap{position:fixed;bottom:92px;" + side + ":24px;z-index:2147483001;",
    "width:min(400px,calc(100vw - 32px));",
    "height:min(620px,calc(100dvh - 112px));",
    "border-radius:16px;overflow:hidden;",
    "box-shadow:0 10px 40px rgba(0,0,0,.24);",
    "opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;",
    "transition:opacity .22s ease,transform .22s ease;}",

    "#hc-wrap.hc-open{opacity:1;transform:none;pointer-events:all;}",
    "#hc-frame{width:100%;height:100%;border:0;display:block;background:#fff;}",

    "@media(max-width:480px){",
    "#hc-wrap{bottom:0;left:0;right:0;width:100%;border-radius:16px 16px 0 0;",
    "height:82dvh;max-height:82dvh;}",
    "#hc-btn{bottom:16px;" + side + ":16px;}",
    "}",
  ].join("");

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── Button ──────────────────────────────────────────────────────────────── */
  var btn = document.createElement("button");
  btn.id = "hc-btn";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("aria-expanded", "false");

  var badge = document.createElement("span");
  badge.id = "hc-badge";
  badge.setAttribute("aria-live", "polite");
  btn.appendChild(badge);

  var iconChat = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var iconClose = '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  btn.insertAdjacentHTML("beforeend", iconChat);

  /* ── Frame container ─────────────────────────────────────────────────────── */
  var wrap = document.createElement("div");
  wrap.id = "hc-wrap";
  wrap.setAttribute("aria-hidden", "true");

  var frame = document.createElement("iframe");
  frame.id = "hc-frame";
  frame.title = "Hotel Concierge Chat";
  frame.setAttribute("allow", "microphone");
  frame.setAttribute("loading", "lazy");
  wrap.appendChild(frame);

  document.body.appendChild(btn);
  document.body.appendChild(wrap);

  /* ── State ───────────────────────────────────────────────────────────────── */
  var isOpen = false;
  var frameLoaded = false;
  var unread = 0;

  function open() {
    if (!frameLoaded) {
      frame.src = origin + "/widget/" + encodeURIComponent(slug);
      frameLoaded = true;
    }
    isOpen = true;
    unread = 0;
    badge.style.display = "none";
    wrap.classList.add("hc-open");
    wrap.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    btn.querySelector("svg").remove();
    btn.insertAdjacentHTML("beforeend", iconClose);
  }

  function close() {
    isOpen = false;
    wrap.classList.remove("hc-open");
    wrap.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.querySelector("svg").remove();
    btn.insertAdjacentHTML("beforeend", iconChat);
  }

  btn.addEventListener("click", function () {
    if (isOpen) close(); else open();
  });

  window.addEventListener("message", function (e) {
    if (e.origin !== origin) return;
    if (!e.data) return;
    if (e.data.type === "hc-close") close();
    if (e.data.type === "hc-unread" && !isOpen) {
      unread++;
      badge.textContent = unread > 9 ? "9+" : String(unread);
      badge.style.display = "block";
    }
  });

  /* ── Keyboard: Escape closes the panel ──────────────────────────────────── */
  document.addEventListener("keydown", function (e) {
    if (isOpen && (e.key === "Escape" || e.keyCode === 27)) close();
  });
})();
