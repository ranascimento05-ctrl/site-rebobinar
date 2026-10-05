/* Análise automática: preenche, a partir da FDS, as respostas que constam nela.
   Só ficam para o analista os dados que a FDS não traz (uso, local, PGR, pareceres, decisão)
   e as situações que exigem julgamento (conflito de segregação, FDS incompleta, produto equivalente). */
(function (O) {
  const E = O.Engine, S = O.Store;
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const nomesPorId = { ident: 'Identificação', finalidade: 'Finalidade', lista: 'Lista de homologados', sim: 'Similaridade', fds: 'Validação da FDS', fds2: 'Data e idioma da FDS', ghs: 'Classificação GHS', impactos: 'Impactos ocupacionais e ambientais', imdg: 'Classificação IMDG', compat: 'Compatibilidade e segregação', plano: 'Plano de ação' };

  function similar(p) {
    const n = norm(p.nome);
    return E.homologados(S.produtos()).find((x) => x.id !== p.id && norm(x.nome) === n) || null;
  }
  function candidato(p) {
    let best = null; let bestN = 0;
    E.homologados(S.produtos()).forEach((x) => {
      if (x.id === p.id || !x.imdg.classe || x.imdg.classe !== p.imdg.classe) return;
      const comum = (x.fds.cas || []).filter((c) => (p.fds.cas || []).includes(c)).length;
      if (comum > bestN) { best = x; bestN = comum; }
    });
    return best;
  }
  const mesmoConjunto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

  const secao = (p, n) => ((p.fds.secoes || {})[n] || '').trim();
  const primeiras = (t, n) => t.split('\n').map((x) => x.trim()).filter(Boolean).join('; ').slice(0, n);

  // preenchimento sugerido por etapa (só em etapa ainda não confirmada)
  const PREP = {
    finalidade(p) { if (!p.finalidade && ['Operação', 'Manutenção', 'Limpeza'].includes(p.ctx.area)) { p.finalidade = p.ctx.area; p.auto.finalidade = 'copiada do local de uso'; } },
    lista(p) { if (p.lista.naLista === null) { const m = similar(p); if (m) p.auto.listaSug = m.id; else { p.lista.naLista = false; p.auto.lista = 'nenhum produto homologado com este nome'; } } },
    sim(p) {
      if (p.sim.ativa !== null) return;
      const c = candidato(p);
      if (!c) { p.sim.ativa = false; p.auto.sim = 'nenhum homologado com mesma classe e componentes em comum'; return; }
      p.auto.simSug = c.id;
      p.sim.refId = p.sim.refId || c.id;
      p.sim.familia = c.imdg.classe === p.imdg.classe && mesmoConjunto(c.comp.grupos || [], p.comp.grupos || []);
      p.sim.componentes = mesmoConjunto(c.fds.cas || [], p.fds.cas || []);
      p.sim.forma = !!c.aplicacao && c.aplicacao === p.aplicacao;
    },
    fds(p) {
      if (!p.fds.analisada || p.fds.completa !== null) return;
      const ok = Object.keys(p.fds.secoesOk || {}).length === 16 && Object.values(p.fds.secoesOk).every(Boolean);
      if (ok) { p.fds.completa = true; p.auto.fds = '16 de 16 seções localizadas'; }
    },
    fds2(p) {
      if (!p.fds.analisada || p.fds.atualizada !== null) return;
      const idade = E.idadeFds(p); const lim = S.config().anosValidadeFDS;
      if (p.fds.portugues && idade != null && idade <= lim) { p.fds.atualizada = true; p.auto.fds2 = 'em português, revisão há ' + idade.toFixed(1).replace('.', ',') + ' anos'; }
    },
    ghs(p) {
      if (!p.fds.analisada || p.ghs.confirmado) return;
      const tri = E.triagem(p); const c = tri.criticos;
      p.ghs.cancerigeno = c.some((x) => x.tipo === 'cancerigeno'); p.ghs.mutagenico = c.some((x) => x.tipo === 'mutagenico');
      p.ghs.teratogenico = c.some((x) => x.tipo === 'teratogenico' || x.tipo === 'reprodutivo'); p.ghs.pfc = c.some((x) => x.tipo === 'pfc');
      p.ghs.nenhum = !c.length;
      p.auto.ghs = c.length ? c.length + ' evidência(s) de critério de rejeição' : 'sem cancerígeno, mutagênico, teratogênico ou PFC nas frases H, CAS e texto';
    },
    impactos(p) {
      if (!p.fds.analisada) return;
      const sg = E.sugestoes(p);
      const s8 = secao(p, 8);
      if (p.ocup.risco === null) {
        p.ocup.risco = sg.risco.ocup || /luva|respirador|[oó]culos|m[aá]scara|protetor facial/i.test(s8);
        if (p.ocup.risco) {
          p.ocup.subst = p.ocup.subst || sg.ocup.subst.join('\n');
          p.ocup.eng = p.ocup.eng || sg.ocup.eng.concat(/exaust|ventila/i.test(s8) ? ['Conforme Seção 8 da FDS: ' + primeiras(s8.split('\n').filter((l) => /exaust|ventila|engenharia/i.test(l)).join('\n'), 200)] : []).join('\n');
          p.ocup.adm = p.ocup.adm || sg.ocup.adm.join('\n');
          p.ocup.epi = p.ocup.epi || sg.ocup.epi.concat(s8 ? ['Conforme Seção 8 da FDS: ' + primeiras(s8.split('\n').filter((l) => /luva|respirat|[oó]culos|roupa|vestiment|cal[cç]ado|prote[cç][aã]o/i.test(l)).join('\n') || s8, 260)] : []).join('\n');
        }
        p.auto.impactosOcup = p.ocup.risco ? 'risco ocupacional com controles da FDS (Seção 8) e das frases H' : 'sem risco ocupacional significativo nas frases H e na Seção 8';
      }
      if (p.amb.risco === null) {
        p.amb.risco = sg.risco.amb;
        if (p.amb.risco) {
          p.amb.contencao = p.amb.contencao || sg.amb.contencao.join('\n');
          p.amb.derramamento = p.amb.derramamento || sg.amb.derramamento.concat(secao(p, 6) ? ['Conforme Seção 6 da FDS: ' + primeiras(secao(p, 6), 240)] : []).join('\n');
          p.amb.residuos = p.amb.residuos || sg.amb.residuos.concat(secao(p, 13) ? ['Conforme Seção 13 da FDS: ' + primeiras(secao(p, 13), 200)] : []).join('\n');
        }
        p.auto.impactosAmb = p.amb.risco ? 'perigo ambiental (H400 a H420 ou poluente marinho)' : 'sem perigo ambiental nas frases H';
      }
    },
    pgr(p) {
      if (!p.fds.analisada || p.hig.tlv !== null) return;
      const s8 = secao(p, 8);
      p.hig.tlv = /tlv|acgih|nr-?\s?15|limite de toler|twa|stel/i.test(s8);
      p.auto.pgr = p.hig.tlv ? 'Seção 8 cita limites de exposição' : 'Seção 8 não cita limites de exposição';
    },
    compat(p) {
      if (!p.fds.analisada) return;
      if (p.comp.incompDeclaradas === null) { p.comp.incompDeclaradas = (p.comp.incompativeis || []).length > 0; p.auto.compat = p.comp.incompDeclaradas ? 'incompatibilidades lidas nas Seções 7 e 10' : 'nenhuma incompatibilidade declarada nas Seções 7 e 10'; }
      if (!(p.comp.controles || []).length) { const sg = E.sugestoes(p).controlesArm; if (sg.length) p.comp.controles = sg; }
      const loc = S.local(p.ctx.localId);
      if (loc && !p.comp.localOk) {
        const cp = E.compatibilidade(p, loc, S.produtos());
        p.comp._motor = cp.status;
        if (cp.status !== 'conflito') { p.comp.localOk = 'sim'; p.auto.compatLocal = cp.itens ? 'sem conflito com os ' + cp.itens + ' itens do local' : 'local sem itens cadastrados: segregação não verificada'; }
      }
    },
    plano(p) { if (p.trein.gerar === null) { p.trein.gerar = true; p.auto.plano = 'checklist gerado por padrão'; } },
  };

  // condição extra para confirmar sem intervenção
  const OK = {
    ident: (p) => !!p.nome.trim(),
    finalidade: (p) => !!p.finalidade,
    lista: (p) => p.lista.naLista === false,
    sim: (p) => p.sim.ativa === false,
    fds: (p) => p.fds.completa === true,
    fds2: (p) => p.fds.atualizada === true,
    ghs: (p) => p.fds.analisada,
    impactos: (p) => p.fds.analisada && p.ocup.risco !== null && p.amb.risco !== null,
    imdg: (p) => p.fds.analisada && !['1', '6.2', '7'].includes(p.imdg.classe) && (p.imdg.naoRegulado || (p.imdg.onu && p.imdg.classe)),
    compat: (p) => p.fds.analisada && p.comp.localOk === 'sim' && p.comp._motor !== 'conflito',
    plano: () => true,
  };

  function resumo(p, id) {
    const a = p.auto || {};
    return { ident: p.nome, finalidade: p.finalidade + (a.finalidade ? ' (' + a.finalidade + ')' : ''), lista: 'Não consta na lista', sim: 'Análise completa', fds: a.fds || 'FDS completa', fds2: a.fds2 || 'FDS atualizada', ghs: a.ghs || '', impactos: 'Ocupacional: ' + (p.ocup.risco ? 'risco com controles' : 'sem risco significativo') + '. Ambiental: ' + (p.amb.risco ? 'perigo ambiental' : 'sem perigo ambiental'), imdg: p.imdg.naoRegulado ? 'Não regulado para transporte' : 'UN ' + p.imdg.onu + ' | classe ' + p.imdg.classe + (p.imdg.pg ? ' | GE ' + p.imdg.pg : ''), compat: (p.comp.incompDeclaradas ? 'Incompatibilidades: ' + (p.comp.incompativeis || []).length + '. ' : 'Sem incompatibilidades declaradas. ') + (a.compatLocal || ''), plano: 'Checklist de treinamento' }[id] || '';
  }

  // o que a FDS trouxe e o que falta informar
  function lido(p) {
    const L = [];
    if (!p.fds.analisada) return L;
    const okSec = Object.values(p.fds.secoesOk || {}).filter(Boolean).length;
    L.push('Seções da FDS localizadas: ' + okSec + ' de 16');
    if (p.nome) L.push('Produto: ' + p.nome); if (p.fornecedor) L.push('Fornecedor: ' + p.fornecedor);
    if (p.fds.dataRevisao) L.push('Revisão: ' + O.Docs.fmtData(p.fds.dataRevisao));
    if ((p.ghs.h || []).length) L.push('Frases H: ' + p.ghs.h.join(' ')); if ((p.ghs.p || []).length) L.push('Frases P: ' + p.ghs.p.length);
    if ((p.fds.cas || []).length) L.push('Componentes (CAS): ' + p.fds.cas.join(', '));
    if (p.imdg.onu) L.push('Transporte: UN ' + p.imdg.onu + ' | classe ' + p.imdg.classe + (p.imdg.pg ? ' | GE ' + p.imdg.pg : '') + (p.imdg.numeroRisco ? ' | risco ' + p.imdg.numeroRisco : ''));
    if (p.imdg.pontoFulgor !== '') L.push('Ponto de fulgor: ' + p.imdg.pontoFulgor + ' °C');
    if ((p.comp.incompativeis || []).length) L.push('Incompatibilidades: ' + p.comp.incompativeis.length + ' grupo(s)');
    const tri = E.triagem(p);
    L.push('Triagem CMR e PFC: ' + (tri.criticos.length ? tri.criticos.length + ' evidência(s) de rejeição' : 'nenhuma evidência'));
    return L;
  }
  function faltam(p) {
    const F = [];
    if (!p.fds.analisada) { F.push('Tudo: envie a FDS para a análise automática.'); return F; }
    if ((p.fds.secoesOk && Object.values(p.fds.secoesOk).some((v) => !v))) F.push('Seções ausentes na FDS: ' + Object.keys(p.fds.secoesOk).filter((k) => !p.fds.secoesOk[k]).join(', ') + ' (solicitar ao fornecedor)');
    if (!p.fds.dataRevisao) F.push('Data de revisão da FDS');
    if (!p.fds.portugues) F.push('Confirmar o idioma da FDS');
    if (!p.imdg.onu && !p.imdg.naoRegulado) F.push('Classificação de transporte (Seção 14 sem ONU legível)');
    if (!(p.ghs.h || []).length) F.push('Frases H (Seção 2 sem frases legíveis)');
    F.push('Onde será usado e onde será armazenado (não consta na FDS)');
    F.push('Cobertura do PGR e avaliação quantitativa (etapas 9.2 e 9.3)');
    F.push('Parecer de Higiene Ocupacional, se houver (etapa 12)');
    F.push('Decisão final do responsável técnico');
    return F;
  }

  O.Auto = { PREP, OK, resumo, lido, faltam, similar, candidato, nomesPorId };
})(window.O360 = window.O360 || {});
