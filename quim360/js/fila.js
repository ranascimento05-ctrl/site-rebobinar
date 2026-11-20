/* Fila de homologação: importa uma lista de produtos (xlsx ou csv) sem FDS e organiza o trabalho.
   A lista é só ponto de partida (nome, fabricante, local, composição em texto): os dados reais vêm da FDS atual de cada produto. */
(function (O) {
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const limpa = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  // ---------------------------------------------------------------- leitura de xlsx (JSZip) e de csv
  async function lerXlsx(file) {
    if (!window.JSZip) throw new Error('Biblioteca de leitura de planilha indisponível.');
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const xml = async (p) => { const f = zip.file(p); return f ? new DOMParser().parseFromString(await f.async('string'), 'application/xml') : null; };
    const ss = await xml('xl/sharedStrings.xml');
    const strs = ss ? [...ss.getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
    const wb = await xml('xl/workbook.xml'); const rels = await xml('xl/_rels/workbook.xml.rels');
    if (!wb || !rels) throw new Error('Arquivo .xlsx inválido.');
    const alvo = {}; [...rels.getElementsByTagName('Relationship')].forEach((r) => { alvo[r.getAttribute('Id')] = r.getAttribute('Target'); });
    const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const folhas = [];
    for (const s of [...wb.getElementsByTagName('sheet')]) {
      let t = alvo[s.getAttributeNS(NS, 'id')] || ''; t = t.replace(/^\//, ''); if (!/^xl\//.test(t)) t = 'xl/' + t;
      const doc = await xml(t); if (!doc) continue;
      const linhas = [];
      [...doc.getElementsByTagName('row')].forEach((row) => {
        const r = []; let tem = false;
        [...row.getElementsByTagName('c')].forEach((c) => {
          const ref = c.getAttribute('r') || ''; const col = ref.replace(/\d+/g, '').split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
          const tipo = c.getAttribute('t'); const v = c.getElementsByTagName('v')[0];
          let val = '';
          if (tipo === 's' && v) val = strs[+v.textContent] || ''; else if (tipo === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join(''); else if (v) val = v.textContent;
          if (val !== '') { r[col] = val; tem = true; }
        });
        if (tem) linhas[(+row.getAttribute('r') || linhas.length + 1) - 1] = r;
      });
      folhas.push({ nome: s.getAttribute('name'), linhas });
    }
    return folhas;
  }
  function lerCsv(texto) {
    texto = String(texto).replace(/^\uFEFF/, '');
    const sep = (texto.match(/;/g) || []).length >= (texto.match(/,/g) || []).length ? ';' : ',';
    const linhas = []; let r = [], c = '', q = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (q) { if (ch === '"' && texto[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { r.push(c); c = ''; } else if (ch === '\n') { r.push(c); linhas.push(r); r = []; c = ''; } else if (ch !== '\r') c += ch;
    }
    if (c !== '' || r.length) { r.push(c); linhas.push(r); }
    return [{ nome: 'csv', linhas }];
  }

  // ---------------------------------------------------------------- normalização
  const COL = [['nome', ['descricao do produto', 'nome do produto', 'produto', 'descricao']], ['fabricante', ['fabricante', 'fornecedor']], ['classe', ['classe de risco', 'classe']], ['composicao', ['composicao quimica', 'composicao']],
    ['emUso', ['em uso']], ['area', ['area usuaria']], ['localArm', ['local de armazenamento']], ['localUso', ['local de utilizacao', 'local de uso']], ['qtd', ['quantidade']], ['fds', ['fds possui carimbo', 'carimbo']]];
  function achaCabecalho(folhas) {
    for (const f of folhas) {
      for (let i = 0; i < f.linhas.length; i++) {
        const r = f.linhas[i]; if (!r) continue;
        if (!r.some((c) => /descri[cç][aã]o do produto|nome do produto/i.test(norm(c)) || norm(c) === 'produto')) continue;
        const mapa = {};
        r.forEach((c, j) => { const h = norm(c); COL.forEach(([k, chaves]) => { if (mapa[k] === undefined && chaves.some((x) => h === x || h.startsWith(x))) mapa[k] = j; }); });
        if (mapa.nome !== undefined) return { folha: f, linha: i, mapa };
      }
    }
    return null;
  }
  // locais escritos de várias formas viram um nome único
  function normLocal(raw) {
    const t = norm(raw).replace(/['’`´]/g, '');
    if (!t || /^(na|n\/a|nao se aplica|-)$/.test(t)) return '';
    if (/cont[ae]i?ner|conteiner/.test(t)) return 'Contêiner de PQ';
    if (/tanque/.test(t)) return 'Tanques';
    if (/limpeza/.test(t)) return 'Área de limpeza';
    if (/deposito.*oficina|oficina.*deposito/.test(t)) return 'Depósito da oficina';
    if (/oficina/.test(t)) return 'Oficina';
    return limpa(raw).toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()).replace(/ (De|Da|Do|Das|Dos|E) /g, (m) => m.toLowerCase());
  }
  function normClasse(raw) {
    const t = norm(raw); if (!t || t === 'none') return '';
    if (/^sem classe/.test(t)) return 'Sem classe de risco';
    if (/^(na|n\/a)$/.test(t)) return '';
    return limpa(raw).replace(',', '.');
  }
  function normEmUso(raw) { const t = norm(raw); if (/^s/.test(t) && !/^sem/.test(t)) return true; if (/^n/.test(t)) return false; return null; }

  // prioridade para levantar a FDS e homologar primeiro: aponta onde um gatilho de CMR ou PFC é mais provável
  const ALTA = [[/(?<!etil)benzeno/, 'benzeno'], [/tolueno/, 'tolueno'], [/n-?hexano|\bhexano/, 'hexano'], [/tricloro|percloro|diclorometano|cloreto de metileno|tetracloreto/, 'solvente clorado'], [/formol|formaldeido/, 'formaldeído'], [/metanol|alcool metilico/, 'metanol'], [/\bfluor(?!escen)|pfas|ptfe|perfluor|polifluor/, 'flúor ou PFAS'], [/cromo|chumbo|cadmio|amianto|asbesto|hidrazina/, 'metal ou agente de atenção']];
  const MEDIA = [[/xileno|xilol/, 'xileno'], [/etilbenzeno/, 'etilbenzeno'], [/estireno/, 'estireno']];
  function prioridade(it) {
    const t = norm(it.composicao + ' ' + it.nome); const alta = [], media = [];
    ALTA.forEach(([re, n]) => { if (re.test(t)) alta.push(n); });
    MEDIA.forEach(([re, n]) => { if (re.test(t)) media.push(n); });
    const c = norm(it.classe);
    if (alta.length) return { nivel: 'alta', motivos: alta.map((x) => 'cita ' + x + ' (possível gatilho CMR ou PFC)') };
    if (media.length) return { nivel: 'media', motivos: media.map((x) => 'cita ' + x + ' (solvente aromático: confirmar na FDS)') };
    if (c === '3') return { nivel: 'media', motivos: ['classe 3 (líquido inflamável)'] };
    if (c === '6' || c === '8a' || c === '8b' || c === '4.1') return { nivel: 'media', motivos: ['classe de risco ' + it.classe] };
    return { nivel: 'normal', motivos: [] };
  }

  function montar(folhas, nomeArquivo) {
    const cab = achaCabecalho(folhas);
    if (!cab) throw new Error('Não encontrei a coluna "Descrição do Produto" na planilha. Confira se é a lista de produtos químicos.');
    const { folha, linha, mapa } = cab; const g = (r, k) => (mapa[k] === undefined ? '' : limpa(r[mapa[k]]));
    const itens = []; const vistos = {}; const agora = new Date().toISOString();
    for (let i = linha + 1; i < folha.linhas.length; i++) {
      const r = folha.linhas[i]; if (!r) continue;
      const nome = g(r, 'nome'); if (!nome) continue;
      const it = { id: O.Store.uid('fila'), nome, fabricante: g(r, 'fabricante'), classe: normClasse(g(r, 'classe')), composicao: g(r, 'composicao'), emUso: normEmUso(g(r, 'emUso')), area: g(r, 'area'), localOriginal: g(r, 'localArm'), local: normLocal(g(r, 'localArm')), localUso: g(r, 'localUso'), quantidade: g(r, 'qtd'), carimboLista: /^s/.test(norm(g(r, 'fds'))) ? 'sim' : g(r, 'fds') ? 'nao' : '', origem: nomeArquivo || '', importadoEm: agora, estado: '', produtoId: '', obs: '' };
      it.chave = norm(it.nome) + '|' + norm(it.fabricante);
      it.duplicado = !!vistos[it.chave]; vistos[it.chave] = 1;
      it.prioridade = prioridade(it);
      if (it.emUso === false) { it.estado = 'descartado'; it.obs = 'Marcado como fora de uso na lista importada.'; }
      itens.push(it);
    }
    return itens;
  }
  async function lerArquivo(file) {
    const n = file.name.toLowerCase();
    const folhas = n.endsWith('.xlsx') ? await lerXlsx(file) : lerCsv(await file.text());
    return montar(folhas, file.name);
  }

  // situação mostrada: segue o produto, quando a homologação já foi iniciada
  const ROTULOS = { homologado: 'Homologado', condicionado: 'Homologado com condicionantes', reprovado: 'Reprovado', pendente: 'Pendente', em_analise: 'Em homologação', na_lista: 'Já homologado' };
  function situacao(it) {
    const p = it.produtoId ? O.Store.produto(it.produtoId) : null;
    if (p) return { chave: p.status || 'em_analise', rotulo: ROTULOS[p.status] || 'Em homologação', produto: p };
    if (it.estado === 'descartado') return { chave: 'descartado', rotulo: 'Descartado' };
    if (it.estado === 'fds_recebida') return { chave: 'fds_recebida', rotulo: 'FDS recebida' };
    return { chave: 'fds_levantar', rotulo: 'FDS a levantar' };
  }
  // tipo de local sugerido a partir do nome normalizado
  function tipoSugerido(nome) {
    const t = norm(nome);
    if (/conteiner|contêiner/.test(t)) return 'Contêiner de PQ';
    if (/tanque/.test(t)) return 'Tanques';
    if (/oficina/.test(t) && !/deposito/.test(t)) return 'Oficina';
    if (/deposito|armario|almoxarifado|limpeza/.test(t)) return 'Almoxarifado';
    if (/plataforma|edar|manutencao|estacao|horta/.test(t)) return 'Área operacional';
    return 'Outro';
  }
  // locais distintos da fila (nome normalizado), com contagem e se já existe cadastro com esse nome
  function locaisDaFila() {
    const S = O.Store; const mapa = {};
    S.fila().forEach((i) => { const k = i.local || ''; if (!k) return; (mapa[k] = mapa[k] || { nome: k, qtd: 0 }).qtd++; });
    const cad = S.locais().map((l) => norm(l.nome));
    return Object.keys(mapa).map((k) => Object.assign(mapa[k], { tipo: tipoSugerido(k), cadastrado: cad.includes(norm(k)), suspeito: /^(em uso|sem local|na)$/.test(norm(k)) })).sort((a, b) => b.qtd - a.qtd);
  }
  // cria os locais escolhidos [{origem, nome, tipo}] e liga os itens da fila a eles
  function cadastrarLocais(escolhas) {
    const S = O.Store; let criados = 0;
    escolhas.forEach((e) => {
      let l = S.locais().find((x) => norm(x.nome) === norm(e.nome));
      if (!l) { l = S.novoLocal(e.nome, e.tipo); l.descricao = 'Cadastrado a partir da lista importada. Complete a descrição, a área e a categoria de segurança.'; S.salvarLocal(l); criados++; }
      S.fila().filter((i) => i.local === e.origem && !i.produtoId).forEach((i) => { i.localId = l.id; S.salvarFila(i); });
    });
    return criados;
  }

  // inicia a homologação já com os dados da lista (a FDS lida substitui o que for conflitante)
  function iniciar(it) {
    const E = O.Engine, S = O.Store;
    const p = E.novoProduto();
    p.nome = it.nome; p.fornecedor = it.fabricante;
    p.comp.limite = it.quantidade || '';
    const norml = (s) => norm(s);
    const loc = (it.localId && S.local(it.localId)) || (it.local ? S.locais().find((l) => norml(l.nome).includes(norml(it.local)) || norml(it.local).includes(norml(l.nome))) : null);
    if (loc) p.ctx.localId = loc.id;
    p.comp.observacoes = 'Origem: lista importada' + (it.localOriginal ? '. Local informado: ' + it.localOriginal : '') + (it.localUso ? '. Local de utilização: ' + it.localUso : '') + '.';
    p.filaRef = { id: it.id, composicao: it.composicao, classe: it.classe, quantidade: it.quantidade, area: it.area, carimboLista: it.carimboLista };
    S.salvarProduto(p);
    it.produtoId = p.id; S.salvarFila(it);
    return p;
  }

  O.Fila = { locaisDaFila, cadastrarLocais, tipoSugerido, lerArquivo, montar, situacao, iniciar, prioridade, normLocal, ROTULOS };
})(window.O360 = window.O360 || {});
