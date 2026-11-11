/* ============ Setup mode: open the app with #setup ============
   Drag boxes, highlight markers and crops into place on each figure, then
   "Copy coordinates" and paste over that figure's block in the deck file.
   Edits also apply on THIS device right away (saved in localStorage) so you can
   try them in the games before pasting. */
function Setup(deckId, figId) {
  const deck = DECKS[deckId] || DECKS[DECK_ORDER[0]];
  const figIds = Object.keys((deck && deck.figures) || {});
  if (!figIds.length) { bar.set({ title: "Setup", back: "#/" }); mount(`<p class="muted">No figures in this topic.</p>`); return; }
  if (!figIds.includes(figId)) figId = figIds[0];
  bar.set({ title: "Setup", back: "#/deck/" + deck.id });

  const clone = o => JSON.parse(JSON.stringify(o));
  const W = clone(Figures.get(deck, figId));             // working copy
  W.boxes = W.boxes || []; W.markers = W.markers || {}; W.views = W.views || {};
  const termNames = deck.terms.map(t => t.term);
  const labelNames = [...new Set([
    ...(deck.labels ? deck.labels.items.map(i => i.label) : []),
    ...Object.values(deck.figures).flatMap(f => f.boxes.filter(b => b[4]).map(b => b[4])),
  ])].sort();
  const S = { mode: "boxes", term: Object.keys(W.markers)[0] || termNames[0], sel: null };
  const r2 = n => Math.round(n * 100) / 100;
  const save = () => {
    Figures.saveOverride(deck, figId, { view: W.view, boxes: W.boxes, markers: W.markers, views: W.views });
    $("#edited", v).hidden = false;
  };

  const v = mount(`
    <div class="setup-top">
      <select id="figSel">${figIds.map(id => `<option value="${id}" ${id === figId ? "selected" : ""}>${esc(deck.figures[id].title)}</option>`).join("")}</select>
      <div class="seg" id="modes">
        <button data-m="boxes">Boxes</button><button data-m="markers">Markers</button><button data-m="crops">Crops</button>
      </div>
    </div>
    <div class="setup-help muted" id="help"></div>
    <div class="setup-tools" id="tools"></div>
    <div class="card setup-board">
      <div id="board"></div>
      <div class="zoom-ctl"><button class="btn small" id="zout">−</button><button class="btn small" id="zin">+</button><button class="btn small" id="zreset">Fit</button><span class="muted">Pinch or ctrl+scroll to zoom, drag the background to pan</span></div>
    </div>
    <div class="setup-bottom">
      <button class="btn primary" id="copy">Copy coordinates</button>
      <button class="btn" id="preview">Preview in games</button>
      <button class="btn bad" id="discard">Discard edits</button>
    </div>
    <p class="muted small-note" id="edited" ${Figures.hasOverride(deck, figId) ? "" : "hidden"}>Edits are saved on this device only. Copy them into <code>decks/${esc(deck.id)}.js</code> to give them to everyone.</p>
    <textarea id="out" class="setup-out" readonly hidden></textarea>`, "setup");

  let zoom = null;
  function drawBoard() {
    let extra = "";
    if (S.mode === "boxes") {
      W.boxes.forEach((b, i) => {
        extra += `<div class="ed ed-box${b[4] ? " named" : ""}${S.sel === i ? " sel" : ""}" data-k="box" data-i="${i}" style="left:${b[0]}%;top:${b[1]}%;width:${b[2]}%;height:${b[3]}%">
          <span>${esc(b[4] || "")}</span><i class="ed-handle" data-h="1"></i></div>`;
      });
    } else if (S.mode === "markers") {
      for (const [term, pts] of Object.entries(W.markers)) {
        pts.forEach((p, j) => {
          const on = term === S.term;
          extra += `<div class="ed ed-marker${on ? " on" : ""}${on && S.sel === j ? " sel" : ""}" data-k="mk" data-t="${esc(term)}" data-j="${j}" style="left:${p[0]}%;top:${p[1]}%"><i></i>${on ? "" : `<b>${esc(term)}</b>`}</div>`;
        });
      }
    } else {
      const isDefault = S.term === "__view";
      const c = isDefault ? W.view : W.views[S.term] || null;
      if (c) extra += `<div class="ed ed-crop" data-k="crop" style="left:${c[0]}%;top:${c[1]}%;width:${c[2]}%;height:${c[3]}%"><span>${isDefault ? "Default crop" : esc(S.term)}</span><i class="ed-handle" data-h="1"></i></div>`;
      const pts = !isDefault && W.markers[S.term];
      if (pts) pts.forEach(p => (extra += `<div class="fig-marker" style="left:${p[0]}%;top:${p[1]}%"><i></i></div>`));
    }
    // in Boxes mode show the real image with boxes as outlines; otherwise show it masked
    const layer = Figures.layer(W, { boxes: S.mode === "boxes" ? "none" : "mask", extra });
    $("#board", v).innerHTML = Figures.view(W, [0, 0, 100, 100], layer, "fig-setup");
    zoom = makeZoom($(".fig-setup", v), { doubleTap: false, max: 10 });
  }

  function drawTools() {
    $$("#modes button", v).forEach(b => b.classList.toggle("on", b.dataset.m === S.mode));
    const help = {
      boxes: "Every printed label needs a box over it. Boxes with a name become drop boxes in Label the Diagram; blank boxes just hide the text. Drag to move, drag the corner to resize.",
      markers: "Pick a term, then drag its glowing circle(s) onto the structure. Terms can have more than one circle (e.g. R and L).",
      crops: "The picture shown for a term is cropped to this rectangle. Pick a term to give it its own crop, or edit the figure's default crop.",
    }[S.mode];
    $("#help", v).textContent = help;
    let t = "";
    if (S.mode === "boxes") {
      const b = S.sel != null && W.boxes[S.sel];
      t = `<button class="btn small" id="addBox">+ Box</button>` + (b ? `
        <select id="boxName"><option value="">(blank — just hides text)</option>${labelNames.map(n => `<option ${b[4] === n ? "selected" : ""}>${esc(n)}</option>`).join("")}<option value="__new">New name…</option></select>
        <button class="btn small bad" id="delBox">Delete box</button>` : `<span class="muted">Tap a box to select it</span>`);
    } else {
      const terms = S.mode === "crops" ? [["__view", "(figure default crop)"], ...termNames.map(n => [n, n])] : termNames.map(n => [n, n]);
      t = `<select id="termSel">${terms.map(([val, name]) => `<option value="${esc(val)}" ${val === S.term ? "selected" : ""}>${esc(name)}${S.mode === "markers" && W.markers[val] ? " ●" : ""}${S.mode === "crops" && W.views[val] ? " ▭" : ""}</option>`).join("")}</select>`;
      if (S.mode === "markers") t += `<button class="btn small" id="addMk">+ Circle</button>${W.markers[S.term] && W.markers[S.term].length ? `<button class="btn small bad" id="delMk">Remove circle</button>` : ""}`;
      else if (S.term !== "__view") t += W.views[S.term] ? `<button class="btn small bad" id="delCrop">Use default crop</button>` : `<button class="btn small" id="addCrop">Own crop</button>`;
    }
    $("#tools", v).innerHTML = t;
    const on = (id, fn) => { const el = $("#" + id, v); if (el) el.onclick = fn; };
    on("addBox", () => { W.boxes.push([45, 45, 12, 4]); S.sel = W.boxes.length - 1; save(); redraw(); });
    on("delBox", () => { W.boxes.splice(S.sel, 1); S.sel = null; save(); redraw(); });
    const bn = $("#boxName", v);
    if (bn) bn.onchange = () => {
      let name = bn.value;
      if (name === "__new") name = (prompt("Label text (as it should appear on the chip):") || "").trim();
      const b = W.boxes[S.sel]; b.length = 4; if (name) b.push(name);
      if (name && !labelNames.includes(name)) labelNames.push(name);
      save(); redraw();
    };
    const ts = $("#termSel", v);
    if (ts) ts.onchange = () => { S.term = ts.value; S.sel = null; redraw(); };
    on("addMk", () => { (W.markers[S.term] = W.markers[S.term] || []).push([50, 50]); S.sel = W.markers[S.term].length - 1; save(); redraw(); });
    on("delMk", () => {
      const pts = W.markers[S.term]; pts.splice(S.sel != null && pts[S.sel] ? S.sel : pts.length - 1, 1);
      if (!pts.length) delete W.markers[S.term];
      S.sel = null; save(); redraw();
    });
    on("addCrop", () => { W.views[S.term] = (W.view || [0, 0, 100, 100]).slice(); save(); redraw(); });
    on("delCrop", () => { delete W.views[S.term]; save(); redraw(); });
  }
  const redraw = () => { drawTools(); drawBoard(); };

  // dragging boxes / markers / crops (coordinates in % of the image)
  $("#board", v).addEventListener("pointerdown", e => {
    const el = e.target.closest(".ed");
    if (!el) return;
    e.stopPropagation(); e.preventDefault();
    const layer = el.closest(".fig-layer").getBoundingClientRect();
    const resize = !!e.target.closest(".ed-handle");
    const k = el.dataset.k;
    let ref;
    if (k === "box") { S.sel = +el.dataset.i; ref = W.boxes[S.sel]; }
    else if (k === "mk") { S.term = el.dataset.t; S.sel = +el.dataset.j; ref = W.markers[S.term][S.sel]; }
    else ref = S.term === "__view" ? W.view : W.views[S.term];
    const start = ref.slice(0, 4), sx = e.clientX, sy = e.clientY;
    $$(".ed.sel", v).forEach(x => x.classList.remove("sel")); el.classList.add("sel");
    el.setPointerCapture(e.pointerId);
    const move = ev => {
      const dx = (ev.clientX - sx) / layer.width * 100, dy = (ev.clientY - sy) / layer.height * 100;
      if (k === "mk") { ref[0] = r2(start[0] + dx); ref[1] = r2(start[1] + dy); el.style.left = ref[0] + "%"; el.style.top = ref[1] + "%"; return; }
      if (resize) { ref[2] = r2(Math.max(0.5, start[2] + dx)); ref[3] = r2(Math.max(0.5, start[3] + dy)); }
      else { ref[0] = r2(start[0] + dx); ref[1] = r2(start[1] + dy); }
      Object.assign(el.style, { left: ref[0] + "%", top: ref[1] + "%", width: ref[2] + "%", height: ref[3] + "%" });
    };
    const up = () => {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      save(); drawTools();
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }, true);

  $$("#modes button", v).forEach(b => b.onclick = () => {
    S.mode = b.dataset.m; S.sel = null;
    if (S.mode === "crops" && !S.term) S.term = "__view";
    if (S.mode === "markers" && S.term === "__view") S.term = Object.keys(W.markers)[0] || termNames[0];
    redraw();
  });
  $("#figSel", v).onchange = e => { location.hash = `#/setup/${deck.id}/${e.target.value}`; };
  $("#zin", v).onclick = () => zoom.zoomBy(1.6);
  $("#zout", v).onclick = () => zoom.zoomBy(1 / 1.6);
  $("#zreset", v).onclick = () => zoom.reset();
  $("#copy", v).onclick = async () => {
    const text = Figures.serialize(figId, W);
    const out = $("#out", v); out.hidden = false; out.value = text;
    try { await navigator.clipboard.writeText(text); toast("Copied! Paste over the \"" + figId + "\" block"); }
    catch (err) { out.select(); toast("Select the text below and copy it"); }
  };
  $("#preview", v).onclick = () => { location.hash = `#/deck/${deck.id}/label/${figId}`; };
  $("#discard", v).onclick = () => {
    if (!confirm("Throw away your edits to this figure on this device?")) return;
    Figures.clearOverride(deck, figId); Setup(deck.id, figId);
  };
  redraw();
}
