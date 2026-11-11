/* Touch-friendly drag & drop.
   - Drag a chip: a floating copy follows the finger; drop it on a target.
   - Or tap a chip, then tap a target.
   onDrop(chip, target) returns true if correct. The caller moves the chip into place. */
function makeDnD({ root, targetSelector, onDrop }) {
  let selected = null;
  const isOpen = t => t && !t.classList.contains("solved");
  const targets = () => [...root.querySelectorAll(targetSelector)];

  function select(chip) {
    if (selected) selected.classList.remove("selected");
    selected = chip && chip !== selected ? chip : null;
    if (selected) selected.classList.add("selected");
    root.classList.toggle("armed", !!selected);
  }

  function replay(el, cls, ms) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  }

  function attempt(chip, target) {
    const ok = onDrop(chip, target);
    if (ok) {
      replay(chip, "snap", 500);
      replay(target, "accept", 600);
    } else {
      chip.dataset.missed = "1";
      replay(chip, "wrong", 650);
      replay(target, "reject", 600);
    }
    return ok;
  }

  function bindChip(chip) {
    chip.addEventListener("pointerdown", e => down(e, chip));
    chip.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(chip); }
    });
  }

  function bindTarget(t) {
    t.addEventListener("click", () => {
      if (selected && isOpen(t)) {
        const chip = selected; select(null);
        attempt(chip, t);
      }
    });
  }

  function down(e, chip) {
    if (chip.classList.contains("locked") || (e.button && e.button !== 0)) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, start = chip.getBoundingClientRect();
    let ghost = null, over = null, lastX = sx, lastY = sy, raf = 0;

    const find = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const t = el && el.closest(targetSelector);
      return t && root.contains(t) && isOpen(t) ? t : null;
    };
    const setOver = t => {
      if (t === over) return;
      over && over.classList.remove("over");
      over = t;
      over && over.classList.add("over");
    };
    // top scroll zone starts below the sticky bar / sticky chip tray (once the finger has left the tray)
    const tray = root.querySelector(".tray");
    let leftTray = false;
    const topEdge = () => {
      const bar = document.querySelector(".bar"), t = tray && tray.getBoundingClientRect();
      return Math.max(bar ? bar.getBoundingClientRect().bottom : 0, t && getComputedStyle(tray).position === "sticky" ? t.bottom : 0);
    };
    const autoscroll = () => {
      const edge = 70, h = window.innerHeight, top = topEdge();
      if (lastY > top + 6) leftTray = true;
      let v = 0;
      if (leftTray && lastY < top + edge) v = -Math.ceil((top + edge - lastY) / 6);
      else if (lastY > h - edge) v = Math.ceil((lastY - (h - edge)) / 6);
      if (v) { window.scrollBy(0, v); setOver(find(lastX, lastY)); }
      raf = requestAnimationFrame(autoscroll);
    };
    const move = ev => {
      if (ev.pointerId !== e.pointerId) return;
      lastX = ev.clientX; lastY = ev.clientY;
      const dx = lastX - sx, dy = lastY - sy;
      if (!ghost) {
        if (Math.hypot(dx, dy) < 7) return;
        select(null);
        ghost = chip.cloneNode(true);
        ghost.classList.add("ghost");
        ghost.classList.remove("selected", "snap", "wrong");
        Object.assign(ghost.style, {
          left: start.left + "px", top: start.top + "px",
          width: start.width + "px", height: start.height + "px",
        });
        document.body.appendChild(ghost);
        chip.classList.add("placeholder");
        document.body.classList.add("dragging");
        raf = requestAnimationFrame(autoscroll);
      }
      ghost.style.transform = `translate(${dx}px,${dy}px) scale(1.06) rotate(${Math.max(-4, Math.min(4, dx / 40))}deg)`;
      setOver(find(lastX, lastY));
    };
    const end = (ev, cancelled) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      cancelAnimationFrame(raf);
      document.body.classList.remove("dragging");
      if (!ghost) { if (!cancelled) select(chip); return; }   // a tap
      const t = cancelled ? null : find(ev.clientX, ev.clientY);
      setOver(null);
      if (t && attempt(chip, t)) {
        ghost.remove(); chip.classList.remove("placeholder");
        return;
      }
      // fly back to wherever the chip now is (the page may have scrolled)
      const now = chip.getBoundingClientRect();
      ghost.classList.add("returning");
      if (t) ghost.classList.add("wrong");
      ghost.style.transform = `translate(${now.left - start.left}px,${now.top - start.top}px)`;
      const done = () => { ghost.remove(); chip.classList.remove("placeholder"); };
      ghost.addEventListener("transitionend", done, { once: true });
      setTimeout(done, 500);
    };
    const up = ev => end(ev, false);
    const cancel = ev => end(ev, true);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }

  return {
    bindChip, bindTarget, select,
    bindAll(chips) { chips.forEach(bindChip); targets().forEach(bindTarget); },
  };
}
