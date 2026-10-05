/* Telas: painel, produtos, registro do produto, documentos, locais, matriz, analisador de FDS, base legal e configurações. */
(function (O) {
  const U = O.UI, h = U.h, E = O.Engine, T = O.TRANSPORT, G = O.GHS, S = O.Store, D = O.Docs, R = O.Render;
  const V = {};
  const slug = (s) => (s || 'produto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const head = (titulo, sub, ...acoes) => h('div', { class: 'top' }, h('div', {}, h('h1', {}, titulo), sub ? h('p', {}, sub) : null), h('div', { class: 'row' }, acoes));
  const nomeG = (k) => (T.RG.find((r) => r[0] === k) || [k, k])[1];

  // ------------------------------------------------------------ catálogo de documentos
  V.catalogo = (p) => {
    const ok = ['homologado', 'condicionado'].includes(p.status);
    const prods = S.produtos();
    const c = [{ id: 'relatorio', nome: 'Relatório de homologação', desc: 'Decisão, FDS, triagem GHS, impactos, PGR, IMDG, segregação e rastreabilidade.', fn: () => D.relatorio(p, prods), on: true }];
    c.push({ id: 'ficha', nome: 'Ficha de emergência', desc: 'Estrutura NBR 7503 e Manual ABIQUIM: riscos, isolamento, fogo, derramamento, primeiros socorros.', fn: () => D.fichaEmergencia(p), on: ok });
    c.push({ id: 'rotulo', nome: 'Rotulagem', desc: 'Rótulo GHS (NBR 14725), etiqueta de uso (NR-26) e rótulos de risco (NBR 7500).', fn: () => D.rotulagem(p), on: ok });
    c.push({ id: 'envelope', nome: 'Envelope de transporte', desc: 'Painel de segurança, rótulos de risco, conduta do motorista e ficha de emergência.', fn: () => D.envelope(p), on: ok });
    c.push({ id: 'treino', nome: 'Checklist de treinamento', desc: 'Manuseio, armazenamento, descarte, emergência e lista de presença.', fn: () => D.treinamento(p), on: ok && p.trein.gerar !== false });
    return c;
  };

  async function baixarDocx(p, d) {
    U.toast('Gerando o arquivo Word...');
    try { const blob = await R.docx(d.fn(), d.nome + ' | ' + p.nome); R.baixar(blob, d.id + '-' + slug(p.nome) + '.docx'); }
    catch (e) { console.error(e); U.toast('Falha ao gerar o Word: ' + e.message); }
  }
  const pdf = (p, d) => R.printPdf(d.fn(), d.nome + ' | ' + p.nome);

  V.docBotoes = (p, d) => h('div', { class: 'row' }, h('a', { class: 'btn sm sec', href: '#/doc/' + p.id + '/' + d.id }, 'Pré-visualizar'), h('button', { class: 'btn sm', onclick: () => baixarDocx(p, d) }, 'Word (.docx)'), h('button', { class: 'btn sm ghost', onclick: () => pdf(p, d) }, 'PDF'));

  // ------------------------------------------------------------ saída (etapa 15)
  V.saida = (p) => {
    const w = h('div');
    if (p.lista.naLista === true) { w.appendChild(U.alert('ok', 'Encaminhar para aprovação de compra', 'O produto já consta na lista de homologados (' + (p.lista.numero || 'sem número informado') + ').')); return w; }
    w.appendChild(U.q(15, 'Como deseja receber o resultado?'));
    const area = h('div');
    const modo = { v: 'word' };
    const draw = () => {
      area.innerHTML = '';
      const cat = V.catalogo(p);
      if (modo.v === 'texto') {
        const txt = R.text(D.relatorio(p, S.produtos()));
        area.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => U.copiar(txt) }, 'Copiar texto')));
        area.appendChild(h('div', { class: 'pre' }, txt));
      } else if (modo.v === 'visual') {
        area.appendChild(h('div', { class: 'row', style: 'margin-bottom:10px' }, h('a', { class: 'btn', href: '#/doc/' + p.id + '/relatorio' }, 'Abrir relatório em tela cheia')));
        area.appendChild(h('div', { class: 'paper', html: R.html(D.relatorio(p, S.produtos())) }));
      } else {
        cat.forEach((d) => area.appendChild(h('div', { class: 'card', style: d.on ? '' : 'opacity:.5' }, h('h3', {}, d.nome), h('p', { class: 'small' }, d.desc + (d.on ? '' : ' Disponível após a homologação.')), d.on ? V.docBotoes(p, d) : null)));
        area.appendChild(h('p', { class: 'small' }, 'O PDF abre a janela de impressão do navegador: escolha "Salvar como PDF". O Word é gerado no formato .docx.'));
      }
    };
    const opts = [['word', 'Modelo Word e PDF', 'Documentos para baixar'], ['visual', 'Versão visual com layout', 'Relatório formatado na tela'], ['texto', 'Texto formatado', 'Para colar em e-mail ou sistema']];
    w.appendChild(h('div', { class: 'opts' }, opts.map((o) => { const inp = h('input', { type: 'radio', name: 'modo', ...(o[0] === 'word' ? { checked: true } : {}) }); const lab = h('label', { class: 'opt' + (o[0] === 'word' ? ' sel' : '') }, inp, h('span', {}, h('b', {}, o[1]), h('small', {}, o[2]))); inp.addEventListener('change', () => { modo.v = o[0]; [...lab.parentNode.children].forEach((c) => c.classList.remove('sel')); lab.classList.add('sel'); draw(); }); return lab; })));
    w.appendChild(area); draw();
    return w;
  };

  // ------------------------------------------------------------ painel
  V.painel = (root) => {
    const ps = S.produtos();
    const cnt = (st) => ps.filter((p) => p.status === st).length;
    root.appendChild(head('Painel', 'Homologação, uso, armazenamento e compatibilidade de produtos químicos', h('a', { class: 'btn', href: '#/nova' }, 'Nova homologação'), h('a', { class: 'btn ghost', href: '#/fds' }, 'Analisar FDS')));
    root.appendChild(h('div', { class: 'grid g4', style: 'margin-bottom:14px' },
      h('div', { class: 'kpi' }, h('b', {}, ps.length), h('span', {}, 'Produtos cadastrados')),
      h('div', { class: 'kpi ok' }, h('b', {}, cnt('homologado')), h('span', {}, 'Homologados')),
      h('div', { class: 'kpi warn' }, h('b', {}, cnt('condicionado') + cnt('pendente') + cnt('em_analise')), h('span', {}, 'Condicionados, pendentes e em análise')),
      h('div', { class: 'kpi crit' }, h('b', {}, cnt('reprovado')), h('span', {}, 'Reprovados'))));
    const lim = S.config().anosValidadeFDS;
    const alertas = [];
    ps.forEach((p) => {
      const idade = E.idadeFds(p);
      if (['homologado', 'condicionado'].includes(p.status) && idade != null && idade > lim) alertas.push([p, 'FDS com ' + idade.toFixed(1).replace('.', ',') + ' anos. Solicitar revisão ao fornecedor.']);
      if (p.status === 'condicionado') alertas.push([p, 'Liberação de uso condicionada: ' + E.avaliar(p, ps).condicionantes.join(' ')]);
      if (p.status === 'pendente') alertas.push([p, 'Pendente: ' + ((p.pendencia && p.pendencia.motivos && p.pendencia.motivos[0]) || 'aguardando informação') ]);
      if (['homologado', 'condicionado'].includes(p.status)) {
        const loc = S.local(p.ctx.localId);
        if (loc) { const cp = E.compatibilidade(p, loc, ps); if (cp.status === 'conflito' && p.comp.localOk !== 'conflito') alertas.push([p, 'Conflito de segregação com itens do local ' + loc.nome + '.']); }
      }
    });
    const rej = ps.filter((p) => p.status === 'reprovado');
    const g = h('div', { class: 'grid g2' });
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Atenção agora'), alertas.length ? h('div', {}, alertas.slice(0, 8).map(([p, t]) => h('div', { class: 'alert warn' }, h('b', {}, h('a', { href: '#/produto/' + p.id }, p.nome)), t))) : h('p', { class: 'muted' }, 'Nenhum alerta aberto.')));
    const porClasse = {}; ps.filter((p) => ['homologado', 'condicionado'].includes(p.status)).forEach((p) => { const k = p.imdg.classe || 'Não regulado'; porClasse[k] = (porClasse[k] || 0) + 1; });
    const mx = Math.max(1, ...Object.values(porClasse));
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Homologados por classe de risco ', U.disc('PSM')), Object.keys(porClasse).length ? Object.keys(porClasse).sort().map((k) => h('div', { class: 'row', style: 'margin:4px 0' }, h('span', { style: 'width:90px' }, k), h('div', { style: 'flex:1;background:#0b1222;border-radius:6px;height:18px' }, h('div', { style: 'height:100%;border-radius:6px;background:var(--sky);width:' + (porClasse[k] / mx * 100) + '%' })), h('b', {}, porClasse[k]))) : h('p', { class: 'muted' }, 'Sem produtos homologados.')));
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Reprovados por critério interno'), rej.length ? h('table', { class: 't' }, h('tbody', {}, rej.slice(0, 8).map((p) => h('tr', {}, h('td', {}, h('a', { href: '#/produto/' + p.id }, p.nome)), h('td', {}, E.triagem(p).criticos.map((c) => c.tipo).filter((x, i, a) => a.indexOf(x) === i).join(', ') || 'outro motivo'))))) : h('p', { class: 'muted' }, 'Nenhum produto reprovado.')));
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Locais de armazenamento ', U.disc('PSM')), S.locais().length ? S.locais().map((l) => { const a = E.auditoriaLocal(l, ps); const crit = a.pares.filter((x) => x.motivos.length || ['2', '3', '4'].includes(x.codigo)).length; return h('div', { class: 'row', style: 'margin:6px 0' }, h('a', { href: '#/locais' }, l.nome), h('span', { class: 'muted' }, a.itens.length + ' itens'), crit ? U.badge('warn', crit + ' par(es) a revisar') : U.badge('ok', 'sem pares críticos')); }) : h('p', { class: 'muted' }, 'Cadastre os locais em "Locais".')));
    root.appendChild(g);
    if (!ps.length) root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Primeiros passos'), h('p', {}, 'Comece por uma análise de FDS ou inicie uma homologação. Para ver o fluxo completo, carregue os dados de demonstração.'), h('button', { class: 'btn ghost', onclick: () => { O.Demo.criar(); location.hash = '#/painel'; O.route(); } }, 'Carregar dados de demonstração')));
  };

  // ------------------------------------------------------------ lista de produtos
  V.produtos = (root) => {
    root.appendChild(head('Produtos', 'Registro único por produto, com status, FDS e documentos', h('a', { class: 'btn', href: '#/nova' }, 'Nova homologação')));
    const st = { q: '', s: '' };
    const lista = h('div');
    const draw = () => {
      lista.innerHTML = '';
      const ps = S.produtos().filter((p) => (!st.s || p.status === st.s) && (!st.q || (p.nome + ' ' + p.fornecedor + ' ' + p.imdg.onu + ' ' + (p.dec.numero || '')).toLowerCase().includes(st.q.toLowerCase())));
      if (!ps.length) { lista.appendChild(h('div', { class: 'empty' }, 'Nenhum produto encontrado.')); return; }
      lista.appendChild(h('div', { class: 'card scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Produto', 'Registro', 'Status', 'ONU / classe', 'Local', 'FDS'].map((x) => h('th', {}, x)))),
        h('tbody', {}, ps.map((p) => { const l = S.local(p.ctx.localId); const idade = E.idadeFds(p); return h('tr', {}, h('td', {}, h('a', { href: '#/produto/' + p.id }, p.nome || 'Sem nome'), h('div', { class: 'small' }, p.fornecedor)), h('td', { class: 'mono' }, p.dec.numero || '—'), h('td', {}, U.statusBadge(p.status)), h('td', {}, [p.imdg.onu && 'UN ' + p.imdg.onu, p.imdg.classe && 'cl. ' + p.imdg.classe].filter(Boolean).join(' | ') || '—'), h('td', {}, l ? l.nome : '—'), h('td', {}, p.fds.dataRevisao ? D.fmtData(p.fds.dataRevisao) + (idade > S.config().anosValidadeFDS ? ' (antiga)' : '') : '—')); })))));
    };
    root.appendChild(h('div', { class: 'row', style: 'margin-bottom:12px' }, h('input', { type: 'text', placeholder: 'Buscar por nome, fornecedor, ONU ou registro', style: 'max-width:380px', oninput: (e) => { st.q = e.target.value; draw(); } }),
      h('select', { style: 'max-width:240px', 'aria-label': 'Filtrar por status', onchange: (e) => { st.s = e.target.value; draw(); } }, h('option', { value: '' }, 'Todos os status'), Object.keys(D.STATUS).map((k) => h('option', { value: k }, D.STATUS[k][0])))));
    root.appendChild(lista); draw();
  };

  // ------------------------------------------------------------ registro do produto
  V.produto = (root, id, tab) => {
    const p = S.produto(id);
    if (!p) { root.appendChild(h('div', { class: 'empty' }, 'Produto não encontrado.')); return; }
    tab = tab || 'resumo';
    const av = E.avaliar(p, S.produtos());
    const st = D.STATUS[p.status] || D.STATUS.em_analise;
    const concluido = p.confirmadas.decisao || p.status === 'na_lista';
    root.appendChild(head(p.nome || 'Sem nome', [p.fornecedor, p.dec.numero].filter(Boolean).join(' | ') || 'Registro de produto',
      h('a', { class: 'btn', href: '#/homologar/' + p.id }, concluido ? 'Reabrir o assistente' : 'Continuar a análise'),
      h('button', { class: 'btn danger sm', onclick: async () => { if (await U.confirm('Excluir produto', 'O registro e a análise serão removidos deste navegador. Esta ação não pode ser desfeita.', 'Excluir')) { S.removerProduto(p.id); location.hash = '#/produtos'; } } }, 'Excluir')));
    const tabs = [['resumo', 'Resumo'], ['fds', 'FDS'], ['compat', 'Compatibilidade'], ['docs', 'Documentos'], ['registro', 'Registro e QR Code']];
    root.appendChild(h('div', { class: 'row', role: 'tablist', style: 'margin-bottom:12px' }, tabs.map((t) => h('a', { class: 'btn ' + (t[0] === tab ? '' : 'ghost'), role: 'tab', 'aria-selected': t[0] === tab, href: '#/produto/' + p.id + '/' + t[0] }, t[1]))));
    if (tab === 'resumo') {
      root.appendChild(U.alert(st[1], 'Status: ' + st[0], p.dec.justificativa || av.reprovacoes.concat(av.pendencias, av.condicionantes).join(' ') || 'Análise em andamento.'));
      av.alertas.forEach((a) => root.appendChild(U.alert('warn', 'Alerta', a)));
      const loc = S.local(p.ctx.localId);
      const n20 = E.nr20(p);
      root.appendChild(h('div', { class: 'grid g2' },
        h('div', { class: 'card' }, h('h3', {}, 'Uso e armazenamento'), kv([['Onde', [p.ctx.area, p.ctx.atividade].filter(Boolean).join(' | ')], ['Finalidade', p.finalidade], ['Aplicação', p.aplicacao], ['Local', loc ? loc.nome + ' (' + loc.tipo + ')' : ''], ['Via de análise', E.simplificadaVigente(p) ? 'Simplificada (read-across)' : 'Completa']])),
        h('div', { class: 'card' }, h('h3', {}, 'Perigos GHS ', U.disc('SST')), h('div', { class: 'pictos' }, (p.ghs.pictos || []).map((c) => h('span', { html: O.Pic.ghs(c, 52), title: G.PICTO[c] }))), h('p', {}, h('b', {}, p.ghs.palavra || 'Sem palavra de advertência')), h('div', {}, (p.ghs.h || []).map((x) => h('span', { class: 'chip' + (av.tri.criticos.some((c) => c.fonte === x) ? ' crit' : ''), title: G.hText(x) || '' }, x)))),
        h('div', { class: 'card' }, h('h3', {}, 'Transporte ', U.disc('PSM')), kv([['ONU', p.imdg.onu], ['Nome', p.imdg.nome], ['Classe', p.imdg.classe], ['Grupo de embalagem', p.imdg.pg], ['Número de risco', p.imdg.numeroRisco], ['NR-20', n20.aplica ? n20.categoria : 'Não aplicável pelo ponto de fulgor']])),
        h('div', { class: 'card' }, h('h3', {}, 'Triagem CMR e PFC'), av.tri.criticos.length ? U.alert('crit', 'Reprovação automática', av.tri.criticos.map((c) => c.detalhe)) : U.alert('ok', 'Sem evidência de cancerígeno, mutagênico, teratogênico ou PFC', 'Com base nas frases H, nos CAS e no texto da FDS analisada.'))));
    } else if (tab === 'fds') {
      root.appendChild(O.Wizard.fdsPanel(p, () => O.route()));
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Seções da FDS (editáveis)'), h('p', { class: 'small' }, 'O texto das seções 4, 5, 6, 8, 9, 12, 13 e 14 alimenta a ficha de emergência, o envelope e o checklist.'),
        O.FDS.SEC_TITLES.map((t, i) => { const n = i + 1; const ta = h('textarea', { rows: 3 }); ta.value = (p.fds.secoes || {})[n] || ''; ta.addEventListener('input', () => { p.fds.secoes = p.fds.secoes || {}; p.fds.secoes[n] = ta.value; U.salvar(p); }); return h('label', { class: 'f' }, h('span', {}, n + ' ' + t), ta); })));
    } else if (tab === 'compat') {
      const outros = E.homologados(S.produtos()).filter((x) => x.id !== p.id);
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Aplicação prática da matriz de segregação ', U.disc('PSM')),
        h('p', { class: 'small' }, 'Este produto contra cada produto homologado: matriz de segregação por classe (NR-29 e IMDG) mais reatividade pela Seção 10 da FDS. Classes: ' + (E.classesDoProduto(p).join(' e ') || 'não informada') + '.'),
        V.resumoCompat(p, outros), V.tabelaCompat(p, outros)));
    } else if (tab === 'docs') {
      V.catalogo(p).forEach((d) => root.appendChild(h('div', { class: 'card', style: d.on ? '' : 'opacity:.5' }, h('h3', {}, d.nome), h('p', { class: 'small' }, d.desc + (d.on ? '' : ' Disponível após a homologação.')), d.on ? V.docBotoes(p, d) : null)));
    } else {
      const link = D.linkRegistro(p);
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Cadastro próprio na lista de homologados'), kv([['Registro', p.dec.numero], ['Data', D.fmtData(p.dec.data)], ['Status', st[0]]]),
        ['homologado', 'condicionado'].includes(p.status) ? h('div', { class: 'row', style: 'margin-top:10px' }, h('div', { style: 'background:#fff;padding:6px;border-radius:8px', html: O.Pic.qr(link, 140) }), h('div', {}, h('p', { class: 'small' }, 'O QR Code aponta para:'), h('p', { class: 'mono', style: 'word-break:break-all' }, link), U.input(p, 'dec.sharepoint', { label: 'Link do SharePoint (substitui o destino do QR Code)' }), h('button', { class: 'btn sm', onclick: () => { U.salvarJa(p); O.route(); } }, 'Atualizar QR Code'))) : h('p', { class: 'muted' }, 'O registro e o QR Code são gerados na homologação.'),
        h('p', { class: 'small', style: 'margin-top:10px' }, 'O produto recebe registro próprio e nunca herda o registro do produto de referência.')));
    }
  };
  const kv = (rows) => h('table', { class: 't' }, h('tbody', {}, rows.map((r) => h('tr', {}, h('th', {}, r[0]), h('td', {}, r[1] || '—')))));

  // ------------------------------------------------------------ compatibilidade entre produtos
  const NIV_CLASS = { incompativel: 'cI', segregar: 'c3', longe: 'c1', verificar: 'cX', livre: 'c-' };
  V.tabelaCompat = (p, outros) => {
    if (!outros.length) return h('div', { class: 'empty' }, 'Não há outros produtos homologados para comparar.');
    const rows = outros.map((q) => ({ q, r: E.compatPar(p, q) }));
    const ordem = { incompativel: 0, segregar: 1, verificar: 2, longe: 3, livre: 4 };
    rows.sort((a, b) => ordem[a.r.nivel] - ordem[b.r.nivel]);
    return h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Produto homologado', 'Classes', 'Matriz', 'Resultado', 'Local', 'Orientação'].map((x) => h('th', {}, x)))),
      h('tbody', {}, rows.map(({ q, r }) => { const lq = S.local(q.ctx.localId); const lp = S.local(p.ctx.localId); return h('tr', {}, h('td', {}, h('a', { href: '#/produto/' + q.id + '/compat' }, q.nome), h('div', { class: 'small' }, q.dec.numero || '')), h('td', {}, (r.par || ['—']).join(' x ')), h('td', {}, r.codigo || '—'), h('td', {}, h('span', { class: 'pc ' + NIV_CLASS[r.nivel] }, E.NIVEL[r.nivel])), h('td', {}, (lq ? lq.name || lq.nome : '—') + (lq && lp && lq.id === lp.id ? ' (mesmo local)' : '')), h('td', {}, r.acao, r.motivos.length ? h('ul', { class: 'small', style: 'margin:4px 0 0 16px;padding:0' }, r.motivos.map((m) => h('li', {}, m))) : null)); }))));
  };
  V.resumoCompat = (p, outros) => {
    const rs = outros.map((q) => ({ q, r: E.compatPar(p, q) }));
    const livres = rs.filter((x) => x.r.nivel === 'livre' || x.r.nivel === 'longe').map((x) => x.q.nome);
    const nao = rs.filter((x) => x.r.nivel === 'incompativel').map((x) => x.q.nome);
    const seg = rs.filter((x) => x.r.nivel === 'segregar').map((x) => x.q.nome);
    return h('div', {}, nao.length ? U.alert('crit', 'Não armazenar junto de', nao) : null, seg.length ? U.alert('warn', 'Armazenar segregado de', seg) : null, livres.length ? U.alert('ok', 'Pode compartilhar o local com', livres) : null);
  };
  V.gradeCompat = (lista) => {
    const tb = h('table', { class: 'mx', 'aria-label': 'Compatibilidade entre produtos homologados' });
    tb.appendChild(h('thead', {}, h('tr', {}, h('th', {}), lista.map((p) => h('th', { class: 'col', title: p.nome, style: 'height:120px;max-width:34px' }, p.nome.length > 22 ? p.nome.slice(0, 21) + '…' : p.nome)))));
    const body = h('tbody');
    lista.forEach((a) => body.appendChild(h('tr', {}, h('th', { style: 'text-align:right;white-space:nowrap', title: a.nome }, a.nome.length > 26 ? a.nome.slice(0, 25) + '…' : a.nome), lista.map((b) => {
      if (a.id === b.id) return h('td', { class: 'c0' }, '—');
      const r = E.compatPar(a, b);
      return h('td', { class: 'x' + NIV_CLASS[r.nivel], title: a.nome + ' x ' + b.nome + ': ' + E.NIVEL[r.nivel] + '. ' + r.acao, style: 'cursor:help' }, { incompativel: 'X', segregar: r.codigo || 'S', longe: '1', verificar: '?', livre: 'OK' }[r.nivel]);
    }))));
    tb.appendChild(body); return tb;
  };

  // ------------------------------------------------------------ visualização de documento
  V.doc = (root, id, tipo) => {
    const p = S.produto(id);
    const d = p && V.catalogo(p).find((x) => x.id === tipo);
    if (!p || !d) { root.appendChild(h('div', { class: 'empty' }, 'Documento não encontrado.')); return; }
    root.appendChild(head(d.nome, p.nome, h('a', { class: 'btn ghost', href: '#/produto/' + p.id + '/docs' }, 'Voltar'), h('button', { class: 'btn', onclick: () => baixarDocx(p, d) }, 'Word (.docx)'), h('button', { class: 'btn ghost', onclick: () => pdf(p, d) }, 'PDF')));
    root.appendChild(h('div', { class: 'paper', html: R.html(d.fn()) }));
  };

  // ------------------------------------------------------------ analisador de FDS (avulso)
  V.fds = (root) => {
    root.appendChild(head('Analisador de FDS', 'Leitura da FDS e triagem imediata. Os dados alimentam a homologação.'));
    const p = E.novoProduto();
    const out = h('div');
    const rerender = () => {
      out.innerHTML = '';
      if (!p.fds.analisada) return;
      const av = E.avaliar(p, S.produtos());
      const n20 = E.nr20(p);
      out.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Resultado da triagem'),
        av.tri.criticos.length ? U.alert('crit', 'Reprovação automática pelo critério interno', av.tri.criticos.map((c) => c.detalhe + ' [' + c.fonte + ']')) : U.alert('ok', 'Sem cancerígeno, mutagênico, teratogênico ou PFC identificado', 'Confirme a Seção 3 e a Seção 11 da FDS na etapa 7 da homologação.'),
        av.tri.suspeitos.map((x) => U.alert('warn', 'Alerta', x.detalhe)), n20.aplica ? h('div', { class: 'alert warn' }, h('b', {}, 'NR-20: ' + n20.categoria), n20.texto) : null,
        h('div', { class: 'pictos' }, (p.ghs.pictos || []).map((c) => h('span', { html: O.Pic.ghs(c, 60), title: G.PICTO[c] })), h('b', {}, p.ghs.palavra)),
        h('div', {}, (p.ghs.h || []).map((x) => h('div', {}, h('span', { class: 'chip' }, x), G.hText(x)))),
        h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => { p.ctx.area = ''; U.salvarJa(p); location.hash = '#/homologar/' + p.id; } }, 'Iniciar a homologação com estes dados'))));
    };
    root.appendChild(O.Wizard.fdsPanel(p, rerender)); root.appendChild(out);
  };

  // ------------------------------------------------------------ locais
  V.locais = (root) => {
    root.appendChild(head('Locais de armazenamento', 'Contêiner de PQ, oficina, almoxarifado e demais áreas, com o que já está armazenado'));
    const nome = h('input', { type: 'text', placeholder: 'Nome (ex.: Contêiner de PQ 01)' });
    const tipo = h('select', {}, T.LOCAIS_TIPO.map((t) => h('option', {}, t)));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Novo local'), h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:220px' }, nome), tipo, h('button', { class: 'btn', onclick: () => { if (!nome.value.trim()) return; S.novoLocal(nome.value.trim(), tipo.value); O.route(); } }, 'Criar'))));
    const ps = S.produtos();
    if (!S.locais().length) root.appendChild(h('div', { class: 'empty' }, 'Nenhum local cadastrado.'));
    S.locais().forEach((l) => {
      const aud = E.auditoriaLocal(l, ps);
      const card = h('div', { class: 'card' });
      card.appendChild(h('div', { class: 'row' }, h('h3', {}, l.nome, ' ', U.badge('info', l.tipo)), h('span', { class: 'spacer' }), h('button', { class: 'btn danger sm', onclick: async () => { if (await U.confirm('Excluir local', 'O local "' + l.nome + '" será removido.', 'Excluir')) { S.removerLocal(l.id); O.route(); } } }, 'Excluir')));
      const holder = { l };
      card.appendChild(h('div', { class: 'grid g2' }, U.input(holder, 'l.nome', { label: 'Nome', onInput: () => S.salvarLocal(l) }), U.input(holder, 'l.espacoM', { type: 'number', label: 'Distância livre disponível para segregação (m)', hint: '6 m atende "separado de"; 24 m atende o nível 4.', onInput: () => S.salvarLocal(l) })));
      card.appendChild(U.input(holder, 'l.descricao', { rows: 2, label: 'Descrição, contenção e condições do local', onInput: () => S.salvarLocal(l) }));
      card.appendChild(h('h4', {}, 'Itens armazenados'));
      const linked = aud.itens.filter((i) => i.origem === 'homologado');
      if (linked.length) card.appendChild(h('p', { class: 'small' }, 'Vinculados por homologação: ' + linked.map((i) => i.nome).join('; ')));
      const tb = h('tbody');
      (l.itens || []).forEach((it, i) => tb.appendChild(h('tr', {}, h('td', {}, it.nome), h('td', {}, it.classe + (it.subrisco ? ' / ' + it.subrisco : '')), h('td', {}, (it.grupos || []).map(nomeG).join(', ') || '—'), h('td', {}, (it.incompativeis || []).map(nomeG).join(', ') || '—'), h('td', {}, h('button', { class: 'btn sm ghost', onclick: () => { l.itens.splice(i, 1); S.salvarLocal(l); O.route(); } }, 'Remover')))));
      if ((l.itens || []).length) card.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Item', 'Classe', 'Grupos', 'Incompatível com', ''].map((x) => h('th', {}, x)))), tb)));
      const novo = { nome: '', classe: '', subrisco: '', grupos: [], incompativeis: [] };
      card.appendChild(h('details', {}, h('summary', {}, 'Adicionar item armazenado'), U.input({ n: novo }, 'n.nome', { label: 'Nome do produto' }),
        h('div', { class: 'grid g2' }, U.select({ n: novo }, 'n.classe', T.CLASSES.map((c) => [c[0], c[0] + ' ' + c[1]]), { label: 'Classe de risco' }), U.input({ n: novo }, 'n.subrisco', { label: 'Risco subsidiário (opcional)' })),
        h('p', { class: 'q' }, 'Grupo de reatividade do item'), U.checks({ n: novo }, 'n.grupos', T.RG.filter((r) => r[0] !== 'ignicao').map((r) => ({ v: r[0], label: r[1] }))),
        h('p', { class: 'q' }, 'Incompatível com (FDS do item)'), U.checks({ n: novo }, 'n.incompativeis', T.RG.map((r) => ({ v: r[0], label: r[1] }))),
        h('button', { class: 'btn', onclick: () => { if (!novo.nome.trim() || !novo.classe) { U.toast('Informe nome e classe.'); return; } l.itens = l.itens || []; l.itens.push({ ...novo, nome: novo.nome.trim() }); S.salvarLocal(l); O.route(); } }, 'Adicionar')));
      const crit = aud.pares.filter((x) => x.motivos.length || ['2', '3', '4', 'X'].includes(x.codigo));
      card.appendChild(h('h4', { style: 'margin-top:12px' }, 'Auditoria de segregação do local ', U.disc('PSM')));
      if (aud.itens.length < 2) card.appendChild(h('p', { class: 'muted' }, 'Cadastre ao menos dois itens para auditar pares.'));
      else if (!crit.length) card.appendChild(U.alert('ok', null, 'Nenhum par exige segregação pela matriz ou por reatividade.'));
      else card.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Par', 'Classes', 'Código', 'Observação'].map((x) => h('th', {}, x)))), h('tbody', {}, crit.map((x) => { const need = x.codigo && T.SEG_LEGEND[x.codigo] ? T.SEG_LEGEND[x.codigo].metros : null; const ok = !need || (Number(l.espacoM) || 0) >= need; return h('tr', {}, h('td', {}, x.a + ' x ' + x.b), h('td', {}, x.par ? x.par.join(' x ') : '—'), h('td', {}, x.codigo || '—'), h('td', {}, [x.codigo && T.SEG_LEGEND[x.codigo] ? T.SEG_LEGEND[x.codigo].nome + (need && !ok ? ' (exige ' + need + ' m, o local tem ' + (l.espacoM || 0) + ' m)' : '') : '', ...x.motivos].filter(Boolean).join('. '))); })))));
      root.appendChild(card);
    });
  };

  // ------------------------------------------------------------ matriz
  V.matriz = (root) => {
    root.appendChild(head('Matriz de segregação', 'Anexo da NR-29 e Código IMDG, aplicada ao armazenamento'));
    const info = h('div', { class: 'alert' }, h('b', {}, 'Toque em uma célula'), 'Mostra a regra entre as duas classes.');
    const tb = h('table', { class: 'mx', 'aria-label': 'Matriz de segregação' });
    tb.appendChild(h('thead', {}, h('tr', {}, h('th', {}), T.CLASSES.map((c) => h('th', { class: 'col', title: c[1] }, c[0])))));
    const body = h('tbody');
    T.CLASSES.forEach((a) => body.appendChild(h('tr', {}, h('th', { title: a[1], style: 'text-align:right' }, a[0]), T.CLASSES.map((b) => { const code = T.seg(a[0], b[0]); const td = h('td', { class: 'c' + code, tabindex: 0, 'aria-label': a[0] + ' com ' + b[0] + ': ' + T.SEG_LEGEND[code].nome }, code); const sel = () => { tb.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl')); td.classList.add('hl'); info.innerHTML = ''; info.className = 'alert ' + (code === '1' ? '' : 'warn'); info.appendChild(h('b', {}, a[0] + ' ' + a[1] + ' com ' + b[0] + ' ' + b[1] + ': ' + code + ' ' + T.SEG_LEGEND[code].nome)); info.appendChild(document.createTextNode(T.SEG_LEGEND[code].texto)); }; td.addEventListener('click', sel); td.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } }); return td; }))));
    tb.appendChild(body);
    root.appendChild(h('div', { class: 'card scroll' }, tb));
    root.appendChild(info);
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Legenda'), Object.keys(T.SEG_LEGEND).map((k) => h('div', { class: 'leg' }, h('span', { class: 'code c' + k }, k), h('div', {}, h('b', {}, T.SEG_LEGEND[k].nome), h('div', { class: 'small' }, T.SEG_LEGEND[k].texto)))), h('p', { class: 'small' }, 'Classes 1 (explosivos), 6.2 (infectantes) e 7 (radioativos) ficam fora da matriz: armazenamento proibido ou restrito em área comum.')));
    // aplicação prática: produtos homologados
    const hom = E.homologados(S.produtos());
    const prat = h('div', { class: 'card' }, h('h3', {}, 'Aplicação prática: produtos homologados ', U.disc('PSM')));
    if (hom.length < 2) prat.appendChild(h('p', { class: 'muted' }, 'Homologue ao menos 2 produtos para ver a compatibilidade entre eles. Dica: carregue a demonstração em Configurações.'));
    else {
      const sel = h('select', { 'aria-label': 'Produto' }, hom.map((p) => h('option', { value: p.id }, p.nome)));
      const out = h('div');
      const show = () => { out.innerHTML = ''; const p = S.produto(sel.value); const outros = hom.filter((x) => x.id !== p.id); out.appendChild(V.resumoCompat(p, outros)); out.appendChild(V.tabelaCompat(p, outros)); };
      sel.addEventListener('change', show);
      prat.appendChild(h('label', { class: 'f' }, h('span', {}, 'Produto'), sel)); prat.appendChild(out); show();
      prat.appendChild(h('h4', { style: 'margin-top:14px' }, 'Grade de todos contra todos'));
      prat.appendChild(h('div', { class: 'scroll' }, V.gradeCompat(hom)));
      prat.appendChild(h('p', { class: 'small' }, 'X: incompatível (reatividade). Número: código da matriz (2, 3 ou 4 exigem distância). 1: longe de. ?: verificar a FDS. OK: compatível. Passe o mouse para ver a orientação.'));
    }
    root.appendChild(prat);
    // verificador
    const sa = h('select', {}, T.CLASSES.map((c) => h('option', { value: c[0] }, c[0] + ' ' + c[1])));
    const sb = h('select', {}, T.CLASSES.map((c) => h('option', { value: c[0] }, c[0] + ' ' + c[1])));
    const res = h('div');
    const chk = () => { const code = T.seg(sa.value, sb.value); res.innerHTML = ''; res.appendChild(U.alert(code === '1' || code === 'X' ? '' : 'warn', code + ' ' + T.SEG_LEGEND[code].nome, T.SEG_LEGEND[code].texto)); };
    sa.addEventListener('change', chk); sb.addEventListener('change', chk); chk();
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Verificador de par'), h('div', { class: 'grid g2' }, h('label', { class: 'f' }, h('span', {}, 'Classe A'), sa), h('label', { class: 'f' }, h('span', {}, 'Classe B'), sb)), res));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Reatividade química pela FDS (Seção 10) ', U.disc('PSM')), h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Grupo A', 'Grupo B', 'Efeito'].map((x) => h('th', {}, x)))), h('tbody', {}, T.RG_RULES.map((r) => h('tr', {}, h('td', {}, nomeG(r[0])), h('td', {}, nomeG(r[1])), h('td', {}, r[2])))))),
      U.alert('warn', 'Validação obrigatória', 'A matriz reproduz a base do acervo. Antes de decisão formal, confirme cada par na tabela 7.2.4 do Código IMDG e nas Seções 7 e 10 da FDS. Em caso de diferença, vale o IMDG e a FDS do fornecedor.')));
  };

  // ------------------------------------------------------------ base legal
  V.legal = (root) => {
    root.appendChild(head('Base técnico-legal', 'Normas que sustentam cada regra do aplicativo'));
    root.appendChild(h('div', { class: 'card' }, T.BASE_LEGAL.map((b) => h('div', { class: 'legalrow' }, h('div', {}, h('b', { class: 'sky' }, b.sigla)), h('div', {}, h('b', {}, b.titulo), h('p', { style: 'margin:2px 0' }, b.uso), h('small', {}, 'Aplicada em: ' + b.onde))))));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Critérios internos de rejeição automática'), h('ul', {}, h('li', {}, 'Cancerígeno: frases H350, H350i, H351 e CAS da lista de alerta.'), h('li', {}, 'Mutagênico: H340 e H341.'), h('li', {}, 'Teratogênico e tóxico à reprodução: H360 e H361 (D e F).'), h('li', {}, 'Contém PFCs ou PFAS: CAS da lista de alerta, ou marcação do analista; termos no texto geram alerta.'), h('li', {}, 'Categoria 2 (suspeita) reprova por padrão. Altere em Configurações.')), h('p', { class: 'small' }, 'A lista de alerta por CAS é de triagem e não exaustiva. Substâncias fora dela dependem das frases H e da Seção 3 da FDS.')));
  };

  // ------------------------------------------------------------ configurações
  V.config = (root) => {
    const c = S.config();
    root.appendChild(head('Configurações', 'Responsável técnico, critérios e dados'));
    const holder = { c };
    const save = () => S.setConfig(holder.c);
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Responsável técnico e organização'), h('div', { class: 'grid g2' }, U.input(holder, 'c.responsavel', { label: 'Responsável técnico', onInput: save }), U.input(holder, 'c.registro', { label: 'Registro profissional', onInput: save }), U.input(holder, 'c.organizacao', { label: 'Organização (aparece na capa dos documentos)', onInput: save }), U.input(holder, 'c.email', { label: 'E-mail', onInput: save }), U.input(holder, 'c.telEmergencia', { label: 'Telefone de emergência da organização', onInput: save }), U.input(holder, 'c.sharepointBase', { label: 'Endereço base do SharePoint (opcional)', onInput: save }))));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Critérios'), U.input(holder, 'c.anosValidadeFDS', { type: 'number', label: 'Validade da FDS em anos (alerta acima deste valor)', onInput: save }), h('div', { class: 'opts' }, U.flag(holder, 'c.cat2Reprova', 'Tratar categoria 2 (suspeita) como reprovação automática', 'H341, H351, H361 e H361d. Padrão conservador.', save))));
    const extra = h('textarea', { rows: 4, placeholder: 'CAS;nome;tipo   (tipo: cancerigeno, reprotoxico, mutagenico ou pfas)' }); extra.value = (c.watchExtra || '');
    extra.addEventListener('change', () => { holder.c.watchExtra = extra.value; save(); V.aplicarWatch(); U.toast('Lista de alerta atualizada.'); });
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Lista de alerta de triagem'), h('p', { class: 'small' }, 'Adicione substâncias de interesse da organização. Já constam ' + Object.values(T.WATCH).reduce((n, a) => n + a.length, 0) + ' registros (benzeno, formaldeído, tricloroetileno, PFOA, PFOS, entre outros).'), extra));
    const file = h('input', { type: 'file', accept: '.json', style: 'display:none' });
    file.addEventListener('change', async () => { try { S.importar(await file.files[0].text()); U.toast('Dados importados.'); O.route(); } catch (e) { U.toast(e.message); } });
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Dados'), h('p', { class: 'small' }, 'Os dados ficam neste navegador. Exporte para backup ou para levar a outro computador.'), h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => R.baixar(new Blob([S.exportar()], { type: 'application/json' }), 'quim360-dados-' + new Date().toISOString().slice(0, 10) + '.json') }, 'Exportar JSON'), h('button', { class: 'btn ghost', onclick: () => file.click() }, 'Importar JSON'), file,
      h('button', { class: 'btn ghost', onclick: async () => { if (await U.confirm('Carregar demonstração', 'Serão adicionados 2 locais e 2 produtos fictícios.', 'Carregar')) { O.Demo.criar(); O.route(); } } }, 'Carregar demonstração'),
      h('button', { class: 'btn danger', onclick: async () => { if (await U.confirm('Apagar tudo', 'Todos os produtos, locais e configurações deste navegador serão apagados.', 'Apagar')) { S.limpar(); O.route(); } } }, 'Apagar tudo'))));
  };
  V.aplicarWatch = () => {
    const txt = S.config().watchExtra || '';
    ['cancerigeno', 'reprotoxico', 'mutagenico', 'pfas'].forEach((k) => { T.WATCH[k] = T.WATCH[k].filter((x) => !x[2]); });
    txt.split('\n').forEach((l) => { const [cas, nome, tipo] = l.split(';').map((x) => (x || '').trim()); if (/^\d{2,7}-\d{2}-\d$/.test(cas) && T.WATCH[tipo]) T.WATCH[tipo].push([cas, nome || cas, true]); });
  };

  // ------------------------------------------------------------ capa
  V.capa = (root) => {
    const c = S.config();
    const ps = S.produtos();
    document.querySelector('.app').classList.add('capa');
    const L = O.LOGO.lockup;
    const pilar = (disc, titulo, itens) => h('div', { class: 'pilar ' + disc.toLowerCase() }, h('div', { class: 'row' }, U.disc(disc), h('h3', { style: 'margin:0' }, titulo)), h('ul', {}, itens.map((i) => h('li', {}, i))));
    root.appendChild(h('div', { class: 'cv' },
      h('header', { class: 'cv-nav' }, h('span', { html: O.Pic.logo(36) }), h('b', {}, 'QUIM 360'), h('span', { class: 'spacer' }), h('a', { href: '#/painel' }, 'Painel'), h('a', { href: '#/produtos' }, 'Produtos'), h('a', { href: '#/legal' }, 'Base técnico-legal')),
      h('section', { class: 'cv-hero' },
        h('div', { class: 'cv-txt' },
          h('p', { class: 'cv-eyebrow' }, 'Orbit 360 | Gestão de produtos químicos'),
          h('h1', {}, 'Da FDS à decisão de homologação.'),
          h('p', { class: 'cv-lead' }, 'Envie a FDS. O app lê as 16 seções, faz a triagem de cancerígenos, mutagênicos, teratogênicos e PFCs, classifica o transporte, verifica a segregação no local de armazenamento e gera o relatório, a ficha de emergência, o rótulo, o envelope e o checklist de treinamento.'),
          h('div', { class: 'row' }, h('a', { class: 'btn big', href: '#/nova' }, 'Homologar um produto'), h('a', { class: 'btn big sec', href: '#/fds' }, 'Analisar uma FDS'), h('a', { class: 'btn big ghost', href: '#/painel' }, 'Entrar no painel'))),
        h('div', { class: 'cv-logo' }, h('img', { src: L.src, alt: 'Orbit 360 | Consultoria em SSMA' }))),
      h('section', { class: 'cv-stats' },
        [['16', 'seções da FDS lidas e conferidas pela NBR 14725'], ['15', 'etapas de homologação, sem pular confirmação'], ['12', 'classes na matriz de segregação, aplicada produto a produto'], ['5', 'documentos por produto, em Word e PDF']].map((s) => h('div', {}, h('b', {}, s[0]), h('span', {}, s[1])))),
      h('section', { class: 'cv-sec' },
        h('h2', {}, 'Como funciona'),
        h('div', { class: 'cv-steps' }, [['1', 'Envie a FDS', 'Texto, .txt ou .pdf. O app extrai frases H e P, CAS, ONU, classe, incompatibilidades e limites de exposição.'], ['2', 'A triagem roda sozinha', 'Cancerígeno, mutagênico, teratogênico e PFC reprovam de forma automática. O que a FDS responde é preenchido.'], ['3', 'Você informa o que falta', 'Uso, local de armazenamento, cobertura do PGR e pareceres. Conflito de segregação sempre para para você.'], ['4', 'Decisão e documentos', 'Decisão com justificativa, registro com QR Code e os cinco documentos prontos.']].map((s) => h('div', { class: 'cv-step' }, h('i', {}, s[0]), h('h3', {}, s[1]), h('p', {}, s[2]))))),
      h('section', { class: 'cv-sec' },
        h('h2', {}, 'Três disciplinas, uma análise'),
        h('div', { class: 'grid g3' },
          pilar('PSM', 'Armazenamento e compatibilidade', ['Matriz de segregação NR-29 e IMDG', 'Reatividade pela Seção 10 da FDS', 'NR-20 para inflamáveis e combustíveis', 'Compatibilidade com cada produto homologado']),
          pilar('SST', 'Saúde e segurança do trabalho', ['Triagem CMR por frase H e CAS', 'Hierarquia de controle por produto', 'Interface com PGR e Higiene Ocupacional', 'Checklist de treinamento']),
          pilar('GA', 'Gestão ambiental', ['Perigo aquático e poluente marinho', 'Contenção e resposta a derramamento', 'Destinação de resíduos', 'Ficha de emergência e envelope NBR 7503']))),
      h('section', { class: 'cv-sec' },
        h('h2', {}, 'Base técnico-legal'),
        h('div', { class: 'cv-chips' }, T.BASE_LEGAL.map((b) => h('a', { class: 'cv-chip', href: '#/legal', title: b.titulo }, b.sigla)))),
      h('section', { class: 'cv-cta' }, ps.length ? h('p', {}, ps.length + ' produto(s) cadastrado(s) neste navegador.') : h('p', {}, 'Nenhum produto cadastrado. Comece pela FDS ou carregue a demonstração.'),
        h('div', { class: 'row', style: 'justify-content:center' }, h('a', { class: 'btn big', href: '#/nova' }, 'Iniciar'), !ps.length ? h('button', { class: 'btn big ghost', onclick: () => { O.Demo.criar(); location.hash = '#/painel'; } }, 'Carregar demonstração') : null)),
      h('footer', { class: 'cv-foot' }, h('span', {}, 'Orbit 360 | Consultoria em SSMA'), h('span', {}, c.responsavel + (c.registro ? ' | ' + c.registro : '')), h('span', {}, 'Apoio à decisão: a decisão formal é do responsável técnico, com a FDS vigente do fornecedor.'))));
  };

  O.Views = V;
})(window.O360 = window.O360 || {});
