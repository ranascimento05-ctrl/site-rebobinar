/* Assistente de homologação: contexto + 15 etapas, uma confirmação por etapa. */
(function (O) {
  const U = O.UI, h = U.h, E = O.Engine, T = O.TRANSPORT, G = O.GHS, S = O.Store, D = O.Docs;
  const SIMNAO = [{ v: true, label: 'Sim' }, { v: false, label: 'Não' }];
  const nomeG = (k) => (T.RG.find((r) => r[0] === k) || [k, k])[1];

  // ---------------------------------------------------------- FDS: aplicação dos dados extraídos
  function aplicarFds(p, text, res) {
    const c = res.campos;
    p.fds.texto = text; p.fds.secoes = res.secoes;
    p.fds.secoesOk = {}; for (let i = 1; i <= 16; i++) p.fds.secoesOk[i] = res.secoesEncontradas.includes(i);
    if (!p.nome && c.nome) p.nome = c.nome;
    if (!p.fornecedor && c.fornecedor) p.fornecedor = c.fornecedor;
    if (!p.codigoFornecedor && c.codigoFornecedor) p.codigoFornecedor = c.codigoFornecedor;
    p.fds.dataRevisao = c.dataRevisao || p.fds.dataRevisao; p.fds.versao = c.versao || p.fds.versao;
    p.fds.portugues = c.idiomaPortugues; p.fds.cas = c.cas; p.fds.ph = c.ph; p.fds.parseAvisos = res.avisos;
    p.fds.composicao = (res.secoes[3] || '').replace(/\s+/g, ' ').slice(0, 220);
    p.emerg.telefoneFornecedor = c.telEmergenciaFornecedor || p.emerg.telefoneFornecedor;
    p.ghs.h = c.h; p.ghs.p = c.p; p.ghs.pComb = c.pComb;
    const dv = G.derive(c.h);
    p.ghs.palavra = c.palavra || dv.palavra;
    p.ghs.pictos = c.pictosDeclarados.length ? c.pictosDeclarados : dv.pictos;
    Object.assign(p.imdg, {
      onu: c.onu || '', nome: c.nomeEmbarque || '', classe: c.classeRisco || '', subrisco: c.subrisco || '', pg: c.grupoEmbalagem || '',
      numeroRisco: c.numeroRisco || '', ems: c.ems || '', poluente: !!c.poluenteMarinho, pontoFulgor: c.pontoFulgor == null ? '' : c.pontoFulgor,
    });
    p.imdg.naoRegulado = !c.onu && !c.classeRisco;
    p.comp.incompativeis = c.incompativeis || [];
    p.comp.grupos = E.gruposSugeridos(p);
    if (c.limitesExposicao) p.hig.tlvAgentes = p.hig.tlvAgentes || c.limitesExposicao;
    if (c.tempMax && !p.comp.tempMax) p.comp.tempMax = c.tempMax;
    p.fds.analisada = true;
    p.fds.sug = { cmrCas: c.cmrCas, pfas: c.pfasIndicios, hDesc: c.hDesconhecidas, faltantes: res.secoesFaltantes };
  }

  function fdsPanel(p, rerender) {
    const ta = h('textarea', { rows: 8, placeholder: 'Cole aqui o texto completo da FDS (seções 1 a 16) ou carregue um arquivo .txt ou .pdf.' });
    ta.value = p.fds.texto || '';
    const out = h('div');
    const mostrar = (res) => {
      out.innerHTML = '';
      const c = res.campos;
      out.appendChild(U.alert(res.secoesFaltantes.length ? 'warn' : 'ok', res.secoesEncontradas.length + ' de 16 seções localizadas', res.secoesFaltantes.length ? 'Ausentes: ' + res.secoesFaltantes.map((n) => n + ' ' + O.FDS.SEC_TITLES[n - 1]).join('; ') : 'Todas as seções foram identificadas pelos títulos.'));
      const rows = [
        ['Produto', c.nome], ['Fornecedor', c.fornecedor], ['Revisão', c.dataRevisao ? D.fmtData(c.dataRevisao) : ''], ['Idioma', c.idiomaPortugues ? 'Português' : 'Não identificado como português'],
        ['Frases H', c.h.join(' ')], ['ONU / classe / grupo', [c.onu, c.classeRisco, c.grupoEmbalagem].filter(Boolean).join(' / ')], ['Ponto de fulgor', c.pontoFulgor == null ? '' : c.pontoFulgor + ' °C'], ['Componentes (CAS)', c.cas.join(', ')],
      ];
      out.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('tbody', {}, rows.map((r) => h('tr', {}, h('th', {}, r[0]), h('td', {}, r[1] || '—')))))));
      (res.avisos || []).forEach((a) => out.appendChild(U.alert('warn', null, a)));
      const evid = c.cmrCas.map((x) => x.nome + ' (CAS ' + x.cas + ', ' + x.tipo + ')').concat(c.pfasIndicios);
      if (evid.length) out.appendChild(U.alert('crit', 'Evidências para a triagem CMR e PFC', evid));
    };
    if (p.fds.analisada) mostrar({ campos: { nome: p.nome, fornecedor: p.fornecedor, dataRevisao: p.fds.dataRevisao, idiomaPortugues: p.fds.portugues, h: p.ghs.h, onu: p.imdg.onu, classeRisco: p.imdg.classe, grupoEmbalagem: p.imdg.pg, pontoFulgor: p.imdg.pontoFulgor === '' ? null : p.imdg.pontoFulgor, cas: p.fds.cas, cmrCas: (p.fds.sug || {}).cmrCas || [], pfasIndicios: (p.fds.sug || {}).pfas || [] }, secoesEncontradas: Object.keys(p.fds.secoesOk).filter((k) => p.fds.secoesOk[k]).map(Number), secoesFaltantes: Object.keys(p.fds.secoesOk).filter((k) => !p.fds.secoesOk[k]).map(Number), avisos: p.fds.parseAvisos });
    const analisar = () => {
      const t = ta.value.trim();
      if (t.length < 80) { U.toast('Cole o texto da FDS antes de analisar.'); return; }
      const res = O.FDS.parse(t); aplicarFds(p, t, res); U.salvarJa(p); mostrar(res); U.toast('FDS analisada. Revise os valores sugeridos em cada etapa.'); rerender && rerender();
    };
    const file = h('input', { type: 'file', accept: '.txt,.pdf,text/plain,application/pdf', style: 'display:none' });
    file.addEventListener('change', async () => {
      if (!file.files[0]) return;
      try { ta.value = await O.FDS.lerArquivo(file.files[0]); analisar(); } catch (e) { U.toast(e.message); }
    });
    const ex = h('select', { 'aria-label': 'FDS de exemplo' }, h('option', { value: '' }, 'FDS de exemplo (demonstração)'), h('option', { value: 'solvente' }, 'Solvente inflamável'), h('option', { value: 'alcalino' }, 'Limpador alcalino'), h('option', { value: 'benzeno' }, 'Desengraxante com benzeno (reprova)'));
    ex.addEventListener('change', () => { if (ex.value) { ta.value = O.SAMPLES[ex.value]; analisar(); } });
    return h('div', { class: 'card' }, h('h3', {}, 'Análise da FDS'), h('p', { class: 'small' }, 'A análise lê o texto, localiza as 16 seções e sugere frases H e P, componentes (CAS), classificação de transporte, incompatibilidades e indícios de CMR e PFC. Os valores são sugestões: você confirma cada etapa.'),
      ta, h('div', { class: 'row', style: 'margin:8px 0' }, h('button', { class: 'btn', onclick: analisar }, 'Analisar texto'), h('button', { class: 'btn ghost', onclick: () => file.click() }, 'Carregar arquivo'), file, h('div', { style: 'min-width:240px' }, ex)), out);
  }

  const listaInput = (p, path, label, prefix, hint) => {
    const el = h('input', { type: 'text', value: (U.get(p, path) || []).join(' ') });
    el.addEventListener('change', () => { U.set(p, path, G.splitCodes(el.value, prefix)); U.salvar(p); el.value = U.get(p, path).join(' '); });
    return h('label', { class: 'f' }, h('span', {}, label), el, hint ? h('small', {}, hint) : null);
  };

  // ---------------------------------------------------------- definição das etapas
  const ORDER = ['fds0', 'ctx', 'ident', 'finalidade', 'lista', 'sim', 'fds', 'fds2', 'ghs', 'impactos', 'pgr', 'imdg', 'compat', 'pareceres', 'decisao', 'plano', 'saida'];
  const TITLES = {
    fds0: ['Envio da FDS', null], ctx: ['Onde será usado e armazenado', null], ident: ['1 Identificação do produto', null], finalidade: ['2 Finalidade do uso', null], lista: ['3 Lista de homologados', null],
    sim: ['4 Similaridade (read-across)', null], fds: ['5 Validação da FDS', null], fds2: ['6 Data e idioma da FDS', null], ghs: ['7 Classificação GHS', null],
    impactos: ['8 Impactos ocupacionais e ambientais', null], pgr: ['9 Interface com o PGR', null], imdg: ['10 Classificação IMDG', null], compat: ['11 Compatibilidade e segregação', null],
    pareceres: ['12 Pareceres e gatilho do PGR', null], decisao: ['13 Decisão', null], plano: ['14 Plano de ação', null], saida: ['15 Saída em Word e PDF', null],
  };

  function visiveis(p) {
    const fim = p.lista.naLista === true;
    const rej = !!p.rejeicaoAuto;
    const triRej = !!(p.fds.analisada && E.triagem(p).reprovado);
    return ORDER.filter((id) => {
      if (triRej && ['fds', 'fds2'].includes(id) && !p.confirmadas[id] && !fim) return false;
      if (fim) return ['fds0', 'ctx', 'ident', 'finalidade', 'lista', 'saida'].includes(id);
      if (rej && ['impactos', 'pgr', 'compat', 'pareceres', 'plano'].includes(id)) return false;
      if (rej && id === 'imdg' && !p.confirmadas.imdg && p.confirmadas.ghs) return false;
      if (id === 'plano') return ['homologado', 'condicionado'].includes(p.status);
      return true;
    });
  }

  function reavaliarRejeicao(p) {
    const tri = E.triagem(p);
    p.rejeicaoAuto = (p.confirmadas.ghs && tri.reprovado) || (p.confirmadas.imdg && p.imdg.incompativelOperacao) || false;
  }

  function checarSimplificada(p) {
    if (!E.simplificadaVigente(p)) return null;
    const ref = S.produto(p.sim.refId);
    const dv = E.divergencias(p, ref).filter((x) => x.tipo === 'relevante');
    if (dv.length) { p.sim.encerrada = true; p.sim.divergencia = p.sim.divergencia || dv[0].texto; U.salvarJa(p); return dv.map((x) => x.texto); }
    return null;
  }

  // cada etapa: { render(p, api) -> Node, validar(p) -> [erros], depois(p) -> opcional }
  const STEPS = {
    // ------------------------------------------------ envio da FDS e análise automática
    fds0: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q('', 'Envie a FDS. O app lê o documento e preenche tudo que consta nela.'));
        w.appendChild(fdsPanel(p, api.rerender));
        if (p.fds.analisada) {
          const L = O.Auto.lido(p), F = O.Auto.faltam(p);
          w.appendChild(h('div', { class: 'grid g2' },
            h('div', { class: 'card' }, h('h3', {}, 'Lido da FDS'), h('ul', { style: 'margin:0 0 0 18px;padding:0' }, L.map((x) => h('li', {}, x)))),
            h('div', { class: 'card' }, h('h3', {}, 'Falta informar'), h('ul', { style: 'margin:0 0 0 18px;padding:0' }, F.map((x) => h('li', {}, x))))));
          const tri = E.triagem(p);
          if (tri.criticos.length) w.appendChild(U.alert('crit', 'Reprovação automática identificada na FDS', tri.criticos.map((c) => c.detalhe + ' [' + c.fonte + ']')));
          w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'modoAuto', 'Confirmar automaticamente as etapas que a FDS responde por completo', 'Você revisa tudo na decisão. Etapas com conflito ou dado faltante sempre param para você.', api.rerender)));
        } else w.appendChild(h('p', { class: 'small' }, 'Sem FDS, todas as respostas serão manuais. Você pode enviar a FDS depois, em qualquer etapa.'));
        return w;
      },
      validar: () => [],
    },
    // ------------------------------------------------ contexto
    ctx: {
      render(p, api) {
        const wrap = h('div');
        wrap.appendChild(U.q('', 'Onde o produto será utilizado?'));
        wrap.appendChild(U.radio(p, 'ctx.area', ['Operação', 'Manutenção', 'Limpeza', 'Obra'].map((x) => ({ v: x, label: x })), { onChange: () => { if (!p.finalidade && ['Operação', 'Manutenção', 'Limpeza'].includes(p.ctx.area)) p.finalidade = p.ctx.area; } }));
        wrap.appendChild(U.input(p, 'ctx.atividade', { label: 'Atividade ou área (opcional)', ph: 'Ex.: limpeza de peças na oficina mecânica' }));
        wrap.appendChild(U.q('', 'Onde o produto será armazenado?'));
        const locs = S.locais();
        const sel = U.select(p, 'ctx.localId', locs.map((l) => [l.id, l.nome + ' (' + l.tipo + ')']), { empty: locs.length ? 'Selecione o local' : 'Nenhum local cadastrado: crie abaixo' });
        wrap.appendChild(sel);
        const nome = h('input', { type: 'text', placeholder: 'Nome do novo local (ex.: Contêiner de PQ 01)' });
        const tipo = h('select', {}, T.LOCAIS_TIPO.map((t) => h('option', {}, t)));
        const esp = h('input', { type: 'number', min: 0, step: 0.5, placeholder: 'Distância livre p/ segregação (m)', style: 'max-width:240px' });
        wrap.appendChild(h('div', { class: 'sug' }, h('h4', {}, 'Cadastrar novo local'), h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:200px' }, nome), h('div', {}, tipo), esp,
          h('button', { class: 'btn ghost', onclick: () => { if (!nome.value.trim()) { U.toast('Informe o nome do local.'); return; } const l = S.novoLocal(nome.value.trim(), tipo.value); l.espacoM = Number(esp.value) || 0; S.salvarLocal(l); p.ctx.localId = l.id; U.salvarJa(p); api.rerender(); } }, 'Criar e selecionar')),
          h('small', {}, 'A distância livre limita a segregação possível: 6 m para "separado de", 24 m para o nível 4. Contêiner pequeno ou armário: use 0.')));
        return wrap;
      },
      validar: (p) => [!p.ctx.area && 'Informe onde o produto será utilizado.', !p.ctx.localId && 'Selecione ou cadastre o local de armazenamento.'].filter(Boolean),
    },
    // ------------------------------------------------ 1
    ident: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q(1, 'Qual é o nome do produto químico?'));
        w.appendChild(U.input(p, 'nome', { label: 'Nome comercial', ph: 'Digite o nome como consta na FDS' }));
        w.appendChild(h('div', { class: 'grid g2' }, U.input(p, 'fornecedor', { label: 'Fornecedor ou fabricante' }), U.input(p, 'codigoFornecedor', { label: 'Código do fornecedor (opcional)' })));
        w.appendChild(h('p', { class: 'small' }, 'Se tiver a FDS em mãos, carregue agora: o nome e demais dados são preenchidos pela análise.'));
        w.appendChild(fdsPanel(p, api.rerender));
        return w;
      },
      validar: (p) => [!p.nome.trim() && 'Informe o nome do produto.'].filter(Boolean),
    },
    // ------------------------------------------------ 2
    finalidade: {
      render(p) {
        const w = h('div');
        w.appendChild(U.q(2, 'Qual será a finalidade do produto?'));
        w.appendChild(U.radio(p, 'finalidade', ['Operação', 'Manutenção', 'Limpeza', 'Conservação'].map((x) => ({ v: x, label: x }))));
        w.appendChild(U.input(p, 'aplicacao', { label: 'Forma de aplicação / uso', ph: 'Ex.: aplicação manual com pano; imersão de peças; pulverização', hint: 'Usada na comparação de similaridade (etapa 4).' }));
        return w;
      },
      validar: (p) => [!p.finalidade && 'Selecione a finalidade.'].filter(Boolean),
    },
    // ------------------------------------------------ 3
    lista: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q(3, 'O produto já está na lista de produtos homologados?'));
        const hom = S.produtos().filter((x) => x.id !== p.id && ['homologado', 'condicionado'].includes(x.status));
        if (p.auto && p.auto.listaSug) { const sg = S.produto(p.auto.listaSug); if (sg) w.appendChild(U.alert('warn', 'Produto com o mesmo nome já homologado', sg.nome + ' | ' + sg.dec.numero + '. Confirme se é o mesmo produto e fornecedor.')); }
        const par = hom.filter((x) => p.nome && x.nome.toLowerCase().includes(p.nome.toLowerCase().slice(0, 12)));
        if (par.length) w.appendChild(h('div', { class: 'sug' }, h('h4', {}, 'Registros parecidos na lista'), par.map((x) => h('div', { class: 'row' }, h('span', {}, x.nome + ' | ' + x.dec.numero), h('button', { class: 'btn sm sec', onclick: () => { p.lista.naLista = true; p.lista.numero = x.dec.numero; U.salvarJa(p); api.rerender(); } }, 'É este produto')))));
        w.appendChild(U.radio(p, 'lista.naLista', [{ v: true, label: 'Sim', hint: 'Encaminhar para aprovação de compra' }, { v: false, label: 'Não', hint: 'Prosseguir para a análise da FDS' }], { onChange: api.rerender }));
        if (p.lista.naLista === true) { w.appendChild(U.input(p, 'lista.numero', { label: 'Número do registro na lista' })); w.appendChild(U.alert('ok', 'Encaminhar para aprovação de compra', 'O fluxo termina aqui. Nenhuma nova análise é necessária se a FDS e o uso forem os mesmos do registro.')); }
        return w;
      },
      validar: (p) => [p.lista.naLista === null && 'Responda se o produto já está na lista.'].filter(Boolean),
      depois(p) { if (p.lista.naLista === true) { p.status = 'na_lista'; } else if (p.status === 'na_lista') p.status = 'em_analise'; },
    },
    // ------------------------------------------------ 4
    sim: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q(4, 'Existe produto já homologado de composição equivalente?'));
        w.appendChild(U.radio(p, 'sim.ativa', [{ v: true, label: 'Sim', hint: 'Aplicar a via simplificada' }, { v: false, label: 'Não', hint: 'Análise completa' }], { onChange: api.rerender }));
        if (p.auto && p.auto.simSug) { const sg = S.produto(p.auto.simSug); if (sg) w.appendChild(U.alert('info', 'Sugestão automática de referência', sg.nome + ' | ' + sg.dec.numero + ': mesma classe e componentes em comum. Os critérios abaixo foram pré-marcados pela comparação das FDS. Decida se vale a via simplificada.')); }
        if (p.sim.ativa) {
          const hom = S.produtos().filter((x) => x.id !== p.id && ['homologado', 'condicionado'].includes(x.status));
          if (!hom.length) w.appendChild(U.alert('warn', 'Nenhum produto homologado cadastrado', 'Sem produto de referência, a via simplificada não está disponível. Responda "Não".'));
          w.appendChild(U.select(p, 'sim.refId', hom.map((x) => [x.id, x.nome + ' | ' + x.dec.numero]), { label: 'Produto de referência', empty: 'Selecione', onChange: api.rerender }));
          w.appendChild(h('p', { class: 'q' }, 'Critérios obrigatórios de equivalência (todos devem ser atendidos)'));
          w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'sim.familia', 'Mesma família química'), U.flag(p, 'sim.forma', 'Mesma forma de aplicação ou uso'), U.flag(p, 'sim.componentes', 'Mesmos componentes perigosos declarados na Seção 3 da FDS')));
          if (!E.criteriosSimOk(p)) w.appendChild(U.alert('warn', null, 'Enquanto os três critérios e a referência não estiverem atendidos, a análise completa será aplicada.'));
        }
        w.appendChild(h('details', { class: 'card' }, h('summary', {}, 'O que a via simplificada permite e o que nunca dispensa'),
          h('h4', { style: 'margin-top:10px' }, 'Permite'), h('ul', {}, h('li', {}, 'Aproveitar, por referência cruzada, a avaliação ocupacional e ambiental (etapas 8, 8a e 8b) se finalidade e local de armazenamento forem os mesmos.'), h('li', {}, 'Aproveitar o parecer de Higiene Ocupacional e a cobertura do PGR (etapa 9) se o parecer mencionar a família química.'), h('li', {}, 'Reduzir o detalhamento do relatório, citando a referência e o número e a data de sua homologação.')),
          h('h4', {}, 'Nunca dispensa'), h('ul', {}, h('li', {}, 'Etapas 5 e 6: FDS do próprio produto.'), h('li', {}, 'Etapa 7: triagem GHS com a FDS do próprio produto.'), h('li', {}, 'Etapa 10: classificação IMDG do próprio produto.'), h('li', {}, 'Etapa 11: segregação para o local real de armazenamento.'), h('li', {}, 'Etapa 12: pareceres e indicador do PGR.'), h('li', {}, 'Etapas 13 a 15: decisão, relatório, registro próprio com QR Code e treinamento.'), h('li', {}, 'Divergência relevante em qualquer etapa encerra a via simplificada.'))));
        return w;
      },
      validar: (p) => {
        const e = [];
        if (p.sim.ativa === null) e.push('Responda se existe produto equivalente.');
        return e;
      },
      depois(p) { if (p.sim.ativa && !E.criteriosSimOk(p)) { p.sim.ativa = false; } p.sim.encerrada = false; },
    },
    // ------------------------------------------------ 5
    fds: {
      render(p, api) {
        const w = h('div');
        w.appendChild(fdsPanel(p, api.rerender));
        w.appendChild(U.q(5, 'A FDS está conforme a ABNT NBR 14725:2023 (16 seções completas)?'));
        const chk = h('div', { class: 'opts' });
        O.FDS.SEC_TITLES.forEach((t, i) => {
          const n = i + 1;
          const on = !!(p.fds.secoesOk || {})[n];
          const inp = h('input', { type: 'checkbox', ...(on ? { checked: true } : {}) });
          const lab = h('label', { class: 'opt' + (on ? ' sel' : ''), style: 'flex:1 1 260px;min-width:240px' }, inp, h('span', {}, h('b', {}, n + ' ' + t)));
          inp.addEventListener('change', () => { p.fds.secoesOk[n] = inp.checked; lab.classList.toggle('sel', inp.checked); U.salvar(p); });
          chk.appendChild(lab);
        });
        w.appendChild(h('details', { open: !p.fds.analisada }, h('summary', {}, 'Conferência das 16 seções'), chk));
        w.appendChild(U.radio(p, 'fds.completa', [{ v: true, label: 'Sim' }, { v: false, label: 'Não', hint: 'Solicitar correção ao fornecedor' }], { onChange: api.rerender }));
        if (p.fds.completa === false) w.appendChild(pendenciaBox(p, api, 'fds', ['FDS sem as 16 seções da ABNT NBR 14725:2023: ' + Object.keys(p.fds.secoesOk || {}).filter((k) => !p.fds.secoesOk[k]).map((k) => k + ' ' + O.FDS.SEC_TITLES[k - 1]).join('; ')]));
        return w;
      },
      validar: (p) => {
        const e = [];
        if (p.fds.completa === null) e.push('Responda se a FDS está completa.');
        if (p.fds.completa === false) e.push('FDS incompleta: registre a pendência e solicite correção ao fornecedor. Não é possível avançar.');
        if (p.fds.completa === true && Object.values(p.fds.secoesOk || {}).some((v) => v === false)) e.push('Há seções marcadas como ausentes. Marque-as como presentes ou responda "Não".');
        if (p.fds.completa === true && !Object.keys(p.fds.secoesOk || {}).length) e.push('Confira as 16 seções antes de confirmar.');
        return e;
      },
    },
    // ------------------------------------------------ 6
    fds2: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q(6, 'A FDS está atualizada e em português?'));
        const idade = E.idadeFds(p);
        const lim = S.config().anosValidadeFDS;
        if (idade != null) w.appendChild(U.alert(idade > lim ? 'warn' : 'ok', 'Revisão em ' + D.fmtData(p.fds.dataRevisao), 'Idade da FDS: ' + idade.toFixed(1).replace('.', ',') + ' anos (limite configurado: ' + lim + ').'));
        if (p.fds.portugues === false) w.appendChild(U.alert('warn', null, 'A análise do texto não identificou o idioma português.'));
        w.appendChild(h('div', { class: 'grid g2' }, U.input(p, 'fds.dataRevisao', { type: 'date', label: 'Data da revisão da FDS' }), U.input(p, 'fds.versao', { label: 'Versão' })));
        w.appendChild(U.radio(p, 'fds.atualizada', [{ v: true, label: 'Sim' }, { v: false, label: 'Não', hint: 'Solicitar versão atualizada' }], { onChange: api.rerender }));
        if (p.fds.atualizada === false) w.appendChild(pendenciaBox(p, api, 'fds2', ['FDS desatualizada ou fora do português. Revisão atual: ' + D.fmtData(p.fds.dataRevisao)]));
        return w;
      },
      validar: (p) => [p.fds.atualizada === null && 'Responda se a FDS está atualizada e em português.', p.fds.atualizada === false && 'FDS não atende: registre a pendência e solicite a versão atualizada.'].filter(Boolean),
    },
    // ------------------------------------------------ 7
    ghs: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q(7, 'O produto apresenta algum dos seguintes riscos?'));
        w.appendChild(h('div', { class: 'grid g2' }, listaInput(p, 'ghs.h', 'Frases H (Seção 2 da FDS)', 'H', 'Separe por espaço. Ex.: H225 H319 H336'), listaInput(p, 'ghs.p', 'Frases P (Seção 2 da FDS)', 'P', 'Usadas na rotulagem.')));
        w.appendChild(h('label', { class: 'f' }, h('span', {}, 'Componentes (CAS) da Seção 3'), (() => { const el = h('input', { type: 'text', value: (p.fds.cas || []).join(', ') }); el.addEventListener('change', () => { p.fds.cas = el.value.split(/[\s,;]+/).filter((x) => /^\d{2,7}-\d{2}-\d$/.test(x)); U.salvar(p); }); return el; })()));
        const tri = E.triagem(p);
        if (tri.criticos.length) w.appendChild(U.alert('crit', 'Reprovação automática: ' + tri.criticos.length + ' evidência(s)', tri.criticos.map((c) => c.detalhe + ' [' + c.fonte + ']')));
        tri.suspeitos.forEach((c) => w.appendChild(U.alert('warn', 'Alerta', c.detalhe)));
        tri.informativos.forEach((c) => w.appendChild(U.alert('', null, c)));
        w.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { const c = tri.criticos; p.ghs.cancerigeno = c.some((x) => x.tipo === 'cancerigeno'); p.ghs.mutagenico = c.some((x) => x.tipo === 'mutagenico'); p.ghs.teratogenico = c.some((x) => x.tipo === 'teratogenico' || x.tipo === 'reprodutivo'); p.ghs.pfc = c.some((x) => x.tipo === 'pfc'); p.ghs.nenhum = !c.length; U.salvarJa(p); api.rerender(); } }, 'Marcar conforme a análise')));
        w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'ghs.cancerigeno', 'Cancerígeno', 'Categoria 1A, 1B ou 2 (H350, H351)', (v) => { if (v) p.ghs.nenhum = false; api.rerender(); }), U.flag(p, 'ghs.teratogenico', 'Teratogênico', 'Toxicidade para o desenvolvimento (H360D, H361d)', (v) => { if (v) p.ghs.nenhum = false; api.rerender(); }), U.flag(p, 'ghs.mutagenico', 'Mutagênico', 'H340, H341', (v) => { if (v) p.ghs.nenhum = false; api.rerender(); }), U.flag(p, 'ghs.pfc', 'Contém PFCs', 'Per e polifluorados (PFAS, PFOA, PFOS, fluoropolímeros)', (v) => { if (v) p.ghs.nenhum = false; api.rerender(); }), U.flag(p, 'ghs.nenhum', 'Nenhum dos acima', 'Só vale se a Seção 2 e a Seção 3 não trouxerem os indícios acima', (v) => { if (v) { p.ghs.cancerigeno = p.ghs.teratogenico = p.ghs.mutagenico = p.ghs.pfc = false; } api.rerender(); })));
        const dv = G.derive(p.ghs.h);
        if (dv.pictos.length) w.appendChild(h('div', { class: 'pictos' }, dv.pictos.map((c) => h('span', { html: O.Pic.ghs(c, 56), title: G.PICTO[c] })), h('span', { class: 'muted' }, 'Palavra de advertência: ' + (dv.palavra || '—'))));
        w.appendChild(U.alert('', 'Critério interno', 'Cancerígenos, teratogênicos, mutagênicos e produtos com PFCs são reprovados de forma automática. O motor também lê as frases H e os CAS: marcar "Nenhum" não anula uma evidência encontrada.'));
        return w;
      },
      validar: (p) => {
        const e = [];
        const any = p.ghs.cancerigeno || p.ghs.teratogenico || p.ghs.mutagenico || p.ghs.pfc || p.ghs.nenhum;
        if (!any && !E.triagem(p).criticos.length) e.push('Marque uma opção (ou "Nenhum dos acima").');
        if (!(p.ghs.h || []).length && !p.ghs.nenhum && !any) e.push('Informe as frases H da Seção 2 ou confirme "Nenhum dos acima".');
        return e;
      },
      depois(p) {
        const tri = E.triagem(p);
        tri.criticos.forEach((c) => { if (c.tipo === 'cancerigeno') p.ghs.cancerigeno = true; if (c.tipo === 'mutagenico') p.ghs.mutagenico = true; if (c.tipo === 'teratogenico' || c.tipo === 'reprodutivo') p.ghs.teratogenico = true; if (c.tipo === 'pfc') p.ghs.pfc = true; });
        if (tri.criticos.length) p.ghs.nenhum = false;
        p.ghs.confirmado = true;
        const dv = G.derive(p.ghs.h); if (!(p.ghs.pictos || []).length) p.ghs.pictos = dv.pictos; if (!p.ghs.palavra) p.ghs.palavra = dv.palavra;
      },
    },
    // ------------------------------------------------ 8
    impactos: {
      render(p, api) {
        const w = h('div');
        const sg = E.sugestoes(p);
        const ref = E.simplificadaVigente(p) ? S.produto(p.sim.refId) : null;
        if (ref) {
          const igual = ref.finalidade === p.finalidade && ref.ctx.localId === p.ctx.localId;
          w.appendChild(U.alert(igual ? 'ok' : 'warn', 'Via simplificada: ' + ref.nome + ' | ' + ref.dec.numero, igual ? 'Finalidade e local coincidem com a referência. Você pode aproveitar a avaliação por referência cruzada.' : 'Finalidade ou local diferem da referência. A avaliação precisa ser feita neste produto.'));
          if (igual) w.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { p.ocup = JSON.parse(JSON.stringify(ref.ocup)); p.amb = JSON.parse(JSON.stringify(ref.amb)); p.sim.herda8 = true; U.salvarJa(p); api.rerender(); } }, 'Aproveitar etapas 8, 8a e 8b da referência'), p.sim.herda8 ? U.badge('ok', 'Aproveitado por referência cruzada') : null));
        }
        w.appendChild(U.q(8, 'Há riscos significativos para saúde, segurança ou meio ambiente?'));
        w.appendChild(h('p', { class: 'small' }, 'As dimensões ocupacional e ambiental são avaliadas separadamente, com decisões independentes. Um produto pode ser aprovado ocupacionalmente e ainda exigir restrições ambientais.'));
        const oc = h('div', { class: 'card' }, h('h3', {}, '8a Dimensão ocupacional ', U.disc('SST')), h('p', { class: 'q' }, 'Há riscos ocupacionais significativos (inalação, contato cutâneo, ocular, ingestão)?'),
          U.radio(p, 'ocup.risco', SIMNAO, { uid: 'o', onChange: api.rerender }));
        if (sg.risco.ocup && p.ocup.risco === false) oc.appendChild(U.alert('warn', 'Atenção', 'As frases H indicam risco por inalação, contato ou ingestão. Responder "Não" exige justificativa na decisão.'));
        if (p.ocup.risco) {
          oc.appendChild(h('div', { class: 'sug' }, h('h4', {}, 'Sugestões prontas pela hierarquia de controle'), ...['subst', 'eng', 'adm', 'epi'].map((k) => sg.ocup[k].length ? h('div', {}, h('b', {}, { subst: 'Substituição', eng: 'Engenharia', adm: 'Administrativos', epi: 'EPI' }[k]), h('ul', {}, sg.ocup[k].map((x) => h('li', {}, x)))) : null),
            h('button', { class: 'btn sm sec', onclick: () => { ['subst', 'eng', 'adm', 'epi'].forEach((k) => { if (!p.ocup[k]) p.ocup[k] = sg.ocup[k].join('\n'); }); U.salvarJa(p); api.rerender(); } }, 'Aplicar sugestões aos campos vazios')));
          oc.appendChild(U.input(p, 'ocup.subst', { rows: 2, label: '1 Substituição' })); oc.appendChild(U.input(p, 'ocup.eng', { rows: 2, label: '2 Controles de engenharia' })); oc.appendChild(U.input(p, 'ocup.adm', { rows: 2, label: '3 Controles administrativos' })); oc.appendChild(U.input(p, 'ocup.epi', { rows: 2, label: '4 EPI' }));
        }
        w.appendChild(oc);
        const am = h('div', { class: 'card' }, h('h3', {}, '8b Dimensão ambiental ', U.disc('GA')), h('p', { class: 'q' }, 'O produto apresenta perigo ao meio ambiente (toxicidade aquática, bioacumulação, persistência)?'),
          U.radio(p, 'amb.risco', SIMNAO, { uid: 'a', onChange: api.rerender }));
        if (sg.risco.amb && p.amb.risco === false) am.appendChild(U.alert('warn', 'Atenção', 'As frases H (H400 a H420) ou a condição de poluente marinho indicam perigo ambiental.'));
        if (p.amb.risco) {
          am.appendChild(h('div', { class: 'sug' }, h('h4', {}, 'Sugestões prontas'), h('ul', {}, sg.amb.contencao.concat(sg.amb.derramamento, sg.amb.residuos).map((x) => h('li', {}, x))), h('button', { class: 'btn sm sec', onclick: () => { if (!p.amb.contencao) p.amb.contencao = sg.amb.contencao.join('\n'); if (!p.amb.derramamento) p.amb.derramamento = sg.amb.derramamento.join('\n'); if (!p.amb.residuos) p.amb.residuos = sg.amb.residuos.join('\n'); U.salvarJa(p); api.rerender(); } }, 'Aplicar sugestões aos campos vazios')));
          am.appendChild(U.input(p, 'amb.contencao', { rows: 2, label: 'Contenção' })); am.appendChild(U.input(p, 'amb.residuos', { rows: 2, label: 'Destinação de resíduos' })); am.appendChild(U.input(p, 'amb.derramamento', { rows: 2, label: 'Resposta a derramamento' }));
        }
        w.appendChild(am);
        return w;
      },
      validar: (p) => {
        const e = [];
        if (p.ocup.risco === null) e.push('Responda a dimensão ocupacional (8a).');
        if (p.amb.risco === null) e.push('Responda a dimensão ambiental (8b).');
        if (p.ocup.risco && !(p.ocup.eng || p.ocup.adm || p.ocup.epi || p.ocup.subst).trim()) e.push('Detalhe as medidas de controle ocupacionais.');
        if (p.amb.risco && !(p.amb.contencao || p.amb.residuos || p.amb.derramamento).trim()) e.push('Detalhe os controles ambientais, independentemente do resultado ocupacional.');
        return e;
      },
    },
    // ------------------------------------------------ 9
    pgr: {
      render(p, api) {
        const w = h('div');
        const ref = E.simplificadaVigente(p) ? S.produto(p.sim.refId) : null;
        if (ref) {
          w.appendChild(U.alert('info', 'Via simplificada', 'O parecer de Higiene Ocupacional e a cobertura do PGR da referência só valem se o parecer existente mencionar a família química de forma aplicável.'));
          w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'sim.parecerCitaFamilia', 'O parecer da referência menciona a família química deste produto')));
          if (p.sim.parecerCitaFamilia) w.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { p.hig = JSON.parse(JSON.stringify(ref.hig)); p.sim.herda9 = true; U.salvarJa(p); api.rerender(); } }, 'Aproveitar etapa 9 da referência'), p.sim.herda9 ? U.badge('ok', 'Aproveitado por referência cruzada') : null));
        }
        const s8 = (p.fds.secoes || {})[8] || '';
        const temLim = /tlv|acgih|nr-?15|limite de toler|twa|stel|ppm|mg\/m/i.test(s8);
        w.appendChild(U.q('9.1', 'O produto contém agentes químicos com limite de tolerância da NR-15 ou valor de referência da ACGIH (TLV)?'));
        if (p.fds.analisada) w.appendChild(U.alert(temLim ? 'warn' : '', 'Leitura da Seção 8', temLim ? 'A Seção 8 cita limites de exposição (TLV, NR-15, ppm ou mg/m³). Sugestão: responder "Sim".' : 'A Seção 8 não cita limites de exposição. Sugestão: "Não". Confirme na FDS.'));
        w.appendChild(U.radio(p, 'hig.tlv', [{ v: true, label: 'Sim', hint: 'Exigir parecer de Higiene Ocupacional antes da decisão' }, { v: false, label: 'Não', hint: 'Registrar a ausência no relatório' }], { uid: '91', onChange: api.rerender }));
        if (p.hig.tlv) { w.appendChild(U.input(p, 'hig.tlvAgentes', { label: 'Agentes e limites (ex.: acetato de etila, TLV-TWA 400 ppm)' })); w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'hig.parecerExigidoOk', 'Parecer formal de Higiene Ocupacional recebido (consultoria de SSO)', 'Sem o parecer, a decisão fica pendente.'))); }
        w.appendChild(U.q('9.2', 'O produto exige atualização do PGR ou do Inventário de Riscos, ou já está coberto por avaliações existentes?'));
        w.appendChild(U.radio(p, 'hig.pgr', [{ v: 'requer', label: 'Exige atualização do PGR', hint: 'Acionar o elaborador do PGR e aguardar antes da liberação de uso' }, { v: 'coberto', label: 'Coberto por avaliações existentes', hint: 'Anexar parecer ou evidência' }, { v: 'indefinido', label: 'Indefinido', hint: 'Encaminhar a FDS ao elaborador do PGR' }], { uid: '92' }));
        w.appendChild(U.q('9.3', 'É necessária avaliação quantitativa (dosimetria ou varredura) antes da liberação de uso?'));
        w.appendChild(U.radio(p, 'hig.dosimetria', [{ v: true, label: 'Sim', hint: 'Condicionar a liberação à conclusão da avaliação' }, { v: false, label: 'Não', hint: 'Registrar a justificativa' }], { uid: '93' }));
        w.appendChild(U.input(p, 'hig.justificativa', { rows: 2, label: 'Justificativa / observações' }));
        return w;
      },
      validar: (p) => [p.hig.tlv === null && 'Responda 9.1.', !p.hig.pgr && 'Responda 9.2.', p.hig.dosimetria === null && 'Responda 9.3.', p.hig.dosimetria === false && !p.hig.justificativa.trim() && 'Registre a justificativa de não exigir avaliação quantitativa (9.3).'].filter(Boolean),
    },
    // ------------------------------------------------ 10
    imdg: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q(10, 'Qual é a classificação IMDG do produto?'));
        if (p.fds.analisada) w.appendChild(U.alert('', 'Sugestão da FDS (Seção 14)', [p.imdg.onu && 'ONU ' + p.imdg.onu, p.imdg.classe && 'Classe ' + p.imdg.classe, p.imdg.pg && 'Grupo de embalagem ' + p.imdg.pg].filter(Boolean).join(' | ') || 'A FDS não trouxe dados de transporte legíveis.'));
        w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'imdg.naoRegulado', 'Produto não regulado para transporte', 'Seção 14 declara "não classificado como perigoso para transporte"', (v) => { if (v) { p.imdg.classe = ''; p.imdg.onu = ''; p.imdg.pg = ''; p.imdg.numeroRisco = ''; p.imdg.subrisco = ''; } api.rerender(); })));
        if (!p.imdg.naoRegulado) {
          w.appendChild(h('div', { class: 'grid g3' }, U.input(p, 'imdg.onu', { label: 'Número ONU', ph: '1993' }),
            U.select(p, 'imdg.classe', T.CLASSES.concat(T.CLASS_EXTRA).map((c) => [c[0], c[0] + ' ' + c[1]]), { label: 'Classe de risco', onChange: api.rerender }),
            U.select(p, 'imdg.pg', ['I', 'II', 'III'], { label: 'Grupo de embalagem', empty: 'Não se aplica' })));
          w.appendChild(U.input(p, 'imdg.nome', { label: 'Nome apropriado para embarque' }));
          w.appendChild(h('div', { class: 'grid g3' }, U.input(p, 'imdg.subrisco', { label: 'Risco subsidiário', ph: 'Ex.: 8' }), U.input(p, 'imdg.numeroRisco', { label: 'Número de risco (ANTT 5.947/21)' }), U.input(p, 'imdg.ems', { label: 'EmS (IMDG)' })));
          const sug = T.riscoSugerido(p.imdg.classe, p.imdg.pg, p.imdg.pontoFulgor === '' ? null : parseFloat(p.imdg.pontoFulgor));
          if (sug && !p.imdg.numeroRisco) w.appendChild(h('div', { class: 'sug' }, 'Número de risco usual para a classe ' + p.imdg.classe + ': ', h('b', {}, sug), '. ', h('button', { class: 'btn sm sec', onclick: () => { p.imdg.numeroRisco = sug; U.salvarJa(p); api.rerender(); } }, 'Usar'), h('small', { style: 'display:block' }, 'Confirme na relação de produtos perigosos da Resolução ANTT 5.947/21.')));
          w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'imdg.poluente', 'Poluente marinho (IMDG)', 'Atenção à operação portuária e ao derramamento')));
        }
        w.appendChild(U.input(p, 'imdg.pontoFulgor', { type: 'number', label: 'Ponto de fulgor (°C), Seção 9', hint: 'Define a aplicação da NR-20.' }));
        const n20 = E.nr20(p);
        if (n20.aplica) w.appendChild(h('div', { class: 'alert warn' }, h('b', {}, 'NR-20 aplicável: ' + n20.categoria, ' ', U.disc('PSM')), n20.texto));
        if (['1', '6.2', '7'].includes(p.imdg.classe)) w.appendChild(U.alert('crit', 'Classe fora do escopo geral', 'Explosivos (1), substâncias infectantes (6.2) e radioativos (7) têm armazenamento proibido ou restrito em área comum e exigem análise especial. Avalie a incompatibilidade com a operação.'));
        w.appendChild(h('div', { class: 'opts' }, U.flag(p, 'imdg.incompativelOperacao', 'Classificação incompatível com as operações do local', 'Marcar reprova o produto')));
        w.appendChild(U.alert('', 'Referência', 'Resolução ANTT 5.947/21 (transporte terrestre) e Código IMDG (marítimo). Número ONU, classe e grupo vêm da Seção 14: confirme contra a relação oficial.'));
        return w;
      },
      validar: (p) => {
        const e = [];
        if (!p.imdg.naoRegulado) {
          if (!/^\d{4}$/.test(String(p.imdg.onu))) e.push('Informe o número ONU com 4 dígitos ou marque "não regulado".');
          if (!p.imdg.classe) e.push('Selecione a classe de risco.');
          if (p.imdg.classe && !['2.1', '2.2', '2.3', '7', '1', '6.2', '4.1'].includes(p.imdg.classe) && !p.imdg.pg && ['3', '8', '6.1', '4.2', '4.3', '5.1', '5.2'].includes(p.imdg.classe)) e.push('Informe o grupo de embalagem.');
        }
        return e;
      },
    },
    // ------------------------------------------------ 11
    compat: {
      render(p, api) {
        const w = h('div');
        const loc = S.local(p.ctx.localId);
        w.appendChild(U.q('11.1', 'Conforme as Seções 7 e 10 da FDS, o produto apresenta incompatibilidades químicas declaradas?'));
        w.appendChild(U.radio(p, 'comp.incompDeclaradas', [{ v: true, label: 'Sim', hint: 'Listar e verificar conflito com o que já está no local' }, { v: false, label: 'Não', hint: 'Registrar a ausência' }], { uid: '111', onChange: api.rerender }));
        if (p.fds.analisada) w.appendChild(U.alert('', 'Leitura da FDS', (p.comp.incompativeis || []).length ? 'Incompatibilidades identificadas: ' + p.comp.incompativeis.map(nomeG).join('; ') + '.' : 'Nenhuma incompatibilidade identificada no texto das Seções 7 e 10.'));
        if (p.comp.incompDeclaradas) { w.appendChild(h('p', { class: 'q' }, 'Incompatível com:')); w.appendChild(U.checks(p, 'comp.incompativeis', T.RG.map((r) => ({ v: r[0], label: r[1] })))); w.appendChild(U.input(p, 'comp.incompTexto', { rows: 2, label: 'Texto da FDS (opcional)' })); }
        w.appendChild(h('p', { class: 'q' }, 'Este produto é, ele mesmo, do grupo:'));
        w.appendChild(U.checks(p, 'comp.grupos', T.RG.filter((r) => r[0] !== 'ignicao').map((r) => ({ v: r[0], label: r[1] }))));
        w.appendChild(U.q('11.2', 'O local informado é compatível com o produto, considerando o que já está armazenado e a segregação por classe (GHS/IMDG)?'));
        if (!loc) w.appendChild(U.alert('crit', null, 'Nenhum local de armazenamento foi selecionado no contexto.'));
        else {
          const cp = E.compatibilidade(p, loc, S.produtos());
          const tone = cp.status === 'conflito' ? 'crit' : cp.status === 'com_medidas' ? 'warn' : 'ok';
          const box = h('div', { class: 'alert ' + tone }, h('b', {}, 'Local: ' + loc.nome + ' (' + loc.tipo + ') | ' + cp.itens + ' item(ns) armazenado(s) | distância livre ' + (loc.espacoM || 0) + ' m ', U.disc('PSM')),
            cp.itens === 0 ? 'Local sem itens cadastrados: não há conflito a verificar. Cadastre os itens existentes em "Locais" para uma verificação real.' : cp.mensagens.join(' ') || 'Sem conflito pelas regras da matriz e dos grupos de reatividade.');
          if (cp.pares.length) box.appendChild(h('div', { class: 'scroll' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Item no local', 'Classes', 'Código', 'Regra'].map((x) => h('th', {}, x)))), h('tbody', {}, cp.pares.map((x) => h('tr', {}, h('td', {}, x.com), h('td', {}, x.par.join(' x ')), h('td', {}, x.codigo), h('td', {}, x.texto)))))));
          if (cp.grupos.length) box.appendChild(h('ul', {}, cp.grupos.map((g) => h('li', {}, g.com + ': ' + g.a + ' x ' + g.b + '. ' + g.efeito))));
          w.appendChild(box);
          w.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { p.comp.localOk = cp.status === 'conflito' ? 'conflito' : 'sim'; U.salvarJa(p); api.rerender(); } }, 'Usar resultado da análise')));
          p.comp._motor = cp.status;
        }
        w.appendChild(U.radio(p, 'comp.localOk', [{ v: 'sim', label: 'Sim, compatível', hint: 'Registrar local aprovado e condições da FDS' }, { v: 'conflito', label: 'Não, há conflito de segregação', hint: 'Definir local alternativo ou medidas' }, { v: 'insuficiente', label: 'Informação insuficiente na FDS', hint: 'Solicitar complementação' }], { uid: '112', onChange: api.rerender }));
        if (p.comp.localOk === 'sim' && p.comp._motor === 'conflito') { w.appendChild(U.alert('crit', 'Divergência do motor', 'O motor encontrou conflito neste local e você marcou "compatível". Justifique abaixo.')); w.appendChild(U.input(p, 'comp.observacoes', { rows: 2, label: 'Justificativa da divergência (obrigatória)' })); }
        if (p.comp.localOk === 'conflito') {
          w.appendChild(U.radio(p, 'comp.solucao', [{ v: 'alternativo', label: 'Local alternativo ou segregação física', hint: 'Bacias separadas, armários distintos, distanciamento mínimo' }, { v: 'condicionar', label: 'Condicionar a homologação', hint: 'Liberar após a medida de segregação' }, { v: 'reprovar', label: 'Sem solução viável', hint: 'Reprovar' }], { uid: '112b' }));
          w.appendChild(U.input(p, 'comp.observacoes', { rows: 2, label: 'Medida de segregação ou local alternativo' }));
        }
        if (p.comp.localOk === 'insuficiente') w.appendChild(pendenciaBox(p, api, 'compat', ['Informação insuficiente nas Seções 7 e 10 para avaliar armazenamento e incompatibilidades.']));
        w.appendChild(U.q('11.3', 'O armazenamento exige controles adicionais específicos?'));
        const sg = E.sugestoes(p);
        if (sg.controlesArm.length) w.appendChild(h('div', { class: 'sug' }, h('b', {}, 'Sugeridos pela FDS e pela classe: '), sg.controlesArm.map((k) => (T.CONTROLES_ARM.find((c) => c[0] === k) || [0, k])[1]).join('; '), ' ', h('button', { class: 'btn sm sec', onclick: () => { p.comp.controles = sg.controlesArm.slice(); U.salvarJa(p); api.rerender(); } }, 'Aplicar')));
        w.appendChild(U.checks(p, 'comp.controles', T.CONTROLES_ARM.map((c) => ({ v: c[0], label: c[1] })), { exclusive: 'nenhum' }));
        w.appendChild(h('div', { class: 'grid g2' }, U.input(p, 'comp.limite', { label: 'Quantidade máxima armazenada', ph: 'Ex.: 200 L' }), U.input(p, 'comp.tempMax', { label: 'Temperatura máxima de armazenamento (Seção 7)', ph: 'Ex.: 35 °C' })));
        w.appendChild(U.alert('', 'Base', 'Matriz de segregação (Anexo da NR-29 e Código IMDG) mais os grupos de reatividade da Seção 10. O código "X" exige verificação específica na FDS. Confirme cada par na tabela 7.2.4 do Código IMDG antes de decisão formal.'));
        return w;
      },
      validar: (p) => {
        const e = [];
        if (p.comp.incompDeclaradas === null) e.push('Responda 11.1.');
        if (p.comp.incompDeclaradas && !(p.comp.incompativeis || []).length && !p.comp.incompTexto.trim()) e.push('Liste as incompatibilidades declaradas.');
        if (!p.comp.localOk) e.push('Responda 11.2.');
        if (p.comp.localOk === 'conflito' && !p.comp.solucao) e.push('Defina a solução para o conflito de segregação.');
        if (p.comp.localOk === 'sim' && p.comp._motor === 'conflito' && !p.comp.observacoes.trim()) e.push('Justifique a divergência em relação ao motor de segregação.');
        if (p.comp.localOk === 'insuficiente') e.push('Informação insuficiente: registre a pendência e solicite complemento ao fornecedor.');
        if (!(p.comp.controles || []).length) e.push('Responda 11.3 (marque "Nenhum controle adicional" se for o caso).');
        return e;
      },
    },
    // ------------------------------------------------ 12
    pareceres: {
      render(p, api) {
        const w = h('div');
        w.appendChild(U.q('12.1', 'Há parecer de Higiene Ocupacional ou do elaborador do PGR arquivado para este produto (e-mail, laudo ou relatório)?'));
        w.appendChild(U.radio(p, 'par.tem', [{ v: true, label: 'Sim', hint: 'Anexar ao relatório e ao registro (rastreabilidade)' }, { v: false, label: 'Não', hint: 'Avaliar se é exigível pela etapa 9' }], { uid: '121', onChange: api.rerender }));
        if (p.par.tem) w.appendChild(U.input(p, 'par.descricao', { rows: 2, label: 'Identificação do parecer (data, autor, referência)' }));
        if (p.par.tem === false && p.hig.tlv) w.appendChild(U.alert('crit', 'Parecer exigível', 'A etapa 9.1 exige parecer de Higiene Ocupacional. Solicite antes de concluir.'));
        w.appendChild(U.q('12.2', 'Indicador de saída obrigatório: situação do PGR'));
        if (!p.par.pgrIndicador) p.par.pgrIndicador = p.hig.pgr === 'requer' ? 'requer' : (p.hig.pgr === 'coberto' ? 'nao_requer' : '');
        w.appendChild(U.radio(p, 'par.pgrIndicador', [{ v: 'requer', label: 'PGR: requer atualização', hint: 'Informar prazo e responsável' }, { v: 'nao_requer', label: 'PGR: não requer atualização (parecer anexo)' }], { uid: '122', onChange: api.rerender }));
        if (p.par.pgrIndicador === 'requer') w.appendChild(h('div', { class: 'grid g2' }, U.input(p, 'par.pgrPrazo', { type: 'date', label: 'Prazo' }), U.input(p, 'par.pgrResponsavel', { label: 'Responsável' })));
        return w;
      },
      validar: (p) => [p.par.tem === null && 'Responda 12.1.', !p.par.pgrIndicador && 'Registre o indicador do PGR (12.2).', p.par.pgrIndicador === 'requer' && (!p.par.pgrPrazo || !p.par.pgrResponsavel) && 'Informe prazo e responsável pela atualização do PGR.', p.par.pgrIndicador === 'nao_requer' && !p.par.tem && 'Indicador "não requer atualização" exige parecer anexo (12.1).'].filter(Boolean),
    },
    // ------------------------------------------------ 13
    decisao: {
      render(p, api) {
        const w = h('div');
        reavaliarRejeicao(p);
        const av = E.avaliar(p, S.produtos());
        w.appendChild(U.q(13, 'O produto será homologado?'));
        const st = D.STATUS[av.sugestao] || D.STATUS.em_analise;
        w.appendChild(U.alert(st[1], 'Resultado da análise: ' + st[0], av.reprovacoes.concat(av.pendencias, av.condicionantes).length ? av.reprovacoes.concat(av.pendencias, av.condicionantes) : 'Nenhum impedimento registrado.'));
        av.alertas.forEach((a) => w.appendChild(U.alert('warn', 'Alerta', a)));
        if (p.sim.encerrada) w.appendChild(U.alert('warn', 'Via simplificada encerrada', p.sim.divergencia));
        const autoIds = visiveis(p).filter((x) => p.autoConf[x] && p.confirmadas[x]);
        if (autoIds.length) w.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Revise o que a análise da FDS preencheu'), h('p', { class: 'small' }, 'A decisão confirma estas respostas. Abra qualquer etapa para corrigir.'),
          h('table', { class: 't' }, h('tbody', {}, autoIds.map((x) => h('tr', {}, h('td', {}, TITLES[x][0].replace(/^\d+ /, '')), h('td', {}, O.Auto.resumo(p, x)), h('td', {}, h('button', { class: 'btn sm ghost', onclick: () => api.ir(x) }, 'Revisar'))))))));
        const opts = [{ v: 'sim', label: av.sugestao === 'condicionado' ? 'Sim, com condicionantes' : 'Sim, homologar', hint: 'Gera relatório, cadastro e QR Code' }, { v: 'nao', label: 'Não homologar', hint: 'Informar justificativa técnica ou legal' }, { v: 'pendente', label: 'Manter pendente', hint: 'Aguardar fornecedor ou parecer' }];
        w.appendChild(U.radio(p, 'dec.valor', opts, { onChange: api.rerender }));
        if (p.dec.valor === 'sim' && (av.reprovacoes.length || av.pendencias.length)) w.appendChild(U.alert('crit', 'Homologação bloqueada', 'Há reprovação automática ou pendência. Resolva ou escolha outra opção.'));
        if (p.dec.valor === 'nao' && !p.dec.justificativa) { p.dec.justificativa = av.reprovacoes.join(' '); }
        w.appendChild(U.input(p, 'dec.justificativa', { rows: 3, label: p.dec.valor === 'sim' ? 'Observações da decisão' : 'Justificativa técnica ou legal' }));
        if (p.dec.valor === 'sim') w.appendChild(U.input(p, 'dec.sharepoint', { label: 'Link do cadastro no SharePoint (opcional)', hint: 'O QR Code aponta para este link. Sem link, aponta para o registro neste aplicativo.' }));
        return w;
      },
      validar: (p) => {
        const e = []; const av = E.avaliar(p, S.produtos());
        if (!p.dec.valor) e.push('Escolha a decisão.');
        if (p.dec.valor === 'sim' && av.reprovacoes.length) e.push('Reprovação automática: não é possível homologar.');
        if (p.dec.valor === 'sim' && av.pendencias.length) e.push('Há pendências: resolva-as antes de homologar.');
        if (p.dec.valor === 'nao' && !p.dec.justificativa.trim()) e.push('Informe a justificativa técnica ou legal.');
        return e;
      },
      depois(p) {
        const av = E.avaliar(p, S.produtos());
        if (p.dec.valor === 'nao') p.status = 'reprovado';
        else if (p.dec.valor === 'pendente') p.status = 'pendente';
        else p.status = av.sugestao === 'condicionado' ? 'condicionado' : 'homologado';
        p.dec.data = new Date().toISOString();
        if (['homologado', 'condicionado'].includes(p.status) && !p.dec.numero) p.dec.numero = S.proximoNumero();
      },
    },
    // ------------------------------------------------ 14
    plano: {
      render(p) {
        const w = h('div');
        w.appendChild(U.alert('ok', 'O plano de ação será gerado', 'Ele lista as ações para colocar o produto em uso: controles, armazenamento, rotulagem, treinamento, PGR e revisão da FDS, com origem, responsável e prazo.'));
        w.appendChild(U.q(14, 'Deseja gerar também o checklist de treinamento para manuseio, armazenamento e descarte?'));
        w.appendChild(U.radio(p, 'trein.gerar', SIMNAO));
        w.appendChild(U.alert('', null, 'O checklist usa os controles de manuseio (8a), de armazenamento (11.3), de descarte (8b) e de emergência (Seções 4 a 6 da FDS).'));
        return w;
      },
      validar: (p) => [p.trein.gerar === null && 'Responda se deseja gerar o checklist.'].filter(Boolean),
    },
    // ------------------------------------------------ 15
    saida: {
      render(p, api) { return O.Views.saida(p, api); },
      validar: () => [],
    },
  };

  function pendenciaBox(p, api, etapa, motivos) {
    const txt = D.solicitacaoFornecedor(p, motivos);
    return h('div', { class: 'alert warn' }, h('b', {}, 'Pendência com o fornecedor'), h('div', { class: 'pre', style: 'margin:8px 0' }, txt),
      h('div', { class: 'row' }, h('button', { class: 'btn sm ghost', onclick: () => U.copiar(txt) }, 'Copiar solicitação'),
        h('button', { class: 'btn sm', onclick: () => { p.status = 'pendente'; p.pendencia = { etapa, motivos, em: new Date().toISOString() }; U.salvarJa(p); U.toast('Pendência registrada. A análise pode ser retomada depois.'); location.hash = '#/produto/' + p.id; } }, 'Registrar pendência e pausar')));
  }

  // ---------------------------------------------------------- tela do assistente
  // confirma uma etapa e calcula a próxima; auto = confirmação feita pela análise automática
  function confirmar(p, cur, auto) {
    const def = STEPS[cur];
    def.depois && def.depois(p);
    p.confirmadas[cur] = new Date().toISOString();
    if (auto) p.autoConf[cur] = true; else delete p.autoConf[cur];
    reavaliarRejeicao(p);
    let aviso = null;
    if (['ghs', 'imdg', 'compat'].includes(cur)) aviso = checarSimplificada(p);
    const v2 = visiveis(p);
    const prox = v2[v2.indexOf(cur) + 1] || 'saida';
    p.etapa = (cur === 'decisao' && !v2.includes('plano')) ? 'saida' : prox;
    const rej = !!(p.rejeicaoAuto && ['ghs', 'imdg'].includes(cur));
    if (rej) p.etapa = 'decisao';
    return { aviso, rej };
  }

  // avança sozinho pelas etapas que a FDS responde por completo; para na primeira que exige o analista
  function autoAvancar(p) {
    const avisos = [];
    let guard = 0;
    while (p.modoAuto && p.fds.analisada && guard++ < 20) {
      let cur = p.etapa;
      if (!visiveis(p).includes(cur)) { const v = visiveis(p); const nx = ORDER.slice(ORDER.indexOf(cur)).find((x) => v.includes(x) && !p.confirmadas[x]); if (!nx) break; p.etapa = cur = nx; }
      if (p.confirmadas[cur]) break;
      const pre = O.Auto.PREP[cur]; if (pre) pre(p);
      const okf = O.Auto.OK[cur];
      if (!okf || !okf(p) || STEPS[cur].validar(p).length) break;
      const r = confirmar(p, cur, true);
      if (r.aviso) avisos.push({ tipo: 'sim', aviso: r.aviso });
      if (r.rej) { avisos.push({ tipo: 'rej' }); break; }
    }
    return avisos;
  }

  function mostrarAvisos(avisos) {
    let seq = Promise.resolve();
    avisos.forEach((a) => {
      if (a.tipo === 'sim') seq = seq.then(() => U.modal('Via simplificada encerrada', h('div', {}, h('p', {}, 'Foi identificada divergência relevante em relação ao produto de referência. A análise completa passa a ser obrigatória.'), h('ul', {}, a.aviso.map((x) => h('li', {}, x)))), [['Entendi', true, '']]));
      else seq = seq.then(() => U.modal('Reprovação automática', h('p', {}, 'O produto atinge critério de rejeição. As etapas 8 a 12 foram dispensadas e a análise segue para a decisão e o relatório com a justificativa.'), [['Seguir para a decisão', true, '']]));
    });
    return seq;
  }

  function render(root, id) {
    const p = S.produto(id);
    if (!p) { root.appendChild(h('div', { class: 'empty' }, 'Produto não encontrado.')); return; }
    if (p.status === 'pendente' && p.pendencia) { p.status = 'em_analise'; }
    p.autoConf = p.autoConf || {}; p.auto = p.auto || {};
    if (p.modoAuto === undefined) p.modoAuto = true;
    const draw = () => {
      root.innerHTML = '';
      reavaliarRejeicao(p);
      let vis = visiveis(p);
      if (!vis.includes(p.etapa)) p.etapa = vis.find((x) => !p.confirmadas[x]) || vis[vis.length - 1];
      // etapas que a FDS responde são confirmadas aqui, antes de desenhar
      const avisos = autoAvancar(p);
      if (avisos.length) U.salvarJa(p);
      // sugestões de preenchimento nas etapas que ainda exigem o analista
      if (p.modoAuto && p.fds.analisada && !p.confirmadas[p.etapa] && O.Auto.PREP[p.etapa]) { O.Auto.PREP[p.etapa](p); U.salvar(p); }
      vis = visiveis(p);
      const cur = p.etapa;
      const done = vis.filter((x) => p.confirmadas[x]).length;
      const numero = (sid) => { const m = TITLES[sid][0].match(/^(\d+) /); return m ? m[1] : '•'; };
      const side = h('nav', { class: 'steps', 'aria-label': 'Etapas' }, h('div', { class: 'bar', title: done + ' de ' + vis.length }, h('div', { style: 'width:' + Math.round(done / vis.length * 100) + '%' })),
        ORDER.map((sid) => {
          const v = vis.includes(sid);
          const cls = !v ? 'skip' : sid === cur ? 'cur' : p.confirmadas[sid] ? 'done' : '';
          return h('button', { class: 'step ' + cls, disabled: !v || (!p.confirmadas[sid] && sid !== cur), 'aria-current': sid === cur ? 'step' : null, onclick: () => { if (v && (p.confirmadas[sid] || sid === cur)) { p.etapa = sid; draw(); } } },
            h('i', {}, p.confirmadas[sid] && v ? '✓' : numero(sid)), h('span', {}, TITLES[sid][0].replace(/^\d+ /, ''), !v ? h('small', {}, p.rejeicaoAuto && sid !== 'plano' ? 'Dispensada: reprovação automática' : 'Não se aplica') : (p.autoConf[sid] && p.confirmadas[sid] ? h('small', {}, 'Preenchida pela FDS') : null)));
        }));
      const def = STEPS[cur];
      const api = { rerender: () => { const sy = window.scrollY; draw(); window.scrollTo(0, sy); }, ir: (sid) => { p.etapa = sid; draw(); window.scrollTo(0, 0); } };
      const erros = h('div', { id: 'erros' });
      const autoIds = vis.filter((x) => p.autoConf[x] && p.confirmadas[x] && x !== cur);
      const banner = autoIds.length && cur !== 'decisao' ? U.alert('ok', autoIds.length + ' etapa(s) preenchida(s) pela análise da FDS', autoIds.map((x) => TITLES[x][0].replace(/^\d+ /, '') + ': ' + O.Auto.resumo(p, x)).filter(Boolean)) : null;
      const body = h('div', { class: 'card' }, h('div', { class: 'row' }, h('h2', {}, TITLES[cur][0]), h('span', { class: 'spacer' }), U.statusBadge(p.status)), banner, h('div', {}, def.render(p, api)), erros);
      const idx = vis.indexOf(cur);
      const nav = h('div', { class: 'row', style: 'margin-top:12px' },
        idx > 0 ? h('button', { class: 'btn ghost', onclick: () => { p.etapa = vis[idx - 1]; draw(); window.scrollTo(0, 0); } }, 'Voltar') : null, h('span', { class: 'spacer' }),
        cur === 'saida' ? h('a', { class: 'btn', href: '#/produto/' + p.id }, 'Concluir e abrir o registro') : h('button', { class: 'btn', onclick: () => {
          const errs = def.validar(p);
          if (errs.length) { erros.innerHTML = ''; erros.appendChild(U.alert('crit', 'Antes de avançar', errs)); erros.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
          const r = confirmar(p, cur, false);
          const todos = [];
          if (r.aviso) todos.push({ tipo: 'sim', aviso: r.aviso });
          if (r.rej) todos.push({ tipo: 'rej' });
          if (!r.rej) autoAvancar(p).forEach((a) => todos.push(a));
          U.salvarJa(p);
          mostrarAvisos(todos).then(() => { draw(); window.scrollTo(0, 0); });
        } }, cur === 'decisao' ? 'Confirmar decisão' : cur === 'fds0' && !p.fds.analisada ? 'Continuar sem FDS' : 'Confirmar e avançar'));
      root.appendChild(h('div', { class: 'top' }, h('div', {}, h('h1', {}, p.nome || 'Nova homologação'), h('p', {}, 'Assistente de homologação | a FDS responde o que consta nela, você informa o resto')), h('a', { class: 'btn ghost', href: '#/produto/' + p.id }, 'Sair e salvar')));
      root.appendChild(h('div', { class: 'wiz' }, side, h('div', {}, body, nav)));
      if (avisos.length) mostrarAvisos(avisos);
    };
    draw();
  }

  O.Wizard = { render, aplicarFds, fdsPanel, STEPS, visiveis };
})(window.O360 = window.O360 || {});
