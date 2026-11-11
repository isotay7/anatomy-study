/* ============ Anatomy Lab Study: app shell, home, topic page ============ */
const DECKS = {}, DECK_ORDER = [];
function registerDeck(deck) {
  if (!deck || !deck.id || !Array.isArray(deck.terms)) { console.warn("Bad deck", deck); return; }
  deck.diagrams = deck.diagrams || {};
  if (!DECKS[deck.id]) DECK_ORDER.push(deck.id);
  DECKS[deck.id] = deck;
}

/* ---------- helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = n => Array.from({ length: n }, (_, i) => i);
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Picture for a term: textbook figure (default), or the drawn diagram in Simple view / as a fallback. */
const simpleView = () => Store.setting("simple") === true;
function drawnPic(deck, term, opts = {}) {
  const D = deck.diagrams[term.pic];
  if (!D) return `<div class="nopic">${esc(term.def)}</div>`;
  return Diagram.render(D, { show: term.show || [], sides: opts.sides, label: "Highlighted structure" });
}
function pic(deck, term, opts = {}) {
  const ti = deck.terms.indexOf(term);
  let inner = null;
  if (term.img) inner = `<img class="photo" src="${esc(term.img)}" alt="" loading="lazy" draggable="false">`;
  else if (!simpleView() && !opts.drawn) inner = Figures.termPic(deck, term);
  const isFig = !!inner && !term.img;
  if (!inner) inner = drawnPic(deck, term, opts);
  const zoomBtn = isFig && opts.zoomBtn !== false
    ? `<button class="zoom-btn no-pan" data-ti="${ti}" aria-label="Zoom picture"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/></svg></button>` : "";
  return `<div class="pic${isFig ? " is-fig" : ""}" data-deck="${esc(deck.id)}" data-ti="${ti}">${inner}${zoomBtn}</div>`;
}
const hasPic = (deck, t) => !!(t.img || deck.diagrams[t.pic] || Figures.forTerm(deck, t));

// Zoom button on any picture: full figure in a pinch-zoom viewer
document.addEventListener("click", e => {
  const b = e.target.closest(".zoom-btn");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const p = b.closest(".pic"), deck = DECKS[p.dataset.deck], term = deck.terms[+p.dataset.ti];
  openLightbox(Figures.termPic(deck, term, { full: true }), "Pinch to zoom");
}, true);

// Image couldn't load (offline, not cached yet): swap in the drawn diagram
document.addEventListener("figure-failed", e => {
  const p = e.detail && e.detail.closest(".pic");
  if (!p || !p.dataset.deck) return;
  const deck = DECKS[p.dataset.deck], term = deck.terms[+p.dataset.ti];
  if (term) { p.classList.remove("is-fig"); p.innerHTML = drawnPic(deck, term, { sides: false }); }
});

const ICONS = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="13" height="15" rx="2.5"/><path d="M8 3h10.5A2.5 2.5 0 0 1 21 5.5V17"/></svg>',
  match: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="7" height="5" rx="1.5"/><rect x="14.5" y="15" width="7" height="5" rx="1.5"/><path d="M9.5 6.5c5 0 0 11 5 11"/></svg>',
  label: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="15" r="2"/><path d="M14.5 13.5L8 7"/><rect x="2.5" y="3" width="8" height="5" rx="1.5"/></svg>',
  quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.6 2.7c-.6.2-.9.7-.9 1.3v.7"/><circle cx="12" cy="17" r=".4" fill="currentColor"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 64 64"><path d="M30 13c-2-5-1-9 3-10" fill="none" stroke="#2f63c8" stroke-width="5" stroke-linecap="round"/><path d="M24 20c0-8 6-13 13-12 6 1 9 5 9 11" fill="none" stroke="#c8343c" stroke-width="6" stroke-linecap="round"/><path d="M14 30c-3 6-1 14 6 19 8 6 20 9 30 8 3-6 3-14-1-21-4-6-12-10-20-10-6 0-12 1-15 4z" fill="#c8343c"/><path d="M33 26c2 8 6 17 13 27" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/></svg>',
  brain: '<svg viewBox="0 0 64 64"><path d="M20 14c-7 0-11 6-10 12-4 3-4 11 1 14 0 7 6 11 12 10 3 4 10 4 13 0 6 2 13-2 13-9 5-3 5-11 0-14 1-7-5-13-12-12-4-4-12-4-17-1z" fill="#d98a9a"/><path d="M32 14v40M22 26c4 0 6 3 6 6M42 24c-4 0-6 3-6 7M20 40c4-1 7 1 8 4M44 40c-4-1-7 1-8 4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/></svg>',
};
const topicIcon = deck => /\.(svg|png|jpe?g|webp)$/i.test(deck.icon || "") ? `<img src="${esc(deck.icon)}" alt="">` : ICONS[deck.icon] || `<span class="initial">${esc((deck.short || deck.title)[0])}</span>`;

