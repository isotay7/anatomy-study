/* ======================= Games (all read the same deck data) ======================= */

function progressBar(done, total) {
  return `<div class="progress" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}"><span style="width:${total ? (done / total) * 100 : 0}%"></span></div>`;
}
function doneScreen({ emoji, title, line, missed = [], buttons }) {
  return `<div class="done card">
    <div class="done-emoji">${emoji}</div>
    <h2>${title}</h2>
    <p class="muted">${line}</p>
    ${missed.length ? `<div class="missed"><h4>Worth another look</h4>${missed.map(t => `<div class="missed-row"><b>${esc(t.term)}</b><span>${esc(t.def)}</span></div>`).join("")}</div>` : ""}
    <div class="done-btns">${buttons}</div>
  </div>`;
}

/* ---------------- 1. Picture Flashcards (also used by Weak Spots) ---------------- */
function Flash(v, deck, indices, title) {
  const S = { queue: indices.slice(), total: indices.length, got: 0, missedOnce: new Set(), flipped: false, busy: false };

  function render() {
    if (!S.queue.length) return finish();
    const t = deck.terms[S.queue[0]];
    v.innerHTML = `
      ${progressBar(S.total - S.queue.length, S.total)}
      <div class="meta-row"><span class="pill">${S.queue.length} left</span><span class="pill good">${S.got} got it</span></div>
      <div class="flashcard" id="card" tabindex="0" aria-label="Flashcard. Tap to flip.">
        ${S.flipped ? back(t) : front(t)}
      </div>
      <div class="fc-actions">${S.flipped
        ? `<button class="btn bad" id="miss">Missed it</button><button class="btn good" id="got">Got it</button>`
        : `<button class="btn primary wide" id="flip">Flip card</button>`}</div>
      <p class="keys">Keyboard: Space to flip · ← missed · → got it</p>`;
    $("#card", v).onclick = flip;
    $$("#card .fig", v).forEach(f => makeZoom(f, { doubleTap: false }));
    if (S.flipped) { $("#miss", v).onclick = () => answer(false); $("#got", v).onclick = () => answer(true); }
    else $("#flip", v).onclick = flip;
  }
  const front = t => `<div class="face face-front">${hasPic(deck, t) ? pic(deck, t) : `<p class="def-prompt">${esc(t.def)}</p>`}<span class="tap-hint">Tap to flip</span></div>`;
  const back = t => `<div class="face face-back">
      ${hasPic(deck, t) ? `<div class="back-pic">${pic(deck, t, { sides: false })}</div>` : ""}
      <div class="back-text"><h2>${esc(t.term)}</h2><p>${esc(t.def)}</p></div>
    </div>`;

  function animateCard(fn) {
    const c = $("#card", v);
    if (reduceMotion() || !c) { fn(); return; }
    S.busy = true;
    c.classList.add("flip-out");
    setTimeout(() => { fn(); const n = $("#card", v); n.classList.add("flip-in"); setTimeout(() => { n.classList.remove("flip-in"); S.busy = false; }, 200); }, 150);
  }
  function flip() { if (S.busy || S.flipped) return; animateCard(() => { S.flipped = true; render(); }); }
  function answer(ok) {
    if (S.busy || !S.flipped) return;
    const i = S.queue.shift(), t = deck.terms[i];
    Store.record(deck.id, t.term, ok);
    if (ok) S.got++;
    else { S.missedOnce.add(i); S.queue.splice(Math.min(3, S.queue.length), 0, i); }
    const c = $("#card", v);
    if (!reduceMotion() && c) {
      S.busy = true;
      c.classList.add(ok ? "out-right" : "out-left");
      setTimeout(() => { S.busy = false; S.flipped = false; render(); const n = $("#card", v); n && n.classList.add("in"); }, 260);
    } else { S.flipped = false; render(); }
  }
  function finish() {
    const missed = [...S.missedOnce].map(i => deck.terms[i]);
    const first = S.total - missed.length;
    v.innerHTML = doneScreen({
      emoji: missed.length ? "💪" : "🎉",
      title: "Pile cleared!",
      line: `${first} of ${S.total} right the first time.`,
      missed,
      buttons: `<a class="btn" href="#/deck/${deck.id}">Back to topic</a><button class="btn primary" id="again">Go again</button>`,
    });
    $("#again", v).onclick = () => { S.queue = shuffle(indices); S.got = 0; S.missedOnce.clear(); S.flipped = false; render(); };
  }
  const onKey = e => {
    if (!S.queue.length || e.metaKey || e.ctrlKey) return;
    if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); flip(); }
    else if (e.key === "ArrowRight") answer(true);
    else if (e.key === "ArrowLeft") answer(false);
  };
  document.addEventListener("keydown", onKey);
  render();
  return () => document.removeEventListener("keydown", onKey);
}

