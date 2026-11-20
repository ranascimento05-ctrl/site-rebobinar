/* Telas: painel, produtos, registro do produto, documentos, locais, matriz, analisador de FDS, base legal e configurações. */
(function (O) {
  const U = O.UI, h = U.h, E = O.Engine, T = O.TRANSPORT, G = O.GHS, S = O.Store, D = O.Docs, R = O.Render;
  const V = {};
  const slug = (s) => (s || 'produto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const head = (titulo, sub, ...acoes) => h('div', { class: 'top' }, h('div', {}, h('h1', {}, titulo), sub ? h('p', {}, sub) : null), h('div', { class: 'row' }, acoes));
  const nomeG = (k) => (T.RG.find((r) => r[0] === k) || [k, k])[1];


  // ------------------------------------------------------------ quantidades-limite (NBR 17160)
  const ST_LIM = { dentro: ['ok', 'Dentro do limite'], armazem: ['warn', 'Exige armazém (6.3.1)'], analise: ['warn', 'Definir pela análise de risco'], secoes: ['crit', 'Seções adicionais'] };
  V.gatilhos = (res, titulo) => {
    const c = h('div', { class: 'card' }, h('h3', {}, titulo || 'Quantidades-limite da NBR 17160 ', U.disc('PSM')));
    if (!res.itens.length) { c.appendChild(h('p', { class: 'small' }, 'Nenhum item no local.')); return c; }
    c.appendChild(h('p', { class: 'small' }, 'Quantidade agregada por perigo (massa líquida em kg; gases em L; inflamáveis pelo volume nominal da embalagem, 6.2.8). Itens sem frase H usam a classe de armazenamento e ficam marcados como aproximados.'));
    if (res.semQtd.length) c.appendChild(U.alert('warn', 'Quantidade não informada', res.semQtd.join('; ') + '. Sem a quantidade, o item não entra na soma e as seções aplicáveis podem estar subestimadas.'));
    if (res.informado) {
      c.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Perigo', 'Quantidade', 'Limite fora de armazém', 'Situação', 'Passa a valer'].map((x) => h('th', {}, x)))),
        h('tbody', {}, res.cats.map((x) => h('tr', {}, h('td', {}, x.rotulo, x.aprox ? h('small', { class: 'muted' }, ' (aprox.)') : null, h('br'), h('small', { class: 'muted' }, x.itens.join(', '))), h('td', {}, String(Math.round(x.qtd * 100) / 100).replace('.', ',') + ' ' + x.unidade), h('td', {}, x.fora != null ? String(x.fora).replace('.', ',') + ' ' + x.unidade : 'não indicado'), h('td', {}, U.badge(ST_LIM[x.status][0], ST_LIM[x.status][1])), h('td', {}, (x.status === 'secoes' ? x.secoes : x.status === 'analise' ? x.analise : '—') + (x.nota && x.qtd > 0 ? ' | ' + x.nota : ''))))))));
      c.appendChild(h('p', { class: 'small' }, 'Massa líquida total no local: ' + Math.round(res.total).toLocaleString('pt-BR') + ' kg' + (res.total1500 ? ' (acima de 1 500 kg: 6.3.1.3)' : '') + '.'));
      res.conjuntas.forEach((j) => c.appendChild(U.alert('warn', j.titulo.split(' |')[0] + ' | armazenamento conjunto das classes ' + j.classes.join(', ') + ': ' + Math.round(j.qtd) + ' kg (' + j.faixa + ')', j.texto)));
      res.obs7.forEach((o) => c.appendChild(U.alert('warn', 'Observação 7 | ' + o.a + ' com ' + o.b, Math.round(o.qtd) + ' kg acima de 1 t: consultar o responsável técnico.')));
    }
    return c;
  };


  V.contencao = (l, extra) => {
    const c = h('div', { class: 'card' }, h('h3', {}, 'Contenção da água de extinção (NBR 17160, Anexo F) ', U.disc('GA')));
    const r = E.contencaoLocal(l, S.produtos(), extra);
    c.appendChild(h('p', { class: 'small' }, 'Estimativa do volume de água contaminada a reter em caso de incêndio. Anexo informativo: o corpo de bombeiros e a licença ambiental podem exigir valor diferente.'));
    if (r.semDados.length) c.appendChild(U.alert('warn', 'Sem frases H', r.semDados.join('; ') + ': itens sem frases H não entram na classe de perigo à água.'));
    if (r.linhas.length) c.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Produto', 'Pontos', 'Classe de perigo à água', 'Composição dos pontos'].map((x) => h('th', {}, x)))), h('tbody', {}, r.linhas.map((x) => h('tr', {}, h('td', {}, x.nome), h('td', {}, String(x.pontos)), h('td', {}, 'CPA ' + x.cpa), h('td', {}, x.detalhe.join('; ') || '—')))))));
    if (!r.vol) c.appendChild(U.alert('', 'Falta a área do setor', 'Informe a área do setor de armazenamento (m²) e a categoria de segurança nos campos acima do cartão (etapa 11) ou no cadastro do local, em Locais de armazenamento, para calcular o volume.'));
    else {
      const f = (n) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');
      c.appendChild(h('div', { class: 'grid g4', style: 'margin-top:8px' }, h('div', { class: 'kpi' }, h('b', {}, 'CPA ' + r.cpa), h('span', {}, 'Classe do local (maior entre os produtos)')), h('div', { class: 'kpi' }, h('b', {}, f(r.vol.base) + ' m³'), h('span', {}, 'Tabela F.1, ' + (r.catK || 'K1') + ', ' + f(r.areaM2) + ' m²')), h('div', { class: 'kpi warn' }, h('b', {}, f(r.vol.total) + ' m³'), h('span', {}, r.vol.fator !== 1 ? 'Com fator ' + String(r.vol.fator).replace('.', ',') + ' (CPA ' + r.cpa + ')' : 'Água de extinção estimada')), h('div', { class: 'kpi crit' }, h('b', {}, f(r.total) + ' m³'), h('span', {}, 'Volume a reter' + (r.material ? ' (inclui ' + f(r.material) + ' m³ de material)' : ' (some o volume de material que pode vazar)')))));
      if (!r.catK) c.appendChild(h('p', { class: 'small' }, 'Categoria de segurança não informada: considerada K1/K2 (mais conservador).'));
    }
    c.appendChild(h('p', { class: 'small' }, O.NBR17160.F1_NOTA));
    return c;
  };

  // assinatura e logo dos documentos de uma análise: cada pessoa da equipe assina o que analisou
  V.assinaturaCard = (p) => {
    p.assina = p.assina || { nome: '', registro: '', funcao: '' };
    const cfgc = S.config();
    const prev = h('p', { class: 'small', style: 'margin-top:6px' });
    const atual = () => { const q = D.signer(p); prev.textContent = 'Assinará os documentos: ' + (q.nome ? q.nome + (q.registro ? ' | ' + q.registro : '') + ' (' + q.funcao + ')' : 'ninguém definido: a linha de assinatura sairá em branco para preenchimento manual.'); };
    const c = h('div', { class: 'card' }, h('h3', {}, 'Quem assina os documentos desta análise'),
      h('p', { class: 'small' }, 'Cada análise pode ter um responsável técnico diferente. Se deixar em branco, usa o padrão da equipe em Configurações' + (cfgc.responsavel ? ' (' + cfgc.responsavel + ')' : ' (ainda não definido)') + '.'),
      h('div', { class: 'grid g2' }, U.input(p, 'assina.nome', { label: 'Nome do responsável técnico', onInput: atual }), U.input(p, 'assina.registro', { label: 'Registro profissional (opcional)', onInput: atual })),
      U.input(p, 'assina.funcao', { label: 'Função na assinatura (opcional)', ph: 'Responsável técnico', onInput: atual }),
      prev,
      h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn sm ghost', onclick: () => { if (!(p.assina.nome || '').trim()) { U.toast('Informe o nome para usar como padrão.'); return; } S.setConfig({ responsavel: p.assina.nome.trim(), registro: p.assina.registro || '' }); U.toast('Definido como padrão da equipe.'); atual(); } }, 'Usar como padrão da equipe')));
    atual();
    return c;
  };

  // ------------------------------------------------------------ checklist da NBR 17160 por local
  V.checklistCard = (l) => {
    const RQ = O.NBR17160REQ;
    const card = h('div', { class: 'card' }, h('h3', {}, 'Checklist de requisitos da NBR 17160 ', U.disc('PSM')));
    const r0 = E.requisitosLocal(l, S.produtos());
    const resumo = h('p', { class: 'small' });
    const pinta = () => { const r = E.requisitosLocal(l, S.produtos()); resumo.textContent = r.cont.total + ' requisitos aplicáveis: ' + r.cont.c + ' conformes, ' + r.cont.nc + ' não conformes, ' + r.cont.na + ' não se aplicam, ' + r.cont.aberto + ' sem resposta.'; };
    card.appendChild(h('p', { class: 'small' }, 'Requisitos que se aplicam a este local conforme o que está armazenado, as quantidades e as características marcadas (ar livre, armário de segurança). Texto condensado, com o número do item da norma; a norma vigente prevalece. Itens não conformes viram ações no plano de ação dos produtos do local.'));
    card.appendChild(resumo); pinta();
    Object.keys(RQ.GRUPOS).forEach((gk) => {
      const itens = r0.itens.filter((i) => i.grupo === gk);
      if (!itens.length) return;
      const det = h('details', { class: 'ck' }, h('summary', {}, RQ.GRUPOS[gk] + ' (' + itens.length + ')'));
      itens.forEach((it) => {
        const nome = 'rq-' + l.id + '-' + it.id;
        const salva = (patch) => { l.check = l.check || {}; l.check[it.id] = Object.assign({ r: '', obs: '' }, l.check[it.id], patch); S.salvarLocal(l); pinta(); };
        const grupoOp = h('div', { class: 'row', style: 'margin-top:4px' });
        const op = (v, rot) => { const inp = h('input', { type: 'radio', name: nome, value: v, style: 'display:none', ...(it.resp === v ? { checked: true } : {}) }); const lab = h('label', { class: 'ro ' + v + (it.resp === v ? ' sel' : '') }, inp, rot); inp.addEventListener('change', () => { grupoOp.querySelectorAll('.ro').forEach((x) => x.classList.remove('sel')); lab.classList.add('sel'); salva({ r: v }); }); return lab; };
        grupoOp.append(op('c', 'Conforme'), op('nc', 'Não conforme'), op('na', 'Não se aplica'));
        const obs = h('input', { type: 'text', placeholder: 'Observação ou evidência (opcional)', value: it.obs }); obs.addEventListener('input', () => salva({ obs: obs.value }));
        det.appendChild(h('div', { style: 'padding:8px 0;border-top:1px solid var(--line,#26324d)' }, h('div', {}, h('b', { class: 'sky' }, it.id + ' '), it.texto, it.semTexto ? U.badge('warn', 'texto não transcrito') : null), grupoOp, obs));
      });
      card.appendChild(det);
    });
    card.appendChild(h('div', { class: 'row', style: 'margin-top:10px' }, V.docBotoes({ nome: l.nome, id: 'chk' }, { id: 'checklist', nome: 'Checklist NBR 17160', fn: () => D.checklistLocal(l, S.produtos()) }, true)));
    return card;
  };

  V.inspecaoCard = (l) => {
    const RQ = O.NBR17160REQ; const holder = { l };
    const r = E.requisitosLocal(l, S.produtos());
    const hoje = new Date().toISOString().slice(0, 10);
    const novo = { data: hoje, resp: '', resultado: 'conforme', obs: '', lista: [] };
    const card = h('div', { class: 'card' }, h('h3', {}, 'Inspeções do armazém (NBR 17160, 6.3.9) ', U.disc('PSM')),
      h('p', { class: 'small' }, 'Verificação antes da primeira utilização e depois em intervalos regulares, com registro do resultado. O intervalo é definido pelo empregador (6.3.2.5).'),
      U.input(holder, 'l.periodoInspecaoDias', { type: 'number', label: 'Intervalo entre inspeções (dias)', onInput: () => S.salvarLocal(l) }));
    if (r.semInspecao) card.appendChild(U.alert('warn', 'Nenhuma inspeção registrada', 'A norma pede inspeção antes da primeira utilização do armazém.'));
    else if (r.proxima) card.appendChild(U.alert(r.vencida ? 'crit' : 'ok', r.vencida ? 'Inspeção vencida' : 'Inspeção em dia', 'Última: ' + D.fmtData(r.inspecoes[0].data) + '. Próxima até ' + D.fmtData(r.proxima) + '.'));
    const form = h('details', {}, h('summary', {}, 'Registrar inspeção'),
      U.input({ n: novo }, 'n.data', { type: 'date', label: 'Data' }), U.input({ n: novo }, 'n.resp', { label: 'Responsável pela inspeção' }),
      h('p', { class: 'q' }, 'Itens verificados (6.3.9.2)'), U.checks({ n: novo }, 'n.lista', RQ.INSPECAO.map((x) => ({ v: x[0], label: x[1] }))),
      U.select({ n: novo }, 'n.resultado', [['conforme', 'Conforme'], ['pendencias', 'Com pendências']], { label: 'Resultado', empty: false }), U.input({ n: novo }, 'n.obs', { rows: 2, label: 'Observações e pendências' }),
      h('button', { class: 'btn', onclick: () => { if (!novo.data || !(novo.resp || '').trim()) { U.toast('Informe a data e o responsável.'); return; } l.inspecoes = l.inspecoes || []; l.inspecoes.push({ data: novo.data, resp: novo.resp.trim(), resultado: novo.resultado || 'conforme', obs: novo.obs || '', itens: novo.lista || [] }); S.salvarLocal(l); O.route(); } }, 'Registrar'));
    card.appendChild(form);
    if (r.inspecoes.length) card.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Data', 'Responsável', 'Resultado', 'Itens', 'Observações', ''].map((x) => h('th', {}, x)))), h('tbody', {}, r.inspecoes.map((x, i) => h('tr', {}, h('td', {}, D.fmtData(x.data)), h('td', {}, x.resp), h('td', {}, x.resultado === 'conforme' ? 'Conforme' : 'Com pendências'), h('td', {}, String((x.itens || []).length) + ' de ' + RQ.INSPECAO.length), h('td', {}, x.obs || '—'), h('td', {}, x.resultado !== 'conforme' ? h('button', { class: 'btn sm sec', onclick: () => { V._rascunho[l.id] = { titulo: 'Pendência de inspeção: ' + String(x.obs || 'sem descrição').slice(0, 70), origem: 'Inspeção', ref: 'Inspeção de ' + D.fmtData(x.data) + ', ' + x.resp, causas: x.obs || '' }; U.toast('Cenário iniciado: informe severidade e probabilidade em Análise de risco.'); O.route(); } }, 'Criar cenário') : null, h('button', { class: 'btn sm ghost', onclick: () => { l.inspecoes = l.inspecoes.filter((y) => y !== x); S.salvarLocal(l); O.route(); } }, 'Remover'))))))));
    return card;
  };

  // alternativas e orientações de substituição (gatilho CMR ou PFC)
  V.alternativasCard = (p, aberto) => {
    const a = E.alternativas(p);
    if (!a.aplica) return null;
    const d = h('details', { class: 'card' + (aberto ? '' : ''), ...(aberto ? { open: true } : {}) }, h('summary', { style: 'cursor:pointer;font-weight:600' }, 'Alternativas e orientações de substituição ', U.disc('SST')));
    d.appendChild(h('p', { class: 'small' }, 'Pontos de partida para buscar alternativa ao produto ou à composição que acionou o gatilho. Não são especificação: todo substituto precisa de FDS própria, teste de desempenho e nova triagem. A decisão é do responsável técnico.' + (a.carga ? ' Para a carga do terminal a substituição não se aplica; o foco é reduzir a exposição.' : '')));
    a.itens.forEach((i) => d.appendChild(h('div', { style: 'margin:8px 0' }, h('b', {}, i.nome + ' (CAS ' + i.cas + ')'), h('ul', { style: 'margin:4px 0 0 18px' }, i.sug.map((x) => h('li', {}, x))), i.nota ? h('p', { class: 'small' }, 'Observação: ' + i.nota) : null)));
    a.porTipo.forEach((t) => d.appendChild(h('div', { style: 'margin:8px 0' }, h('b', {}, t.rotulo + ' (por tipo de perigo)'), h('ul', { style: 'margin:4px 0 0 18px' }, t.sug.map((x) => h('li', {}, x))))));
    d.appendChild(h('b', {}, 'Como conduzir a substituição'));
    d.appendChild(h('ol', { style: 'margin:4px 0 8px 18px' }, a.gerais.map((x) => h('li', {}, x))));
    d.appendChild(U.input(p, 'cmr.alternativas', { rows: 3, label: 'Alternativas avaliadas e resultado', ph: 'Ex.: avaliado diluente isoparafínico; desempenho insuficiente para a resina X; fornecedor Y testará nova formulação.' }));
    return d;
  };

  // ------------------------------------------------------------ análise de risco do armazém (NBR 17160, Seção 5)
  // critério de risco: matriz 5x5, escalas e situações de enquadramento
  V.criterioView = () => {
    const RK = O.RISCO;
    const cor = (n) => (n >= 15 ? '#dc2626' : n >= 10 ? '#f59e0b' : n >= 5 ? '#64748b' : '#16a34a');
    const grade = h('table', { class: 't', style: 'text-align:center;width:auto' }, h('thead', {}, h('tr', {}, h('th', {}, 'Sev. \\ Prob.'), [1, 2, 3, 4, 5].map((p) => h('th', {}, p + ' ' + RK.PROB_DESC[p - 1].nome)))),
      h('tbody', {}, [5, 4, 3, 2, 1].map((s) => h('tr', {}, h('th', {}, s + ' ' + RK.SEV_DESC[s - 1].nome), [1, 2, 3, 4, 5].map((p) => h('td', { style: 'background:' + cor(s * p) + ';color:#fff;font-weight:700' }, String(s * p)))))));
    return h('div', {},
      h('p', { class: 'small' }, 'Risco = severidade x probabilidade. Crítico: 15 a 25 (vermelho). Alto: 10 a 14 (amarelo). Médio: 5 a 9 (cinza). Baixo: 1 a 4 (verde). O critério é ponto de partida: use o da sua organização se for diferente.'),
      h('div', { class: 'scroll' }, grade),
      h('h4', { style: 'margin-top:10px' }, 'Escala de severidade'),
      h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Nível', 'Pessoas', 'Meio ambiente', 'Patrimônio e operação'].map((x) => h('th', {}, x)))), h('tbody', {}, RK.SEV_DESC.map((x) => h('tr', {}, h('td', {}, h('b', {}, x.n + ' ' + x.nome)), h('td', {}, x.pessoas), h('td', {}, x.ambiente), h('td', {}, x.patrimonio)))))),
      h('h4', { style: 'margin-top:10px' }, 'Escala de probabilidade'),
      h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Nível', 'Descrição'].map((x) => h('th', {}, x)))), h('tbody', {}, RK.PROB_DESC.map((x) => h('tr', {}, h('td', {}, h('b', {}, x.n + ' ' + x.nome)), h('td', {}, x.desc)))))),
      h('h4', { style: 'margin-top:10px' }, 'Situações típicas para enquadramento'),
      h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Situação', 'Sugestão'].map((x) => h('th', {}, x)))), h('tbody', {}, RK.EXEMPLOS.map((x) => h('tr', {}, h('td', {}, x.situacao), h('td', {}, x.sev ? 'Severidade ' + x.sev + ' (' + RK.SEV_DESC[x.sev - 1].nome + ')' : 'Probabilidade ' + x.prob + ' (' + RK.PROB_DESC[x.prob - 1].nome + ')')))))));
  };

  V._rascunho = V._rascunho || {};
  V.riscoCard = (l) => {
    const RK = O.RISCO;
    l.analise = l.analise || { campos: {}, cenarios: {}, proprios: [], conclusao: '', data: '', revisao: '' };
    l.analise.campos = l.analise.campos || {}; l.analise.cenarios = l.analise.cenarios || {}; l.analise.proprios = l.analise.proprios || [];
    const holder = { l }; const salva = () => S.salvarLocal(l);
    const a = E.analiseRiscoLocal(l, S.produtos());
    const card = h('div', { class: 'card' }, h('h3', {}, 'Análise de risco do armazém (NBR 17160, Seção 5) ', U.disc('PSM')),
      h('p', { class: 'small' }, 'A norma pede análise de risco do armazém. O app preenche o que já sabe (produtos, quantidades, segregação, água de extinção, checklist) e você completa o restante e avalia cada cenário. Os cenários padrão podem ser editados ou desativados para este local, e você pode adicionar cenários próprios conforme inspeções, incidentes e mudanças. Cenários e medidas são pontos de partida a revisar.'));
    const det = (titulo, corpo, aberto) => h('details', aberto ? { open: true } : {}, h('summary', { style: 'cursor:pointer;font-weight:600;padding:6px 0' }, titulo), corpo);
    // aspectos 5.1 e considerações 5.2
    const lista = h('div');
    a.aspectos.concat(a.consid).forEach((x) => {
      lista.appendChild(h('div', { style: 'padding:6px 0;border-top:1px solid #26324d' }, h('b', { class: 'sky' }, x.id + ' '), x.texto, x.auto ? h('p', { class: 'small', style: 'margin:4px 0' }, 'App: ' + x.auto) : null, x.campo ? U.input(holder, 'l.analise.campos.' + x.campo, { rows: 2, label: 'Registro do analista', onInput: salva }) : null));
    });
    card.appendChild(det('Aspectos (5.1) e considerações (5.2)', lista));
    card.appendChild(det('Informações adicionais (Anexo A)', h('div', {}, h('ul', { style: 'margin:0 0 6px 18px' }, a.anexoA.map((x) => h('li', {}, h('b', {}, x[0] + ' '), x[1]))), U.input(holder, 'l.analise.campos.ameacas', { rows: 2, label: 'Análise de ameaças e vulnerabilidades (A.8)', onInput: salva }))));
    card.appendChild(det('Matriz de risco 5x5 e situações para enquadramento', V.criterioView()));

    const resumo = h('p', { class: 'small' });
    const pinta = () => { const r = E.analiseRiscoLocal(l, S.produtos()).resumo; resumo.textContent = r.crit + ' crítico(s), ' + r.alto + ' alto(s), ' + r.medio + ' médio(s), ' + r.baixo + ' baixo(s), ' + r.semAvaliar + ' sem avaliação.'; };
    const linhasTxt = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const campoTxt = (obj, chave, rotulo, atual, rows, depois) => { const ta = h('textarea', { rows: rows || 2 }); ta.value = atual || ''; ta.addEventListener('input', () => { obj[chave] = ta.value; salva(); depois && depois(); }); return h('label', { class: 'f' }, h('span', {}, rotulo), ta); };
    const selSP = (obj, vazio, mostra) => h('div', { class: 'grid g2' },
      U.select(obj, 'sev', RK.SEV.map((x) => [x[0], x[0] + ' ' + x[1]]), { label: 'Severidade', empty: vazio ? false : 'Selecione', onChange: () => { obj.sev = Number(obj.sev) || ''; salva(); mostra(); pinta(); } }),
      U.select(obj, 'prob', RK.PROB.map((x) => [x[0], x[0] + ' ' + x[1]]), { label: 'Probabilidade', empty: vazio ? false : 'Selecione', onChange: () => { obj.prob = Number(obj.prob) || ''; salva(); mostra(); pinta(); } }));

    // ---- cenários padrão
    const cen = h('div');
    a.cenarios.filter((c) => c.padrao).forEach((c) => {
      const o = l.analise.cenarios[c.k] = l.analise.cenarios[c.k] || { sev: '', prob: '', obs: '' };
      const badge = h('span'); const mostra = () => { const n = RK.nivel(o.sev, o.prob); badge.replaceChildren(n.v ? U.badge(n.tom || 'info', n.nome + ' (' + n.v + ')') : U.badge('info', 'Não avaliado')); };
      const edit = h('details', {}, h('summary', { class: 'small', style: 'cursor:pointer' }, 'Editar os textos deste cenário' + (c.editado ? ' (editado)' : '')),
        campoTxt(o, 'causas', 'Causas', c.causas, 2), campoTxt(o, 'consequencias', 'Consequências', c.consequencias, 2), campoTxt(o, 'medidasTxt', 'Medidas de controle (uma por linha)', c.medidas.join('\n'), 4),
        h('button', { class: 'btn sm ghost', onclick: () => { delete o.causas; delete o.consequencias; delete o.medidasTxt; salva(); O.route(); } }, 'Voltar ao texto padrão'));
      const sug = c.sugProb ? h('p', { class: 'small', style: 'margin:2px 0' }, 'Sugestão do app para a probabilidade: ' + c.sugProb.n + ' (' + c.sugProb.txt + '). Você decide.') : null;
      const desat = h('div', { class: 'row' }, h('button', { class: 'btn sm ghost', onclick: () => { o.off = true; salva(); O.route(); } }, 'Desativar neste local'));
      cen.appendChild(h('div', { style: 'padding:8px 0;border-top:1px solid #26324d' }, h('div', { class: 'row' }, h('b', {}, c.titulo), h('span', { class: 'spacer' }), badge),
        h('p', { class: 'small', style: 'margin:4px 0' }, 'Causas: ' + c.causas), h('p', { class: 'small', style: 'margin:4px 0' }, 'Consequências: ' + c.consequencias),
        h('ul', { style: 'margin:4px 0 4px 18px' }, c.medidas.map((m) => h('li', { class: 'small' }, m))),
        c.checklist.total ? h('p', { class: 'small', style: 'margin:4px 0' }, 'Checklist relacionado: ' + c.checklist.c + ' conforme(s), ' + c.checklist.nc + ' não conforme(s), ' + c.checklist.aberto + ' sem resposta.') : null,
        edit, selSP(o, false, mostra), sug, U.input(o, 'obs', { rows: 2, label: 'Medidas adicionais e observações', onInput: salva }), desat));
      mostra();
    });
    card.appendChild(det('Cenários padrão (' + a.cenarios.filter((c) => c.padrao).length + ')', h('div', {}, resumo, cen), true)); pinta();
    // desativados
    if (a.desativados.length) card.appendChild(det('Cenários padrão desativados neste local (' + a.desativados.length + ')', h('div', {}, a.desativados.map((c) => { const o = l.analise.cenarios[c.k]; return h('div', { style: 'padding:6px 0;border-top:1px solid #26324d' }, h('b', {}, c.titulo), U.input(o, 'offJust', { label: 'Justificativa para desativar (obrigatória)', onInput: salva }), h('button', { class: 'btn sm ghost', onclick: () => { o.off = false; salva(); O.route(); } }, 'Reativar')); }))));

    // ---- cenários adicionados
    const cfgLib = () => S.config().bibliotecaCenarios || [];
    const proprios = h('div');
    a.cenarios.filter((c) => c.proprio).forEach((c) => {
      const o = l.analise.proprios.find((x) => x.id === c.id); if (!o) return;
      const badge = h('span'); const mostra = () => { const n = RK.nivel(o.sev, o.prob); badge.replaceChildren(U.badge(n.tom || 'info', n.nome + ' (' + n.v + ')')); };
      proprios.appendChild(h('div', { style: 'padding:8px 0;border-top:1px solid #26324d' }, h('div', { class: 'row' }, h('b', {}, o.titulo), h('span', { class: 'spacer' }), badge),
        h('p', { class: 'small', style: 'margin:2px 0' }, 'Origem: ' + (o.origem || '—') + (o.ref ? ' | ' + o.ref : '') + (o.data ? ' | ' + D.fmtData(o.data) : '')),
        U.input(o, 'titulo', { label: 'Título', onInput: salva }), campoTxt(o, 'causas', 'Causas', o.causas, 2), campoTxt(o, 'consequencias', 'Consequências', o.consequencias, 2), campoTxt(o, 'medidas', 'Medidas de controle (uma por linha)', o.medidas, 3),
        selSP(o, true, mostra), U.input(o, 'obs', { rows: 2, label: 'Observações', onInput: salva }),
        h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => { const lib = cfgLib().slice(); lib.push({ id: 'm' + Date.now().toString(36), titulo: o.titulo, causas: o.causas, consequencias: o.consequencias, medidas: o.medidas, origem: o.origem || '', criadoEm: new Date().toISOString() }); S.setConfig({ bibliotecaCenarios: lib }); U.toast('Salvo na biblioteca de cenários.'); } }, 'Salvar na biblioteca'),
          h('button', { class: 'btn sm danger', onclick: async () => { if (await U.confirm('Remover cenário', 'O cenário "' + o.titulo + '" será removido deste local.', 'Remover')) { l.analise.proprios = l.analise.proprios.filter((x) => x !== o); salva(); O.route(); } } }, 'Remover'))));
      mostra();
    });
    // formulário de novo cenário
    const ras = V._rascunho[l.id]; const novo = Object.assign({ titulo: '', origem: RK.ORIGENS[0], ref: '', causas: '', consequencias: '', medidas: '', sev: '', prob: '', obs: '' }, ras || {});
    const nf = h('details', ras ? { open: true } : {}, h('summary', { style: 'cursor:pointer;font-weight:600;padding:6px 0' }, 'Adicionar cenário'),
      U.input({ n: novo }, 'n.titulo', { label: 'Título do cenário' }),
      h('div', { class: 'grid g2' }, U.select({ n: novo }, 'n.origem', RK.ORIGENS.map((x) => [x, x]), { label: 'Origem', empty: false }), U.input({ n: novo }, 'n.ref', { label: 'Referência (inspeção, incidente, produto)', ph: 'Ex.: inspeção de 10/11/2026' })),
      campoTxt(novo, 'causas', 'Causas', novo.causas, 2), campoTxt(novo, 'consequencias', 'Consequências', novo.consequencias, 2), campoTxt(novo, 'medidas', 'Medidas de controle (uma por linha)', novo.medidas, 3),
      h('div', { class: 'grid g2' }, U.select({ n: novo }, 'n.sev', RK.SEV.map((x) => [x[0], x[0] + ' ' + x[1]]), { label: 'Severidade (obrigatória)', empty: 'Selecione' }), U.select({ n: novo }, 'n.prob', RK.PROB.map((x) => [x[0], x[0] + ' ' + x[1]]), { label: 'Probabilidade (obrigatória)', empty: 'Selecione' })),
      U.input({ n: novo }, 'n.obs', { rows: 2, label: 'Observações' }),
      h('button', { class: 'btn', onclick: () => {
        if (!(novo.titulo || '').trim()) { U.toast('Informe o título do cenário.'); return; }
        if (!Number(novo.sev) || !Number(novo.prob)) { U.toast('Informe a severidade e a probabilidade.'); return; }
        l.analise.proprios.push({ id: 'c' + Date.now().toString(36), titulo: novo.titulo.trim(), origem: novo.origem, ref: novo.ref || '', data: new Date().toISOString().slice(0, 10), causas: novo.causas, consequencias: novo.consequencias, medidas: novo.medidas, sev: Number(novo.sev), prob: Number(novo.prob), obs: novo.obs || '' });
        delete V._rascunho[l.id]; salva(); O.route(); } }, 'Adicionar cenário'));
    const lib = cfgLib(); let escolhido = '';
    const selLib = h('select', {}, h('option', { value: '' }, lib.length ? 'Escolher modelo da biblioteca' : 'Biblioteca vazia'), lib.map((m) => h('option', { value: m.id }, m.titulo)));
    selLib.addEventListener('change', () => { escolhido = selLib.value; });
    const usar = h('div', { class: 'row', style: 'margin:6px 0' }, selLib, h('button', { class: 'btn sm sec', onclick: () => { const m = lib.find((x) => x.id === escolhido); if (!m) { U.toast('Escolha um modelo.'); return; } V._rascunho[l.id] = { titulo: m.titulo, causas: m.causas, consequencias: m.consequencias, medidas: m.medidas, origem: m.origem || RK.ORIGENS[0], ref: 'Modelo da biblioteca' }; O.route(); } }, 'Usar modelo (informe severidade e probabilidade)'));
    card.appendChild(det('Cenários adicionados neste local (' + l.analise.proprios.length + ')', h('div', {}, proprios, usar, nf), !!ras || l.analise.proprios.length > 0));

    card.appendChild(h('div', { class: 'grid g2' }, U.input(holder, 'l.analise.data', { type: 'date', label: 'Data da análise', onInput: salva }), U.input(holder, 'l.analise.revisao', { type: 'date', label: 'Próxima revisão', onInput: salva })));
    card.appendChild(U.input(holder, 'l.analise.conclusao', { rows: 3, label: 'Conclusão da análise', onInput: salva }));
    card.appendChild(h('div', { class: 'row', style: 'margin-top:10px' }, V.docBotoes({ nome: l.nome, id: 'risco' }, { id: 'analise-risco', nome: 'Análise de risco do armazém', fn: () => D.analiseRiscoLocal(l, S.produtos()) }, true)));
    card.appendChild(h('p', { class: 'small', style: 'margin:10px 0 4px' }, 'Cenários para treinamento da brigada, diálogo de segurança e reunião (uma ficha por cenário, com perguntas e lista de presença):'));
    card.appendChild(V.cenariosBotoes(l, {}));
    return card;
  };

  // ------------------------------------------------------------ cenários de risco para treinamento e reuniões
  V.cenariosBotoes = (local, op) => {
    const pseudo = { nome: local ? local.nome : 'catalogo-geral', id: 'cen' };
    const doc = { id: 'cenarios', nome: 'Cenários de risco', fn: () => D.cenariosDoc(local, S.produtos(), op) };
    return h('div', { class: 'row' }, V.docBotoes(pseudo, doc, true), h('button', { class: 'btn sm ghost', onclick: () => U.copiar(R.text(doc.fn())) }, 'Copiar texto (e-mail)'));
  };
  V.cenarios = (root) => {
    root.appendChild(head('Cenários de risco', 'Para treinamento da brigada, diálogo de segurança, reuniões e envio por e-mail'));
    const st = { local: '', soAltos: false, umaPorPagina: true };
    const area = h('div');
    const locais = S.locais();
    const sel = h('select', { 'aria-label': 'Local' }, h('option', { value: '' }, 'Catálogo geral (cenários padrão e biblioteca)'), locais.map((l) => h('option', { value: l.id }, l.nome)));
    const ckA = h('input', { type: 'checkbox', id: 'cn-a' }), ckP = h('input', { type: 'checkbox', id: 'cn-p', checked: true });
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'O que imprimir ou enviar'),
      h('p', { class: 'small' }, 'Escolha um local para levar os cenários dele, com os níveis de risco avaliados, ou o catálogo geral. O documento tem uma ficha por cenário, perguntas para discussão, espaço para anotações e lista de presença. Baixe em Word ou PDF, imprima ou copie o texto para colar em um e-mail.'),
      h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:240px' }, sel), h('label', { for: 'cn-a', class: 'row small' }, ckA, 'Somente risco alto e crítico'), h('label', { for: 'cn-p', class: 'row small' }, ckP, 'Um cenário por página')),
      h('div', { id: 'cn-btn', style: 'margin-top:10px' })));
    root.appendChild(area);
    const draw = () => {
      const local = st.local ? S.local(st.local) : null;
      const op = { soAltos: st.soAltos, umaPorPagina: st.umaPorPagina };
      const bt = root.querySelector('#cn-btn'); bt.innerHTML = ''; bt.appendChild(V.cenariosBotoes(local, op));
      area.innerHTML = '';
      const bl = D.cenariosDoc(local, S.produtos(), op);
      area.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Pré-visualização'), h('div', { class: 'paper', html: R.html(bl) })));
    };
    sel.addEventListener('change', () => { st.local = sel.value; draw(); }); ckA.addEventListener('change', () => { st.soAltos = ckA.checked; draw(); }); ckP.addEventListener('change', () => { st.umaPorPagina = ckP.checked; draw(); });
    draw();
  };

  // ------------------------------------------------------------ fila de homologação (lista importada, sem FDS)
  V.fila = (root) => {
    const F = O.Fila;
    root.appendChild(head('Fila de homologação', 'Produtos de uma lista a homologar: levante a FDS atual de cada um e inicie a análise'));
    const impBox = h('div');
    const arq = h('input', { type: 'file', accept: '.xlsx,.csv,.txt', style: 'display:none' });
    let pendente = null;
    const mostraPrevia = (itens, nome) => {
      pendente = itens; impBox.innerHTML = '';
      const c = (f) => itens.filter(f).length;
      const jaTem = new Set(S.fila().map((x) => x.chave));
      const novos = itens.filter((i) => !jaTem.has(i.chave)).length;
      let modo = 'adicionar';
      const rad = (v, rot) => { const inp = h('input', { type: 'radio', name: 'modo-fila', value: v, ...(v === modo ? { checked: true } : {}) }); inp.addEventListener('change', () => { modo = v; }); return h('label', { class: 'row small', style: 'gap:6px' }, inp, rot); };
      impBox.appendChild(h('div', { class: 'alert' }, h('b', {}, nome + ': ' + itens.length + ' produtos lidos'), h('div', { class: 'small' }, 'Prioridade alta: ' + c((i) => i.prioridade.nivel === 'alta') + ' | média: ' + c((i) => i.prioridade.nivel === 'media') + ' | normal: ' + c((i) => i.prioridade.nivel === 'normal') + '. Possíveis duplicados: ' + c((i) => i.duplicado) + '. Marcados fora de uso: ' + c((i) => i.emUso === false) + '. Sem composição: ' + c((i) => !i.composicao) + '. Novos em relação à fila atual: ' + novos + '.')));
      impBox.appendChild(h('div', { class: 'row' }, rad('adicionar', 'Adicionar só os novos (ignora o que já está na fila)'), rad('substituir', 'Substituir a fila (mantém os que já iniciaram homologação)')));
      impBox.appendChild(h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn', onclick: () => {
        if (modo === 'substituir') { const mant = S.fila().filter((x) => x.produtoId); const chaves = new Set(mant.map((x) => x.chave)); S.substituirFila(mant.concat(pendente.filter((i) => !chaves.has(i.chave)))); }
        else S.adicionarFila(pendente.filter((i) => !jaTem.has(i.chave)));
        U.toast('Fila atualizada.'); O.route(); } }, 'Importar para a fila'), h('button', { class: 'btn ghost', onclick: () => { pendente = null; impBox.innerHTML = ''; } }, 'Cancelar')));
    };
    arq.addEventListener('change', async () => { if (!arq.files[0]) return; try { const itens = await F.lerArquivo(arq.files[0]); if (!itens.length) { U.toast('Nenhum produto encontrado na planilha.'); return; } mostraPrevia(itens, arq.files[0].name); } catch (e) { U.toast(e.message); } arq.value = ''; });
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Importar lista de produtos'),
      h('p', { class: 'small' }, 'Aceita planilha .xlsx ou .csv com as colunas Descrição do Produto, Fabricante, Classe de risco, Composição química, Em uso, Área usuária, Local de Armazenamento, Local de utilização e Quantidade. A lista não traz FDS: serve para organizar o trabalho. Nenhum dado vira produto homologado, e a coluna Empresa não é importada.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => arq.click() }, 'Escolher planilha'), arq), impBox));

    const lista = S.fila();
    if (!lista.length) { root.appendChild(h('div', { class: 'empty' }, 'A fila está vazia. Importe uma lista para começar.')); return; }
    // locais da lista: cadastro em lote
    { const ls = F.locaisDaFila();
      const falta = ls.filter((l) => !l.cadastrado).length;
      const escolhas = ls.map((l) => ({ origem: l.nome, nome: l.nome, tipo: l.tipo, marcado: !l.cadastrado && !l.suspeito && l.qtd >= 2 }));
      const corpo = h('tbody', {}, ls.map((l, i) => { const e = escolhas[i];
        const ck = h('input', { type: 'checkbox', ...(e.marcado ? { checked: true } : {}), ...(l.cadastrado ? { disabled: true } : {}) }); ck.addEventListener('change', () => { e.marcado = ck.checked; });
        const nome = h('input', { type: 'text', value: e.nome, ...(l.cadastrado ? { disabled: true } : {}) }); nome.addEventListener('input', () => { e.nome = nome.value; });
        const tipo = h('select', { ...(l.cadastrado ? { disabled: true } : {}) }, T.LOCAIS_TIPO.map((t) => h('option', { ...(t === e.tipo ? { selected: true } : {}) }, t))); tipo.addEventListener('change', () => { e.tipo = tipo.value; });
        return h('tr', {}, h('td', {}, ck), h('td', {}, nome, l.suspeito ? h('div', { class: 'small' }, 'Nome suspeito na lista: confira antes de cadastrar.') : null), h('td', {}, tipo), h('td', {}, String(l.qtd)), h('td', {}, l.cadastrado ? U.badge('ok', 'já cadastrado') : U.badge('warn', 'a cadastrar'))); }));
      root.appendChild(h('details', falta ? { open: true } : {}, h('summary', { style: 'cursor:pointer;font-weight:600;padding:6px 0' }, 'Locais da lista (' + ls.length + '): ' + falta + ' a cadastrar'),
        h('div', { class: 'card' }, h('p', { class: 'small' }, 'Cadastre os locais para a fila ligar cada produto ao local certo. Ajuste o nome e o tipo se quiser (por exemplo, separe "Contêiner de PQ" em PQ 01, PQ 02). Depois de cadastrar, complete a área, a categoria de segurança e as marcações de cada local em Locais de armazenamento.'),
          h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['', 'Nome do local', 'Tipo', 'Produtos', 'Situação'].map((x) => h('th', {}, x)))), corpo)),
          h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn', onclick: () => { const sel = escolhas.filter((e) => e.marcado && (e.nome || '').trim()); if (!sel.length) { U.toast('Marque ao menos um local.'); return; } const n = F.cadastrarLocais(sel.map((e) => ({ origem: e.origem, nome: e.nome.trim(), tipo: e.tipo }))); U.toast(n + ' local(is) cadastrado(s).'); O.route(); } }, 'Cadastrar locais marcados'), h('a', { class: 'btn ghost', href: '#/locais' }, 'Ver Locais de armazenamento')))));
    }
    const st = { q: '', sit: '', pri: '', loc: '' };
    const kpi = h('div', { class: 'grid g4', style: 'margin-bottom:12px' });
    const tabArea = h('div');
    const locais = [...new Set(lista.map((i) => i.local || 'Sem local'))].sort();
    const mk = (opts, k) => { const s = h('select', { style: 'max-width:250px' }, opts.map((o) => h('option', { value: o[0] }, o[1]))); s.addEventListener('change', () => { st[k] = s.value; draw(); }); return s; };
    const busca = h('input', { type: 'text', placeholder: 'Buscar por produto, fabricante ou composição', style: 'max-width:340px' }); busca.addEventListener('input', () => { st.q = busca.value; draw(); });
    root.appendChild(kpi);
    root.appendChild(h('div', { class: 'row', style: 'margin-bottom:10px' }, busca,
      mk([['', 'Todas as situações'], ['fds_levantar', 'FDS a levantar'], ['fds_recebida', 'FDS recebida'], ['em_analise', 'Em homologação'], ['pendente', 'Pendente'], ['homologado', 'Homologado'], ['condicionado', 'Homologado com condicionantes'], ['reprovado', 'Reprovado'], ['descartado', 'Descartado']], 'sit'),
      mk([['', 'Toda prioridade'], ['alta', 'Prioridade alta'], ['media', 'Prioridade média'], ['normal', 'Prioridade normal']], 'pri'),
      mk([['', 'Todos os locais']].concat(locais.map((l) => [l, l])), 'loc')));
    const acoes = h('div', { class: 'row', style: 'margin-bottom:10px' }); root.appendChild(acoes);
    root.appendChild(tabArea);
    const PRI_TOM = { alta: 'crit', media: 'warn', normal: 'info' }, PRI_TXT = { alta: 'Alta', media: 'Média', normal: 'Normal' };
    const SIT_TOM = { fds_levantar: 'warn', fds_recebida: 'info', em_analise: 'info', pendente: 'warn', homologado: 'ok', condicionado: 'warn', reprovado: 'crit', descartado: 'info', na_lista: 'ok' };
    const filtrados = () => S.fila().filter((i) => { const s = F.situacao(i); const t = (i.nome + ' ' + i.fabricante + ' ' + i.composicao).toLowerCase();
      return (!st.q || t.includes(st.q.toLowerCase())) && (!st.sit || s.chave === st.sit) && (!st.pri || i.prioridade.nivel === st.pri) && (!st.loc || (i.local || 'Sem local') === st.loc); });
    const draw = () => {
      const todos = S.fila(); const cs = (k) => todos.filter((i) => F.situacao(i).chave === k).length;
      kpi.innerHTML = ''; [['Produtos na fila', todos.length, ''], ['FDS a levantar', cs('fds_levantar'), 'warn'], ['Em homologação', cs('em_analise') + cs('pendente') + cs('fds_recebida'), ''], ['Homologados', cs('homologado') + cs('condicionado') + cs('na_lista'), 'ok']].forEach((k) => kpi.appendChild(h('div', { class: 'kpi ' + k[2] }, h('b', {}, k[1]), h('span', {}, k[0]))));
      const f = filtrados();
      acoes.innerHTML = ''; acoes.appendChild(V.docBotoes({ nome: 'fila-de-homologacao', id: 'fila' }, { id: 'fila', nome: 'Fila de homologação', fn: () => D.filaDoc(filtrados()) }, true));
      acoes.appendChild(h('button', { class: 'btn sm ghost', onclick: () => { const cab = ['Produto', 'Fabricante', 'Classe (lista)', 'Local', 'Prioridade', 'Situação', 'Motivo da prioridade']; const esc = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; const linhas = [cab.map(esc).join(';')].concat(f.map((i) => [i.nome, i.fabricante, i.classe, i.local, PRI_TXT[i.prioridade.nivel], F.situacao(i).rotulo, i.prioridade.motivos.join('; ')].map(esc).join(';'))); R.baixar(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'fila-de-homologacao.csv'); } }, 'Baixar CSV'));
      tabArea.innerHTML = '';
      if (!f.length) { tabArea.appendChild(h('div', { class: 'empty' }, 'Nenhum produto com esses filtros.')); return; }
      const ordem = { alta: 0, media: 1, normal: 2 };
      const linhas = f.slice().sort((a, b) => ordem[a.prioridade.nivel] - ordem[b.prioridade.nivel] || a.nome.localeCompare(b.nome)).slice(0, 250).map((i) => {
        const s = F.situacao(i);
        const det = h('details', {}, h('summary', { class: 'small' }, 'Detalhes'),
          h('p', { class: 'small', style: 'margin:4px 0' }, 'Composição na lista: ' + (i.composicao || '—')), h('p', { class: 'small', style: 'margin:4px 0' }, 'Local informado: ' + (i.localOriginal || '—') + (i.localUso ? ' | uso: ' + i.localUso : '') + (i.quantidade ? ' | quantidade: ' + i.quantidade : '')),
          i.prioridade.motivos.length ? h('p', { class: 'small', style: 'margin:4px 0' }, 'Prioridade: ' + i.prioridade.motivos.join('; ')) : null,
          i.carimboLista === 'sim' ? h('p', { class: 'small', style: 'margin:4px 0' }, 'A lista marca "FDS com carimbo de SSMA", mas refere-se à versão antiga: levante a FDS atual.') : null,
          U.input(i, 'obs', { rows: 2, label: 'Observações', onInput: () => S.salvarFila(i) }));
        const bt = h('div', { class: 'row' });
        if (s.produto) bt.appendChild(h('a', { class: 'btn sm', href: (['em_analise', 'pendente'].includes(s.chave) ? '#/homologar/' : '#/produto/') + s.produto.id }, ['em_analise', 'pendente'].includes(s.chave) ? 'Continuar' : 'Abrir'));
        else if (s.chave === 'descartado') bt.appendChild(h('button', { class: 'btn sm ghost', onclick: () => { i.estado = ''; S.salvarFila(i); draw(); } }, 'Reativar'));
        else {
          bt.appendChild(h('button', { class: 'btn sm', onclick: () => { const p = F.iniciar(i); location.hash = '#/homologar/' + p.id; } }, 'Iniciar homologação'));
          bt.appendChild(h('button', { class: 'btn sm ghost', onclick: () => { i.estado = s.chave === 'fds_recebida' ? '' : 'fds_recebida'; S.salvarFila(i); draw(); } }, s.chave === 'fds_recebida' ? 'FDS ainda não' : 'FDS recebida'));
          bt.appendChild(h('button', { class: 'btn sm ghost', onclick: () => { i.estado = 'descartado'; S.salvarFila(i); draw(); } }, 'Descartar'));
        }
        return h('tr', {}, h('td', {}, h('b', {}, i.nome), i.duplicado ? U.badge('warn', 'possível duplicado') : null, h('div', { class: 'small' }, i.fabricante || '—'), det), h('td', {}, i.local || '—'), h('td', {}, i.classe || '—'), h('td', {}, U.badge(PRI_TOM[i.prioridade.nivel], PRI_TXT[i.prioridade.nivel])), h('td', {}, U.badge(SIT_TOM[s.chave] || 'info', s.rotulo)), h('td', {}, bt));
      });
      tabArea.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Produto', 'Local', 'Classe (lista)', 'Prioridade', 'Situação', ''].map((x) => h('th', {}, x)))), h('tbody', {}, linhas))));
      if (f.length > 250) tabArea.appendChild(h('p', { class: 'small' }, 'Mostrando 250 de ' + f.length + ' produtos: use os filtros. O documento e o CSV trazem todos os produtos filtrados.'));
    };
    draw();
  };

  // ------------------------------------------------------------ estoque: entradas, ajustes e saídas
  V.estoqueCard = (p) => {
    const ok = ['homologado', 'condicionado'].includes(p.status);
    const c = h('div', { class: 'card' }, h('h3', {}, 'Estoque no terminal ', U.disc('PSM')),
      h('p', { class: 'small' }, 'Só o que está armazenado ou em uso agora entra nos cálculos do local (segregação, quantidades-limite, checklist, análise de risco). Homologar não coloca o produto em estoque: registre a entrada quando ele chegar e a saída quando sair. Todos os movimentos ficam no histórico.'));
    if (!ok) { c.appendChild(h('p', { class: 'muted' }, 'Disponível depois da homologação.')); return c; }
    const ativo = E.emEstoque(p); const legado = !p.estoque;
    const loc = S.local((p.estoque && p.estoque.localId) || p.ctx.localId);
    const hoje = new Date().toISOString().slice(0, 10);
    const f = { localId: (loc && loc.id) || p.ctx.localId || '', qtdKg: p.comp.qtdKg === undefined ? '' : p.comp.qtdKg, data: hoje, resp: D.signer(p).nome, obs: '' };
    c.appendChild(h('div', { class: 'row' }, ativo ? U.badge('ok', 'Em estoque' + (loc ? ' em ' + loc.nome : '')) : U.badge('info', 'Sem estoque agora'), p.estoque && p.estoque.qtdKg !== '' && ativo ? h('span', { class: 'small' }, String(p.estoque.qtdKg).replace('.', ',') + ' kg' + (p.estoque.desde ? ' desde ' + D.fmtData(p.estoque.desde) : '')) : null, legado ? h('span', { class: 'small' }, '(registro anterior ao controle de estoque: considerado em estoque)') : null));
    const det = h('details', ativo ? {} : { open: true }, h('summary', { style: 'cursor:pointer;font-weight:600;padding:6px 0' }, ativo ? 'Registrar ajuste de quantidade ou saída' : 'Registrar entrada'),
      h('div', { class: 'grid g2' }, U.select(f, 'localId', S.locais().map((l) => [l.id, l.nome + ' (' + l.tipo + ')']), { label: 'Local', empty: 'Selecione o local' }), U.input(f, 'qtdKg', { type: 'number', label: 'Quantidade (kg; gases em L)' })),
      h('div', { class: 'grid g2' }, U.input(f, 'data', { type: 'date', label: 'Data' }), U.input(f, 'resp', { label: 'Responsável pelo registro' })), U.input(f, 'obs', { rows: 2, label: 'Observações (lote, nota fiscal, motivo)' }));
    const mov = (fn, msg) => { fn(); U.salvarJa(p); U.toast(msg); O.route(); };
    const bt = h('div', { class: 'row' });
    if (!ativo) bt.appendChild(h('button', { class: 'btn', onclick: () => { if (!f.localId) { U.toast('Escolha o local.'); return; } mov(() => E.registrarEntrada(p, f), 'Entrada registrada.'); } }, 'Registrar entrada'));
    else {
      bt.appendChild(h('button', { class: 'btn', onclick: () => { if (f.qtdKg === '' || f.qtdKg == null) { U.toast('Informe a nova quantidade.'); return; } mov(() => E.registrarAjuste(p, f), 'Quantidade ajustada.'); } }, 'Registrar ajuste de quantidade'));
      bt.appendChild(h('button', { class: 'btn ghost', onclick: () => mov(() => E.registrarSaida(p, f), 'Saída registrada. O produto sai dos cálculos do local.') }, 'Registrar saída'));
    }
    det.appendChild(bt); c.appendChild(det);
    const movs = (p.movs || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
    if (movs.length) c.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Data', 'Movimento', 'Local', 'Quantidade', 'Responsável', 'Observação'].map((x) => h('th', {}, x)))), h('tbody', {}, movs.map((m) => h('tr', {}, h('td', {}, D.fmtData(m.data)), h('td', {}, { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' }[m.tipo] || m.tipo), h('td', {}, (S.local(m.localId) || {}).nome || '—'), h('td', {}, m.qtdKg !== '' && m.qtdKg != null ? String(m.qtdKg).replace('.', ',') + ' kg' : '—'), h('td', {}, m.resp || '—'), h('td', {}, m.obs || '—')))))));
    else c.appendChild(h('p', { class: 'small' }, 'Nenhum movimento registrado.'));
    return c;
  };
  // histórico do local: todas as entradas, ajustes e saídas
  V.historicoLocal = (l) => {
    const hs = E.historicoLocal(l, S.produtos());
    const d = h('details', {}, h('summary', { style: 'cursor:pointer;font-weight:600;padding:6px 0' }, 'Histórico de entradas e saídas (' + hs.movs.length + ')'));
    if (hs.semEstoque.length) d.appendChild(h('p', { class: 'small' }, 'Homologados para este local, sem estoque agora: ' + hs.semEstoque.join('; ') + '.'));
    if (!hs.movs.length) d.appendChild(h('p', { class: 'small' }, 'Nenhum movimento registrado. Registre as entradas na página de cada produto (cartão Estoque no terminal).'));
    else d.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Data', 'Produto', 'Movimento', 'Quantidade', 'Responsável', 'Observação'].map((x) => h('th', {}, x)))), h('tbody', {}, hs.movs.map((m) => h('tr', {}, h('td', {}, D.fmtData(m.data)), h('td', {}, h('a', { href: '#/produto/' + m.pid + '/resumo' }, m.produto)), h('td', {}, { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' }[m.tipo] || m.tipo), h('td', {}, m.qtdKg !== '' && m.qtdKg != null ? String(m.qtdKg).replace('.', ',') + ' kg' : '—'), h('td', {}, m.resp || '—'), h('td', {}, m.obs || '—')))))));
    return d;
  };

  // ------------------------------------------------------------ plano de ação: responsáveis e envio por e-mail
  V.acoesCard = (p) => {
    p.acoesPlano = p.acoesPlano || {};
    const prods = S.produtos(); const info = D.listaAcoes(p, prods); const acoes = info.acoes;
    const SIT = [['fazer', 'A fazer'], ['enviada', 'Enviada'], ['andamento', 'Em andamento'], ['concluida', 'Concluída']];
    const contatos = () => S.config().contatos || [];
    const salva = () => U.salvarJa(p);
    const card = h('div', { class: 'card' }, h('h3', {}, 'Plano de ação: responsáveis e envio '), h('p', { class: 'small' }, 'As ações vêm das etapas da análise. Informe o responsável e o e-mail de cada ação (pode ser mais de um e-mail, separados por ponto e vírgula) e envie o pedido: o app abre o seu programa de e-mail com o texto pronto, com o produto, o local de armazenamento e a ação solicitada. O envio é feito por você; o app registra quando o e-mail foi aberto.'));
    if (!acoes.length) { card.appendChild(h('p', { class: 'muted' }, 'Nenhuma ação gerada para este produto ainda.')); return card; }
    const dl = h('datalist', { id: 'dl-contatos' }, contatos().map((c) => h('option', { value: c.nome })));
    card.appendChild(dl);
    const lista = (e) => String(e || '').split(/[;,\s]+/).filter((x) => /@/.test(x));
    const guardaContato = (nome, email) => { if (!nome || !email) return; const cs = contatos().slice(); const i = cs.findIndex((c) => c.nome.toLowerCase() === nome.toLowerCase()); if (i >= 0) cs[i] = { nome: cs[i].nome, email }; else cs.push({ nome, email }); S.setConfig({ contatos: cs }); };
    const montar = (sel, nome, email) => D.emailAcoes(p, prods, sel, { nome, email: lista(email).join(',') });
    const abrir = (sel, nome, email) => {
      if (!lista(email).length) { U.toast('Informe o e-mail do responsável.'); return; }
      const em = montar(sel, nome, email); const url = 'mailto:' + em.para + '?subject=' + encodeURIComponent(em.assunto) + '&body=' + encodeURIComponent(em.corpo);
      const agora = new Date().toISOString();
      sel.forEach((a) => { const r = p.acoesPlano[a.acao] = p.acoesPlano[a.acao] || {}; r.enviados = (r.enviados || []).concat([{ data: agora, para: em.para }]); if (!r.sit || r.sit === 'fazer') r.sit = 'enviada'; });
      guardaContato(nome, email); salva();
      if (url.length > 1900) U.toast('Texto longo: se o e-mail abrir incompleto, use "Copiar e-mail".');
      location.href = url; setTimeout(() => O.route(), 400);
    };
    const copiar = (sel, nome, email) => { const em = montar(sel, nome, email); U.copiar('Para: ' + em.para + '\nAssunto: ' + em.assunto + '\n\n' + em.corpo); };
    const linhas = acoes.map((a) => {
      const r = p.acoesPlano[a.acao] = p.acoesPlano[a.acao] || {};
      const nome = h('input', { type: 'text', value: r.resp || '', placeholder: a.papel || 'Responsável', list: 'dl-contatos', style: 'min-width:150px' });
      const mail = h('input', { type: 'text', value: r.email || '', placeholder: 'e-mail (;)', style: 'min-width:210px' });
      nome.addEventListener('input', () => { r.resp = nome.value; const c = contatos().find((x) => x.nome.toLowerCase() === nome.value.trim().toLowerCase()); if (c && !mail.value) { mail.value = c.email; r.email = c.email; } salva(); });
      mail.addEventListener('input', () => { r.email = mail.value; salva(); });
      const prazo = h('input', { type: 'date', value: r.prazo || '', style: 'min-width:150px' }); prazo.addEventListener('input', () => { r.prazo = prazo.value; salva(); });
      const sit = h('select', { style: 'min-width:130px' }, SIT.map((s) => h('option', { value: s[0], ...((r.sit || 'fazer') === s[0] ? { selected: true } : {}) }, s[1]))); sit.addEventListener('change', () => { r.sit = sit.value; salva(); });
      const ult = (r.enviados || []).slice(-1)[0];
      return h('tr', {}, h('td', {}, h('b', {}, a.acao), h('div', { class: 'small' }, a.origem + (a.prazoTexto ? ' | ' + a.prazoTexto : '')), ult ? h('div', { class: 'small' }, 'E-mail aberto em ' + D.fmtData(ult.data) + ' para ' + ult.para) : null),
        h('td', {}, nome), h('td', {}, mail), h('td', {}, prazo), h('td', {}, sit),
        h('td', {}, h('div', { class: 'row' }, h('button', { class: 'btn sm', style: 'white-space:nowrap', onclick: () => abrir([a], nome.value.trim(), mail.value) }, 'Enviar e-mail'), h('button', { class: 'btn sm ghost', onclick: () => copiar([a], nome.value.trim(), mail.value) }, 'Copiar'))));
    });
    card.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Ação', 'Responsável', 'E-mail', 'Prazo', 'Situação', ''].map((x) => h('th', {}, x)))), h('tbody', {}, linhas))));
    // envio agrupado por responsável: uma mensagem por e-mail, com todas as ações dele
    const grupos = {};
    acoes.forEach((a) => { const r = p.acoesPlano[a.acao] || {}; const em = lista(r.email).join(','); if (!em || r.sit === 'concluida') return; (grupos[em] = grupos[em] || { nome: r.resp || '', email: r.email, acoes: [] }).acoes.push(a); });
    const ks = Object.keys(grupos);
    if (ks.length) {
      const g = h('div', { style: 'margin-top:12px' }, h('h4', {}, 'Enviar por responsável (uma mensagem com todas as ações de cada um)'));
      ks.forEach((k) => { const x = grupos[k]; g.appendChild(h('div', { class: 'row', style: 'margin:6px 0' }, h('span', {}, (x.nome || x.email) + ': ' + x.acoes.length + ' ação(ões)'), h('span', { class: 'spacer' }), h('button', { class: 'btn sm', onclick: () => abrir(x.acoes, x.nome, x.email) }, 'Abrir e-mail'), h('button', { class: 'btn sm ghost', onclick: () => copiar(x.acoes, x.nome, x.email) }, 'Copiar e-mail'))); });
      card.appendChild(g);
    }
    card.appendChild(h('p', { class: 'small', style: 'margin-top:8px' }, 'O responsável, o prazo e a situação aparecem no documento "Plano de ação" (Word e PDF). Os nomes e e-mails usados ficam salvos como contatos para as próximas ações.'));
    return card;
  };

  // ------------------------------------------------------------ catálogo de documentos
  V.catalogo = (p) => {
    const ok = ['homologado', 'condicionado'].includes(p.status);
    const prods = S.produtos();
    const decidido = !!p.confirmadas.decisao || p.status !== 'em_analise';
    const lida = !!(p.fds.analisada || p.nome) && p.status !== 'reprovado'; // ficha, rótulo e envelope saem já com a FDS lida (preliminares até a decisão)
    const c = [{ id: 'relatorio', nome: 'Relatório de homologação', desc: 'Decisão, FDS, triagem GHS, impactos, PGR, IMDG, segregação e rastreabilidade.', fn: () => D.relatorio(p, prods), on: true }];
    c.splice(1, 0, { id: 'analise', nome: 'Relatório da análise da FDS', desc: 'Leitura da FDS: validade, GHS, composição, triagem CMR e PFC, transporte, classe de armazenamento e controles sugeridos. Disponível a qualquer momento.', fn: () => D.analiseFds(p, prods), on: !!(p.fds.analisada || p.nome) });
    c.push({ id: 'quadro', nome: 'Quadro de compatibilidade', desc: 'Este produto e os homologados comparados dois a dois, com grupos que podem dividir o setor de armazém.', fn: () => D.quadroCompat(p, prods), on: E.estoqueAtivo(prods).filter((x) => x.id !== p.id && x.armazenamento !== 'granel').length >= 1 && p.armazenamento !== 'granel' });
    c.push({ id: 'plano', nome: 'Plano de ação', desc: 'Ações, origem, responsável e prazo para colocar o produto em uso (ou encerrar, se reprovado).', fn: () => D.planoAcao(p, prods), on: decidido });
    c.push({ id: 'ficha', nome: 'Ficha de emergência', desc: 'Estrutura NBR 7503 e Manual ABIQUIM: riscos, isolamento, fogo, derramamento, primeiros socorros.', fn: () => D.fichaEmergencia(p), on: ok || lida });
    c.push({ id: 'rotulo', nome: 'Rotulagem', desc: 'Rótulo GHS (NBR 14725), etiqueta de uso (NR-26) e rótulos de risco (NBR 7500).', fn: () => D.rotulagem(p), on: ok || lida });
    c.push({ id: 'envelope', nome: 'Envelope de transporte', desc: 'Painel de segurança, rótulos de risco, conduta do motorista e ficha de emergência.', fn: () => D.envelope(p), on: ok || lida });
    c.push({ id: 'treino', nome: 'Checklist de treinamento', desc: 'Manuseio, armazenamento, descarte, emergência e lista de presença.', fn: () => D.treinamento(p), on: ok && p.trein.gerar !== false });
    return c;
  };

  const nomeArq = (d, p) => d.id + '-' + slug(p.nome);
  async function baixarDocx(p, d) {
    U.toast('Gerando o arquivo Word...');
    try { R.baixar(await R.docx(d.fn(), d.nome + ' | ' + p.nome), nomeArq(d, p) + '.docx'); }
    catch (e) { console.error(e); U.toast('Falha ao gerar o Word: ' + e.message); }
  }
  async function baixarPdf(p, d) {
    U.toast('Gerando o PDF...');
    try { R.baixar(await O.Pdf.blob(d.fn(), d.nome + ' | ' + p.nome), nomeArq(d, p) + '.pdf'); }
    catch (e) { console.error(e); U.toast('Falha ao gerar o PDF: ' + e.message + ' Use "Imprimir" como alternativa.'); }
  }
  async function baixarPacote(p) {
    if (!window.JSZip) { U.toast('Biblioteca de zip indisponível.'); return; }
    U.toast('Gerando o pacote com Word e PDF...');
    try {
      const zip = new window.JSZip();
      for (const d of V.catalogo(p).filter((x) => x.on)) {
        const t = d.nome + ' | ' + p.nome;
        zip.file(nomeArq(d, p) + '.docx', await R.docx(d.fn(), t));
        zip.file(nomeArq(d, p) + '.pdf', await O.Pdf.blob(d.fn(), t));
      }
      R.baixar(await zip.generateAsync({ type: 'blob' }), 'QUIM360-' + slug(p.nome) + '.zip');
    } catch (e) { console.error(e); U.toast('Falha ao gerar o pacote: ' + e.message); }
  }
  V.pacote = (p) => h('div', { class: 'card' }, h('h3', {}, 'Pacote completo'), h('p', { class: 'small' }, 'Um único arquivo .zip com todos os documentos disponíveis, cada um em Word e em PDF.'), h('button', { class: 'btn', onclick: () => baixarPacote(p) }, 'Baixar pacote (.zip)'));

  V.docBotoes = (p, d, semPrev) => h('div', { class: 'row' }, semPrev ? null : h('a', { class: 'btn sm sec', href: '#/doc/' + p.id + '/' + d.id }, 'Pré-visualizar'), h('button', { class: 'btn sm', onclick: () => baixarDocx(p, d) }, 'Word (.docx)'), h('button', { class: 'btn sm', onclick: () => baixarPdf(p, d) }, 'PDF'), h('button', { class: 'btn sm ghost', onclick: () => pdf(p, d) }, 'Imprimir'));

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
        area.appendChild(V.assinaturaCard(p)); area.appendChild(V.logoCard());
        cat.forEach((d) => area.appendChild(h('div', { class: 'card', style: d.on ? '' : 'opacity:.5' }, h('h3', {}, d.nome), h('p', { class: 'small' }, d.desc + (d.on ? '' : ' Disponível após a leitura da FDS ou da homologação.')), d.on ? V.docBotoes(p, d) : null)));
        area.appendChild(V.pacote(p));
        area.appendChild(h('p', { class: 'small' }, 'Word (.docx) e PDF são baixados como arquivo. "Imprimir" abre a impressão do navegador, se preferir.'));
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
    const porClasse = {}; ps.filter((p) => ['homologado', 'condicionado'].includes(p.status)).forEach((p) => { const k = p.imdg.classe || 'nr'; porClasse[k] = (porClasse[k] || 0) + 1; });
    const mx = Math.max(1, ...Object.values(porClasse));
    const totalHom = Object.values(porClasse).reduce((a, n) => a + n, 0);
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Produtos homologados por classe de risco ', U.disc('PSM')),
      h('p', { class: 'small' }, 'Classe de risco ONU/IMDG do transporte (Seção 14 da FDS). Cada barra conta quantos produtos homologados pertencem à classe.'),
      Object.keys(porClasse).length ? Object.keys(porClasse).sort().map((k) => h('div', { style: 'margin:8px 0' },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', {}, k === 'nr' ? 'Não regulado para transporte' : 'Classe ' + k + ' | ' + T.classeNome(k)), h('b', {}, porClasse[k] + (porClasse[k] === 1 ? ' produto' : ' produtos'))),
        h('div', { style: 'background:#0b1222;border-radius:6px;height:12px;margin-top:3px' }, h('div', { style: 'height:100%;border-radius:6px;background:var(--sky);width:' + (porClasse[k] / mx * 100) + '%' })))).concat([h('p', { class: 'small' }, 'Total: ' + totalHom + (totalHom === 1 ? ' produto homologado' : ' produtos homologados') + '.')]) : h('p', { class: 'muted' }, 'Sem produtos homologados.')));
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Reprovados por critério interno'), rej.length ? h('table', { class: 't' }, h('tbody', {}, rej.slice(0, 8).map((p) => h('tr', {}, h('td', {}, h('a', { href: '#/produto/' + p.id }, p.nome)), h('td', {}, E.triagem(p).criticos.map((c) => c.tipo).filter((x, i, a) => a.indexOf(x) === i).join(', ') || 'outro motivo'))))) : h('p', { class: 'muted' }, 'Nenhum produto reprovado.')));
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Locais de armazenamento ', U.disc('PSM')), S.locais().length ? S.locais().map((l) => { const a = E.auditoriaLocal(l, ps); const crit = a.pares.filter((x) => x.nivel === 'incompativel' || x.nivel === 'restricao').length; return h('div', { class: 'row', style: 'margin:6px 0' }, h('a', { href: '#/locais' }, l.nome), h('span', { class: 'muted' }, a.itens.length + ' itens'), crit ? U.badge('warn', crit + ' par(es) a revisar') : U.badge('ok', 'sem restrições')); }) : h('p', { class: 'muted' }, 'Cadastre os locais em "Locais".')));
    g.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Quadro de compatibilidade ', U.disc('PSM')), h('p', { class: 'small' }, 'Compare os produtos dois a dois pela NBR 17160 e veja quais podem dividir o setor de armazém.'), h('a', { class: 'btn', href: '#/compat' }, 'Abrir o quadro')));
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
    const tabs = [['resumo', 'Resumo'], ['fds', 'FDS'], ['compat', 'Compatibilidade'], ['acoes', 'Plano de ação'], ['docs', 'Documentos'], ['registro', 'Registro e QR Code']];
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
        h('div', { class: 'card' }, h('h3', {}, 'Triagem CMR e PFC'), av.tri.criticos.length ? U.alert('warn', 'Gatilho de reprovação automática (CMR ou PFC)', av.tri.criticos.map((c) => c.detalhe).concat(['Apenas sinalizado: a decisão é do responsável técnico, com justificativa, controles de exposição e parecer de Higiene Ocupacional.'])) : U.alert('ok', 'Sem evidência de cancerígeno, mutagênico, teratogênico ou PFC', 'Com base nas frases H, nos CAS e no texto da FDS analisada.'))));
      { const alt = V.alternativasCard(p, false); if (alt) root.appendChild(alt); }
      root.appendChild(V.estoqueCard(p));
    } else if (tab === 'acoes') {
      root.appendChild(V.acoesCard(p));
    } else if (tab === 'fds') {
      root.appendChild(O.Wizard.fdsPanel(p, () => O.route()));
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Seções da FDS (editáveis)'), h('p', { class: 'small' }, 'O texto das seções 4, 5, 6, 8, 9, 12, 13 e 14 alimenta a ficha de emergência, o envelope e o checklist.'),
        O.FDS.SEC_TITLES.map((t, i) => { const n = i + 1; const ta = h('textarea', { rows: 3 }); ta.value = (p.fds.secoes || {})[n] || ''; ta.addEventListener('input', () => { p.fds.secoes = p.fds.secoes || {}; p.fds.secoes[n] = ta.value; U.salvar(p); }); return h('label', { class: 'f' }, h('span', {}, n + ' ' + t), ta); })));
    } else if (tab === 'compat') {
      const outros = E.estoqueAtivo(S.produtos()).filter((x) => x.id !== p.id);
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Aplicação prática da matriz de segregação ', U.disc('PSM')),
        h('p', { class: 'small' }, 'Este produto contra cada produto que está em estoque agora (os homologados sem estoque não entram): matriz de incompatibilidade da ABNT NBR 17160:2024 mais reatividade pela Seção 10 da FDS. Classe de armazenamento deste produto: ' + E.classeArm(p).id + ' (' + E.classeArm(p).motivo + ').'),
        V.resumoCompat(p, outros), outros.length ? V.quadroDoProduto(p, outros) : null, V.tabelaCompat(p, outros)));
      if (p.armazenamento !== 'granel') {
        const lq = S.local(p.ctx.localId);
        root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Quantidade armazenada'), U.input(p, 'comp.qtdKg', { type: 'number', label: 'Quantidade deste produto no local (kg; gases em L)', hint: 'Massa líquida. Para inflamáveis, use o volume nominal da embalagem (6.2.8).', onInput: () => U.salvar(p) })));
        if (lq) root.appendChild(V.gatilhos(E.gatilhosLocal(lq, S.produtos(), p), 'Quantidades-limite em ' + lq.nome));
      }
      if (outros.length) { const dq = V.catalogo(p).find((x) => x.id === 'quadro'); if (dq && dq.on) root.appendChild(h('div', { class: 'card' }, h('h3', {}, dq.nome), h('p', { class: 'small' }, dq.desc), V.docBotoes(p, dq))); root.appendChild(V.gruposCard([p].concat(outros))); }
    } else if (tab === 'docs') {
      root.appendChild(V.pacote(p));
      root.appendChild(V.assinaturaCard(p)); root.appendChild(V.logoCard());
      V.catalogo(p).forEach((d) => root.appendChild(h('div', { class: 'card', style: d.on ? '' : 'opacity:.5' }, h('h3', {}, d.nome), h('p', { class: 'small' }, d.desc + (d.on ? '' : ' Disponível após a leitura da FDS ou da homologação.')), d.on ? V.docBotoes(p, d) : null)));
    } else {
      const link = D.linkRegistro(p);
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Cadastro próprio na lista de homologados'), kv([['Registro', p.dec.numero], ['Data', D.fmtData(p.dec.data)], ['Status', st[0]]]),
        ['homologado', 'condicionado'].includes(p.status) ? h('div', { class: 'row', style: 'margin-top:10px' }, h('div', { style: 'background:#fff;padding:6px;border-radius:8px', html: O.Pic.qr(link, 140) }), h('div', {}, h('p', { class: 'small' }, 'O QR Code aponta para:'), h('p', { class: 'mono', style: 'word-break:break-all' }, link), U.input(p, 'dec.sharepoint', { label: 'Link do SharePoint (substitui o destino do QR Code)' }), h('button', { class: 'btn sm', onclick: () => { U.salvarJa(p); O.route(); } }, 'Atualizar QR Code'))) : h('p', { class: 'muted' }, 'O registro e o QR Code são gerados na homologação.'),
        h('p', { class: 'small', style: 'margin-top:10px' }, 'O produto recebe registro próprio e nunca herda o registro do produto de referência.')));
    }
  };
  const kv = (rows) => h('table', { class: 't' }, h('tbody', {}, rows.map((r) => h('tr', {}, h('th', {}, r[0]), h('td', {}, r[1] || '—')))));

  // ------------------------------------------------------------ compatibilidade entre produtos
  const NIV_CLASS = { incompativel: 'cI', restricao: 'c2', verificar: 'cX', livre: 'c-' };
  V.tabelaCompat = (p, outros) => {
    if (!outros.length) return h('div', { class: 'empty' }, 'Não há outros produtos homologados para comparar.');
    const rows = outros.map((q) => ({ q, r: E.compatPar(p, q) }));
    const ordem = { incompativel: 0, restricao: 1, verificar: 2, livre: 3 };
    rows.sort((a, b) => ordem[a.r.nivel] - ordem[b.r.nivel]);
    return h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Produto homologado', 'Classes de armazenamento', 'NBR 17160', 'Resultado', 'Local', 'Orientação'].map((x) => h('th', {}, x)))),
      h('tbody', {}, rows.map(({ q, r }) => { const lq = S.local(q.ctx.localId); const lp = S.local(p.ctx.localId); return h('tr', {}, h('td', {}, h('a', { href: '#/produto/' + q.id + '/compat' }, q.nome), h('div', { class: 'small' }, q.dec.numero || '')), h('td', {}, (r.par || ['—']).join(' x ')), h('td', {}, r.codigo === 'R' ? 'Proibido' : r.codigo === 'G' ? 'Permitido' : r.codigo ? 'Restrição ' + r.codigo : '—'), h('td', {}, h('span', { class: 'pc ' + NIV_CLASS[r.nivel] }, E.NIVEL[r.nivel])), h('td', {}, (lq ? lq.name || lq.nome : '—') + (lq && lp && lq.id === lp.id ? ' (mesmo local)' : '')), h('td', {}, r.acao, r.motivos.length ? h('ul', { class: 'small', style: 'margin:4px 0 0 16px;padding:0' }, r.motivos.map((m) => h('li', {}, m))) : null)); }))));
  };
  V.resumoCompat = (p, outros) => {
    const rs = outros.map((q) => ({ q, r: E.compatPar(p, q) }));
    const livres = rs.filter((x) => x.r.nivel === 'livre').map((x) => x.q.nome);
    const nao = rs.filter((x) => x.r.nivel === 'incompativel').map((x) => x.q.nome);
    const seg = rs.filter((x) => x.r.nivel === 'restricao').map((x) => x.q.nome + ' (restrição ' + x.r.codigo + ')');
    return h('div', {}, nao.length ? U.alert('crit', 'Armazenamento conjunto proibido com', nao) : null, seg.length ? U.alert('warn', 'Permitido com restrição (NBR 17160)', seg) : null, livres.length ? U.alert('ok', 'Pode compartilhar o setor de armazém com', livres) : null);
  };
  V.gradeCompat = (lista) => {
    const tb = h('table', { class: 'mx', 'aria-label': 'Compatibilidade entre produtos homologados' });
    tb.appendChild(h('thead', {}, h('tr', {}, h('th', {}), lista.map((p) => h('th', { class: 'col', title: p.nome, style: 'height:120px;max-width:34px' }, p.nome.length > 22 ? p.nome.slice(0, 21) + '…' : p.nome)))));
    const body = h('tbody');
    lista.forEach((a) => body.appendChild(h('tr', {}, h('th', { style: 'text-align:right;white-space:nowrap', title: a.nome }, a.nome.length > 26 ? a.nome.slice(0, 25) + '…' : a.nome), lista.map((b) => {
      if (a.id === b.id) return h('td', { class: 'c0' }, '—');
      const r = E.compatPar(a, b);
      return h('td', { class: 'x' + NIV_CLASS[r.nivel], title: a.nome + ' x ' + b.nome + ': ' + E.NIVEL[r.nivel] + '. ' + r.acao, style: 'cursor:help' }, { incompativel: 'X', restricao: r.codigo || 'R', verificar: '?', livre: 'OK' }[r.nivel]);
    }))));
    tb.appendChild(body); return tb;
  };

  // ------------------------------------------------------------ quadro visual de compatibilidade
  const CQ = { incompativel: ['cq-r', 'X'], restricao: ['cq-y', null], livre: ['cq-g', 'OK'], verificar: ['cq-n', '?'] };
  V.heat = (lista, onPick) => {
    const tb = h('table', { class: 'cq', 'aria-label': 'Quadro de compatibilidade entre produtos' });
    tb.appendChild(h('thead', {}, h('tr', {}, h('th', {}), lista.map((p, i) => h('th', { title: p.nome }, String(i + 1))))));
    const body = h('tbody');
    lista.forEach((a, i) => body.appendChild(h('tr', {}, h('th', { class: 'rl', title: a.nome }, h('b', {}, String(i + 1)), ' ' + (a.nome.length > 28 ? a.nome.slice(0, 27) + '…' : a.nome)), lista.map((b, j) => {
      if (i === j) return h('td', { class: 'cq-s' }, '—');
      const r = E.compatPar(a, b); const k = CQ[r.nivel];
      const td = h('td', { class: k[0], tabindex: 0, title: a.nome + ' x ' + b.nome + ': ' + E.NIVEL[r.nivel], 'aria-label': (i + 1) + ' com ' + (j + 1) + ': ' + E.NIVEL[r.nivel] }, k[1] || r.codigo || 'R');
      const pick = () => { tb.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl')); td.classList.add('hl'); onPick && onPick(a, b, r, i + 1, j + 1); };
      td.addEventListener('click', pick); td.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      return td;
    }))));
    tb.appendChild(body);
    return tb;
  };
  V.legendaQuadro = () => h('div', { class: 'cq-leg' }, [['cq-r', 'X', 'Proibido'], ['cq-y', '1 a 8', 'Permitido com restrição (NBR 17160)'], ['cq-g', 'OK', 'Permitido'], ['cq-n', '?', 'Classe não definida']].map((l) => h('span', {}, h('i', { class: l[0] }, l[1]), l[2])));
  V.detalhePar = (a, b, r, i, j) => {
    const nomeG = (k) => (T.RG.find((x) => x[0] === k) || [k, k])[1];
    return h('div', { class: 'alert ' + ({ incompativel: 'crit', restricao: 'warn', livre: 'ok', verificar: '' }[r.nivel]) }, h('b', {}, i + ' ' + a.nome + '  x  ' + j + ' ' + b.nome), h('div', { class: 'small' }, 'Classes de armazenamento: ' + r.par.join(' x ') + ' | ' + (r.nivel === 'incompativel' && r.codigo !== 'R' ? 'Proibido por reatividade (a matriz permite' + (r.codigo && r.codigo !== 'G' ? ' com restrição ' + r.codigo : '') + ')' : E.NIVEL[r.nivel] + (r.codigo && !['R', 'G'].includes(r.codigo) ? ' (restrição ' + r.codigo + ')' : ''))), h('div', {}, r.acao), r.motivos.length ? h('ul', {}, r.motivos.map((m) => h('li', {}, m))) : null);
  };
  V.quadroDoProduto = (p, outros) => {
    const lista = [p].concat(outros);
    let det = h('div', { class: 'alert' }, h('b', {}, 'Toque em uma célula'), 'Mostra o resultado e a orientação para o par.');
    const wrap = h('div', {}, V.legendaQuadro(), h('div', { class: 'scroll' }, V.heat(lista, (a, b, r, i, j) => { const n = V.detalhePar(a, b, r, i, j); det.replaceWith(n); det = n; })), det);
    return wrap;
  };
  V.gruposCard = (lista) => {
    const gr = E.gruposCompativeis(lista);
    return h('div', { class: 'card' }, h('h3', {}, 'Grupos que podem dividir o setor de armazém ', U.disc('PSM')), h('p', { class: 'small' }, 'Todos os pares dentro do grupo são permitidos e sem restrição. Entre grupos, use setores, contêineres ou armários distintos, ou cumpra as restrições.'),
      h('div', { class: 'grid g3' }, gr.map((g, i) => h('div', { class: 'cq-grupo' }, h('b', {}, 'Grupo ' + String.fromCharCode(65 + i)), h('ul', {}, g.map((p) => h('li', {}, (lista.indexOf(p) + 1) + ' ' + p.nome)))))));
  };
  V.quadro = (root) => {
    root.appendChild(head('Quadro de compatibilidade', 'Produtos comparados dois a dois pela ABNT NBR 17160:2024 e pela reatividade da FDS'));
    const st = { local: '', analise: false, plan: false };
    const area = h('div');
    const locais = S.locais().filter((l) => S.produtos().some((p) => p.ctx.localId === l.id));
    const sel = h('select', { 'aria-label': 'Filtrar por local', style: 'max-width:300px' }, h('option', { value: '' }, 'Todos os locais'), locais.map((l) => h('option', { value: l.id }, l.nome)));
    const ck = h('input', { type: 'checkbox', id: 'cq-an' });
    const ckP = h('input', { type: 'checkbox', id: 'cq-pl' });
    root.appendChild(h('div', { class: 'row', style: 'margin-bottom:12px' }, sel, h('label', { for: 'cq-an', class: 'row small' }, ck, 'Incluir produtos ainda em análise'), h('label', { for: 'cq-pl', class: 'row small' }, ckP, 'Incluir homologados sem estoque (planejamento)')));
    root.appendChild(h('p', { class: 'small', style: 'margin-bottom:8px' }, 'Por padrão o quadro compara só o que está em estoque agora no terminal.'));
    root.appendChild(area);
    const draw = () => {
      area.innerHTML = '';
      const todos = S.produtos().filter((p) => (!st.local || p.ctx.localId === st.local));
      const incluir = st.analise ? todos.filter((p) => !['homologado', 'condicionado', 'reprovado', 'na_lista'].includes(p.status) && p.fds.analisada) : [];
      const lista = (st.plan ? E.homologados(todos) : E.estoqueAtivo(todos)).concat(incluir).filter((p) => p.armazenamento !== 'granel');
      if (lista.length < 2) { area.appendChild(h('div', { class: 'empty' }, 'São necessários ao menos 2 produtos em armazenamento embalado para comparar. Homologue produtos ou carregue a demonstração em Configurações.')); return; }
      let nR = 0, nY = 0, nG = 0, nN = 0;
      lista.forEach((a, i) => lista.forEach((b, j) => { if (i < j) { const n = E.compatPar(a, b).nivel; if (n === 'incompativel') nR++; else if (n === 'restricao') nY++; else if (n === 'livre') nG++; else nN++; } }));
      area.appendChild(h('div', { class: 'grid g4', style: 'margin-bottom:12px' }, h('div', { class: 'kpi crit' }, h('b', {}, nR), h('span', {}, 'Pares proibidos')), h('div', { class: 'kpi warn' }, h('b', {}, nY), h('span', {}, 'Com restrição')), h('div', { class: 'kpi ok' }, h('b', {}, nG), h('span', {}, 'Permitidos')), h('div', { class: 'kpi' }, h('b', {}, lista.length), h('span', {}, 'Produtos comparados'))));
      let det = h('div', { class: 'alert' }, h('b', {}, 'Toque em uma célula'), 'Mostra o resultado, a restrição da norma e a orientação para o par.');
      area.appendChild(h('div', { class: 'card' }, h('div', { class: 'row' }, h('h3', {}, 'Quadro comparativo'), h('span', { class: 'spacer' }), V.docBotoes({ nome: st.local ? (S.local(st.local) || {}).nome : 'Produtos homologados', id: 'x' }, { id: 'quadro', nome: 'Quadro de compatibilidade', fn: () => D.quadroCompat(null, todos, st.local ? (S.local(st.local) || {}).nome : '', incluir, st.plan) }, true)),
        V.legendaQuadro(), h('div', { class: 'scroll' }, V.heat(lista, (a, b, r, i, j) => { det.replaceWith(det2 = V.detalhePar(a, b, r, i, j)); det = det2; })), det));
      area.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Produtos do quadro'), h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Nº', 'Produto', 'Classe de armazenamento', 'Local', 'Status'].map((x) => h('th', {}, x)))), h('tbody', {}, lista.map((p, i) => h('tr', {}, h('td', {}, String(i + 1)), h('td', {}, h('a', { href: '#/produto/' + p.id + '/compat' }, p.nome)), h('td', {}, E.classeArm(p).id + ' | ' + O.NBR17160.nome(E.classeArm(p).id)), h('td', {}, (S.local(p.ctx.localId) || {}).nome || '—'), h('td', {}, U.statusBadge(p.status)))))))));
      area.appendChild(V.gruposCard(lista));
    };
    let det2;
    sel.addEventListener('change', () => { st.local = sel.value; draw(); }); ck.addEventListener('change', () => { st.analise = ck.checked; draw(); }); ckP.addEventListener('change', () => { st.plan = ckP.checked; draw(); });
    draw();
  };

  // ------------------------------------------------------------ visualização de documento
  V.doc = (root, id, tipo) => {
    const p = S.produto(id);
    const d = p && V.catalogo(p).find((x) => x.id === tipo);
    if (!p || !d) { root.appendChild(h('div', { class: 'empty' }, 'Documento não encontrado.')); return; }
    root.appendChild(head(d.nome, p.nome, h('a', { class: 'btn ghost', href: '#/produto/' + p.id + '/docs' }, 'Voltar'), h('button', { class: 'btn', onclick: () => baixarDocx(p, d) }, 'Word (.docx)'), h('button', { class: 'btn', onclick: () => baixarPdf(p, d) }, 'PDF'), h('button', { class: 'btn ghost', onclick: () => pdf(p, d) }, 'Imprimir')));
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
        av.tri.criticos.length ? U.alert('warn', 'Perigo CMR ou PFC identificado', av.tri.criticos.map((c) => c.detalhe + ' [' + c.fonte + ']').concat(['Gatilho de reprovação automática: apenas sinalizado. A decisão e as condições (PGR, PCMSO, plano de emergência) são do responsável técnico.'])) : U.alert('ok', 'Sem cancerígeno, mutagênico, teratogênico ou PFC identificado', 'Confirme a Seção 3 e a Seção 11 da FDS na etapa 7 da homologação.'),
        av.tri.suspeitos.map((x) => U.alert('warn', 'Alerta', x.detalhe)), n20.aplica ? h('div', { class: 'alert warn' }, h('b', {}, 'NR-20: ' + n20.categoria), n20.texto) : null,
        h('div', { class: 'pictos' }, (p.ghs.pictos || []).map((c) => h('span', { html: O.Pic.ghs(c, 60), title: G.PICTO[c] })), h('b', {}, p.ghs.palavra)),
        h('div', {}, (p.ghs.h || []).map((x) => h('div', {}, h('span', { class: 'chip' }, x), G.hText(x)))),
        h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => { p.ctx.area = ''; U.salvarJa(p); location.hash = '#/homologar/' + p.id; } }, 'Iniciar a homologação com estes dados')),
        h('h4', { style: 'margin-top:14px' }, 'Relatório da análise da FDS'), V.docBotoes(p, V.catalogo(p).find((x) => x.id === 'analise'))));
      const alt = V.alternativasCard(p, true); if (alt) out.appendChild(alt);
    };
    root.appendChild(O.Wizard.fdsPanel(p, rerender)); root.appendChild(out);
  };

  // ------------------------------------------------------------ locais
  V.locais = (root) => {
    root.appendChild(head('Locais de armazenamento', 'Contêiner de PQ, oficina, almoxarifado e demais áreas, com o que já está armazenado'));
    const nome = h('input', { type: 'text', placeholder: 'Nome (ex.: Contêiner de PQ 01)' });
    const tipo = h('select', {}, T.LOCAIS_TIPO.map((t) => h('option', {}, t)));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Novo local'), h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:220px' }, nome), tipo, h('button', { class: 'btn', onclick: () => { if (!nome.value.trim()) return; S.novoLocal(nome.value.trim(), tipo.value); O.route(); } }, 'Criar'))));
    // importar e exportar locais (.json): leva o cadastro de locais para outro navegador ou colega sem mexer nos produtos
    { const arqL = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
      arqL.addEventListener('change', async () => {
        if (!arqL.files[0]) return;
        try {
          const o = JSON.parse(await arqL.files[0].text());
          const lista = Array.isArray(o) ? o : o.locais;
          if (!Array.isArray(lista) || !lista.length) throw new Error('Arquivo sem locais.');
          const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
          const CAMPOS = ['tipo', 'descricao', 'espacoM', 'areaM2', 'catK', 'volMaterialM3', 'aoArLivre', 'armarioSeg', 'areaVendas', 'periodoInspecaoDias', 'itens', 'check', 'inspecoes', 'analise'];
          let novos = 0, atual = 0;
          lista.forEach((x) => {
            if (!x || !x.nome) return;
            let l = S.locais().find((y) => norm(y.nome) === norm(x.nome));
            if (!l) { l = S.novoLocal(String(x.nome), x.tipo || 'Outro'); novos++; } else atual++;
            CAMPOS.forEach((k) => { if (x[k] === undefined) return; if (k === 'check') l.check = Object.assign({}, l.check || {}, x.check); else if (k === 'inspecoes') l.inspecoes = (l.inspecoes || []).concat(x.inspecoes); else l[k] = x[k]; });
            S.salvarLocal(l);
          });
          U.toast(novos + ' local(is) novo(s), ' + atual + ' atualizado(s).'); O.route();
        } catch (e) { U.toast('Não foi possível importar: ' + e.message); }
        arqL.value = '';
      });
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Importar e exportar locais'), h('p', { class: 'small' }, 'Leva o cadastro de locais (área, categoria de segurança, respostas do checklist, inspeções) para outro navegador ou colega. Na importação, locais com o mesmo nome são atualizados e os demais são criados; produtos e fila não são alterados.'),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => arqL.click() }, 'Importar locais (.json)'), arqL,
          h('button', { class: 'btn ghost', onclick: () => R.baixar(new Blob([JSON.stringify({ tipo: 'quim360-locais', v: 1, locais: S.locais() }, null, 2)], { type: 'application/json' }), 'locais-quim360.json') }, 'Exportar locais (.json)')))); }
    const ps = S.produtos();
    if (!S.locais().length) root.appendChild(h('div', { class: 'empty' }, 'Nenhum local cadastrado.'));
    S.locais().forEach((l) => {
      const aud = E.auditoriaLocal(l, ps);
      const card = h('div', { class: 'card' });
      card.appendChild(h('div', { class: 'row' }, h('h3', {}, l.nome, ' ', U.badge('info', l.tipo)), h('span', { class: 'spacer' }), h('button', { class: 'btn danger sm', onclick: async () => { if (await U.confirm('Excluir local', 'O local "' + l.nome + '" será removido.', 'Excluir')) { S.removerLocal(l.id); O.route(); } } }, 'Excluir')));
      const holder = { l };
      card.appendChild(h('div', { class: 'grid g2' }, U.input(holder, 'l.nome', { label: 'Nome', onInput: () => S.salvarLocal(l) }), U.input(holder, 'l.espacoM', { type: 'number', label: 'Distância livre disponível entre ácidos e bases (m)', hint: 'A NBR 17160 exige 5 m (ou segregação física) entre corrosivos ácidos e básicos.', onInput: () => S.salvarLocal(l) })));
      card.appendChild(h('div', { class: 'grid g2' }, U.input(holder, 'l.areaM2', { type: 'number', label: 'Área do setor de armazenamento (m²)', hint: 'Usada no cálculo da água de extinção (Anexo F).', onInput: () => S.salvarLocal(l) }),
        U.select(holder, 'l.catK', O.NBR17160.CATK, { label: 'Categoria de segurança contra incêndio (Anexo F, F.2.1)', empty: 'Não informada (usa K1/K2)', onChange: () => S.salvarLocal(l) })));
      card.appendChild(h('div', { class: 'opts' }, U.flag(holder, 'l.aoArLivre', 'Armazenamento ao ar livre', 'Ativa os requisitos de distâncias e paredes para áreas externas (Seções 10, 11, 14 e Anexo E).', () => { S.salvarLocal(l); O.route(); }), U.flag(holder, 'l.areaVendas', 'Área de vendas ou instalação residencial', 'Ativa os requisitos do Anexo B.', () => { S.salvarLocal(l); O.route(); }), U.flag(holder, 'l.armarioSeg', 'Armário de segurança', 'Ativa os requisitos do Anexo C.', () => { S.salvarLocal(l); O.route(); })));
      card.appendChild(U.input(holder, 'l.volMaterialM3', { type: 'number', label: 'Volume de material que pode vazar (m³), opcional', hint: 'Somado ao da água de extinção (F.1 a).', onInput: () => S.salvarLocal(l) }));
      card.appendChild(U.input(holder, 'l.descricao', { rows: 2, label: 'Descrição, contenção e condições do local', onInput: () => S.salvarLocal(l) }));
      card.appendChild(h('h4', {}, 'Itens armazenados'));
      const linked = aud.itens.filter((i) => i.origem === 'homologado');
      if (linked.length) card.appendChild(h('p', { class: 'small' }, 'Vinculados por homologação: ' + linked.map((i) => i.nome).join('; ')));
      const tb = h('tbody');
      (l.itens || []).forEach((it, i) => tb.appendChild(h('tr', {}, h('td', {}, it.nome), h('td', {}, E.armDoItem(it) + (it.classeArm ? '' : ' (aprox.)')), h('td', {}, it.qtdKg !== undefined && it.qtdKg !== '' ? String(it.qtdKg).replace('.', ',') + ' kg' : '—'), h('td', {}, (it.grupos || []).map(nomeG).join(', ') || '—'), h('td', {}, (it.incompativeis || []).map(nomeG).join(', ') || '—'), h('td', {}, h('button', { class: 'btn sm ghost', onclick: () => { l.itens.splice(i, 1); S.salvarLocal(l); O.route(); } }, 'Remover')))));
      if ((l.itens || []).length) card.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Item', 'Classe de armazenamento', 'Quantidade', 'Grupos', 'Incompatível com', ''].map((x) => h('th', {}, x)))), tb)));
      const novo = { nome: '', classeArm: '', qtdKg: '', h: '', grupos: [], incompativeis: [] };
      card.appendChild(h('details', {}, h('summary', {}, 'Adicionar item armazenado'), U.input({ n: novo }, 'n.nome', { label: 'Nome do produto' }),
        U.select({ n: novo }, 'n.classeArm', O.NBR17160.CLASSES.filter((c) => c[0] !== '9').map((c) => [c[0], c[0] + ' | ' + c[1]]), { label: 'Classe de armazenamento (NBR 17160, Tabela 2)' }),
        h('div', { class: 'grid g2' }, U.input({ n: novo }, 'n.qtdKg', { type: 'number', label: 'Quantidade (kg; gases em L)', hint: 'Massa líquida. Inflamáveis: volume nominal da embalagem.' }), U.input({ n: novo }, 'n.h', { label: 'Frases H (opcional)', ph: 'Ex.: H225, H319', hint: 'Com as frases H a soma por perigo fica exata; sem elas usa a classe de armazenamento.' })),
        h('p', { class: 'q' }, 'Grupo de reatividade do item'), U.checks({ n: novo }, 'n.grupos', T.RG.filter((r) => r[0] !== 'ignicao').map((r) => ({ v: r[0], label: r[1] }))),
        h('p', { class: 'q' }, 'Incompatível com (FDS do item)'), U.checks({ n: novo }, 'n.incompativeis', T.RG.map((r) => ({ v: r[0], label: r[1] }))),
        h('button', { class: 'btn', onclick: () => { if (!novo.nome.trim() || !novo.classeArm) { U.toast('Informe o nome e a classe de armazenamento.'); return; } l.itens = l.itens || []; l.itens.push({ ...novo, nome: novo.nome.trim() }); S.salvarLocal(l); O.route(); } }, 'Adicionar')));
      const crit = aud.pares;
      card.appendChild(h('h4', { style: 'margin-top:12px' }, 'Auditoria de segregação do local (NBR 17160) ', U.disc('PSM')));
      if (aud.itens.length < 2) card.appendChild(h('p', { class: 'muted' }, 'Cadastre ao menos dois itens para auditar pares.'));
      else if (!crit.length) card.appendChild(U.alert('ok', null, 'Todos os pares são permitidos pela matriz e sem reatividade declarada.'));
      else card.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Par', 'Classes', 'Resultado', 'Observação'].map((x) => h('th', {}, x)))), h('tbody', {}, crit.map((x) => { const falta5 = x.codigo === '8' && (Number(l.espacoM) || 0) < 5; return h('tr', {}, h('td', {}, x.a + ' x ' + x.b), h('td', {}, x.par.join(' x ')), h('td', {}, h('span', { class: 'pc ' + NIV_CLASS[x.nivel] }, E.NIVEL[x.nivel])), h('td', {}, [x.texto, falta5 ? 'O local tem ' + (l.espacoM || 0) + ' m: faltam 5 m ou segregação física.' : '', ...x.motivos].filter(Boolean).join(' '))); })))));
      card.appendChild(h('h4', { style: 'margin-top:14px' }, 'Inventário e quantidades-limite (NBR 17160, 6.1.5 e Tabela 1) ', U.disc('PSM')));
      const gat = E.gatilhosLocal(l, ps);
      if (gat.itens.length) {
        const ps0 = { nome: l.nome, id: 'inv' };
        card.appendChild(h('div', { class: 'row', style: 'margin-bottom:8px' }, V.docBotoes(ps0, { id: 'inventario', nome: 'Inventário de produtos perigosos', fn: () => D.inventarioLocal(l, S.produtos()) }, true)));
        card.appendChild(V.gatilhos(gat, 'Situação do local'));
        card.appendChild(V.contencao(l));
        card.appendChild(V.historicoLocal(l)); card.appendChild(V.riscoCard(l)); card.appendChild(V.checklistCard(l)); card.appendChild(V.inspecaoCard(l));
      } else card.appendChild(h('p', { class: 'muted' }, 'Cadastre itens ou vincule produtos homologados ao local para montar o inventário.'));
      root.appendChild(card);
    });
  };

  // ------------------------------------------------------------ matriz
  const NBR_COR = { R: 'r', G: 'g' };
  V.matriz = (root) => {
    const NB = O.NBR17160;
    root.appendChild(head('Matriz de incompatibilidade', 'ABNT NBR 17160:2024 | armazenamento conjunto de produtos químicos embalados e fracionados'));
    root.appendChild(U.alert('', 'Quando se aplica', 'Armazéns, salas, contêineres e armários com produtos embalados (até 3 000 L). A norma não se aplica a tanques e embalagens estacionárias, a produtos em processo ou em uso, a fracionamento e manutenção, a explosivos, nitrato de amônio, peróxidos orgânicos, radioativos e infectantes, nem a produtos com legislação própria de armazenamento. Ela não substitui a legislação.'));
    const info = h('div', { class: 'alert' }, h('b', {}, 'Toque em uma célula'), 'Mostra a regra entre as duas classes de armazenamento.');
    const tb = h('table', { class: 'mx nm', 'aria-label': 'Matriz de incompatibilidade da NBR 17160' });
    tb.appendChild(h('thead', {}, h('tr', {}, h('th', {}), NB.ORDEM.map((c) => h('th', { class: 'col', title: NB.nome(c) }, c)))));
    const body = h('tbody');
    NB.ORDEM.forEach((a) => body.appendChild(h('tr', {}, h('th', { title: NB.nome(a), style: 'text-align:right' }, a), NB.ORDEM.map((b) => {
      const code = NB.par(a, b); const cls = NBR_COR[code] || 'y';
      const td = h('td', { class: cls, tabindex: 0, 'aria-label': a + ' com ' + b + ': ' + (code === 'R' ? 'proibido' : code === 'G' ? 'permitido' : 'restrição ' + code) }, code === 'R' || code === 'G' ? '' : code);
      const sel = () => { tb.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl')); td.classList.add('hl'); info.innerHTML = ''; info.className = 'alert ' + (code === 'R' ? 'crit' : code === 'G' ? 'ok' : 'warn'); info.appendChild(h('b', {}, a + ' ' + NB.nome(a) + ' com ' + b + ' ' + NB.nome(b))); info.appendChild(document.createTextNode(code === 'R' ? 'Armazenamento conjunto proibido.' : code === 'G' ? 'Armazenamento conjunto permitido.' : 'Permitido com restrição ' + code + '. ' + NB.OBS[code])); };
      td.addEventListener('click', sel); td.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } });
      return td;
    }))));
    tb.appendChild(body);
    root.appendChild(h('div', { class: 'card scroll' }, tb));
    root.appendChild(info);
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Legenda e observações'),
      h('div', { class: 'leg' }, h('span', { class: 'code nm-r' }, ''), h('div', {}, h('b', {}, 'Armazenamento conjunto proibido'))),
      h('div', { class: 'leg' }, h('span', { class: 'code nm-g' }, ''), h('div', {}, h('b', {}, 'Armazenamento conjunto permitido'))),
      h('div', { class: 'leg' }, h('span', { class: 'code nm-y' }, '1 a 8'), h('div', {}, h('b', {}, 'Permitido com restrição'), h('div', { class: 'small' }, 'Cumprir a observação de mesmo número.'))),
      h('table', { class: 't', style: 'margin-top:8px' }, h('tbody', {}, Object.keys(NB.OBS).map((k) => h('tr', {}, h('th', { style: 'width:36px' }, k), h('td', {}, NB.OBS[k])))))));
    root.appendChild(h('div', { class: 'grid g2' },
      [NB.TABELA3, NB.TABELA4].map((t) => h('div', { class: 'card' }, h('h4', {}, t.titulo), h('table', { class: 't' }, h('tbody', {}, t.linhas.map((l) => h('tr', {}, h('th', { style: 'width:80px' }, l[0]), h('td', {}, l[1])))))))));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Regras gerais do armazenamento conjunto'), h('ul', {}, NB.REGRAS.map((r) => h('li', {}, r)))));
    root.appendChild(h('details', { class: 'card' }, h('summary', {}, 'As 25 classes de armazenamento (Tabela 2) e o critério de cada uma'),
      h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Classe', 'Descrição', 'Critério'].map((x) => h('th', {}, x)))), h('tbody', {}, NB.CLASSES.map((c) => h('tr', {}, h('td', {}, c[0]), h('td', {}, c[1]), h('td', {}, c[2]))))))));
    // aplicação prática: produtos homologados
    const hom = E.estoqueAtivo(S.produtos());
    const prat = h('div', { class: 'card' }, h('h3', {}, 'Aplicação prática: produtos em estoque ', U.disc('PSM')));
    if (hom.length < 2) prat.appendChild(h('p', { class: 'muted' }, 'Registre a entrada de ao menos 2 produtos homologados no estoque para ver a compatibilidade entre eles. Dica: carregue a demonstração em Configurações.'));
    else {
      const sel = h('select', { 'aria-label': 'Produto' }, hom.map((p) => h('option', { value: p.id }, p.nome + ' | classe ' + E.classeArm(p).id)));
      const out = h('div');
      const show = () => { out.innerHTML = ''; const p = S.produto(sel.value); const outros = hom.filter((x) => x.id !== p.id); out.appendChild(V.resumoCompat(p, outros)); out.appendChild(V.tabelaCompat(p, outros)); };
      sel.addEventListener('change', show);
      prat.appendChild(h('label', { class: 'f' }, h('span', {}, 'Produto'), sel)); prat.appendChild(out); show();
      prat.appendChild(h('h4', { style: 'margin-top:14px' }, 'Grade de todos contra todos'));
      prat.appendChild(h('div', { class: 'scroll' }, V.gradeCompat(hom)));
      prat.appendChild(h('p', { class: 'small' }, 'X: proibido (matriz ou reatividade). Número: restrição da NBR 17160 (ver observações). OK: permitido. ?: classe não definida. Passe o mouse para ver a orientação.'));
    }
    root.appendChild(prat);
    // verificador
    const opts = () => NB.CLASSES.filter((c) => c[0] !== '9').map((c) => h('option', { value: c[0] }, c[0] + ' | ' + c[1]));
    const sa = h('select', {}, opts()); const sb = h('select', {}, opts());
    const res = h('div');
    const chk = () => { const code = NB.par(sa.value, sb.value); res.innerHTML = ''; res.appendChild(U.alert(code === 'R' ? 'crit' : code === 'G' ? 'ok' : 'warn', code === 'R' ? 'Armazenamento conjunto proibido' : code === 'G' ? 'Armazenamento conjunto permitido' : 'Permitido com restrição ' + code, code === 'R' || code === 'G' ? null : NB.OBS[code])); };
    sa.addEventListener('change', chk); sb.addEventListener('change', chk); chk();
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Verificador de par'), h('div', { class: 'grid g2' }, h('label', { class: 'f' }, h('span', {}, 'Classe A'), sa), h('label', { class: 'f' }, h('span', {}, 'Classe B'), sb)), res));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Reatividade química pela FDS (Seção 10) ', U.disc('PSM')), h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Grupo A', 'Grupo B', 'Efeito'].map((x) => h('th', {}, x)))), h('tbody', {}, T.RG_RULES.map((r) => h('tr', {}, h('td', {}, nomeG(r[0])), h('td', {}, nomeG(r[1])), h('td', {}, r[2])))))),
      U.alert('warn', 'Complemento à matriz', 'A reatividade por grupo é um complemento técnico (a norma lembra, em 9.1.1.2, que a matriz não é a única base da incompatibilidade). Confirme sempre nas Seções 7 e 10 da FDS.')));

    const nr = h('details', { class: 'card' }, h('summary', {}, 'Matriz NR-29 e IMDG: carga portuária e transporte marítimo (não é a base do armazenamento em armazéns)'));
    const box = h('div', { style: 'margin-top:10px' });
    nr.appendChild(box);
    box.appendChild(h('p', { class: 'small' }, 'Segregação de cargas perigosas em navio e área portuária comum (Anexo da NR-29 e Código IMDG). Mantida como referência para operação portuária; confirme na tabela 7.2.4 do Código IMDG.'));
    (() => {
    const info = h('div', { class: 'alert' }, h('b', {}, 'Toque em uma célula'), 'Mostra a regra entre as duas classes.');
    const tb = h('table', { class: 'mx', 'aria-label': 'Matriz NR-29 e IMDG' });
    tb.appendChild(h('thead', {}, h('tr', {}, h('th', {}), T.CLASSES.map((c) => h('th', { class: 'col', title: c[1] }, c[0])))));
    const body = h('tbody');
    T.CLASSES.forEach((a) => body.appendChild(h('tr', {}, h('th', { title: a[1], style: 'text-align:right' }, a[0]), T.CLASSES.map((b) => { const code = T.seg(a[0], b[0]); const td = h('td', { class: 'c' + code, tabindex: 0, 'aria-label': a[0] + ' com ' + b[0] + ': ' + T.SEG_LEGEND[code].nome }, code); const sel = () => { tb.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl')); td.classList.add('hl'); info.innerHTML = ''; info.className = 'alert ' + (code === '1' ? '' : 'warn'); info.appendChild(h('b', {}, a[0] + ' ' + a[1] + ' com ' + b[0] + ' ' + b[1] + ': ' + code + ' ' + T.SEG_LEGEND[code].nome)); info.appendChild(document.createTextNode(T.SEG_LEGEND[code].texto)); }; td.addEventListener('click', sel); td.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } }); return td; }))));
    tb.appendChild(body);
    box.appendChild(h('div', { class: 'card scroll' }, tb));
    box.appendChild(info);
    box.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Legenda'), Object.keys(T.SEG_LEGEND).map((k) => h('div', { class: 'leg' }, h('span', { class: 'code c' + k }, k), h('div', {}, h('b', {}, T.SEG_LEGEND[k].nome), h('div', { class: 'small' }, T.SEG_LEGEND[k].texto)))), h('p', { class: 'small' }, 'Classes 1 (explosivos), 6.2 (infectantes) e 7 (radioativos) ficam fora da matriz: armazenamento proibido ou restrito em área comum.')));

    })();
    root.appendChild(nr);
  };

  // ------------------------------------------------------------ base legal
  V.legal = (root) => {
    root.appendChild(head('Base técnico-legal', 'Normas que sustentam cada regra do aplicativo'));
    root.appendChild(h('div', { class: 'card' }, T.BASE_LEGAL.map((b) => h('div', { class: 'legalrow' }, h('div', {}, h('b', { class: 'sky' }, b.sigla)), h('div', {}, h('b', {}, b.titulo), h('p', { style: 'margin:2px 0' }, b.uso), h('small', {}, 'Aplicada em: ' + b.onde))))));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Critérios internos de rejeição automática'), h('ul', {}, h('li', {}, 'Cancerígeno: frases H350, H350i, H351 e CAS da lista de alerta.'), h('li', {}, 'Mutagênico: H340 e H341.'), h('li', {}, 'Teratogênico e tóxico à reprodução: H360 e H361 (D e F).'), h('li', {}, 'Contém PFCs ou PFAS: CAS da lista de alerta, ou marcação do analista; termos no texto geram alerta.'), h('li', {}, 'Categoria 2 (suspeita) reprova por padrão. Altere em Configurações.')), h('p', { class: 'small' }, 'A lista de alerta por CAS é de triagem e não exaustiva. Substâncias fora dela dependem das frases H e da Seção 3 da FDS.')));
  };


  // logo e identidade dos documentos (usada em Configurações, na aba Documentos e na saída)
  V.logoCard = () => {
    const lg = O.Logo.atual();
    const arq = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/svg+xml,image/webp', style: 'display:none' });
    arq.addEventListener('change', async () => {
      if (!arq.files[0]) return;
      try { const r = await O.Logo.processar(arq.files[0]); const claro = lg.custom ? !!S.config().capaClara : true; S.setConfig({ logoDoc: r.src, logoDocW: r.w, logoDocH: r.h, capaClara: claro }); U.toast('Logo atualizada nos documentos.'); O.route(); }
      catch (e) { U.toast(e.message); }
    });
    return (h('div', { class: 'card' }, h('h3', {}, 'Logo dos documentos'),
      h('p', { class: 'small' }, 'A logo aparece na capa do relatório, do plano de ação, da ficha de emergência, da rotulagem, do envelope e do checklist, em Word, PDF e na pré-visualização. Use PNG com fundo transparente, JPG ou SVG. A imagem é reduzida e guardada neste navegador.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => arq.click() }, lg.custom ? 'Trocar logo' : 'Enviar minha logo'), arq,
        lg.custom ? h('button', { class: 'btn ghost', onclick: () => { S.setConfig({ logoDoc: '', logoDocW: 0, logoDocH: 0, capaClara: false }); U.toast('Voltou para a logo Orbit 360.'); O.route(); } }, 'Voltar para a logo Orbit 360') : null),
      lg.custom ? h('div', { class: 'opts', style: 'margin-top:12px' },
        [[false, 'Faixa escura', 'Para logos claras ou brancas'], [true, 'Faixa clara', 'Para logos escuras ou coloridas']].map((o) => { const inp = h('input', { type: 'radio', name: 'tema', ...(!!S.config().capaClara === o[0] ? { checked: true } : {}) }); const lab = h('label', { class: 'opt' + (!!S.config().capaClara === o[0] ? ' sel' : '') }, inp, h('span', {}, h('b', {}, o[1]), h('small', {}, o[2]))); inp.addEventListener('change', () => { S.setConfig({ capaClara: o[0] }); O.route(); }); return lab; })) : h('p', { class: 'small', style: 'margin-top:8px' }, 'Logo em uso: Orbit 360.'),
      h('div', { class: 'paper', style: 'margin-top:12px;max-width:640px', html: R.html([{ t: 'cover', titulo: 'Exemplo de documento', sub: 'Pré-visualização da capa', org: S.config().organizacao, meta: [['Produto', 'Produto de exemplo']] }]) })));
  };

  // ------------------------------------------------------------ configurações
  V.config = (root) => {
    const c = S.config();
    root.appendChild(head('Configurações', 'Responsável técnico, critérios e dados'));
    const holder = { c };
    const save = () => S.setConfig(holder.c);
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Padrão da equipe: responsável técnico e organização'), h('p', { class: 'small' }, 'Usado quando a análise não define outro assinante. Cada análise pode ser assinada por outra pessoa na aba Documentos ou na etapa de saída.'), h('div', { class: 'grid g2' }, U.input(holder, 'c.responsavel', { label: 'Responsável técnico', onInput: save }), U.input(holder, 'c.registro', { label: 'Registro profissional', onInput: save }), U.input(holder, 'c.organizacao', { label: 'Organização (aparece na capa dos documentos)', onInput: save }), U.input(holder, 'c.email', { label: 'E-mail', onInput: save }), U.input(holder, 'c.telEmergencia', { label: 'Telefone de emergência da organização', onInput: save }), U.input(holder, 'c.sharepointBase', { label: 'Endereço base do SharePoint (opcional)', onInput: save }))));
    root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Critérios'), U.input(holder, 'c.anosValidadeFDS', { type: 'number', label: 'Validade da FDS em anos (alerta acima deste valor)', onInput: save }), h('div', { class: 'opts' }, U.flag(holder, 'c.cat2Reprova', 'Tratar categoria 2 (suspeita) como gatilho de reprovação automática', 'H341, H351, H361 e H361d. O app apenas sinaliza; a decisão é do responsável técnico.', save))));
    root.appendChild(V.logoCard());
    { const lib = S.config().bibliotecaCenarios || [];
      root.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Biblioteca de cenários de risco'), h('p', { class: 'small' }, 'Modelos salvos a partir da análise de risco dos locais. Qualquer local pode usá-los (a severidade e a probabilidade são informadas em cada local). A biblioteca vai junto na exportação e na importação em JSON.'),
        lib.length ? h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Cenário', 'Origem', 'Causas', ''].map((x) => h('th', {}, x)))), h('tbody', {}, lib.map((m) => h('tr', {}, h('td', {}, m.titulo), h('td', {}, m.origem || '—'), h('td', {}, String(m.causas || '—').slice(0, 120)), h('td', {}, h('button', { class: 'btn sm ghost', onclick: () => { S.setConfig({ bibliotecaCenarios: lib.filter((x) => x.id !== m.id) }); O.route(); } }, 'Remover'))))))) : h('p', { class: 'muted' }, 'Nenhum modelo salvo ainda.'))); }
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
      h('header', { class: 'cv-nav' }, h('span', { html: O.Pic.wordmark(46) }), h('b', {}, 'QUIM 360'), h('span', { class: 'spacer' }), h('a', { href: '#/painel' }, 'Painel'), h('a', { href: '#/produtos' }, 'Produtos'), h('a', { href: '#/legal' }, 'Base técnico-legal')),
      h('section', { class: 'cv-hero' },
        h('div', { class: 'cv-txt' },
          h('p', { class: 'cv-eyebrow' }, 'Orbit 360 | Gestão de produtos químicos'),
          h('h1', {}, 'Da FDS à decisão de homologação.'),
          h('p', { class: 'cv-lead' }, 'Envie a FDS. O app lê as 16 seções, faz a triagem de cancerígenos, mutagênicos, teratogênicos e PFCs, classifica o transporte, verifica a segregação no local de armazenamento e gera o relatório, a ficha de emergência, o rótulo, o envelope e o checklist de treinamento.'),
          h('div', { class: 'row' }, h('a', { class: 'btn big', href: '#/nova' }, 'Homologar um produto'), h('a', { class: 'btn big sec', href: '#/fds' }, 'Analisar uma FDS'), h('a', { class: 'btn big ghost', href: '#/painel' }, 'Entrar no painel'))),
        h('div', { class: 'cv-logo' }, h('img', { src: L.src, alt: 'Orbit 360 | Consultoria em SSMA' }))),
      h('section', { class: 'cv-stats' },
        [['16', 'seções da FDS lidas e conferidas pela NBR 14725'], ['15', 'etapas de homologação, sem pular confirmação'], ['25', 'classes de armazenamento da NBR 17160, aplicadas produto a produto'], ['5', 'documentos por produto, em Word e PDF']].map((s) => h('div', {}, h('b', {}, s[0]), h('span', {}, s[1])))),
      h('section', { class: 'cv-sec' },
        h('h2', {}, 'Como funciona'),
        h('div', { class: 'cv-steps' }, [['1', 'Envie a FDS', 'Texto, .txt ou .pdf. O app extrai frases H e P, CAS, ONU, classe, incompatibilidades e limites de exposição.'], ['2', 'A triagem roda sozinha', 'Cancerígeno, mutagênico, teratogênico e PFC acionam um gatilho de reprovação: o app sinaliza, e a decisão é sua. O que a FDS responde é preenchido.'], ['3', 'Você informa o que falta', 'Uso, local de armazenamento, cobertura do PGR e pareceres. Conflito de segregação sempre para para você.'], ['4', 'Decisão e documentos', 'Decisão com justificativa, registro com QR Code e os cinco documentos prontos.']].map((s) => h('div', { class: 'cv-step' }, h('i', {}, s[0]), h('h3', {}, s[1]), h('p', {}, s[2]))))),
      h('section', { class: 'cv-sec' },
        h('h2', {}, 'Três disciplinas, uma análise'),
        h('div', { class: 'grid g3' },
          pilar('PSM', 'Armazenamento e compatibilidade', ['Matriz de incompatibilidade da ABNT NBR 17160:2024', 'Reatividade pela Seção 10 da FDS', 'NR-20 para inflamáveis e combustíveis', 'Compatibilidade com cada produto homologado']),
          pilar('SST', 'Saúde e segurança do trabalho', ['Triagem CMR por frase H e CAS', 'Hierarquia de controle por produto', 'Interface com PGR e Higiene Ocupacional', 'Checklist de treinamento']),
          pilar('GA', 'Gestão ambiental', ['Perigo aquático e poluente marinho', 'Contenção e resposta a derramamento', 'Destinação de resíduos', 'Ficha de emergência e envelope NBR 7503']))),
      h('section', { class: 'cv-sec' },
        h('h2', {}, 'Base técnico-legal'),
        h('div', { class: 'cv-chips' }, T.BASE_LEGAL.map((b) => h('a', { class: 'cv-chip', href: '#/legal', title: b.titulo }, b.sigla)))),
      h('section', { class: 'cv-cta' }, ps.length ? h('p', {}, ps.length + ' produto(s) cadastrado(s) neste navegador.') : h('p', {}, 'Nenhum produto cadastrado. Comece pela FDS ou carregue a demonstração.'),
        h('div', { class: 'row', style: 'justify-content:center' }, h('a', { class: 'btn big', href: '#/nova' }, 'Iniciar'), !ps.length ? h('button', { class: 'btn big ghost', onclick: () => { O.Demo.criar(); location.hash = '#/painel'; } }, 'Carregar demonstração') : null)),
      h('footer', { class: 'cv-foot' }, h('span', {}, 'Orbit 360 | Consultoria em SSMA'), h('span', {}, (c.responsavel || '') + (c.responsavel && c.registro ? ' | ' + c.registro : '')), h('span', {}, 'Apoio à decisão: a decisão formal é do responsável técnico, com a FDS vigente do fornecedor.'))));
  };

  O.Views = V;
})(window.O360 = window.O360 || {});
