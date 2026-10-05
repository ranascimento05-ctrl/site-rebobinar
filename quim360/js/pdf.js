/* PDF direto (sem janela de impressão): converte os blocos dos documentos para pdfmake. */
(function (O) {
  const TONE = {
    crit: { bar: '#ef4444', bg: '#fee2e2', fg: '#7f1d1d' },
    warn: { bar: '#f59e0b', bg: '#fef3c7', fg: '#78350f' },
    ok: { bar: '#10b981', bg: '#d1fae5', fg: '#064e3b' },
    info: { bar: '#60a5fa', bg: '#dbeafe', fg: '#1e3a8a' },
  };
  const BORDA = '#cbd5e1';
  const LARG = 515; // A4 com margens de 40 pt
  const pt = (px) => Math.round(px * 0.75);
  const txt = (v) => { const s = String(v == null ? '' : v); return s === '' ? ' ' : s; };
  const suave = { hLineColor: () => BORDA, vLineColor: () => BORDA, hLineWidth: () => 0.5, vLineWidth: () => 0.5, paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4 };

  async function conv(b) {
    switch (b.t) {
      case 'cover': {
        const lg = O.Logo.atual(); const tm = O.Logo.tema(); const dim = O.Logo.tam(80, 170);
        const meta = await conv({ t: 'kv', rows: b.meta });
        return [
          { table: { widths: ['*'], body: [[{ fillColor: tm.bg, margin: [10, 10, 10, 10], columns: [
            { image: lg.src, width: Math.round(dim.w * 0.75 * 1.2), height: Math.round(dim.h * 0.75 * 1.2) },
            { width: '*', margin: [14, 6, 0, 0], stack: [{ text: b.org || 'QUIM 360', color: tm.org, bold: true, fontSize: 10 }, { text: b.titulo, color: tm.titulo, bold: true, fontSize: 21, margin: [0, 3, 0, 4] }, { text: b.sub, color: tm.sub, fontSize: 9 }] },
          ] }]] }, layout: { hLineWidth: (i, n) => (i === n.table.body.length ? 3 : (lg.claro ? 0.5 : 0)), hLineColor: (i, n) => (i === n.table.body.length ? '#60a5fa' : '#cbd5e1'), vLineWidth: () => (lg.claro ? 0.5 : 0), vLineColor: () => '#cbd5e1' }, margin: [0, 0, 0, 8] },
          ...meta,
        ];
      }
      case 'h1': return [{ text: b.text, fontSize: 15, bold: true, color: '#0f172a', margin: [0, 14, 0, 3], keepWithNext: true }, { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARG, y2: 0, lineWidth: 1.5, lineColor: '#60a5fa' }], margin: [0, 0, 0, 6] }];
      case 'h2': return [{ text: b.text, fontSize: 12, bold: true, color: '#1e3a8a', margin: [0, 10, 0, 4] }];
      case 'p': return [{ text: txt(b.text), fontSize: b.small ? 8.5 : 10, bold: !!b.bold, color: b.small ? '#4b5563' : '#111827', margin: [0, 2, 0, 4] }];
      case 'kv': return [{ table: { widths: ['34%', '*'], body: b.rows.map((m) => [{ text: txt(m[0]), bold: true, color: '#1e3a8a', fillColor: '#eff6ff', fontSize: 9.5 }, { text: txt(m[1]), fontSize: 9.5 }]) }, layout: suave, margin: [0, 4, 0, 8] }];
      case 'table': {
        const ws = (b.widths || b.head.map(() => 100 / b.head.length)).map((w) => w + '%');
        const head = b.head.map((x) => ({ text: txt(x), bold: true, color: '#ffffff', fillColor: '#0f172a', fontSize: 9.5 }));
        const rows = b.rows.map((row, ri) => row.map((c) => ({ text: txt(c), fontSize: 9.5, fillColor: ri % 2 ? '#f8fafc' : undefined, margin: b.tall ? [0, 7, 0, 7] : [0, 0, 0, 0] })));
        return [{ table: { headerRows: 1, dontBreakRows: true, widths: ws, body: [head, ...rows] }, layout: suave, margin: [0, 4, 0, 8] }];
      }
      case 'list': return b.items.length ? [{ [b.ordered ? 'ol' : 'ul']: b.items.map((i) => ({ text: txt(i), fontSize: 10 })), margin: [8, 2, 0, 6] }] : [];
      case 'check': return b.items.map((i) => ({ columns: [{ canvas: [{ type: 'rect', x: 1, y: 2, w: 9, h: 9, lineWidth: 1, lineColor: '#0f172a' }], width: 18 }, { text: txt(i), fontSize: 10 }], margin: [0, 2, 0, 2] }));
      case 'callout': {
        const t = TONE[b.tone] || TONE.info;
        return [{ table: { widths: ['*'], body: [[{ fillColor: t.bg, margin: [6, 4, 6, 4], stack: [{ text: txt(b.title), bold: true, color: t.fg, fontSize: 10.5 }, { text: txt(b.text), color: t.fg, fontSize: 10 }] }]] }, layout: { hLineWidth: () => 0, vLineWidth: (i) => (i === 0 ? 4 : 0), vLineColor: () => t.bar }, margin: [0, 6, 0, 8] }];
      }
      case 'imgs': {
        const cols = [];
        for (const i of b.items) {
          const data = await O.Pic.svgToPng(i.svg, i.w, i.h, 3);
          cols.push({ width: 'auto', stack: [{ image: data, width: pt(Math.min(i.w, 300)), alignment: 'center' }, ...(i.cap ? [{ text: i.cap, fontSize: 7.5, color: '#374151', alignment: 'center', margin: [0, 2, 0, 0] }] : [])] });
        }
        return [{ columns: cols, columnGap: 14, margin: [0, 6, 0, 8] }];
      }
      case 'box': {
        const kids = [];
        for (const c of b.children) kids.push(...await conv(c));
        const cor = b.border || '#dc2626';
        return [{ table: { widths: ['*'], body: [[{ stack: kids, fillColor: b.bg, margin: [8, 6, 8, 6] }]] }, layout: { hLineWidth: () => 2.5, vLineWidth: () => 2.5, hLineColor: () => cor, vLineColor: () => cor }, margin: [0, 6, 0, 8] }];
      }
      case 'qr': {
        const data = await O.Pic.svgToPng(O.Pic.qr(b.text, 120), 120, 120, 3);
        return [{ image: data, width: 84, margin: [0, 6, 0, 2] }, { text: b.cap, fontSize: 8, color: '#374151' }, { text: b.text, fontSize: 6.5, color: '#6b7280', margin: [0, 0, 0, 6] }];
      }
      case 'sign': return [{ columns: b.rows.map((s) => ({ stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8 }] }, { text: txt(s[0]), fontSize: 9.5, margin: [0, 3, 0, 0] }, { text: txt(s[1]), fontSize: 8.5, color: '#4b5563' }] })), columnGap: 30, margin: [0, 40, 0, 0] }];
      case 'pagebreak': return [{ text: '', pageBreak: 'after' }];
      default: return [];
    }
  }

  async function definicao(blocks, titulo) {
    const content = [];
    for (const b of blocks) content.push(...await conv(b));
    return {
      pageSize: 'A4', pageMargins: [40, 40, 40, 50], info: { title: titulo, creator: 'QUIM 360 | Orbit 360' },
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.2 },
      content,
      footer: (cur, total) => ({ text: O.Logo.rodape() + ' | ' + titulo + ' | página ' + cur + ' de ' + total, fontSize: 8, color: '#6b7280', margin: [40, 8, 40, 0] }),
    };
  }

  O.Pdf = {
    async blob(blocks, titulo) {
      if (!window.pdfMake) throw new Error('Biblioteca de PDF indisponível.');
      const def = await definicao(blocks, titulo);
      return await new Promise((ok, err) => { try { window.pdfMake.createPdf(def).getBlob(ok); } catch (e) { err(e); } });
    },
  };
})(window.O360 = window.O360 || {});