/* ---------------- 2. Matching ---------------- */
function Match(v, deck) {
  const withPics = deck.terms.some(t => hasPic(deck, t));
  const M = { mode: "def", rounds: [], r: 0, misses: 0, first: 0 };
  function start() {
    const s = shuffle(range(deck.terms.length).filter(i => M.mode === "def" || hasPic(deck, deck.terms[i])));
    M.rounds = [];
    for (let i = 0; i < s.length; i += 6) M.rounds.push(s.slice(i, i + 6));
    // don't leave a tiny last round: fold it into the previous one
    if (M.rounds.length > 1 && M.rounds[M.rounds.length - 1].length < 3) M.rounds[M.rounds.length - 2].push(...M.rounds.pop());
    M.r = 0; M.misses = 0; M.first = 0;
    render();
  }
  function toolbar() {
    return `<div class="toolbar">
      ${withPics ? `<div class="seg" role="tablist"><button data-m="def" class="${M.mode === "def" ? "on" : ""}">Term → Definition</button><button data-m="pic" class="${M.mode === "pic" ? "on" : ""}">Term → Picture</button></div>` : ""}
      <span class="pill">Round ${Math.min(M.r + 1, M.rounds.length)} of ${M.rounds.length}</span>
    </div>`;
  }
  function render() {
    const total = M.rounds.reduce((n, r) => n + r.length, 0);
    if (M.r >= M.rounds.length) {
      v.innerHTML = toolbar() + doneScreen({
        emoji: M.misses ? "✨" : "🎉",
        title: `All ${total} matched!`,
        line: M.misses ? `${M.first} of ${total} right on the first try · ${M.misses} wrong drop${M.misses > 1 ? "s" : ""}.` : "Not a single wrong drop.",
        buttons: `<a class="btn" href="#/deck/${deck.id}">Back to topic</a><button class="btn primary" id="again">Play again</button>`,
      });
      wire(); $("#again", v).onclick = start; return;
    }
    const ids = M.rounds[M.r];
    v.innerHTML = toolbar() + `
      ${progressBar(M.r, M.rounds.length)}
      <div class="match ${M.mode === "pic" ? "pics" : ""}">
        <div class="tray" id="tray">
          <p class="tray-hint">Drag each term to its ${M.mode === "pic" ? "picture" : "definition"}, or tap a term then tap its match.</p>
          <div class="chips">${shuffle(ids).map(i => `<div class="chip" tabindex="0" data-i="${i}">${esc(deck.terms[i].term)}</div>`).join("")}</div>
        </div>
        <div class="targets">${shuffle(ids).map(i => `
          <div class="target drop" data-i="${i}">
            ${M.mode === "pic" ? `<div class="target-pic">${pic(deck, deck.terms[i], { sides: false })}</div>` : `<p class="target-def">${esc(deck.terms[i].def)}</p>`}
            <div class="slot"><span>Drop here</span></div>
          </div>`).join("")}</div>
      </div>`;
    wire();
    const dnd = makeDnD({
      root: $(".match", v), targetSelector: ".target",
      onDrop(chip, target) {
        const term = deck.terms[chip.dataset.i].term;
        if (chip.dataset.i !== target.dataset.i) {
          M.misses++;
          if (!chip.dataset.missed) Store.record(deck.id, term, false);
          return false;
        }
        if (!chip.dataset.missed) { Store.record(deck.id, term, true); M.first++; }
        const slot = $(".slot", target);
        slot.innerHTML = ""; slot.appendChild(chip);
        chip.classList.add("locked"); chip.removeAttribute("tabindex");
        target.classList.add("solved");
        if (!$(".tray .chip", v)) {
          setTimeout(() => toast(M.r + 1 < M.rounds.length ? "Round complete ✓" : "All matched ✓", 900), 250);
          setTimeout(() => { M.r++; render(); }, 1100);
        }
        return true;
      },
    });
    dnd.bindAll($$(".tray .chip", v));
  }
  function wire() {
    $$(".seg button", v).forEach(b => b.onclick = () => { if (M.mode !== b.dataset.m) { M.mode = b.dataset.m; start(); } });
  }
  start();
}

