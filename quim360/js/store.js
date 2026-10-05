/* Persistência local (localStorage) com fallback em memória e exportação/importação JSON. */
(function (O) {
  const KEY = 'quim360.v1';
  let mem = null;

  const DEFAULT_CFG = {
    organizacao: '',
    responsavel: 'Roberto Almeida do Nascimento',
    registro: '',
    email: 'ranascimento05@gmail.com',
    telEmergencia: '',
    anosValidadeFDS: 5,
    cat2Reprova: true,
    sharepointBase: '',
  };

  function blank() { return { v: 1, seq: 0, produtos: [], locais: [], config: { ...DEFAULT_CFG } }; }

  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(KEY);
      mem = raw ? JSON.parse(raw) : blank();
    } catch (e) { mem = blank(); }
    mem.config = { ...DEFAULT_CFG, ...(mem.config || {}) };
    if (/CREA-PE\s*1816474835/.test(mem.config.registro || '')) mem.config.registro = '';
    mem.produtos = mem.produtos || []; mem.locais = mem.locais || [];
    return mem;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* armazenamento indisponível: segue em memória */ }
    O.emit && O.emit('store');
  }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 8); }

  const Store = {
    all() { return load(); },
    config() { return load().config; },
    setConfig(c) { load().config = { ...load().config, ...c }; save(); },
    produtos() { return load().produtos; },
    produto(id) { return load().produtos.find((p) => p.id === id); },
    salvarProduto(p) {
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
    removerLocal(id) { const d = load(); d.locais = d.locais.filter((l) => l.id !== id); save(); },
    uid,
    exportar() { return JSON.stringify(load(), null, 2); },
    importar(txt) {
      const o = JSON.parse(txt);
      if (!o || !Array.isArray(o.produtos) || !Array.isArray(o.locais)) throw new Error('Arquivo inválido: faltam produtos ou locais.');
      mem = { ...blank(), ...o, config: { ...DEFAULT_CFG, ...(o.config || {}) } };
      save();
    },
    limpar() { mem = blank(); save(); },
  };

  // eventos simples
  const subs = [];
  O.on = (fn) => subs.push(fn);
  O.emit = (e) => subs.forEach((f) => f(e));
  O.Store = Store;
})(window.O360 = window.O360 || {});
