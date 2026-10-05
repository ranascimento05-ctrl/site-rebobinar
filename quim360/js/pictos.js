/* Pictogramas GHS, rótulos de risco de transporte (NBR 7500 / IMDG), painel de segurança, QR Code e logo.
   Pictogramas são representações vetoriais simplificadas: use a arte oficial do GHS na impressão final de rótulos. */
(function (O) {
  const NS = 'xmlns="http://www.w3.org/2000/svg"';

  // glifos em caixa 100x100 (centro 50,50)
  const GL = {
    flame: (c) => `<path d="M50 24 C55 34 66 40 66 54 C66 65 59 73 50 73 C41 73 34 65 34 55 C34 48 38 44 41 39 C43 45 46 47 48 44 C51 39 48 31 50 24 Z" fill="${c}"/>`,
    bomb: (c) => `<circle cx="42" cy="62" r="13" fill="${c}"/><path d="M50 52 L58 43" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><polygon points="64,26 67,34 75,31 71,39 79,43 70,45 71,54 64,48 58,55 58,46 49,44 57,40 54,32 61,35" fill="${c}"/>`,
    oxid: (c) => `<circle cx="50" cy="63" r="11" fill="none" stroke="${c}" stroke-width="5"/><path d="M50 22 C54 29 61 33 61 42 C61 49 56 52 50 52 C44 52 39 49 39 43 C39 38 42 36 44 32 C45 36 47 37 48 35 C50 32 48 27 50 22 Z" fill="${c}"/><rect x="34" y="78" width="32" height="4" fill="${c}"/>`,
    gas: (c) => `<rect x="38" y="38" width="24" height="40" rx="11" fill="${c}"/><rect x="45" y="27" width="10" height="13" rx="2" fill="${c}"/><rect x="41" y="25" width="18" height="5" rx="2" fill="${c}"/>`,
    corr: (c) => `<g fill="${c}"><path d="M30 30 L40 26 L44 34 L34 38 Z"/><path d="M58 26 L68 30 L64 38 L54 34 Z"/><circle cx="37" cy="46" r="2.8"/><circle cx="35" cy="54" r="2.8"/><circle cx="63" cy="46" r="2.8"/><circle cx="65" cy="54" r="2.8"/><path d="M27 66 L50 66 L50 62 L72 62 L72 70 L27 70 Z"/><path d="M33 74 L44 74 L44 79 L33 79 Z"/><path d="M52 74 L72 74 L72 79 L52 79 Z"/></g>`,
    skull: (c) => `<g fill="${c}"><circle cx="50" cy="42" r="14"/><rect x="43" y="50" width="14" height="12" rx="2"/></g><circle cx="44" cy="42" r="3.6" fill="#fff"/><circle cx="56" cy="42" r="3.6" fill="#fff"/><path d="M50 47 L48 52 L52 52 Z" fill="#fff"/><g stroke="${c}" stroke-width="5" stroke-linecap="round"><path d="M30 60 L70 78"/><path d="M70 60 L30 78"/></g><g fill="${c}"><circle cx="29" cy="59" r="3.3"/><circle cx="71" cy="59" r="3.3"/><circle cx="29" cy="79" r="3.3"/><circle cx="71" cy="79" r="3.3"/></g>`,
    excl: (c) => `<rect x="46.5" y="26" width="7" height="30" rx="3" fill="${c}"/><circle cx="50" cy="67" r="4.6" fill="${c}"/>`,
    health: (c) => `<g fill="${c}"><circle cx="50" cy="31" r="7"/><path d="M33 74 C33 56 38 45 50 45 C62 45 67 56 67 74 Z"/></g><polygon points="50,52 52.4,58 58.6,58.4 53.8,62.3 55.4,68.4 50,65 44.6,68.4 46.2,62.3 41.4,58.4 47.6,58" fill="#fff"/>`,
    env: (c) => `<g stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"><path d="M34 62 L34 38"/><path d="M34 50 L27 44"/><path d="M34 44 L41 38"/><path d="M34 56 L41 52"/><path d="M26 66 L74 66"/></g><g fill="${c}"><ellipse cx="60" cy="52" rx="10" ry="6"/><path d="M69 52 L78 46 L78 58 Z"/></g><circle cx="55" cy="50" r="1.6" fill="#fff"/><path d="M24 72 Q32 68 40 72 T56 72 T72 72" stroke="${c}" stroke-width="2.4" fill="none"/>`,
  };
  const GHS_GLYPH = { GHS01: 'bomb', GHS02: 'flame', GHS03: 'oxid', GHS04: 'gas', GHS05: 'corr', GHS06: 'skull', GHS07: 'excl', GHS08: 'health', GHS09: 'env' };

  function ghs(code, size) {
    const s = size || 90;
    return `<svg ${NS} viewBox="0 0 100 100" width="${s}" height="${s}" role="img" aria-label="${O.GHS.PICTO[code] || code}"><polygon points="50,4 96,50 50,96 4,50" fill="#fff" stroke="#dc2626" stroke-width="7" stroke-linejoin="miter"/><g>${GL[GHS_GLYPH[code]]('#111')}</g></svg>`;
  }

  // rótulo de risco de transporte (losango 100x100)
  function transporte(classe, size) {
    const L = O.TRANSPORT.LABELS[classe] || { bg: '#fff', fg: '#000', txt: classe };
    const s = size || 110;
    const clip = '<clipPath id="dm"><polygon points="50,2 98,50 50,98 2,50"/></clipPath>';
    let bgs = `<rect x="0" y="0" width="100" height="100" fill="${L.bg}"/>`;
    if (L.half) {
      if (L.halfPos === 'bottom') bgs += `<rect x="0" y="50" width="100" height="50" fill="${L.half}"/>`;
      else bgs += `<rect x="0" y="50" width="100" height="50" fill="${L.half}"/>`;
    }
    if (L.stripes) for (let x = 6; x < 100; x += 12) bgs += `<rect x="${x}" y="0" width="6" height="100" fill="${L.stripes}"/>`;
    if (L.stripesTop) { for (let x = 6; x < 100; x += 12) bgs += `<rect x="${x}" y="0" width="6" height="50" fill="${L.stripesTop}"/>`; }
    const glyphMap = { '2.1': 'flame', '2.2': 'gas', '2.3': 'skull', '3': 'flame', '4.1': 'flame', '4.2': 'flame', '4.3': 'flame', '5.1': 'oxid', '5.2': 'flame', '6.1': 'skull', '8': 'corr', '1': 'bomb' };
    let glyph = '';
    const g = glyphMap[classe];
    const gcol = (classe === '3' || classe === '2.1' || classe === '2.2' || classe === '4.3') ? '#fff' : '#111';
    if (g) glyph = `<g transform="translate(20,-2) scale(0.6)">${GL[g](gcol)}</g>`;
    const num = classe;
    const numCol = L.fg;
    const numFill = classe === '8' ? '#fff' : numCol;
    return `<svg ${NS} viewBox="0 0 100 100" width="${s}" height="${s}" role="img" aria-label="Rótulo de risco classe ${classe}"><defs>${clip}</defs><g clip-path="url(#dm)">${bgs}</g><polygon points="50,2 98,50 50,98 2,50" fill="none" stroke="#111" stroke-width="2"/><polygon points="50,9 91,50 50,91 9,50" fill="none" stroke="#111" stroke-width="0.9" opacity="0.8"/>${glyph}<text x="50" y="86" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="17" fill="${numFill}">${num}</text></svg>`;
  }

  // painel de segurança laranja: número de risco / ONU
  function painel(risco, onu, w) {
    const W = w || 240; const H = W * 0.5;
    return `<svg ${NS} viewBox="0 0 240 120" width="${W}" height="${H}" role="img" aria-label="Painel de segurança ${risco || ''} / ${onu || ''}"><rect x="2" y="2" width="236" height="116" fill="#f97316" stroke="#111" stroke-width="4"/><line x1="2" y1="60" x2="238" y2="60" stroke="#111" stroke-width="4"/><text x="120" y="48" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="40" fill="#111">${risco || '—'}</text><text x="120" y="102" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="40" fill="#111">${onu || '—'}</text></svg>`;
  }

  // QR
  function qr(text, size) {
    const q = window.qrcode(0, 'M');
    q.addData(String(text || ''));
    q.make();
    const n = q.getModuleCount();
    const cell = 4; const m = 2;
    const dim = (n + m * 2) * cell;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${(c + m) * cell} ${(r + m) * cell}h${cell}v${cell}h-${cell}z`;
    const s = size || 110;
    return `<svg ${NS} viewBox="0 0 ${dim} ${dim}" width="${s}" height="${s}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${d}" fill="#0f172a"/></svg>`;
  }

  // Logo oficial Orbit 360: recortes da arte original (data/logo.js)
  function logo(size) { const L = O.LOGO.mark; const s = size || 40; return `<img src="${L.src}" width="${s}" height="${s}" alt="Orbit 360" style="display:block;border-radius:8px">`; }
  function lockup(h) { const L = O.LOGO.lockup; const hh = h || 90; return `<img src="${L.src}" height="${hh}" width="${Math.round(hh * L.w / L.h)}" alt="Orbit 360 | Consultoria em SSMA" style="display:block">`; }
  function dataBytes(key) {
    const src = O.LOGO[key].src; const bin = atob(src.split(',')[1]); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
  }

  function svgToPng(svg, w, h, scale, transparent) {
    return new Promise((ok, err) => {
      const sc = scale || 3;
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
        const ctx = cv.getContext('2d');
        if (!transparent) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); }
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        ok(cv.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); err(new Error('Falha ao rasterizar SVG')); };
      img.src = url;
    });
  }

  O.Pic = { ghs, transporte, painel, qr, logo, lockup, dataBytes, svgToPng };
})(window.O360 = window.O360 || {});
