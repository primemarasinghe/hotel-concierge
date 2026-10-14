/* Embeddable concierge widget.
 * <script src="https://YOUR-HOST/embed.js" data-property="kandy-hills" data-accent="#2f5d3a" defer></script>
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var slug = script.getAttribute("data-property");
  if (!slug) return console.warn("[concierge] data-property is required");
  var origin = new URL(script.src).origin;
  var accent = script.getAttribute("data-accent") || "#2f5d3a";

  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Chat with the concierge");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  btn.style.cssText =
    "position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;" +
    "color:#fff;background:" + accent + ";box-shadow:0 6px 20px rgba(20,30,25,.25);z-index:2147483000;display:grid;place-items:center";

  var frame = document.createElement("iframe");
  frame.src = origin + "/widget/" + encodeURIComponent(slug);
  frame.title = "Concierge chat";
  frame.style.cssText =
    "position:fixed;right:20px;bottom:20px;width:min(400px,calc(100vw - 24px));height:min(640px,calc(100vh - 40px));" +
    "border:0;border-radius:16px;box-shadow:0 12px 40px rgba(20,30,25,.28);z-index:2147483001;display:none;background:#fff";

  function setOpen(open) {
    frame.style.display = open ? "block" : "none";
    btn.style.display = open ? "none" : "grid";
  }
  btn.addEventListener("click", function () { setOpen(true); });
  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.type === "hc-close") setOpen(false);
  });

  document.body.appendChild(btn);
  document.body.appendChild(frame);
})();
