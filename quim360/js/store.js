/* Persistência local: IndexedDB (principal) com fallback em localStorage, estado em memória com API síncrona, exportação e importação JSON.
   O app só desenha a tela depois de Store.init(): ele abre o banco, traz o estado para a memória e, na primeira vez, passa os dados do localStorage. */
(function (O) {
  const KEY = 'quim360.v1';
  const KEY_BK = 'quim360.backup.';
  // Versão do esquema dos dados: sobe a cada mudança que exija ajuste dos registros guardados.
  // MIGRACOES[n] leva os dados da versão n para a n+1. Antes de migrar, uma cópia automática fica guardada (slot "migracao").
  const SCHEMA_VERSION = 2;
  const MIGRACOES = {
    1: (d) => { d.bacias = d.bacias || []; d.consultas = d.consultas || {}; if (d.config) { if (d.config.email === 'ranascimento05@gmail.com') delete d.config.email; if (d.config.alertaDiasBacia == null) d.config.alertaDiasBacia = 30; } return d; },
  };
  function migrar(d) { let v = d.v || 1; while (v < SCHEMA_VERSION) { if (MIGRACOES[v]) d = MIGRACOES[v](d); v += 1; d.v = v; } return d; }
  let mem = null; let somenteLeitura = false; let falhaGravacao = false; let avisoBackup = '';
  // IndexedDB: um registro com o estado inteiro ("estado/principal") e as cópias automáticas ("backups/<slot>")
  const DB_NOME = 'quim360'; const SLOTS = ['migracao', 'importacao', 'apagar', 'localstorage', 'limpeza'];
  let db = null; let modo = 'ls'; let iniciado = false; let infoQuota = null; let bkMeta = {}; let usoCache = null; let cadeia = Promise.resolve(); let pendente = null;
  function abrirDb() {
    return new Promise((ok, err) => {
      if (!window.indexedDB) { err(new Error('IndexedDB indisponível')); return; }
      let req; try { req = indexedDB.open(DB_NOME, 1); } catch (e) { err(e); return; }
      req.onupgradeneeded = () => { const d = req.result; if (!d.objectStoreNames.contains('estado')) d.createObjectStore('estado'); if (!d.objectStoreNames.contains('backups')) d.createObjectStore('backups'); };
      req.onsuccess = () => ok(req.result); req.onerror = () => err(req.error || new Error('Falha ao abrir o IndexedDB')); req.onblocked = () => err(new Error('IndexedDB bloqueado'));
    });
  }
  const tx = (loja, tipo, fn) => new Promise((ok, err) => { let r; try { const t = db.transaction(loja, tipo); r = fn(t.objectStore(loja)); t.oncomplete = () => ok(r && r.result); t.onerror = () => err(t.error); t.onabort = () => err(t.error || new Error('Transação abortada')); } catch (e) { err(e); } });
  function sinalizaFalha() {
    if (!falhaGravacao) { try { O.UI && O.UI.toast && O.UI.toast('Não foi possível gravar os dados no navegador (espaço cheio ou bloqueado). Exporte um backup agora (Configurações).'); } catch (e2) { /* sem interface */ } }
    falhaGravacao = true;
  }
  // grava o estado no IndexedDB; agrupa gravações seguidas (uma em andamento e, no máximo, uma na fila)
  function gravarIdb() {
    if (pendente) return pendente;
    pendente = cadeia.then(async () => {
      pendente = null;
      try { await tx('estado', 'readwrite', (st) => st.put(mem, 'principal')); falhaGravacao = false; return true; } catch (e) { sinalizaFalha(); return false; }
    });
    cadeia = pendente; return pendente;
  }
  async function atualizarQuota() {
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); infoQuota = { usage: e.usage || 0, quota: e.quota || 0 }; } } catch (e) { infoQuota = null; }
    return infoQuota;
  }
  // Espaço do localStorage: o limite varia por navegador (em geral 5 milhões de caracteres, contando chave e valor, por origem).
  const LIMITE_PADRAO = 5000000; const KEY_LIM = 'quim360.limite';
  const tamKeys = (filtro) => { let t = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && (!filtro || filtro(k))) t += k.length + (localStorage.getItem(k) || '').length; } } catch (e) { /* indisponível */ } return t; };

  const DEFAULT_CFG = {
    organizacao: '',
    responsavel: '',
    registro: '',
    telEmergencia: '',
    anosValidadeFDS: 5,
    cat2Reprova: true,
    sharepointBase: '',
    logoDoc: '', logoDocW: 0, logoDocH: 0, capaClara: false,
    bibliotecaCenarios: [],
    contatos: [],
    alertaDias: 30, alertaDiasFds: 90, alertaDiasBacia: 30, lembreteBackupDias: 30, ultimoBackup: '',
  };

  function blank() { return { v: SCHEMA_VERSION, seq: 0, produtos: [], locais: [], fila: [], bacias: [], consultas: {}, config: { ...DEFAULT_CFG } }; }

  function normalizar(d) {
    d.config = { ...DEFAULT_CFG, ...(d.config || {}) };
    if (/CREA-PE\s*1816474835/.test(d.config.registro || '')) d.config.registro = '';
    d.produtos = (d.produtos || []).filter((x) => x && x.id && x.ghs); // remove registros fantasmas criados por campos de formulário que não são produtos
    d.locais = d.locais || []; d.fila = d.fila || []; d.bacias = d.bacias || []; d.consultas = d.consultas || {};
    return d;
  }
  // confere a versão do esquema, migra se preciso (com cópia antes) e normaliza o estado em memória
  function preparar(raw) {
    let migrou = false; const vArq = mem.v || 1;
    if (vArq > SCHEMA_VERSION) somenteLeitura = true; // dados criados por versão mais nova do app: não gravar por cima
    else if (vArq < SCHEMA_VERSION) { guardaBackup('migracao', 'Antes de migrar os dados da versão ' + vArq + ' para a ' + SCHEMA_VERSION, raw || JSON.stringify(mem)); mem = migrar(mem); migrou = true; }
    mem = normalizar(mem);
    if (migrou) save();
  }
  // leitura antes do Store.init() (ou sem IndexedDB): localStorage, como na versão anterior
  function load() {
    if (mem) return mem;
    let raw = null;
    try { raw = localStorage.getItem(KEY); mem = raw ? JSON.parse(raw) : blank(); } catch (e) { mem = blank(); }
    preparar(raw);
    return mem;
  }
  function save() {
    if (somenteLeitura) return;
    usoCache = null;
    if (modo === 'idb') gravarIdb();
    else {
      try { localStorage.setItem(KEY, JSON.stringify(mem)); falhaGravacao = false; }
      catch (e) { sinalizaFalha(); } // sem espaço: os dados seguem só em memória até fechar a página
    }
    O.emit && O.emit('store');
  }
  // cópias automáticas: antes de migrar, antes de importar, antes de apagar tudo e ao passar do localStorage para o IndexedDB.
  // A cópia nunca pode tirar o espaço dos dados principais: só é guardada se couber com folga.
  const SEM_ESPACO = (slot) => 'A cópia automática "' + slot + '" não foi guardada por falta de espaço. Exporte um backup em arquivo.';
  async function guardaBackupIdb(slot, motivo, dados, forcar) {
    if (!forcar && infoQuota && infoQuota.quota && infoQuota.usage + dados.length > infoQuota.quota * 0.85) { avisoBackup = SEM_ESPACO(slot); return false; }
    try { const quando = new Date().toISOString(); await tx('backups', 'readwrite', (st) => st.put({ quando, motivo, dados }, slot)); bkMeta[slot] = { quando, motivo, tamanho: dados.length }; avisoBackup = ''; return true; }
    catch (e) { avisoBackup = SEM_ESPACO(slot); return false; }
  }
  function guardaBackup(slot, motivo, dados) {
    if (modo === 'idb') return guardaBackupIdb(slot, motivo, dados, false);
    const reg = JSON.stringify({ quando: new Date().toISOString(), motivo, dados });
    let limite = LIMITE_PADRAO; try { limite = Number(sessionStorage.getItem(KEY_LIM)) || LIMITE_PADRAO; } catch (e) { /* padrão */ }
    const atual = (() => { try { const x = localStorage.getItem(KEY_BK + slot); return x ? KEY_BK.length + slot.length + x.length : 0; } catch (e) { return 0; } })();
    if (tamKeys() - atual + KEY_BK.length + slot.length + reg.length > limite * 0.85) { avisoBackup = SEM_ESPACO(slot); return false; }
    try { localStorage.setItem(KEY_BK + slot, reg); avisoBackup = ''; return true; } catch (e) { avisoBackup = SEM_ESPACO(slot); return false; }
  }
  // abre o banco, traz o estado para a memória e, na primeira vez, passa os dados do localStorage (que só são apagados depois de conferidos)
  async function init() {
    if (iniciado) return;
    try { db = await abrirDb(); modo = 'idb'; } catch (e) { db = null; modo = 'ls'; }
    if (modo === 'idb') {
      try {
        const chaves = await tx('backups', 'readonly', (st) => st.getAllKeys()); const regs = await tx('backups', 'readonly', (st) => st.getAll());
        chaves.forEach((k, i) => { const x = regs[i] || {}; bkMeta[k] = { quando: x.quando, motivo: x.motivo, tamanho: (x.dados || '').length }; });
        const est = await tx('estado', 'readonly', (st) => st.get('principal'));
        await atualizarQuota();
        if (est) { mem = est; preparar(null); }
        else {
          let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { /* sem localStorage */ }
          let origem = null; try { origem = raw ? JSON.parse(raw) : null; } catch (e) { origem = null; }
          if (origem) {
            await guardaBackupIdb('localstorage', 'Cópia dos dados antes de passar do localStorage para o IndexedDB', raw, true);
            // cópias automáticas antigas do localStorage também vão para o IndexedDB
            for (const sl of ['migracao', 'importacao', 'apagar']) { try { const x = JSON.parse(localStorage.getItem(KEY_BK + sl)); if (x && x.dados) { await tx('backups', 'readwrite', (st) => st.put(x, 'ls-' + sl)); bkMeta['ls-' + sl] = { quando: x.quando, motivo: 'Cópia antiga do localStorage: ' + x.motivo, tamanho: x.dados.length }; } } catch (e) { /* sem cópia */ } }
            mem = origem; preparar(raw);
            const ok = await gravarIdb(); const conf = ok ? await tx('estado', 'readonly', (st) => st.get('principal')) : null;
            if (conf && (conf.produtos || []).length === mem.produtos.length && (conf.locais || []).length === mem.locais.length) {
              try { localStorage.removeItem(KEY); ['migracao', 'importacao', 'apagar'].forEach((sl) => localStorage.removeItem(KEY_BK + sl)); } catch (e) { /* ok */ }
            }
          } else { mem = blank(); preparar(null); await gravarIdb(); }
        }
      } catch (e) { modo = 'ls'; db = null; mem = null; }
    }
    iniciado = true;
    try { window.addEventListener('pagehide', () => { if (modo === 'idb' && !somenteLeitura) gravarIdb(); }); } catch (e) { /* ok */ }
  }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 8); }

  const Store = {
    all() { return load(); },
    config() { return load().config; },
    setConfig(c) { load().config = { ...load().config, ...c }; save(); },
    produtos() { return load().produtos; },
    produto(id) { return load().produtos.find((p) => p.id === id); },
    salvarProduto(p) {
      if (!p || !p.id || !p.ghs) return; // só grava produtos de verdade (campos de Locais e Configurações usam objetos auxiliares)
      const d = load();
      p.atualizadoEm = new Date().toISOString();
      const i = d.produtos.findIndex((x) => x.id === p.id);
      if (i >= 0) d.produtos[i] = p; else d.produtos.push(p);
      save();
    },
    removerProduto(id) { const d = load(); d.produtos = d.produtos.filter((p) => p.id !== id); save(); },
    proximoNumero() {
      const d = load(); d.seq += 1; save();
      return 'HOM-' + new Date().getFullYear() + '-' + String(d.seq).padStart(3, '0');
    },
    locais() { return load().locais; },
    local(id) { return load().locais.find((l) => l.id === id); },
    novoLocal(nome, tipo) {
      const l = { id: uid('loc'), nome, tipo: tipo || 'Contêiner de PQ', descricao: '', espacoM: 0, itens: [] };
      load().locais.push(l); save(); return l;
    },
    salvarLocal(l) { const d = load(); const i = d.locais.findIndex((x) => x.id === l.id); if (i >= 0) d.locais[i] = l; else d.locais.push(l); save(); },
    fila() { return load().fila; },
    salvarFila(it) { const d = load(); const i = d.fila.findIndex((x) => x.id === it.id); if (i >= 0) d.fila[i] = it; else d.fila.push(it); save(); },
    adicionarFila(lista) { const d = load(); lista.forEach((it) => d.fila.push(it)); save(); },
    substituirFila(lista) { load().fila = lista; save(); },
    removerFila(id) { const d = load(); d.fila = d.fila.filter((x) => x.id !== id); save(); },
    removerLocal(id) { const d = load(); d.locais = d.locais.filter((l) => l.id !== id); save(); },
    // bacias de contenção: só guardam quais produtos a granel estão nelas (os tanques são multiuso e não são cadastrados)
    bacias() { return load().bacias; },
    bacia(id) { return load().bacias.find((b) => b.id === id); },
    novaBacia(nome) { const b = { id: uid('bac'), nome, obs: '', produtos: [], atualizadoEm: new Date().toISOString() }; load().bacias.push(b); save(); return b; },
    salvarBacia(b) { const d = load(); const i = d.bacias.findIndex((x) => x.id === b.id); if (i >= 0) d.bacias[i] = b; else d.bacias.push(b); save(); },
    removerBacia(id) { const d = load(); d.bacias = d.bacias.filter((b) => b.id !== id); save(); },
    // consultas de compatibilidade entre dois produtos (fonte externa, transcrita pelo analista)
    chavePar(a, b) { return [a, b].sort().join('|'); },
    consulta(a, b) { return load().consultas[[a, b].sort().join('|')] || null; },
    salvarConsulta(a, b, c) { load().consultas[[a, b].sort().join('|')] = c; save(); },
    removerConsulta(a, b) { delete load().consultas[[a, b].sort().join('|')]; save(); },
    uid,
    // uso do espaço do navegador, por parte (caracteres; no IndexedDB, aproximadamente bytes)
    uso() {
      const d = load(); const len = (x) => JSON.stringify(x == null ? '' : x).length;
      if (modo === 'idb' && usoCache) return usoCache;
      const fds = d.produtos.reduce((a, p) => a + len(p.fds && p.fds.texto) + len(p.fds && p.fds.secoes), 0);
      const logo = len(d.config && d.config.logoDoc);
      const backups = modo === 'idb' ? Object.keys(bkMeta).reduce((a, k) => a + (bkMeta[k].tamanho || 0), 0) : tamKeys((k) => k.indexOf(KEY_BK) === 0);
      const outros = len(d.produtos) - fds;
      const partes = [['Texto das FDS (texto e seções)', fds], ['Demais dados dos produtos', Math.max(0, outros)], ['Locais e inventários', len(d.locais)], ['Fila de homologação', len(d.fila)], ['Bacias e consultas', len(d.bacias) + len(d.consultas)], ['Logotipo', logo], ['Cópias automáticas', backups]];
      const principal = modo === 'idb' ? partes.slice(0, 6).reduce((a, x) => a + x[1], 0) : tamKeys((k) => k === KEY);
      const total = modo === 'idb' ? principal + backups : tamKeys();
      const r = { total, principal, partes, limite: this.limite(), medido: this.limiteMedido(), bpc: modo === 'idb' ? 1 : 2, modo: this.modo() };
      if (modo === 'idb') usoCache = r;
      return r;
    },
    modo() { return modo === 'idb' ? 'IndexedDB' : 'localStorage'; },
    limiteMedido() { if (modo === 'idb') return !!(infoQuota && infoQuota.quota); try { return !!Number(sessionStorage.getItem(KEY_LIM)); } catch (e) { return false; } },
    limite() { if (modo === 'idb') return (infoQuota && infoQuota.quota) || 250 * 1024 * 1024; try { return Number(sessionStorage.getItem(KEY_LIM)) || LIMITE_PADRAO; } catch (e) { return LIMITE_PADRAO; } },
    // no IndexedDB, pede ao navegador o espaço informado; no localStorage, mede o limite gravando uma chave temporária (removida em seguida)
    async medirLimite() {
      if (modo === 'idb') { usoCache = null; const q = await atualizarQuota(); return q ? q.quota : 0; }
      const usado = tamKeys(); let lo = 0; let hi = 40 * 1024 * 1024;
      try { while (hi - lo > 4096) { const m = Math.floor((lo + hi) / 2); try { localStorage.setItem('__sonda', 'x'.repeat(m)); lo = m; } catch (e) { hi = m; } } } finally { try { localStorage.removeItem('__sonda'); } catch (e) { /* ok */ } }
      const lim = usado + lo; try { sessionStorage.setItem(KEY_LIM, String(lim)); } catch (e) { /* ok */ } return lim;
    },
    init,
    falhaGravacao() { return falhaGravacao; },
    avisoBackup() { return avisoBackup; },
    versao() { return load().v || 1; },
    versaoApp() { return SCHEMA_VERSION; },
    somenteLeitura() { load(); return somenteLeitura; },
    exportar() {
      const d = load(); d.config.ultimoBackup = new Date().toISOString(); save();
      return JSON.stringify({ ...d, app: 'QUIM 360', exportadoEm: d.config.ultimoBackup }, null, 2);
    },
    // dias desde o último backup exportado (null se nunca)
    diasSemBackup() { const u = load().config.ultimoBackup; return u ? Math.floor((Date.now() - new Date(u).getTime()) / 86400000) : null; },
    async importar(txt) {
      const o = JSON.parse(txt);
      if (!o || !Array.isArray(o.produtos) || !Array.isArray(o.locais)) throw new Error('Arquivo inválido: faltam produtos ou locais.');
      if ((o.v || 1) > SCHEMA_VERSION) throw new Error('O arquivo é de uma versão mais nova do app (dados v' + o.v + '; este app lê até a v' + SCHEMA_VERSION + '). Atualize o app antes de importar.');
      if (somenteLeitura) throw new Error('Os dados deste navegador são de uma versão mais nova do app: atualize o app antes de importar.');
      await guardaBackup('importacao', 'Antes de importar um arquivo', JSON.stringify(load()));
      delete o.app; delete o.exportadoEm;
      const novo = normalizar(migrar({ ...blank(), ...o, config: { ...DEFAULT_CFG, ...(o.config || {}) } })); novo.v = SCHEMA_VERSION;
      const anterior = mem; mem = novo; usoCache = null;
      let ok;
      if (modo === 'idb') ok = await gravarIdb(); else { save(); ok = !falhaGravacao; }
      if (!ok) { mem = anterior; usoCache = null; falhaGravacao = false; throw new Error('Sem espaço no navegador para gravar os dados importados. Nada foi alterado: libere espaço (apague textos de FDS ou cópias automáticas) e tente de novo.'); }
      O.emit && O.emit('store');
    },
    // Limpeza seletiva: mantém só os produtos escolhidos (e o que se refere a eles) e renumera os registros de homologação.
    // opt: { locais, bacias, consultas, fila, itensManuais, renumerar } (true = aplicar). Calcula sem alterar quando aplicar === false.
    limpezaSeletiva(ids, opt, aplicar) {
      const d = load(); opt = opt || {}; const keep = new Set(ids);
      const prods = d.produtos.filter((p) => keep.has(p.id));
      const usaLocal = new Set(); prods.forEach((p) => { if (p.ctx && p.ctx.localId) usaLocal.add(p.ctx.localId); if (p.estoque && p.estoque.localId) usaLocal.add(p.estoque.localId); (p.movs || []).forEach((m) => { if (m.localId) usaLocal.add(m.localId); }); });
      const locais = opt.locais ? d.locais.filter((l) => usaLocal.has(l.id)) : d.locais.slice();
      const bacias = (opt.bacias ? d.bacias.filter((b) => (b.produtos || []).some((id) => keep.has(id))) : d.bacias.slice()).map((b) => Object.assign({}, b, { produtos: (b.produtos || []).filter((id) => keep.has(id)) }));
      const consultas = {}; Object.keys(d.consultas || {}).forEach((k) => { const [a, b] = k.split('|'); if (!opt.consultas || (keep.has(a) && keep.has(b))) consultas[k] = d.consultas[k]; });
      // renumeração: pela data da decisão, com o ano da decisão
      const comNumero = prods.filter((p) => p.dec && p.dec.numero).slice().sort((a, b) => String(a.dec.data || '').localeCompare(String(b.dec.data || '')) || String(a.atualizadoEm || '').localeCompare(String(b.atualizadoEm || '')));
      const renum = opt.renumerar ? comNumero.map((p, i) => [p.id, p.nome, p.dec.numero, 'HOM-' + (String(p.dec.data || '').slice(0, 4) || new Date().getFullYear()) + '-' + String(i + 1).padStart(3, '0')]) : [];
      const resumo = { produtos: prods.length, produtosRemovidos: d.produtos.length - prods.length, locais: locais.length, locaisRemovidos: d.locais.length - locais.length, bacias: bacias.length, baciasRemovidas: d.bacias.length - bacias.length, consultas: Object.keys(consultas).length, consultasRemovidas: Object.keys(d.consultas || {}).length - Object.keys(consultas).length, filaRemovida: opt.fila ? d.fila.length : 0, renum };
      if (aplicar === false) return resumo;
      if (somenteLeitura) throw new Error('Os dados deste navegador são de uma versão mais nova do app: atualize o app antes de limpar.');
      guardaBackup('limpeza', 'Antes da limpeza seletiva da base', JSON.stringify(d));
      d.produtos = prods;
      d.produtos.forEach((p) => { // referências a produtos removidos
        if (p.mudanca && p.mudanca.substituiId && !keep.has(p.mudanca.substituiId)) p.mudanca.substituiId = '';
        if (p.sim && p.sim.refId && !keep.has(p.sim.refId)) { p.sim.refId = ''; p.sim.ativa = false; }
      });
      d.locais = locais; d.bacias = bacias; d.consultas = consultas;
      if (opt.itensManuais) d.locais.forEach((l) => { l.itens = []; });
      if (opt.fila) d.fila = [];
      renum.forEach(([id, , , novo]) => { const p = d.produtos.find((x) => x.id === id); if (p) p.dec.numero = novo; });
      if (opt.renumerar) d.seq = renum.length;
      usoCache = null; save();
      return resumo;
    },
    limpar() { const copia = JSON.stringify(load()); guardaBackup('apagar', 'Antes de apagar tudo', copia); mem = blank(); save(); },
    // cópias automáticas guardadas neste navegador
    backups() {
      if (modo === 'idb') return Object.keys(bkMeta).map((slot) => ({ slot, quando: bkMeta[slot].quando, motivo: bkMeta[slot].motivo, tamanho: bkMeta[slot].tamanho }));
      return SLOTS.filter((x) => x !== 'localstorage').map((slot) => { try { const x = JSON.parse(localStorage.getItem(KEY_BK + slot)); return x ? { slot, quando: x.quando, motivo: x.motivo, tamanho: (x.dados || '').length } : null; } catch (e) { return null; } }).filter(Boolean);
    },
    async backupTexto(slot) {
      if (modo === 'idb') { try { const x = await tx('backups', 'readonly', (st) => st.get(slot)); return x ? x.dados : ''; } catch (e) { return ''; } }
      try { return JSON.parse(localStorage.getItem(KEY_BK + slot)).dados; } catch (e) { return ''; }
    },
    async restaurarBackup(slot) { const t = await this.backupTexto(slot); if (!t) throw new Error('Cópia não encontrada.'); await this.importar(t); },
  };

  // eventos simples
  const subs = [];
  O.on = (fn) => subs.push(fn);
  O.emit = (e) => subs.forEach((f) => f(e));
  O.Store = Store;
})(window.O360 = window.O360 || {});