/* ---------- shell ---------- */
const bar = {
  set({ title = "", back = null, right = "" }) {
    const b = $("#back");
    b.hidden = !back;
    b.onclick = () => { location.hash = back || "#/"; };
    $("#barTitle").textContent = title;
    $("#barRight").innerHTML = right;
  },
};
let cleanup = null;
function mount(html, cls = "") {
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  const v = $("#view");
  v.className = "view " + cls;
  v.innerHTML = html;
  if (!reduceMotion()) { v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); }
  window.scrollTo(0, 0);
  return v;
}
function toast(msg, ms = 1400) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, ms);
}

/* ---------- router ---------- */
const GAMES = {
  flash: { name: "Picture Flashcards", icon: "cards", run: (v, d) => Flash(v, d, shuffle(range(d.terms.length)), "Picture Flashcards") },
  match: { name: "Matching", icon: "match", run: (v, d) => Match(v, d) },
  label: { name: "Label the Diagram", icon: "label", run: (v, d, sub) => LabelMenu(v, d, sub) },
  quiz: { name: "Quick Quiz", icon: "quiz", run: (v, d) => Quiz(v, d) },
  weak: { name: "Weak Spots", icon: "target", run: (v, d) => Weak(v, d) },
};
function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "setup") return Setup(parts[1], parts[2]);
  if (parts[0] === "credits") return Credits();
  if (parts[0] === "deck" && DECKS[parts[1]]) {
    const deck = DECKS[parts[1]], g = GAMES[parts[2]];
    if (g) {
      const sub = parts[3];
      bar.set({ title: g.name, back: sub ? `#/deck/${deck.id}/${parts[2]}` : "#/deck/" + deck.id });
      cleanup = g.run(mount("", "game game-" + parts[2]), deck, sub) || null;
      return;
    }
    return DeckPage(deck);
  }
  Home();
}

/* ---------- home ---------- */
function Home() {
  bar.set({ title: "" });
  const cards = DECK_ORDER.map(id => {
    const d = DECKS[id], s = Store.summary(d), pct = Math.round((s.known / s.total) * 100);
    return `<a class="topic" href="#/deck/${esc(d.id)}">
      <div class="topic-icon">${topicIcon(d)}</div>
      <div class="topic-body">
        <h3>${esc(d.short || d.title)}</h3>
        <p>${esc(d.blurb || "")}</p>
        <div class="meter"><span style="width:${pct}%"></span></div>
        <div class="topic-meta">${s.known} of ${s.total} known${s.weakCount ? ` · <b>${s.weakCount} to review</b>` : ""}</div>
      </div>
      <span class="chev">${ICONS.chev}</span>
    </a>`;
  }).join("");
  mount(`
    <section class="hero">
      <p class="eyebrow">Hi Alexa 👋</p>
      <h1>What are we studying today?</h1>
    </section>
    <div class="topics">${cards || '<p class="muted">No topics yet.</p>'}</div>
    <p class="fine">Your progress is saved on this device only. · <a href="#/credits">Image credits</a></p>`, "home");
}

