/* Persistência local (localStorage) com fallback em memória e exportação/importação JSON. */
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
  let mem = null; let somenteLeitura = false;

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

  function load() {
    if (mem) return mem;
    let raw = null; let migrou = false;
    try { raw = localStorage.getItem(KEY); mem = raw ? JSON.parse(raw) : blank(); } catch (e) { mem = blank(); }
    const vArq = mem.v || 1;
    if (vArq > SCHEMA_VERSION) somenteLeitura = true; // dados criados por versão mais nova do app: não gravar por cima
    else if (vArq < SCHEMA_VERSION) { if (raw) guardaBackup('migracao', 'Antes de migrar os dados da versão ' + vArq + ' para a ' + SCHEMA_VERSION, raw); mem = migrar(mem); migrou = true; }
    mem.config = { ...DEFAULT_CFG, ...(mem.config || {}) };
    if (/CREA-PE\s*1816474835/.test(mem.config.registro || '')) mem.config.registro = '';
    mem.produtos = (mem.produtos || []).filter((x) => x && x.id && x.ghs); // remove registros fantasmas criados por campos de formulário que não são produtos
    mem.locais = mem.locais || [];
    mem.fila = mem.fila || [];
    mem.bacias = mem.bacias || [];
    mem.consultas = mem.consultas || {};
    if (migrou) save();
    return mem;
  }
  function save() {
    if (somenteLeitura) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* armazenamento indisponível: segue em memória */ }
    O.emit && O.emit('store');
  }
  // cópias automáticas (3 espaços): antes de migrar, antes de importar e antes de apagar tudo
  function guardaBackup(slot, motivo, dados) { try { localStorage.setItem(KEY_BK + slot, JSON.stringify({ quando: new Date().toISOString(), motivo, dados })); } catch (e) { /* sem espaço: segue sem a cópia */ } }
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
    versao() { return load().v || 1; },
    versaoApp() { return SCHEMA_VERSION; },
    somenteLeitura() { load(); return somenteLeitura; },
    exportar() {
      const d = load(); d.config.ultimoBackup = new Date().toISOString(); save();
      return JSON.stringify({ ...d, app: 'QUIM 360', exportadoEm: d.config.ultimoBackup }, null, 2);
    },
    // dias desde o último backup exportado (null se nunca)
    diasSemBackup() { const u = load().config.ultimoBackup; return u ? Math.floor((Date.now() - new Date(u).getTime()) / 86400000) : null; },
    importar(txt) {
      const o = JSON.parse(txt);
      if (!o || !Array.isArray(o.produtos) || !Array.isArray(o.locais)) throw new Error('Arquivo inválido: faltam produtos ou locais.');
      if ((o.v || 1) > SCHEMA_VERSION) throw new Error('O arquivo é de uma versão mais nova do app (dados v' + o.v + '; este app lê até a v' + SCHEMA_VERSION + '). Atualize o app antes de importar.');
      if (somenteLeitura) throw new Error('Os dados deste navegador são de uma versão mais nova do app: atualize o app antes de importar.');
      guardaBackup('importacao', 'Antes de importar um arquivo', JSON.stringify(load()));
      delete o.app; delete o.exportadoEm;
      const novo = migrar({ ...blank(), ...o, config: { ...DEFAULT_CFG, ...(o.config || {}) } }); novo.v = SCHEMA_VERSION;
      mem = novo; save(); mem = null; load();
    },
    limpar() { guardaBackup('apagar', 'Antes de apagar tudo', JSON.stringify(load())); mem = blank(); save(); },
    // cópias automáticas guardadas neste navegador
    backups() {
      return ['migracao', 'importacao', 'apagar'].map((slot) => { try { const x = JSON.parse(localStorage.getItem(KEY_BK + slot)); return x ? { slot, quando: x.quando, motivo: x.motivo, tamanho: (x.dados || '').length } : null; } catch (e) { return null; } }).filter(Boolean);
    },
    backupTexto(slot) { try { return JSON.parse(localStorage.getItem(KEY_BK + slot)).dados; } catch (e) { return ''; } },
    restaurarBackup(slot) { const t = this.backupTexto(slot); if (!t) throw new Error('Cópia não encontrada.'); this.importar(t); },
  };

  // eventos simples
  const subs = [];
  O.on = (fn) => subs.push(fn);
  O.emit = (e) => subs.forEach((f) => f(e));
  O.Store = Store;
})(window.O360 = window.O360 || {});
