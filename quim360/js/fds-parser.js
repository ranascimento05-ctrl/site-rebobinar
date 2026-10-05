/* Analisador de FDS (ABNT NBR 14725): extrai dados do texto colado ou de arquivo .txt/.pdf.
   Heurístico e determinístico: sugere valores, quem confirma é o analista. */
(function (O) {
  const SEC_TITLES = [
    'Identificação do produto e da empresa',
    'Identificação de perigos',
    'Composição e informações sobre os ingredientes',
    'Medidas de primeiros socorros',
    'Medidas de combate a incêndio',
    'Medidas de controle para derramamento ou vazamento',
    'Manuseio e armazenamento',
    'Controle de exposição e proteção individual',
    'Propriedades físicas e químicas',
    'Estabilidade e reatividade',
    'Informações toxicológicas',
    'Informações ecológicas',
    'Considerações sobre tratamento e disposição',
    'Informações sobre transporte',
    'Informações sobre regulamentações',
    'Outras informações',
  ];

  function norm(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  // Divide o texto em seções 1..16
  function splitSections(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const marks = [];
    const re = /^\s*(?:se[cç][aã]o|section)?\s*(1[0-6]|[1-9])\s*[\.\-–:)]?\s*[\-–:]?\s*([A-Za-zÀ-ÿ].{3,120})$/i;
    lines.forEach((ln, i) => {
      const m = ln.match(re);
      if (!m) return;
      const n = +m[1];
      const t = norm(m[2]);
      // confere o título esperado por palavra-chave
      const keys = {
        1: ['identificacao do produto', 'identificacao da substancia', 'identificacao do produto e da empresa'],
        2: ['identificacao de perigo', 'identificacao dos perigo'],
        3: ['composicao', 'informacoes sobre os ingredientes'],
        4: ['primeiros socorros'],
        5: ['combate a incendio', 'combate ao incendio'],
        6: ['derramamento', 'vazamento', 'liberacao acidental'],
        7: ['manuseio', 'armazenamento'],
        8: ['controle de exposicao', 'protecao individual'],
        9: ['propriedades fisico', 'propriedades fisicas'],
        10: ['estabilidade', 'reatividade'],
        11: ['toxicologic'],
        12: ['ecologic'],
        13: ['tratamento', 'disposicao', 'destinacao final', 'eliminacao'],
        14: ['transporte'],
        15: ['regulament'],
        16: ['outras informacoes'],
      };
      if ((keys[n] || []).some((k) => t.includes(k))) marks.push({ n, i });
    });
    // mantém a primeira ocorrência de cada seção, em ordem crescente
    const seen = {};
    const ordered = [];
    marks.forEach((m) => { if (!seen[m.n]) { seen[m.n] = 1; ordered.push(m); } });
    ordered.sort((a, b) => a.i - b.i);
    const out = {};
    ordered.forEach((m, k) => {
      const end = k + 1 < ordered.length ? ordered[k + 1].i : lines.length;
      out[m.n] = lines.slice(m.i + 1, end).join('\n').trim();
    });
    return { secoes: out, encontradas: ordered.map((m) => m.n) };
  }

  function firstMatch(text, regexes) {
    for (const r of regexes) { const m = text.match(r); if (m) return m[1].trim(); }
    return '';
  }

  function parseDate(str) {
    if (!str) return null;
    let m = str.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    m = str.match(/(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }

  function langPt(text) {
    const t = ' ' + norm(text).slice(0, 20000) + ' ';
    const pt = (t.match(/ (de|do|da|para|com|em|nao|uso|produto|perigo|seguranca|em caso|medidas|informacoes) /g) || []).length;
    const en = (t.match(/ (the|and|of|for|with|product|hazard|safety|in case|measures|information|not) /g) || []).length;
    return { pt, en, portugues: pt >= en * 1.5 && pt > 8 };
  }

  function parse(text) {
    const T = O.TRANSPORT, G = O.GHS;
    const res = { avisos: [], campos: {} };
    const { secoes, encontradas } = splitSections(text);
    res.secoes = secoes;
    res.secoesEncontradas = encontradas;
    res.secoesFaltantes = [];
    for (let i = 1; i <= 16; i++) if (!encontradas.includes(i)) res.secoesFaltantes.push(i);

    const c = res.campos;
    c.nome = firstMatch(text, [/nome (?:do produto|comercial)\s*[:\-]\s*([^\n]{2,90})/i, /produto\s*[:\-]\s*([^\n]{2,90})/i, /product name\s*[:\-]\s*([^\n]{2,90})/i]);
    c.fornecedor = firstMatch(text, [/(?:fabricante|fornecedor|empresa)\s*[:\-]\s*([^\n]{2,90})/i, /supplier\s*[:\-]\s*([^\n]{2,90})/i]);
    c.codigoFornecedor = firstMatch(text, [/(?:c[oó]digo (?:do produto|interno)|ref(?:er[eê]ncia)?)\s*[:\-]\s*([^\n]{1,40})/i]);
    c.telEmergenciaFornecedor = firstMatch(text, [/(?:telefone de emerg[eê]ncia|emergency (?:phone|telephone))\s*[:\-]?\s*([^\n]{5,60})/i]);

    // revisão e data
    const rev = firstMatch(text, [/(?:data (?:da )?(?:[uú]ltima )?(?:revis[aã]o|emiss[aã]o|elabora[cç][aã]o|atualiza[cç][aã]o)|revis[aã]o|revision date|date of issue)\s*[:\-]?\s*([^\n]{6,40})/i]);
    const d = parseDate(rev) || parseDate(text.slice(0, 3000));
    c.dataRevisao = d ? d.toISOString().slice(0, 10) : '';
    c.versao = firstMatch(text, [/vers[aã]o\s*[:\-]?\s*([\w.\-]{1,12})/i, /revis[aã]o\s*n?[º°o]?\s*[:\-]?\s*(\d{1,3})\b/i]);

    const lg = langPt(text);
    c.idiomaPortugues = lg.portugues;
    res.idioma = lg;

    // frases H e P
    const hAll = G.splitCodes(text, 'H');
    const hValid = hAll.filter((h) => G.hText(h));
    c.h = hValid;
    c.hDesconhecidas = hAll.filter((h) => !G.hText(h));
    c.p = G.splitCodes(text, 'P').filter((p) => /^P\d{3}$/.test(p));
    c.pComb = (text.match(/P\d{3}(?:\s*\+\s*P\d{3})*/g) || []).map((x) => x.replace(/\s+/g, '')).filter((x, i, a) => a.indexOf(x) === i);
    const sig = firstMatch(text, [/palavra de advert[eê]ncia\s*[:\-]?\s*(perigo|aten[cç][aã]o|danger|warning)/i]);
    c.palavra = /perigo|danger/i.test(sig) ? 'Perigo' : /aten|warning/i.test(sig) ? 'Atenção' : '';
    // pictogramas declarados (GHS01..09)
    c.pictosDeclarados = [...new Set((text.match(/GHS0[1-9]/g) || []))];

    // CAS
    const cas = [...new Set((text.match(/\b\d{2,7}-\d{2}-\d\b/g) || []))].filter((x) => {
      const digits = x.replace(/-/g, '');
      const chk = +digits.slice(-1);
      let s = 0; const body = digits.slice(0, -1);
      for (let i = 0; i < body.length; i++) s += (+body[body.length - 1 - i]) * (i + 1);
      return s % 10 === chk;
    });
    c.cas = cas;

    // transporte
    const s14 = secoes[14] || text;
    c.onu = firstMatch(s14, [/(?:n[uú]mero (?:da )?onu|un number|onu|un)\s*[:\-]?\s*(?:UN|ONU)?\s*(\d{4})\b/i]) || firstMatch(text, [/\b(?:UN|ONU)\s*(\d{4})\b/i]);
    c.nomeEmbarque = firstMatch(s14, [/nome apropriado para embarque\s*[:\-]?\s*([^\n]{3,140})/i, /proper shipping name\s*[:\-]?\s*([^\n]{3,140})/i]);
    c.classeRisco = firstMatch(s14, [/classe(?:\/subclasse)?(?: de risco)?(?: principal)?(?: e subsidi[aá]rio)?\s*[:\-]?\s*(\d(?:\.\d)?)\b/i, /hazard class\s*[:\-]?\s*(\d(?:\.\d)?)\b/i]);
    c.subrisco = firstMatch(s14, [/risco subsidi[aá]rio\s*[:\-]?\s*(\d(?:\.\d)?)\b/i]);
    c.grupoEmbalagem = (firstMatch(s14, [/grupo de embalagem\s*[:\-]?\s*(III|II|I)\b/i, /packing group\s*[:\-]?\s*(III|II|I)\b/i]) || '').toUpperCase();
    c.numeroRisco = firstMatch(s14, [/n[uú]mero de risco\s*[:\-]?\s*(\d{2,3}|X\d{2,3})/i]);
    c.poluenteMarinho = /poluente marinho|marine pollutant/i.test(s14) && !/n[aã]o (?:[eé] )?(?:considerado )?poluente marinho|not (?:a )?marine pollutant/i.test(s14);
    c.ems = firstMatch(s14, [/EmS\s*[:\-]?\s*(F-[A-Z],?\s*S-[A-Z])/i]);

    // ponto de fulgor
    const pf = firstMatch(secoes[9] || text, [/ponto de fulgor\s*[:\-]?\s*(?:[^\d\-]{0,40})(-?\d{1,3}(?:[.,]\d+)?)\s*°?\s*c/i, /flash point\s*[:\-]?\s*(-?\d{1,3}(?:[.,]\d+)?)/i]);
    c.pontoFulgor = pf ? parseFloat(pf.replace(',', '.')) : null;
    c.ph = firstMatch(secoes[9] || text, [/\bpH\b\s*[:\-]?\s*(?:[^\d\-]{0,25})(\d{1,2}(?:[.,]\d+)?)/i]);

    // reatividade (Seção 10) -> tags
    const s10 = norm((secoes[10] || '') + ' ' + (secoes[7] || ''));
    const tags = new Set();
    if (/acido/.test(s10) && /incompativ|evitar|materiais a evitar/.test(s10)) tags.add('acido');
    if (/(base|alcali|hidroxido|soda)/.test(s10) && /incompativ|evitar/.test(s10)) tags.add('base');
    if (/oxidante|peroxido|permanganato|cromato|hipoclorito|nitrato/.test(s10) && /incompativ|evitar/.test(s10)) tags.add('oxidante');
    if (/(redutor|agentes redutores)/.test(s10)) tags.add('redutor');
    if (/(combustive|organicos|solvente|materia(?:l|is) inflamave)/.test(s10) && /incompativ|evitar/.test(s10)) tags.add('organico_combustivel');
    if (/(reage (?:violentamente )?com (?:a )?agua|em contato com (?:a )?agua libera|reativo com agua|agua[^.]{0,40}(?:reage|libera))/.test(s10)) tags.add('agua_reativo');
    if (/(umidade|agua)/.test(s10) && /evitar|incompativ/.test(s10)) tags.add('agua_umidade');
    if (/cianeto|sulfeto/.test(s10)) tags.add('cianeto_sulfeto');
    if (/hipoclorito|cloro ativo/.test(s10)) tags.add('hipoclorito');
    if (/amonia|aminas/.test(s10)) tags.add('amonia_aminas');
    if (/(aluminio|zinco|magnesio|metais?)/.test(s10) && /incompativ|evitar|corros/.test(s10)) tags.add('metais');
    if (/fontes? de ignicao|chamas|faiscas|calor/.test(s10)) tags.add('ignicao');
    c.incompativeis = [...tags];

    // limites de exposição (Seção 8) e temperatura de armazenamento (Seção 7)
    const lim = (secoes[8] || '').split('\n').map((x) => x.trim()).filter((x) => /tlv|twa|stel|nr-?\s?15|limite de (?:exposi|toler)|\bppm\b|mg\/m/i.test(x));
    c.limitesExposicao = lim.join('; ').slice(0, 300);
    const tm = (secoes[7] || '').match(/(?:temperatura|armazen)[^.\n]{0,60}?(?:inferior a|m[aá]xima(?: de)?|n[aã]o exceder|at[eé]|abaixo de)\s*(\d{1,3})\s*°\s*c/i);
    c.tempMax = tm ? tm[1] + ' °C' : '';
    // PFAS
    const pfasHits = [];
    if (T.PFAS_TERMS.test(text)) pfasHits.push('termo no texto: ' + (text.match(T.PFAS_TERMS) || [''])[0]);
    cas.forEach((x) => { const w = T.WATCH.pfas.find((p) => p[0] === x); if (w) pfasHits.push(w[1] + ' (CAS ' + x + ')'); });
    c.pfasIndicios = pfasHits;

    // CMR: frases H + CAS da lista de alerta
    const cmrH = G.cmrFromH(hValid);
    c.cmrH = cmrH;
    const cmrCas = [];
    ['cancerigeno', 'reprotoxico', 'mutagenico'].forEach((k) => {
      cas.forEach((x) => { const w = T.WATCH[k].find((p) => p[0] === x); if (w) cmrCas.push({ tipo: k, cas: x, nome: w[1] }); });
    });
    c.cmrCas = cmrCas;

    // avisos
    if (!encontradas.length) res.avisos.push('Nenhuma seção numerada foi reconhecida. Cole o texto com os títulos das seções 1 a 16.');
    else if (res.secoesFaltantes.length) res.avisos.push('Seções não encontradas: ' + res.secoesFaltantes.join(', ') + '. Verifique se o texto foi colado completo.');
    if (c.hDesconhecidas.length) res.avisos.push('Frases H não reconhecidas: ' + c.hDesconhecidas.join(', '));
    if (!c.dataRevisao) res.avisos.push('Data de revisão não identificada.');
    if (!c.idiomaPortugues) res.avisos.push('O texto não parece estar em português.');
    return res;
  }

  // PDF via pdf.js (carregado sob demanda); .txt via FileReader
  async function lerArquivo(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) {
      if (!window.pdfjsLib) {
        await new Promise((ok, err) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = ok; s.onerror = () => err(new Error('Não foi possível carregar o leitor de PDF (sem acesso à rede). Cole o texto da FDS manualmente.'));
          document.head.appendChild(s);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let out = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        let lastY = null; let line = '';
        tc.items.forEach((it) => {
          const y = Math.round(it.transform[5]);
          if (lastY !== null && Math.abs(y - lastY) > 2) { out += line.trim() + '\n'; line = ''; }
          line += it.str + ' '; lastY = y;
        });
        out += line.trim() + '\n';
      }
      if (out.replace(/\s/g, '').length < 200) throw new Error('O PDF não contém texto selecionável (provável digitalização). Faça OCR ou cole o texto.');
      return out;
    }
    return await file.text();
  }

  O.FDS = { SEC_TITLES, parse, splitSections, lerArquivo, parseDate };
})(window.O360 = window.O360 || {});
