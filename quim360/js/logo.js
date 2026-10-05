/* Logo dos documentos: Orbit 360 (padrão) ou logo própria enviada pelo usuário (Configurações). */
(function (O) {
  const S = O.Store;
  const TEMA_ESCURO = { bg: '#111420', fill: '111420', org: '#60a5fa', titulo: '#ffffff', sub: '#93c5fd', orgHex: '60A5FA', tituloHex: 'FFFFFF', subHex: '93C5FD' };
  const TEMA_CLARO = { bg: '#ffffff', fill: 'FFFFFF', org: '#2563eb', titulo: '#0f172a', sub: '#475569', orgHex: '2563EB', tituloHex: '0F172A', subHex: '475569' };

  const Logo = {
    atual() {
      const c = S.config();
      if (c.logoDoc) return { src: c.logoDoc, w: c.logoDocW || 300, h: c.logoDocH || 100, tipo: 'png', custom: true, claro: !!c.capaClara };
      const L = O.LOGO.lockup;
      return { src: L.src, w: L.w, h: L.h, tipo: 'jpg', custom: false, claro: false };
    },
    tema() { return this.atual().claro ? TEMA_CLARO : TEMA_ESCURO; },
    // dimensões em px que cabem na caixa maxW x maxH, mantendo a proporção
    tam(maxH, maxW) {
      const l = this.atual();
      let h = maxH; let w = h * l.w / l.h;
      if (w > maxW) { w = maxW; h = w * l.h / l.w; }
      return { w: Math.round(w), h: Math.round(h) };
    },
    img(maxH, maxW) {
      const l = this.atual(); const t = this.tam(maxH, maxW || 260);
      return `<img src="${l.src}" width="${t.w}" height="${t.h}" alt="${l.custom ? 'Logo da organização' : 'Orbit 360 | Consultoria em SSMA'}" style="display:block;object-fit:contain">`;
    },
    bytes() {
      const bin = atob(this.atual().src.split(',')[1]); const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
    },
    // lê o arquivo, reduz para no máximo 700 x 280 px e devolve PNG (preserva transparência)
    processar(file) {
      return new Promise((ok, err) => {
        if (!/^image\//.test(file.type)) { err(new Error('Escolha um arquivo de imagem (PNG, JPG ou SVG).')); return; }
        if (file.size > 6 * 1024 * 1024) { err(new Error('Imagem acima de 6 MB. Reduza o arquivo.')); return; }
        const url = URL.createObjectURL(file); const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || 400; let h = img.naturalHeight || 160;
          if (!img.naturalWidth && file.type === 'image/svg+xml') { w = 400; h = 160; }
          const esc = Math.min(1, 700 / w, 280 / h); const cw = Math.max(1, Math.round(w * esc)); const ch = Math.max(1, Math.round(h * esc));
          const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          cv.getContext('2d').drawImage(img, 0, 0, cw, ch);
          URL.revokeObjectURL(url);
          ok({ src: cv.toDataURL('image/png'), w: cw, h: ch });
        };
        img.onerror = () => { URL.revokeObjectURL(url); err(new Error('Não foi possível ler a imagem.')); };
        img.src = url;
      });
    },
    // texto de rodapé dos documentos
    rodape() { const c = S.config(); if (!this.atual().custom) return 'Orbit 360 | QUIM 360'; return c.organizacao ? c.organizacao + ' | QUIM 360' : 'QUIM 360'; },
  };
  O.Logo = Logo;
})(window.O360 = window.O360 || {});
