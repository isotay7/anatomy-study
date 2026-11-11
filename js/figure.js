/* Textbook figures: cropped image + blank boxes over printed labels + pulsing markers.
   All coordinates are percentages of the full image, so they line up at any size. */
const Figures = (() => {
  const OVERRIDE_KEY = "anatomyStudy.setup.v1";
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}"); } catch (e) {}

  // figure data, with any unsaved setup-mode edits on this device applied
  function get(deck, id) {
    const base = deck.figures && deck.figures[id];
    if (!base) return null;
    const o = overrides[deck.id + "/" + id];
    return o ? Object.assign({}, base, o) : base;
  }
  function saveOverride(deck, id, data) {
    overrides[deck.id + "/" + id] = data;
    try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides)); } catch (e) {}
  }
  function clearOverride(deck, id) {
    delete overrides[deck.id + "/" + id];
    try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides)); } catch (e) {}
  }
  const hasOverride = (deck, id) => !!overrides[deck.id + "/" + id];

  // which figure shows this term (first figure with a marker for it)
  function forTerm(deck, term) {
    for (const id of Object.keys(deck.figures || {})) {
      const f = get(deck, id);
      if (f.markers && f.markers[term.term]) return { id, fig: f };
    }
    return null;
  }

  const pct = n => n + "%";
  const box = (b, cls, inner = "") =>
    `<div class="${cls}" style="left:${pct(b[0])};top:${pct(b[1])};width:${pct(b[2])};height:${pct(b[3])}">${inner}</div>`;

  /* Inner layer: the whole image at 100% width, with overlays. */
  function layer(fig, { markers = [], boxes = "mask", extra = "" } = {}) {
    let s = `<div class="fig-layer" style="aspect-ratio:${fig.w}/${fig.h};--fs:${fig.fs || 1.6}">`;
    s += `<img class="fig-img" src="${fig.src}" alt="" draggable="false" onerror="Figures.failed(this)">`;
    if (boxes === "mask") for (const b of fig.boxes) s += box(b, "fig-mask");
    for (const [x, y] of markers) s += `<div class="fig-marker" style="left:${pct(x)};top:${pct(y)}"><i></i></div>`;
    return s + extra + `</div>`;
  }

  /* A cropped view of the figure: [x, y, w, h] in % of the image. */
  function view(fig, v, layerHTML, cls = "", attrs = "") {
    const [vx, vy, vw, vh] = v || fig.view || [0, 0, 100, 100];
    const ratio = (vw * fig.w) / (vh * fig.h);
    return `<div class="fig ${cls}" ${attrs} style="aspect-ratio:${ratio.toFixed(4)}">
      <div class="fig-zoom"><div class="fig-pan"><div class="fig-crop" style="width:${(10000 / vw).toFixed(3)}%;left:${(-vx * 100 / vw).toFixed(3)}%;top:${(-vy * 100 / vh).toFixed(3)}%">${layerHTML}</div></div></div>
    </div>`;
  }

  /* Picture for a term: crop + all labels hidden + pulsing marker(s). */
  function termPic(deck, term, { full = false } = {}) {
    const hit = forTerm(deck, term);
    if (!hit) return null;
    const { fig, id } = hit;
    const v = full ? [0, 0, 100, 100] : (fig.views && fig.views[term.term]) || fig.view;
    return view(fig, v, layer(fig, { markers: fig.markers[term.term] }), "fig-term", `data-fig="${id}"`);
  }

  // image failed (offline and not cached): fall back to the drawn diagram
  function failed(img) {
    const fig = img.closest(".fig");
    if (fig) fig.classList.add("fig-broken");
    document.dispatchEvent(new CustomEvent("figure-failed", { detail: fig }));
  }

  // Deck-file text for one figure (setup mode "Copy coordinates" uses this)
  function serialize(id, f) {
    const n = v => +(+v).toFixed(2);
    const arr = a => "[" + a.map(v => (typeof v === "string" ? JSON.stringify(v) : n(v))).join(", ") + "]";
    const L = [];
    L.push(`    ${JSON.stringify(id)}: {`);
    L.push(`      title: ${JSON.stringify(f.title)}, src: ${JSON.stringify(f.src)}, w: ${f.w}, h: ${f.h}, fs: ${n(f.fs || 1.6)},`);
    L.push(`      credit: ${JSON.stringify(f.credit || {})},`);
    L.push(`      view: ${arr(f.view || [0, 0, 100, 100])},`);
    L.push(`      // [x, y, width, height] in % of the image. A 5th value makes it a Label-the-Diagram drop box.`);
    L.push(`      boxes: [`);
    for (const b of f.boxes || []) L.push(`        ${arr(b)},`);
    L.push(`      ],`);
    L.push(`      // pulsing highlight(s) for each term, [x, y] in %`);
    L.push(`      markers: {`);
    for (const [k, pts] of Object.entries(f.markers || {})) L.push(`        ${JSON.stringify(k)}: [${pts.map(arr).join(", ")}],`);
    L.push(`      },`);
    L.push(`      // optional crop per term (otherwise "view" is used)`);
    L.push(`      views: {`);
    for (const [k, v] of Object.entries(f.views || {})) L.push(`        ${JSON.stringify(k)}: ${arr(v)},`);
    L.push(`      },`);
    L.push(`    },`);
    return L.join("\n");
  }

  return { get, forTerm, layer, view, termPic, failed, saveOverride, clearOverride, hasOverride, box, serialize };
})();