/* ---------------- 3. Label the Diagram ---------------- */
function Label(v, deck) {
  const L = deck.labels, D = L && deck.diagrams[L.diagram];
  if (!L || !D) { v.innerHTML = `<p class="muted">This topic has no diagram to label.</p>`; return; }
  const [vx, vy, vw, vh] = D.view;
  const BW = 250, BH = 96, GAP = 12, COLGAP = 26, PAD = 12;
  const LX = vx - COLGAP - BW, RX = vx + vw + COLGAP;

  // anchor points on the diagram
  const items = L.items.map((it, i) => {
    let at = it.at;
    if (!at) { const ves = Diagram.vesselById(D, it.vessel); at = ves ? Diagram.pointAt(ves[2], it.t ?? 0.5) : [vx + vw / 2, vy + vh / 2]; }
    return { ...it, i, at };
  });
  // stack boxes beside each side, as close to their anchor height as possible without overlap
  for (const side of ["L", "R"]) {
    const col = items.filter(it => it.side === side).sort((a, b) => a.at[1] - b.at[1]);
    col.forEach(it => (it.y = it.at[1] - BH / 2));
    for (let pass = 0; pass < 200; pass++) {
      let moved = false;
      for (let k = 1; k < col.length; k++) {
        const over = col[k - 1].y + BH + GAP - col[k].y;
        if (over > 0.01) { col[k - 1].y -= over / 2; col[k].y += over / 2; moved = true; }
      }
      if (!moved) break;
    }
  }
  const top = Math.min(vy, ...items.map(it => it.y)) - PAD;
  const bottom = Math.max(vy + vh, ...items.map(it => it.y + BH)) + PAD;
  const left = LX - PAD, width = RX + BW + PAD - left, height = bottom - top;
  const pct = (n, of) => ((n / of) * 100).toFixed(3) + "%";

  function start() {
    let leaders = "";
    for (const it of items) {
      const bx = it.side === "L" ? LX + BW : RX, by = it.y + BH / 2;
      leaders += `<path d="M${bx} ${by.toFixed(1)} L${it.at[0].toFixed(1)} ${it.at[1].toFixed(1)}" class="leader"/>`;
    }
    for (const it of items) leaders += `<circle cx="${it.at[0].toFixed(1)}" cy="${it.at[1].toFixed(1)}" r="7" class="leader-dot"/>`;
    const boxes = items.map(it => `<div class="lbox drop" data-i="${it.i}" style="left:${pct((it.side === "L" ? LX : RX) - left, width)};top:${pct(it.y - top, height)};width:${pct(BW, width)};height:${pct(BH, height)}"></div>`).join("");
    v.innerHTML = `
      <div class="toolbar"><span class="pill" id="count">0 of ${items.length} placed</span><span class="pill good" id="firsts">0 first try</span>
        <button class="btn small" id="restart">Restart</button></div>
      <div id="result"></div>
      <div class="label-layout">
        <div class="label-board" style="aspect-ratio:${width.toFixed(0)}/${height.toFixed(0)}">
          ${Diagram.render(D, { view: [left, top, width, height], extra: leaders, sides: false, label: L.title || "Diagram" })}
          ${boxes}
        </div>
        <div class="bank card">
          <h3>Drag each label to its box <small>or tap a label, then a box</small></h3>
          <div class="chips">${shuffle(items).map(it => `<div class="chip" tabindex="0" data-i="${it.i}">${esc(it.label)}</div>`).join("")}</div>
        </div>
      </div>`;
    $("#restart", v).onclick = start;
    let placed = 0, firsts = 0;
    const dnd = makeDnD({
      root: v, targetSelector: ".lbox",
      onDrop(chip, box) {
        if (items[chip.dataset.i].label !== items[box.dataset.i].label) return false;
        box.appendChild(chip);
        chip.classList.add("locked", "in-box"); chip.removeAttribute("tabindex");
        box.classList.add("solved");
        placed++; if (!chip.dataset.missed) firsts++;
        $("#count", v).textContent = `${placed} of ${items.length} placed`;
        $("#firsts", v).textContent = `${firsts} first try`;
        if (placed === items.length) finish(firsts);
        return true;
      },
    });
    dnd.bindAll($$(".bank .chip", v));
  }
  function finish(right) {
    const prev = Store.labelScore(deck.id);
    Store.setLabelScore(deck.id, right, items.length);
    const best = prev && right > prev.best ? " New best!" : prev ? ` Best: ${Math.max(prev.best, right)}/${items.length}.` : "";
    $(".bank", v).remove();
    $("#result", v).innerHTML = `<div class="result card">
      <div><b class="score">${right}/${items.length}</b><span>right on the first try.${best}</span></div>
      <button class="btn primary" id="again">Try again</button></div>`;
    $("#again", v).onclick = start;
    $("#result", v).scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  }
  start();
}