/* ---------- topic page ---------- */
function ring(pct) {
  const r = 30, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 72 72"><circle cx="36" cy="36" r="${r}" class="ring-bg"/>
    <circle cx="36" cy="36" r="${r}" class="ring-fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/>
    <text x="36" y="41" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>`;
}
function DeckPage(deck) {
  bar.set({ title: deck.short || deck.title, back: "#/" });
  const s = Store.summary(deck);
  const figIds = Object.keys(deck.figures || {}).filter(id => (Figures.get(deck, id).boxes || []).some(b => b[4]));
  const legend = (deck.legend || []).map(([k, name]) => `<span class="key"><i style="background:${(Diagram.KIND[k] || {}).fill || k}"></i>${esc(name)}</span>`).join("");
  const nLabels = (deck.labels ? 1 : 0) + figIds.length;
  const simple = simpleView();
  const row = (key, desc, extra = "", disabled = false) => {
    const g = GAMES[key];
    return `<a class="game-row${disabled ? " disabled" : ""}" ${disabled ? 'aria-disabled="true"' : `href="#/deck/${esc(deck.id)}/${key}"`}>
      <span class="game-icon gi-${key}">${ICONS[g.icon]}</span>
      <span class="game-text"><b>${g.name}</b><small>${desc}</small></span>
      ${extra}<span class="chev">${ICONS.chev}</span></a>`;
  };
  const v = mount(`
    <section class="deck-hero">
      <h1>${esc(deck.title)}</h1>
      ${deck.note ? `<p class="muted">${esc(deck.note)}</p>` : ""}
      ${legend ? `<div class="legend">${legend}</div>` : ""}
    </section>
    <section class="stats card">
      ${ring(s.known / s.total)}
      <div class="stat-list">
        <div><b>${s.known}</b><span>Known</span></div>
        <div><b>${s.weakCount}</b><span>To review</span></div>
        <div><b>${s.new}</b><span>Not seen yet</span></div>
      </div>
    </section>
    <section class="games">
      ${row("flash", "See the highlighted structure, name it, flip to check")}
      ${row("match", "6 at a time: term → definition or picture")}
      ${nLabels ? row("label", figIds.length && !simple ? `${figIds.length} textbook figures${deck.labels ? " + the drawn diagram" : ""}` : `Drag ${deck.labels.items.length} labels onto the diagram`) : ""}
      ${row("quiz", "Name the highlighted structure from 4 choices")}
      ${row("weak", s.weakCount ? `Drill the ${Math.min(10, s.weakCount)} cards you've missed most` : "Missed cards will show up here", s.weakCount ? `<span class="badge hot">${s.weakCount}</span>` : "", !s.weakCount)}
    </section>
    ${figIds.length ? `<section class="view-toggle card">
      <div><b>Pictures</b><small>${simple ? "Simple drawn diagrams" : "Real textbook figures"}</small></div>
      <div class="seg"><button data-v="fig" class="${simple ? "" : "on"}">Textbook</button><button data-v="simple" class="${simple ? "on" : ""}">Simple view</button></div>
    </section>` : ""}
    <button class="link-btn" id="reset">Reset progress for this topic</button>
    ${figIds.length ? `<a class="link-btn" href="#/credits">Image credits</a>` : ""}`, "deck");
  $$(".view-toggle .seg button", v).forEach(b => b.onclick = () => { Store.setting("simple", b.dataset.v === "simple"); DeckPage(deck); });
  $("#reset", v).onclick = () => {
    if (confirm("Reset all progress for this topic? This can't be undone.")) { Store.resetDeck(deck.id); DeckPage(deck); toast("Progress reset"); }
  };
}

/* ---------- boot ---------- */
function loadScript(src) {
  return new Promise(res => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => { console.warn("Could not load", src); res(); };
    document.head.appendChild(s);
  });
}
(async function boot() {
  for (const f of window.DECK_FILES || []) await loadScript("decks/" + f);
  window.addEventListener("hashchange", route);
  route();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
