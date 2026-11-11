/* Progress, saved only in this browser (localStorage). Nothing is uploaded. */
const Store = (() => {
  const KEY = "anatomyStudy.v1";
  let data = { cards: {}, labels: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = Object.assign({ cards: {}, labels: {} }, JSON.parse(raw));
  } catch (e) { /* private mode or blocked storage: progress just won't persist */ }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  const id = (deckId, term) => deckId + "::" + term;

  function card(deckId, term) {
    return data.cards[id(deckId, term)] || { r: 0, w: 0, streak: 0, last: 0 };
  }
  function record(deckId, term, correct) {
    const c = Object.assign({}, card(deckId, term));
    if (correct) { c.r++; c.streak++; } else { c.w++; c.streak = 0; }
    c.last = Date.now();
    data.cards[id(deckId, term)] = c;
    save();
  }
  // "known": answered right twice in a row (or right and never missed)
  function status(deckId, term) {
    const c = card(deckId, term);
    if (!c.r && !c.w) return "new";
    if (c.streak >= 2 || (c.r >= 1 && c.w === 0)) return "known";
    if (c.w > 0) return "weak";
    return "learning";
  }
  function weakness(deckId, term) {
    const c = card(deckId, term);
    if (!c.w) return 0;
    return c.w * 2 - c.r - c.streak * 2 + (c.streak === 0 ? 1 : 0);
  }
  // Terms she has missed, worst first (excludes ones she has since nailed twice in a row)
  function weakTerms(deck, max = 10) {
    return deck.terms
      .map((t, i) => ({ i, s: weakness(deck.id, t.term), c: card(deck.id, t.term) }))
      .filter(x => x.c.w > 0 && x.c.streak < 2)
      .sort((a, b) => b.s - a.s || b.c.last - a.c.last)
      .slice(0, max)
      .map(x => x.i);
  }
  function summary(deck) {
    const out = { known: 0, weak: 0, learning: 0, new: 0, total: deck.terms.length };
    for (const t of deck.terms) out[status(deck.id, t.term)]++;
    out.weakCount = weakTerms(deck, 999).length;
    return out;
  }
  function labelScore(deckId) { return data.labels[deckId] || null; }
  function setLabelScore(deckId, right, total) {
    const prev = data.labels[deckId];
    data.labels[deckId] = { last: right, total, best: Math.max(right, prev ? prev.best : 0), at: Date.now() };
    save();
  }
  function resetDeck(deckId) {
    for (const k of Object.keys(data.cards)) if (k.startsWith(deckId + "::")) delete data.cards[k];
    delete data.labels[deckId];
    save();
  }
  return { card, record, status, weakTerms, summary, labelScore, setLabelScore, resetDeck };
})();