/* ---------------- 4. Quick Quiz ---------------- */
function Quiz(v, deck) {
  const N = Math.min(10, deck.terms.length);
  const Q = { list: [], qi: 0, score: 0, missed: [], locked: false };
  function start() {
    // favour cards she doesn't know yet
    const order = shuffle(range(deck.terms.length)).sort((a, b) =>
      (Store.status(deck.id, deck.terms[a].term) === "known") - (Store.status(deck.id, deck.terms[b].term) === "known"));
    Q.list = shuffle(order.slice(0, N)); Q.qi = 0; Q.score = 0; Q.missed = []; render();
  }
  function choices(i) {
    const t = deck.terms[i];
    const group = x => { const f = !simpleView() && Figures.forTerm(deck, x); return f ? f.id : x.pic; };
    const same = shuffle(range(deck.terms.length).filter(j => j !== i && group(deck.terms[j]) === group(t)));
    const other = shuffle(range(deck.terms.length).filter(j => j !== i && group(deck.terms[j]) !== group(t)));
    return shuffle([i, ...same.concat(other).slice(0, 3)]);
  }
  function render() {
    if (Q.qi >= Q.list.length) return finish();
    const i = Q.list[Q.qi], t = deck.terms[i], usePic = hasPic(deck, t);
    Q.locked = false;
    v.innerHTML = `
      ${progressBar(Q.qi, Q.list.length)}
      <div class="meta-row"><span class="pill">Question ${Q.qi + 1} of ${Q.list.length}</span><span class="pill good">${Q.score} correct</span></div>
      <div class="quiz-pic card">${usePic ? pic(deck, t) : `<p class="def-prompt">${esc(t.def)}</p>`}</div>
      <p class="quiz-q">${usePic ? "Which structure is highlighted?" : "Which term matches this definition?"}</p>
      <div class="options">${choices(i).map(j => `<button class="option" data-j="${j}">${esc(deck.terms[j].term)}</button>`).join("")}</div>
      <div id="feedback"></div>`;
    $$(".option", v).forEach(b => b.onclick = () => pick(b, i));
    $$(".quiz-pic .fig", v).forEach(f => makeZoom(f, {}));
  }
  function pick(btn, i) {
    if (Q.locked) return;
    Q.locked = true;
    const t = deck.terms[i], ok = +btn.dataset.j === i;
    Store.record(deck.id, t.term, ok);
    $$(".option", v).forEach(b => { b.disabled = true; if (+b.dataset.j === i) b.classList.add("right"); });
    if (ok) {
      Q.score++;
      btn.classList.add("pop");
      setTimeout(() => { Q.qi++; render(); }, 850);
    } else {
      Q.missed.push(t);
      btn.classList.add("wrong");
      $("#feedback", v).innerHTML = `<div class="explain card"><b>${esc(t.term)}</b><p>${esc(t.def)}</p><button class="btn primary wide" id="next">Next</button></div>`;
      $("#next", v).onclick = () => { Q.qi++; render(); };
      $("#next", v).scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest" });
    }
  }
  function finish() {
    const n = Q.list.length;
    v.innerHTML = doneScreen({
      emoji: Q.score === n ? "🏆" : Q.score >= n * 0.7 ? "🎉" : "💪",
      title: `${Q.score} out of ${n}`,
      line: Q.score === n ? "Perfect score!" : "Missed ones are added to Weak Spots.",
      missed: Q.missed,
      buttons: `<a class="btn" href="#/deck/${deck.id}">Back to topic</a><button class="btn primary" id="again">New quiz</button>`,
    });
    $("#again", v).onclick = start;
  }
  start();
}

