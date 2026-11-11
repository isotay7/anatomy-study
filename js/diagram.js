/* Draws a topic's diagram as SVG: body shapes, tapered vessels, glowing highlight. */
const Diagram = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const KIND = {
    a: { fill: "#c8343c", edge: "#97212a", dim: "#efc9c7" },
    v: { fill: "#2f63c8", edge: "#1f4594", dim: "#c9d5ef" },
    p: { fill: "#7a52c2", edge: "#563496", dim: "#dcd1ef" },
    f: { fill: "#ddd2cb", edge: "#cbbdb4", dim: "#e8e0da" },
  };
  const STYLE = {
    body: 'fill="#f7ede6" stroke="#e8d6cb" stroke-width="3" stroke-linejoin="round"',
    lung: 'fill="#f2dcd7" fill-opacity=".55" stroke="#ebcbc4" stroke-width="2"',
    bone: 'fill="none" stroke="#eadccf" stroke-width="9" stroke-linecap="round"',
    line: 'fill="none" stroke="#e2cdc1" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"',
    heart: 'fill="url(#heartGrad)" stroke="#d7948b" stroke-width="3" fill-opacity=".94"',
    detail: 'fill="none" stroke="#d0877d" stroke-width="2.5" stroke-linecap="round" opacity=".55"',
    organ: 'fill="#f4dcd6" stroke="#dcb1a8" stroke-width="3"',
  };

  /* ---------- path geometry (sampled once, cached) ---------- */
  let sampler = null;
  const geoCache = new Map();
  function samplePath(d) {
    if (geoCache.has(d)) return geoCache.get(d);
    if (!sampler) {
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden";
      sampler = document.createElementNS(NS, "path");
      svg.appendChild(sampler); document.body.appendChild(svg);
    }
    sampler.setAttribute("d", d);
    const L = sampler.getTotalLength();
    const n = Math.max(10, Math.ceil(L / 5));
    const pts = [];
    for (let i = 0; i <= n; i++) { const p = sampler.getPointAtLength((L * i) / n); pts.push([p.x, p.y]); }
    const g = { pts, L };
    geoCache.set(d, g);
    return g;
  }
  function pointAt(d, t) {
    const { pts } = samplePath(d);
    const f = Math.max(0, Math.min(1, t)) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r];
  }

  // Closed outline of a vessel that tapers from w0 to w1, with rounded ends.
  const taperCache = new Map();
  function taper(d, w0, w1) {
    const key = d + "|" + w0 + "|" + w1;
    if (taperCache.has(key)) return taperCache.get(key);
    const { pts } = samplePath(d);
    const n = pts.length - 1, left = [], right = [], tans = [];
    for (let i = 0; i <= n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
      tans.push([tx, ty]);
      const w = (w0 + (w1 - w0) * (i / n)) / 2, nx = -ty, ny = tx;
      left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    const cap = (c, t, r, back) => {
      const out = [], [tx, ty] = t, nx = -ty, ny = tx, s = back ? -1 : 1;
      for (let k = 1; k < 8; k++) {
        const th = (Math.PI * k) / 8, cs = Math.cos(th), sn = Math.sin(th);
        out.push([c[0] + s * (nx * cs + tx * sn) * r, c[1] + s * (ny * cs + ty * sn) * r]);
      }
      return out;
    };
    const ring = [
      ...left,
      ...cap(pts[n], tans[n], w1 / 2, false),
      ...right.reverse(),
      ...cap(pts[0], tans[0], w0 / 2, true),
    ];
    const out = "M" + ring.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
    taperCache.set(key, out);
    return out;
  }

  /* ---------- rendering ---------- */
  let uid = 0;
  function shapeSVG(s) {
    if (s.image) return `<image href="${s.image}" x="${s.x || 0}" y="${s.y || 0}" width="${s.w}" height="${s.h}" preserveAspectRatio="xMidYMid meet"/>`;
    return `<path d="${s.d}" ${STYLE[s.style] || STYLE.organ}/>`;
  }
  function vesselGroup(list, mode) {
    // mode: "full" | "dim" | "hl"
    if (!list.length) return "";
    let edges = "", fills = "", sheen = "", halo = "";
    for (const [, kind, d, w0 = 10, w1 = w0] of list) {
      const k = KIND[kind] || KIND.a, outline = taper(d, w0, w1);
      const fill = mode === "dim" && kind !== "f" ? k.dim : k.fill;
      if (mode === "hl") halo += `<path d="${outline}" fill="#ffc93c" stroke="#ffc93c" stroke-width="22" stroke-linejoin="round"/>`;
      if (mode !== "dim" && kind !== "f") edges += `<path d="${outline}" fill="none" stroke="${k.edge}" stroke-width="2.4" stroke-linejoin="round"/>`;
      fills += `<path d="${outline}" fill="${fill}"/>`;
      if (mode !== "dim" && kind !== "f")
        sheen += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="${(Math.min(w0, w1) * 0.28).toFixed(1)}" stroke-linecap="round" transform="translate(-${(w0 * 0.12).toFixed(1)} -${(w0 * 0.08).toFixed(1)})"/>`;
    }
    const haloG = halo ? `<g class="hl-halo" filter="url(#glow)">${halo}</g>` : "";
    return `${haloG}<g class="${mode === "hl" ? "hl-vessel" : ""}">${edges}${fills}${sheen}</g>`;
  }

  /* render(diagramDef, {show:[ids], view:[x,y,w,h], extra:"svg markup", sides:true}) */
  function render(D, opts = {}) {
    const show = opts.show || [], any = show.length > 0;
    const [vx, vy, vw, vh] = opts.view || D.view;
    const back = [], front = [];
    for (const s of D.shapes || []) (s.over ? front : back).push(shapeSVG(s));
    const vessels = D.vessels || [];
    const isHl = v => show.includes(v[0]);
    const behind = vessels.filter(v => v[5] && v[5].behind && !isHl(v));
    const normal = vessels.filter(v => !(v[5] && v[5].behind) && !isHl(v));
    const hl = vessels.filter(isHl);
    const mode = any ? "dim" : "full";
    let s = `<svg class="diagram${any ? " has-hl" : ""}" viewBox="${vx} ${vy} ${vw} ${vh}" xmlns="${NS}" role="img" aria-label="${opts.label || "Diagram"}">`;
    if (D.fade) {
      // soft fade-out of the background shapes between y = fade[0] and fade[1]
      const id = "fade" + ++uid;
      s += `<defs><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${D.fade[0]}" x2="0" y2="${D.fade[1]}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
        `<mask id="${id}" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="10000" height="10000"><rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#${id}g)"/></mask></defs>`;
      s += `<g mask="url(#${id})">${back.join("")}</g>`;
    } else s += back.join("");
    s += vesselGroup(behind, mode);
    s += front.join("");
    s += vesselGroup(normal, mode);
    s += vesselGroup(hl, "hl");
    if (opts.sides !== false && D.sides !== false) {
      s += `<text x="${vx + 14}" y="${vy + vh - 16}" class="side-tag">Patient's R</text>`;
      s += `<text x="${vx + vw - 14}" y="${vy + vh - 16}" class="side-tag" text-anchor="end">Patient's L</text>`;
    }
    return s + (opts.extra || "") + `</svg>`;
  }

  function vesselById(D, id) { return (D.vessels || []).find(v => v[0] === id); }

  return { render, pointAt, vesselById, KIND };
})();