/* ---------- pinch / pan zoom for any .fig ---------- */
function makeZoom(fig, { onTap, doubleTap = true, max = 6 } = {}) {
  const vp = fig.querySelector(".fig-zoom"), inner = vp.firstElementChild;
  let s = 1, tx = 0, ty = 0;
  const pts = new Map();
  let g = null, moved = false, lastTap = 0, swallowClick = false;
  vp.style.touchAction = "none";

  const apply = (animate) => {
    inner.style.transition = animate ? "transform .25s cubic-bezier(.2,.8,.2,1)" : "none";
    inner.style.transform = `translate(${tx}px,${ty}px) scale(${s})`;
    fig.classList.toggle("zoomed", s > 1.01);
  };
  const clamp = () => {
    const W = vp.clientWidth, H = vp.clientHeight;
    s = Math.max(1, Math.min(max, s));
    tx = Math.min(0, Math.max(W - W * s, tx));
    ty = Math.min(0, Math.max(H - H * s, ty));
  };
  const zoomAt = (ns, cx, cy, animate) => {
    const r = vp.getBoundingClientRect(), px = cx - r.left, py = cy - r.top;
    const ix = (px - tx) / s, iy = (py - ty) / s;
    s = Math.max(1, Math.min(max, ns));
    tx = px - ix * s; ty = py - iy * s;
    clamp(); apply(animate);
  };

  vp.addEventListener("pointerdown", e => {
    if (e.target.closest(".chip:not(.locked), .no-pan")) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { vp.setPointerCapture(e.pointerId); } catch (_) {}
    if (pts.size === 1) { g = { x: e.clientX, y: e.clientY, tx, ty }; moved = false; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      g = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y), s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx, ty };
      moved = true;
    }
  });
  vp.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId) || !g) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pinch && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const r = vp.getBoundingClientRect();
      const ix = (g.mx - r.left - g.tx) / g.s, iy = (g.my - r.top - g.ty) / g.s;
      s = Math.max(1, Math.min(max, g.s * d / g.d));
      tx = mx - r.left - ix * s; ty = my - r.top - iy * s;
      clamp(); apply(false);
    } else if (!g.pinch) {
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (Math.hypot(dx, dy) > 6) moved = true;
      if (moved && s > 1.01) { tx = g.tx + dx; ty = g.ty + dy; clamp(); apply(false); }
    }
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size === 1 && g && g.pinch) { const [p] = [...pts.values()]; g = { x: p.x, y: p.y, tx, ty }; return; }
    if (pts.size) return;
    if (moved) { swallowClick = true; setTimeout(() => (swallowClick = false), 50); }
    else if (e.type === "pointerup") {
      const now = Date.now();
      if (doubleTap && now - lastTap < 300) { zoomAt(s > 1.5 ? 1 : 2.5, e.clientX, e.clientY, true); lastTap = 0; }
      else { lastTap = now; onTap && onTap(e); }
    }
    g = null;
  };
  vp.addEventListener("pointerup", end);
  vp.addEventListener("pointercancel", end);
  vp.addEventListener("click", e => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); } }, true);
  // trackpad pinch / ctrl+wheel on a laptop
  vp.addEventListener("wheel", e => {
    if (!e.ctrlKey && s <= 1.01) return;
    e.preventDefault();
    if (e.ctrlKey) zoomAt(s * Math.exp(-e.deltaY / 200), e.clientX, e.clientY, false);
    else { tx -= e.deltaX; ty -= e.deltaY; clamp(); apply(false); }
  }, { passive: false });
  // stop iOS Safari from zooming the whole page
  ["gesturestart", "gesturechange"].forEach(t => vp.addEventListener(t, e => e.preventDefault()));

  return {
    reset() { s = 1; tx = 0; ty = 0; apply(true); },
    zoomBy(f) { const r = vp.getBoundingClientRect(); zoomAt(s * f, r.left + r.width / 2, r.top + r.height / 2, true); },
    get scale() { return s; },
  };
}

/* Full-screen zoom viewer */
function openLightbox(html, title = "") {
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<div class="lb-top"><span>${title}</span><button class="btn small" id="lbClose">Done</button></div>
    <div class="lb-body">${html}</div><p class="lb-hint">Pinch or double-tap to zoom</p>`;
  document.body.appendChild(lb);
  document.body.classList.add("noscroll");
  const fig = lb.querySelector(".fig");
  if (fig) makeZoom(fig, {});
  const close = () => { lb.classList.add("closing"); document.body.classList.remove("noscroll"); setTimeout(() => lb.remove(), 200); window.removeEventListener("hashchange", close); };
  lb.querySelector("#lbClose").onclick = close;
  window.addEventListener("hashchange", close);
  requestAnimationFrame(() => lb.classList.add("show"));
}
