/* Renderizadores de blocos: HTML (pré-visualização e PDF por impressão) e Word (.docx). */
(function (O) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TONE = {
    crit: { bar: '#ef4444', bg: '#fee2e2', fg: '#7f1d1d' },
    warn: { bar: '#f59e0b', bg: '#fef3c7', fg: '#78350f' },
    ok: { bar: '#10b981', bg: '#d1fae5', fg: '#064e3b' },
    info: { bar: '#60a5fa', bg: '#dbeafe', fg: '#1e3a8a' },
  };

  // ------------------------------------------------------------ HTML
  function html(blocks) {
    const out = [];
    const r = (b) => {
      switch (b.t) {
        case 'cover':
          return `<header class="d-cover"><div class="d-cover-logo">${O.Pic.lockup(112)}</div><div class="d-cover-txt"><div class="d-cover-org">${b.org ? esc(b.org) : 'QUIM 360'}</div><h1>${esc(b.titulo)}</h1><p class="d-cover-sub">${esc(b.sub)}</p></div></header><table class="d-kv d-meta">${b.meta.map((m) => `<tr><th>${esc(m[0])}</th><td>${esc(m[1])}</td></tr>`).join('')}</table>`;
        case 'h1': return `<h2 class="d-h1">${esc(b.text)}</h2>`;
        case 'h2': return `<h3 class="d-h2">${esc(b.text)}</h3>`;
        case 'p': return `<p class="d-p${b.small ? ' small' : ''}${b.bold ? ' bold' : ''}">${esc(b.text)}</p>`;
        case 'kv': return `<table class="d-kv">${b.rows.map((m) => `<tr><th>${esc(m[0])}</th><td>${esc(m[1]) || '&nbsp;'}</td></tr>`).join('')}</table>`;
        case 'table': return `<table class="d-table${b.tall ? ' tall' : ''}"><thead><tr>${b.head.map((h, i) => `<th style="width:${b.widths ? b.widths[i] : ''}%">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c) || '&nbsp;'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        case 'list': return b.items.length ? `<${b.ordered ? 'ol' : 'ul'} class="d-list">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>` : '';
        case 'check': return `<ul class="d-check">${b.items.map((i) => `<li><span class="bx"></span>${esc(i)}</li>`).join('')}</ul>`;
        case 'callout': { const t = TONE[b.tone] || TONE.info; return `<div class="d-callout" style="border-left-color:${t.bar};background:${t.bg};color:${t.fg}"><strong>${esc(b.title)}</strong><div>${esc(b.text)}</div></div>`; }
        case 'imgs': return `<div class="d-imgs">${b.items.map((i) => `<figure>${i.svg}${i.cap ? `<figcaption>${esc(i.cap)}</figcaption>` : ''}</figure>`).join('')}</div>`;
        case 'box': return `<div class="d-box" style="border-color:${b.border || '#dc2626'};${b.bg ? 'background:' + b.bg : ''}">${b.children.map(r).join('')}</div>`;
        case 'qr': return `<figure class="d-qr">${O.Pic.qr(b.text, 120)}<figcaption>${esc(b.cap)}<br><span class="mono">${esc(b.text.length > 80 ? b.text.slice(0, 80) + '…' : b.text)}</span></figcaption></figure>`;
        case 'sign': return `<div class="d-sign">${b.rows.map((s) => `<div><div class="line"></div><div>${esc(s[0])}</div><div class="small">${esc(s[1])}</div></div>`).join('')}</div>`;
        case 'pagebreak': return '<div class="d-break"></div>';
        default: return '';
      }
    };
    blocks.forEach((b) => out.push(r(b)));
    return `<article class="doc">${out.join('')}</article>`;
  }

  const DOC_CSS = `
  .doc{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827;background:#fff;font-size:11pt;line-height:1.5;text-align:left}
  .doc *{box-sizing:border-box}
  .d-cover{display:flex;gap:20px;align-items:center;background:#111420;color:#fff;padding:18px 22px;border-radius:8px 8px 0 0;border-bottom:4px solid #60a5fa}
  .d-cover-logo{flex:none}.d-cover-txt{min-width:0}.d-cover h1{margin:2px 0 4px;font-size:22pt;line-height:1.2;color:#fff}
  .d-cover-org{color:#60a5fa;font-weight:700;font-size:10pt}
  .d-cover-sub{margin:0;color:#93c5fd;font-size:10pt}
  .d-h1{font-size:15pt;margin:20px 0 8px;color:#0f172a;border-bottom:2px solid #60a5fa;padding-bottom:3px;break-after:avoid}
  .d-h2{font-size:12pt;margin:14px 0 6px;color:#1e3a8a;break-after:avoid}
  .d-p{margin:6px 0}.d-p.small,.small{font-size:9pt;color:#4b5563}.d-p.bold{font-weight:700}
  .d-kv{width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt}
  .d-kv th{width:34%;text-align:left;background:#eff6ff;color:#1e3a8a;border:1px solid #cbd5e1;padding:5px 8px;vertical-align:top;font-weight:700}
  .d-kv td{border:1px solid #cbd5e1;padding:5px 8px;vertical-align:top;white-space:pre-wrap}
  .d-meta{margin-top:0}
  .d-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10pt}
  .d-table th{background:#0f172a;color:#fff;text-align:left;padding:5px 8px;border:1px solid #0f172a}
  .d-table td{border:1px solid #cbd5e1;padding:5px 8px;vertical-align:top;white-space:pre-wrap}
  .d-table tr:nth-child(even) td{background:#f8fafc}
  .d-table.tall td{height:26px}
  .d-list{margin:6px 0 6px 20px;padding:0}.d-list li{margin:2px 0}
  .d-check{list-style:none;margin:6px 0;padding:0}.d-check li{display:flex;gap:8px;margin:4px 0;align-items:flex-start}
  .bx{flex:none;width:12px;height:12px;border:1.5px solid #0f172a;margin-top:4px;border-radius:2px}
  .d-callout{border-left:6px solid;padding:8px 12px;margin:10px 0;border-radius:3px;font-size:10.5pt}
  .d-callout strong{display:block;margin-bottom:2px}
  .d-imgs{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;margin:10px 0}
  .d-imgs figure,.d-qr{margin:0;text-align:center}.d-imgs figcaption,.d-qr figcaption{font-size:8.5pt;color:#374151;max-width:150px;margin:2px auto 0}
  .d-box{border:3px solid;border-radius:6px;padding:12px 14px;margin:10px 0;break-inside:avoid}
  .d-box .d-h2{margin-top:0}
  .d-sign{display:flex;gap:40px;margin-top:36px}.d-sign>div{flex:1}.d-sign .line{border-top:1px solid #111;margin-bottom:4px}
  .mono{font-family:Consolas,'Courier New',monospace;font-size:7.5pt;word-break:break-all}
  .d-break{break-after:page;height:0}
  .d-box .d-table td,.d-box .d-kv td{background:#fff!important}.d-box .d-table tr:nth-child(even) td{background:#fff!important}
  `;

  function printPdf(blocks, titulo) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const d = iframe.contentWindow.document;
    d.open();
    d.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>@page{size:A4;margin:14mm}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}${DOC_CSS}.doc{line-height:1.4}.d-h1{margin-top:14px}</style></head><body>${html(blocks)}</body></html>`);
    d.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => iframe.remove(), 2000); }, 300);
  }

  // ------------------------------------------------------------ Word
  function b64ToU8(dataUrl) {
    const bin = atob(dataUrl.split(',')[1]);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  async function docx(blocks, titulo) {
    const D = window.docx;
    const FONT = 'Arial';
    const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
    const line = (c, sz) => ({ style: D.BorderStyle.SINGLE, size: sz || 4, color: c || 'CBD5E1' });
    const allB = (c, sz) => ({ top: line(c, sz), bottom: line(c, sz), left: line(c, sz), right: line(c, sz) });
    const cache = new Map();
    const png = async (svg, w, h, transp) => {
      const k = svg + w + h + (transp ? 't' : '');
      if (!cache.has(k)) cache.set(k, await O.Pic.svgToPng(svg, w, h, 3, transp));
      return cache.get(k);
    };
    const run = (text, o) => new D.TextRun({ text: String(text == null ? '' : text), font: FONT, size: 22, ...(o || {}) });
    const par = (text, o) => new D.Paragraph({ spacing: { after: 80, line: 300 }, alignment: D.AlignmentType.LEFT, children: [run(text, o && o.run)], ...(o && o.p) });
    const multi = (text, o) => String(text == null ? '' : text).split('\n').map((l) => par(l, o));
    const W = 9638; // largura útil em twips (A4, margens 1,5 cm)
    const tw = (pct) => Math.round(W * pct / 100);

    async function imgParas(items) {
      const cells = [];
      for (const i of items) {
        const data = await png(i.svg, i.w, i.h);
        const ph = Math.min(i.h, 110); const pw = Math.round(i.w * ph / i.h);
        cells.push(new D.TableCell({ borders: noBorders, width: { size: Math.round(W / Math.max(items.length, 4)), type: D.WidthType.DXA }, children: [
          new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.ImageRun({ type: 'png', data: b64ToU8(data), transformation: { width: pw, height: ph } })] }),
          ...(i.cap ? [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [run(i.cap, { size: 16 })] })] : []),
        ] }));
      }
      return [new D.Table({ borders: noBorders, width: { size: W, type: D.WidthType.DXA }, rows: [new D.TableRow({ children: cells })] }), par('')];
    }

    async function conv(b) {
      switch (b.t) {
        case 'cover': {
          const L = O.LOGO.lockup; const lh = 112; const lw = Math.round(lh * L.w / L.h);
          const t = new D.Table({ width: { size: W, type: D.WidthType.DXA }, borders: noBorders, rows: [new D.TableRow({ children: [new D.TableCell({
            shading: { type: D.ShadingType.CLEAR, fill: '111420', color: 'auto' }, margins: { top: 160, bottom: 160, left: 200, right: 200 }, borders: { ...noBorders, bottom: { style: D.BorderStyle.SINGLE, size: 24, color: '60A5FA' } },
            children: [
              new D.Paragraph({ children: [new D.ImageRun({ type: 'jpg', data: O.Pic.dataBytes('lockup'), transformation: { width: lw, height: lh } })] }),
              new D.Paragraph({ spacing: { before: 100, after: 60 }, children: [run(b.titulo, { bold: true, color: 'FFFFFF', size: 48 })] }),
              new D.Paragraph({ children: [run(b.sub, { color: '93C5FD', size: 20 })] }),
            ] })] })] });
          const kv = await conv({ t: 'kv', rows: b.meta });
          return [t, par(''), ...kv];
        }
        case 'h1': return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 }, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: '60A5FA', space: 2 } }, children: [run(b.text, { bold: true, size: 32, color: '0F172A' })] })];
        case 'h2': return [new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, keepNext: true, children: [run(b.text, { bold: true, size: 26, color: '1E3A8A' })] })];
        case 'p': return multi(b.text, { run: { bold: !!b.bold, size: b.small ? 18 : 22, color: b.small ? '4B5563' : undefined } });
        case 'kv': return [new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [tw(34), tw(66)], rows: b.rows.map((m) => new D.TableRow({ cantSplit: true, children: [
          new D.TableCell({ width: { size: tw(34), type: D.WidthType.DXA }, borders: allB(), shading: { type: D.ShadingType.CLEAR, fill: 'EFF6FF', color: 'auto' }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [par(m[0], { run: { bold: true, size: 20, color: '1E3A8A' } })] }),
          new D.TableCell({ width: { size: tw(66), type: D.WidthType.DXA }, borders: allB(), margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: multi(m[1], { run: { size: 20 } }) }),
        ] })) }), par('')];
        case 'table': {
          const ws = b.widths || b.head.map(() => 100 / b.head.length);
          const head = new D.TableRow({ tableHeader: true, children: b.head.map((h, i) => new D.TableCell({ width: { size: tw(ws[i]), type: D.WidthType.DXA }, borders: allB('0F172A'), shading: { type: D.ShadingType.CLEAR, fill: '0F172A', color: 'auto' }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [par(h, { run: { bold: true, color: 'FFFFFF', size: 20 } })] })) });
          const rows = b.rows.map((row, ri) => new D.TableRow({ cantSplit: true, height: b.tall ? { value: 520, rule: D.HeightRule.ATLEAST } : undefined, children: row.map((c, i) => new D.TableCell({ width: { size: tw(ws[i]), type: D.WidthType.DXA }, borders: allB(), shading: ri % 2 ? { type: D.ShadingType.CLEAR, fill: 'F8FAFC', color: 'auto' } : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: multi(c, { run: { size: 20 } }) })) }));
          return [new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: ws.map(tw), rows: [head, ...rows] }), par('')];
        }
        case 'list': return b.items.map((i, n) => new D.Paragraph({ spacing: { after: 60, line: 288 }, indent: { left: 360, hanging: 260 }, children: [run((b.ordered ? (n + 1) + '.  ' : '•  ') + i, { size: 21 })] }));
        case 'check': return b.items.map((i) => new D.Paragraph({ spacing: { after: 60, line: 288 }, indent: { left: 400, hanging: 400 }, children: [run('☐  ', { font: 'Segoe UI Symbol', size: 22 }), run(i, { size: 21 })] }));
        case 'callout': {
          const t = TONE[b.tone] || TONE.info;
          const hex = (c) => c.replace('#', '').toUpperCase();
          return [new D.Table({ width: { size: W, type: D.WidthType.DXA }, borders: noBorders, rows: [new D.TableRow({ cantSplit: true, children: [new D.TableCell({ width: { size: W, type: D.WidthType.DXA }, shading: { type: D.ShadingType.CLEAR, fill: hex(t.bg), color: 'auto' }, margins: { top: 100, bottom: 100, left: 180, right: 160 }, borders: { ...noBorders, left: { style: D.BorderStyle.SINGLE, size: 36, color: hex(t.bar) } }, children: [par(b.title, { run: { bold: true, color: hex(t.fg), size: 22 } }), ...multi(b.text, { run: { color: hex(t.fg), size: 21 } })] })] })] }), par('')];
        }
        case 'imgs': return await imgParas(b.items);
        case 'box': {
          const kids = [];
          for (const c of b.children) kids.push(...await conv(c));
          return [new D.Table({ width: { size: W, type: D.WidthType.DXA }, rows: [new D.TableRow({ cantSplit: true, children: [new D.TableCell({ width: { size: W, type: D.WidthType.DXA }, borders: allB((b.border || '#dc2626').replace('#', '').toUpperCase(), 24), shading: b.bg ? { type: D.ShadingType.CLEAR, fill: b.bg.replace('#', '').toUpperCase(), color: 'auto' } : undefined, margins: { top: 140, bottom: 140, left: 200, right: 200 }, children: kids.filter((k) => !(k instanceof D.Table && false)) })] })] }), par('')];
        }
        case 'qr': {
          const data = await png(O.Pic.qr(b.text, 120), 120, 120);
          return [new D.Paragraph({ children: [new D.ImageRun({ type: 'png', data: b64ToU8(data), transformation: { width: 110, height: 110 } })] }), par(b.cap, { run: { size: 18 } }), par(b.text, { run: { size: 14, font: 'Consolas' } })];
        }
        case 'sign': {
          const cells = b.rows.map((s) => new D.TableCell({ width: { size: Math.round(W / b.rows.length), type: D.WidthType.DXA }, borders: { ...noBorders, top: { style: D.BorderStyle.SINGLE, size: 6, color: '111111' } }, margins: { top: 60 }, children: [par(s[0], { run: { size: 20 } }), par(s[1], { run: { size: 18, color: '4B5563' } })] }));
          return [par(''), par(''), new D.Table({ width: { size: W, type: D.WidthType.DXA }, borders: noBorders, rows: [new D.TableRow({ children: cells })] })];
        }
        case 'pagebreak': return [new D.Paragraph({ children: [new D.PageBreak()] })];
        default: return [];
      }
    }

    const children = [];
    for (const b of blocks) children.push(...await conv(b));
    const doc = new D.Document({
      creator: 'QUIM 360 | Orbit 360', title: titulo,
      styles: { default: { document: { run: { font: FONT, size: 22 } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1134, right: 1134 } } },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.LEFT, children: [run('Orbit 360 | QUIM 360 | ' + titulo + ' | página ', { size: 16, color: '6B7280' }), new D.TextRun({ children: [D.PageNumber.CURRENT], font: FONT, size: 16, color: '6B7280' }), run(' de ', { size: 16, color: '6B7280' }), new D.TextRun({ children: [D.PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '6B7280' })] })] }) },
        children,
      }],
    });
    return await D.Packer.toBlob(doc);
  }

  function text(blocks) {
    const L = [];
    const r = (b) => {
      switch (b.t) {
        case 'cover': L.push(b.titulo.toUpperCase().charAt(0) + b.titulo.slice(1), b.sub, ''); b.meta.forEach((m) => L.push(m[0] + ': ' + m[1])); L.push(''); break;
        case 'h1': L.push('', b.text, '-'.repeat(Math.min(b.text.length, 60))); break;
        case 'h2': L.push('', b.text); break;
        case 'p': L.push(b.text); break;
        case 'kv': b.rows.forEach((m) => L.push(m[0] + ': ' + (m[1] || '—'))); break;
        case 'table': L.push(b.head.join(' | ')); b.rows.forEach((row) => L.push(row.join(' | '))); break;
        case 'list': b.items.forEach((i, n) => L.push((b.ordered ? (n + 1) + '. ' : '- ') + i)); break;
        case 'check': b.items.forEach((i) => L.push('[ ] ' + i)); break;
        case 'callout': L.push(b.title + ': ' + b.text); break;
        case 'box': b.children.forEach(r); break;
        case 'imgs': { const caps = b.items.map((i) => i.cap).filter(Boolean); if (caps.length) L.push('Símbolos: ' + caps.join('; ')); break; }
        case 'qr': L.push(b.cap + ': ' + b.text); break;
        case 'sign': b.rows.forEach((s) => L.push('Assinatura: ' + s[0] + (s[1] ? ' | ' + s[1] : ''))); break;
        default: break;
      }
    };
    blocks.forEach(r);
    return L.join('\n');
  }

  // download: tenta o clique direto; se o navegador ou o visualizador bloquear, mostra um link manual
  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome; a.rel = 'noopener';
    document.body.appendChild(a);
    try { a.click(); } catch (e) { /* segue para o link manual */ }
    a.remove();
    const aviso = document.createElement('div');
    aviso.className = 'toast'; aviso.setAttribute('role', 'status');
    aviso.innerHTML = 'Arquivo gerado: <a href="' + url + '" download="' + nome + '" target="_blank" rel="noopener">' + nome + '</a>. Se o download não iniciou, clique no nome do arquivo.';
    document.body.appendChild(aviso);
    setTimeout(() => { aviso.remove(); URL.revokeObjectURL(url); }, 20000);
  }

  O.Render = { html, docx, text, printPdf, baixar, DOC_CSS, esc };
})(window.O360 = window.O360 || {});