/* ---------------- 5. Weak Spots ---------------- */
function Weak(v, deck) {
  const ids = Store.weakTerms(deck, 10);
  if (!ids.length) {
    v.innerHTML = doneScreen({
      emoji: "🌱", title: "No weak spots yet",
      line: "Cards you miss in the other games will collect here so you can drill them.",
      buttons: `<a class="btn primary" href="#/deck/${deck.id}">Back to topic</a>`,
    });
    return;
  }
  return Flash(v, deck, ids, "Weak Spots");
}

/* ---------------- 3b. Label the Diagram: picker + textbook-figure games ---------------- */
function LabelMenu(v, deck, sub) {
  if (sub === "drawn") return Label(v, deck);
  if (sub && deck.figures && deck.figures[sub]) return LabelFig(v, deck, sub);
  const ids = Object.keys(deck.figures || {}).filter(id => Figures.get(deck, id).boxes.some(b => b[4]));
  const row = (href, title, n, key) => {
    const sc = Store.labelScore(key);
    return `<a class="game-row" href="${href}"><span class="game-icon gi-label">${ICONS.label}</span>
      <span class="game-text"><b>${esc(title)}</b><small>${n} labels</small></span>
      ${sc ? `<span class="badge">Best ${sc.best}/${sc.total}</span>` : ""}<span class="chev">${ICONS.chev}</span></a>`;
  };
  v.innerHTML = `<div class="games">
    ${ids.map(id => { const f = Figures.get(deck, id); return row(`#/deck/${deck.id}/label/${id}`, f.title, f.boxes.filter(b => b[4]).length, deck.id + "/" + id); }).join("")}
    ${deck.labels ? row(`#/deck/${deck.id}/label/drawn`, "Drawn diagram: " + (deck.labels.title || "diagram"), deck.labels.items.length, deck.id) : ""}
  </div>`;
}

function LabelFig(v, deck, figId) {
  const fig = Figures.get(deck, figId);
  const items = fig.boxes.map((b, i) => ({ b, i, label: b[4] })).filter(x => x.label);
  function start() {
    let extra = "";
    // blank masks first, drop boxes on top (padded boxes can overlap a little)
    fig.boxes.forEach(b => { if (!b[4]) extra += Figures.box(b, "fig-mask"); });
    fig.boxes.forEach((b, i) => { if (b[4]) extra += Figures.box(b, "lbox drop fbox").replace('class="lbox', `data-i="${i}" data-name="${esc(b[4])}" class="lbox`); });
    v.innerHTML = `
      <div class="toolbar"><span class="pill" id="count">0 of ${items.length} placed</span><span class="pill good" id="firsts">0 first try</span>
        <button class="btn small" id="restart">Restart</button></div>
      <div id="result"></div>
      <div class="label-layout">
        <div class="fig-board card">
          ${Figures.view(fig, [0, 0, 100, 100], Figures.layer(fig, { boxes: "none", extra }), "fig-label")}
          <div class="zoom-ctl"><button class="btn small" id="zout" aria-label="Zoom out">−</button><button class="btn small" id="zin" aria-label="Zoom in">+</button><span class="muted">Pinch to zoom</span></div>
        </div>
        <div class="bank card"><h3>Drag each label to its box <small>or tap a label, then a box</small></h3>
          <div class="chips">${shuffle(items).map(it => `<div class="chip" tabindex="0" data-i="${it.i}">${esc(it.label)}</div>`).join("")}</div></div>
      </div>`;
    const z = makeZoom($(".fig-label", v), {});
    $("#zin", v).onclick = () => z.zoomBy(1.6);
    $("#zout", v).onclick = () => z.zoomBy(1 / 1.6);
    $("#restart", v).onclick = start;
    let placed = 0, firsts = 0;
    makeDnD({
      root: v, targetSelector: ".fbox",
      onDrop(chip, box) {
        if (fig.boxes[chip.dataset.i][4] !== fig.boxes[box.dataset.i][4]) return false;
        box.appendChild(chip); chip.classList.add("locked", "in-box"); chip.removeAttribute("tabindex");
        box.classList.add("solved");
        placed++; if (!chip.dataset.missed) firsts++;
        $("#count", v).textContent = `${placed} of ${items.length} placed`;
        $("#firsts", v).textContent = `${firsts} first try`;
        if (placed === items.length) {
          const key = deck.id + "/" + figId, prev = Store.labelScore(key);
          Store.setLabelScore(key, firsts, items.length);
          $(".bank", v).remove();
          $("#result", v).innerHTML = `<div class="result card"><div><b class="score">${firsts}/${items.length}</b><span>right on the first try.${prev && firsts > prev.best ? " New best!" : ""}</span></div><button class="btn primary" id="again">Try again</button></div>`;
          $("#again", v).onclick = start;
        }
        return true;
      },
    }).bindAll($$(".bank .chip", v));
  }
  start();
}

/* ---------------- Credits ---------------- */
function Credits() {
  bar.set({ title: "Image credits", back: "#/" });
  const rows = DECK_ORDER.flatMap(id => Object.entries(DECKS[id].figures || {}).map(([fid, f]) => `
    <div class="credit card"><b>${esc(f.title)}</b>
      <p>“${esc(f.credit.file)}” by <b>OpenStax College</b>, from <i>Anatomy &amp; Physiology</i> (OpenStax, 2013), via
      <a href="${esc(f.credit.url)}" target="_blank" rel="noopener">Wikimedia Commons</a>.
      Licensed under <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>.
      Same artwork as ${esc(f.credit.figure)} “${esc(f.credit.figTitle)}” in <i>Anatomy and Physiology 2e</i>.</p>
      <p class="muted">Changes: resized; printed labels covered; cropped; highlight markers added.</p></div>`)).join("");
  mount(`<section class="deck-hero"><h1>Image credits</h1>
    <p class="muted">Textbook figures are from OpenStax, used under the Creative Commons Attribution 3.0 license.</p></section>
    <div class="credits">${rows}</div>`, "credits");
}

