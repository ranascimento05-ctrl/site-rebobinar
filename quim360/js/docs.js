/* Construtores de documentos: cada função devolve uma lista de blocos neutros,
   renderizados depois em HTML (pré-visualização e PDF por impressão) e em Word (.docx). */
(function (O) {
  const T = O.TRANSPORT, G = O.GHS, E = O.Engine;

  const STATUS = {
    em_analise: ['Em análise', 'info'],
    pendente: ['Pendente', 'warn'],
    condicionado: ['Homologado com condicionantes', 'warn'],
    homologado: ['Homologado', 'ok'],
    reprovado: ['Reprovado', 'crit'],
    na_lista: ['Já homologado: encaminhar para aprovação de compra', 'ok'],
  };
  const fmtData = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return iso; return d.toLocaleDateString('pt-BR'); };
  const nz = (v, alt) => (v === undefined || v === null || v === '' ? (alt || '—') : v);
  const sn = (v) => (v === true ? 'Sim' : v === false ? 'Não' : '—');
  const corta = (t, n) => { t = (t || '').replace(/\s+\n/g, '\n').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + ' [continua na FDS]' : t; };
  const localDe = (p) => O.Store.local(p.ctx.localId);
  const cfg = () => O.Store.config();
  // quem assina: o assinante definido na análise, ou o padrão da equipe (Configurações)
  const signer = (p) => { const a = (p && p.assina) || {}; const c = cfg(); const nome = (a.nome || '').trim() || c.responsavel || ''; const reg = (a.nome || '').trim() ? (a.registro || '') : (a.registro || c.registro || ''); return { nome, registro: reg, funcao: (a.funcao || '').trim() || 'Responsável técnico', linha: nome ? nome + (reg ? ' | ' + reg : '') : '' }; };
  const nomeG = (k) => (T.RG.find((r) => r[0] === k) || [k, k])[1];
  const ctrlNome = (k) => (T.CONTROLES_ARM.find((c) => c[0] === k) || [k, k])[1];

  function capa(titulo, sub, p, extra) {
    const c = cfg();
    return {
      t: 'cover', titulo, sub,
      meta: [
        [p.rotulo || 'Produto', nz(p.nome)],
      ].concat(p.pseudo ? [] : [['Registro', nz(p.dec.numero, 'sem número de homologação')]]).concat([
        ['Data', fmtData(new Date().toISOString())],
        [signer(p).funcao, signer(p).linha || 'não informado'],
      ].concat(extra || [])),
      org: c.organizacao,
    };
  }

  function linkRegistro(p) {
    if (p.dec.sharepoint) return p.dec.sharepoint;
    return location.href.split('#')[0] + '#/produto/' + p.id;
  }


  // blocos "Alternativas e orientações de substituição" (relatório e relatório da análise)
  function blocosAlternativas(p) {
    const a = E.alternativas(p); if (!a.aplica) return [];
    const B = [{ t: 'h2', text: 'Alternativas e orientações de substituição' }];
    B.push({ t: 'p', small: true, text: 'Pontos de partida para buscar alternativa ao produto ou à composição que acionou o gatilho. Não são especificação: todo substituto precisa de FDS própria, teste de desempenho e nova triagem. A decisão é do responsável técnico.' + (a.carga ? ' Para a carga do terminal a substituição não se aplica; o foco é reduzir a exposição.' : '') });
    const rows = a.itens.map((i) => [i.nome + ' (CAS ' + i.cas + ')', i.sug.join('\n') + (i.nota ? '\nObservação: ' + i.nota : '')]).concat(a.porTipo.map((t) => [t.rotulo + ' (por tipo de perigo)', t.sug.join('\n')]));
    if (rows.length) B.push({ t: 'table', head: ['Componente ou perigo', 'Orientações'], widths: [30, 70], rows });
    B.push({ t: 'p', bold: true, text: 'Como conduzir a substituição' });
    B.push({ t: 'list', ordered: true, items: a.gerais });
    B.push({ t: 'kv', rows: [['Alternativas avaliadas e resultado', nz(a.avaliadas, 'Não registrado')]] });
    return B;
  }

  // ---------------------------------------------------------------- Relatório
  function relatorio(p, produtos) {
    const av = E.avaliar(p, produtos);
    const st = STATUS[p.status] || STATUS.em_analise;
    const loc = localDe(p);
    const ref = p.sim.refId ? O.Store.produto(p.sim.refId) : null;
    const simp = E.simplificadaVigente(p);
    const B = [];
    B.push(capa('Relatório de homologação de produto químico', 'QUIM 360 | Relatório de Homologação | ' + fmtData(new Date().toISOString()) + ' | ' + nz(p.nome), p));
    B.push({ t: 'callout', tone: st[1], title: 'Decisão: ' + st[0], text: p.dec.justificativa || (av.reprovacoes[0] || av.pendencias[0] || av.condicionantes[0]) || 'Sem pendências registradas.' });
    if (p.status === 'reprovado' || av.reprovacoes.length) B.push({ t: 'list', items: av.reprovacoes });
    if (['homologado', 'condicionado'].includes(p.status) && (p.dec.sobrepoe || []).length) { B.push({ t: 'callout', tone: 'warn', title: 'Gatilhos e pendências assumidos pelo responsável técnico na decisão', text: 'O app sinalizou os pontos abaixo, que normalmente impediriam a homologação. O produto foi liberado com condicionantes, conforme a justificativa técnica registrada.' }); B.push({ t: 'list', items: p.dec.sobrepoe }); }
    if (p.status === 'pendente') B.push({ t: 'list', items: av.pendencias });
    if (p.status === 'condicionado') B.push({ t: 'p', text: 'Condicionantes antes da liberação de uso:', bold: true }, { t: 'list', items: av.condicionantes });
    if (av.alertas.length) B.push({ t: 'callout', tone: 'warn', title: 'Alertas', text: av.alertas.join(' ') });

    B.push({ t: 'h1', text: '1 Identificação e contexto' });
    B.push({ t: 'kv', rows: [
      ['Produto', nz(p.nome)], ['Fornecedor / fabricante', nz(p.fornecedor)], ['Código do fornecedor', nz(p.codigoFornecedor)],
      ['Onde será utilizado', nz([p.ctx.area, p.ctx.atividade].filter(Boolean).join(' | '))],
      ['Finalidade', nz(p.finalidade)], ['Aplicação / forma de uso', nz(p.aplicacao)],
      ['Local de armazenamento', loc ? loc.nome + ' (' + loc.tipo + ')' : '—'],
      ['Natureza do produto', p.natureza === 'carga' ? 'Produto armazenado ou movimentado pelo terminal (carga)' : 'Insumo de operação, manutenção, limpeza ou conservação'],
      ['Forma de armazenamento', p.armazenamento === 'granel' ? 'A granel, em tanque (NBR 17505 e NR-20)' : 'Embalado ou fracionado (NBR 17160)'],
      ['Lista de homologados', p.lista.naLista === true ? 'Já consta: ' + nz(p.lista.numero) : p.lista.naLista === false ? 'Não consta' : '—'],
    ] });

    B.push({ t: 'h1', text: '2 Via de análise' });
    if (simp && ref) {
      B.push({ t: 'callout', tone: 'info', title: 'Via simplificada por similaridade (read-across)', text: 'Produto de referência: ' + ref.nome + ' | ' + nz(ref.dec.numero) + ' | homologado em ' + fmtData(ref.dec.data) + '. O produto recebe registro próprio e não herda o registro da referência.' });
      B.push({ t: 'table', head: ['Item', 'Tratamento nesta via'], widths: [34, 66], rows: [
        ['Etapas 5 e 6: validação da FDS', 'Feita no próprio produto'],
        ['Etapa 7: triagem GHS (cancerígeno, teratogênico, mutagênico, PFC)', 'Feita no próprio produto'],
        ['Etapa 8, 8a e 8b: avaliação ocupacional e ambiental', 'Aproveitada da referência (mesma finalidade e mesmo local)'],
        ['Etapa 9: Higiene Ocupacional e PGR', p.sim.parecerCitaFamilia ? 'Aproveitada da referência (parecer menciona a família química)' : 'Avaliada no próprio produto'],
        ['Etapa 10: classificação IMDG', 'Feita no próprio produto'],
        ['Etapa 11: compatibilidade e segregação', 'Feita para o local real de armazenamento do produto'],
        ['Etapas 12 a 15: pareceres, decisão, relatório, cadastro e treinamento', 'Registro próprio'],
      ] });
      B.push({ t: 'p', text: 'Critérios de equivalência atendidos: mesma família química, mesma forma de aplicação e mesmos componentes perigosos declarados na Seção 3 da FDS.' });
    } else if (p.sim.encerrada) {
      B.push({ t: 'callout', tone: 'warn', title: 'Via simplificada encerrada', text: nz(p.sim.divergencia, 'Divergência relevante identificada em relação ao produto de referência.') + ' A análise completa passou a ser obrigatória.' });
    } else B.push({ t: 'p', text: 'Análise completa.' });

    B.push({ t: 'h1', text: '3 Validação da FDS (ABNT NBR 14725:2023)' });
    const faltam = Object.keys(p.fds.secoesOk || {}).filter((k) => p.fds.secoesOk[k] === false);
    B.push({ t: 'kv', rows: [
      ['16 seções completas', sn(p.fds.completa)], ['Atualizada e em português', sn(p.fds.atualizada)],
      ['Data da revisão', fmtData(p.fds.dataRevisao)], ['Versão', nz(p.fds.versao)],
      ['Seções ausentes', faltam.length ? faltam.join(', ') : 'Nenhuma'],
      ...(p.fds.completa === false && p.fds.seguirIncompleta ? [['Seguiu com a FDS incompleta', 'Sim, por decisão do responsável técnico: ' + nz(p.fds.justIncompleta, 'sem justificativa')]] : []),
      ...((p.fds.secoesColadas || []).length ? [['Seções incluídas à mão', (p.fds.secoesColadas || []).join(', ') + ' (texto colado pelo analista porque o leitor de PDF não as encontrou)']] : []),
      ...(p.fds.manual ? [['Origem dos dados', 'Informados manualmente (sem leitura do texto da FDS)']] : []),
    ] });
    { const cor = p.fds.corrigidos || {}; const ks = Object.keys(cor);
      if (ks.length) { B.push({ t: 'p', bold: true, text: 'Dados corrigidos manualmente após a leitura da FDS' }); B.push({ t: 'table', head: ['Campo', 'Valor lido', 'Valor corrigido', 'Data'], widths: [30, 28, 28, 14], rows: ks.map((k) => [cor[k].rotulo, cor[k].lido || 'vazio', cor[k].atual || 'vazio', fmtData(cor[k].em)]) }); } }

    B.push({ t: 'h1', text: '4 Triagem GHS: perigos CMR e PFC (gatilho de reprovação automática)' });
    const tri = av.tri;
    B.push({ t: 'table', head: ['Critério', 'Resultado'], widths: [34, 66], rows: [
      ['Cancerígeno', tri.criticos.some((c) => c.tipo === 'cancerigeno') ? 'Identificado' : 'Não identificado'],
      ['Mutagênico', tri.criticos.some((c) => c.tipo === 'mutagenico') ? 'Identificado' : 'Não identificado'],
      ['Teratogênico / tóxico à reprodução', tri.criticos.some((c) => c.tipo === 'teratogenico' || c.tipo === 'reprodutivo') ? 'Identificado' : 'Não identificado'],
      ['Contém PFCs / PFAS', tri.criticos.some((c) => c.tipo === 'pfc') ? 'Identificado' : 'Não identificado'],
    ] });
    if (tri.criticos.length) B.push({ t: 'list', items: tri.criticos.map((c) => c.detalhe + ' [' + c.fonte + ']') });
    if (E.cmrCarga(p)) {
      const cm = p.cmr || {};
      B.push({ t: 'callout', tone: 'warn', title: 'Gatilho de reprovação automática acionado: decisão do responsável técnico', text: 'O critério interno de CMR e PFC é sinalizado, mas não bloqueia a homologação. A decisão cabe ao responsável técnico, com justificativa, controles de exposição (PGR, PCMSO, plano de emergência) e parecer de Higiene Ocupacional.' });
      B.push({ t: 'kv', rows: [
        ['Justificativa de não substituição', nz(cm.justificativa)],
        ['Controles de exposição', (cm.controles || []).length ? cm.controles.map((k) => ((O.CMR_CONTROLES || []).find((x) => x[0] === k) || [k, k])[1]).join('\n') : '—'],
        ['Controles implantados e verificados', sn(!!cm.controlesOk)],
      ] });
    }
    blocosAlternativas(p).forEach((b) => B.push(b));
    B.push({ t: 'kv', rows: [
      ['Palavra de advertência', nz(p.ghs.palavra)],
      ['Frases H', (p.ghs.h || []).length ? p.ghs.h.map((h) => h + ' ' + (G.hText(h) || '')).join('; ') : '—'],
      ['Pictogramas', (p.ghs.pictos || []).length ? p.ghs.pictos.map((c) => c + ' ' + G.PICTO[c]).join('; ') : '—'],
      ['Componentes (CAS)', (p.fds.cas || []).join(', ') || '—'],
    ] });

    B.push({ t: 'h1', text: '5 Impactos ocupacionais e ambientais (avaliações independentes)' });
    const her = simp && p.sim.herda8 ? ' (referência cruzada: ' + nz(ref && ref.dec.numero) + ')' : '';
    B.push({ t: 'h2', text: '5.1 Dimensão ocupacional' + her });
    B.push({ t: 'p', text: 'Riscos ocupacionais significativos: ' + sn(p.ocup.risco) });
    if (p.ocup.risco) B.push({ t: 'table', head: ['Hierarquia de controle', 'Medida'], widths: [30, 70], rows: [['1 Substituição', nz(p.ocup.subst)], ['2 Controles de engenharia', nz(p.ocup.eng)], ['3 Controles administrativos', nz(p.ocup.adm)], ['4 EPI', nz(p.ocup.epi)]] });
    B.push({ t: 'h2', text: '5.2 Dimensão ambiental' + her });
    B.push({ t: 'p', text: 'Perigo ao meio ambiente (toxicidade aquática, bioacumulação, persistência): ' + sn(p.amb.risco) });
    if (p.amb.risco) B.push({ t: 'table', head: ['Controle', 'Medida'], widths: [30, 70], rows: [['Contenção', nz(p.amb.contencao)], ['Destinação de resíduos', nz(p.amb.residuos)], ['Resposta a derramamento', nz(p.amb.derramamento)]] });

    B.push({ t: 'h1', text: '6 Interface com o PGR e Higiene Ocupacional (NR-01 e NR-15)' });
    B.push({ t: 'kv', rows: [
      ['Agente com limite NR-15 ou TLV (ACGIH)', sn(p.hig.tlv) + (p.hig.tlvAgentes ? ': ' + p.hig.tlvAgentes : '')],
      ['Parecer formal de Higiene Ocupacional', p.hig.tlv ? (p.hig.parecerExigidoOk ? 'Exigido e anexado' : 'Exigido e pendente') : 'Não exigido (ausência registrada)'],
      ['Situação no PGR / Inventário de Riscos', p.hig.pgr === 'requer' ? 'Exige atualização' : p.hig.pgr === 'coberto' ? 'Coberto por avaliações existentes' : p.hig.pgr === 'indefinido' ? 'Indefinido: FDS encaminhada ao elaborador' : '—'],
      ['Avaliação quantitativa antes da liberação', sn(p.hig.dosimetria)], ['Justificativa', nz(p.hig.justificativa)],
    ] });

    B.push({ t: 'h1', text: '7 Classificação de transporte (ANTT 5.998/2022 e IMDG)' });
    const n20 = E.nr20(p);
    B.push({ t: 'kv', rows: [
      ['Número ONU', nz(p.imdg.onu)], ['Nome apropriado para embarque', nz(p.imdg.nome)],
      ['Classe / subclasse de risco', nz(p.imdg.classe) + (p.imdg.classe ? ' ' + T.classeNome(p.imdg.classe) : '')],
      ['Risco subsidiário', nz(p.imdg.subrisco)], ['Grupo de embalagem', nz(p.imdg.pg)], ['Número de risco', nz(p.imdg.numeroRisco)],
      ['EmS', nz(p.imdg.ems)], ['Poluente marinho', sn(p.imdg.poluente)], ['Ponto de fulgor', p.imdg.pontoFulgor === '' ? '—' : p.imdg.pontoFulgor + ' °C'],
      ['Compatível com as operações', p.imdg.incompativelOperacao ? 'Não' : 'Sim'],
    ] });
    if (n20.aplica) B.push({ t: 'callout', tone: 'warn', title: 'NR-20: ' + n20.categoria, text: n20.texto });

    B.push({ t: 'h1', text: '8 Compatibilidade química e segregação no armazenamento' });
    B.push({ t: 'kv', rows: [
      ['Classe de armazenamento (NBR 17160)', p.armazenamento === 'granel' ? 'Não se aplica: tanque está fora do escopo da NBR 17160 (aplicam-se NBR 17505 e NR-20)' : E.classeArm(p).id + ' | ' + O.NBR17160.nome(E.classeArm(p).id) + ' | ' + E.classeArm(p).motivo],
      ...(p.armazenamento === 'granel' ? [['Requisitos do tanque atendidos', (p.comp.granel || []).length ? p.comp.granel.map((k) => ({ dique: 'Bacia ou dique de contenção (NBR 17505)', nr20: 'Classificação da instalação e prontuário (NR-20)', aterramento: 'Aterramento e proteção contra descargas', incendio: 'Proteção e combate a incêndio', vapores: 'Controle de emissões e vapores', drenagem: 'Drenagem e contenção de águas de combate' }[k] || k)).join('\n') : '—']] : []),
      ['Incompatibilidades declaradas (Seções 7 e 10)', p.comp.incompDeclaradas === true ? (p.comp.incompativeis || []).map(nomeG).join(', ') + (p.comp.incompTexto ? '. ' + p.comp.incompTexto : '') : p.comp.incompDeclaradas === false ? 'Nenhuma declarada' : '—'],
      ['Local avaliado', loc ? loc.nome + ' (' + loc.tipo + ')' : '—'],
      ['Resultado para o local', p.comp.localOk === 'sim' ? 'Compatível' : p.comp.localOk === 'conflito' ? 'Conflito de segregação' : p.comp.localOk === 'insuficiente' ? 'Informação insuficiente na FDS' : '—'],
      ['Solução para o conflito', p.comp.localOk === 'conflito' ? ({ alternativo: 'Local alternativo / segregação física', condicionar: 'Homologação condicionada', reprovar: 'Sem solução viável' }[p.comp.solucao] || '—') : '—'],
      ['Controles adicionais', (p.comp.controles || []).length ? p.comp.controles.map(ctrlNome).join('; ') : '—'],
      ['Estoque máximo', nz(p.comp.limite)], ['Temperatura máxima', nz(p.comp.tempMax)],
    ] });
    if (p.armazenamento === 'granel') {
      const c17 = E.classe17505(p); const ex = E.exigenciasTanque(p);
      B.push({ t: 'h2', text: 'Exigências do produto para o tanque que o receber' });
      B.push({ t: 'p', small: true, text: 'Os tanques do terminal são multiuso: não há vínculo do produto com um tanque específico. Classe do líquido pela NBR 17505-1: ' + (c17.id || 'não definida') + '. ' + c17.texto + ' As respostas abaixo são da engenharia e da operação; o aplicativo não faz cálculo de projeto.' });
      B.push({ t: 'table', head: ['Exigência', 'A frota atual atende?'], widths: [60, 40], rows: ex.map((x) => [x.rot, (E.ATENDE.find((a) => a[0] === x.atende) || [0, 'Não respondido'])[1]]) });
      if (E.tanqueDe(p).obs) B.push({ t: 'kv', rows: [['Observações', E.tanqueDe(p).obs]] });
    }
    if (loc) {
      const cp = E.compatibilidade(p, loc, produtos);
      if (cp.pares.length || cp.grupos.length) {
        const rows = cp.pares.map((x) => [x.com, x.par.join(' / '), (x.codigo === 'R' ? 'Proibido' : x.codigo === 'G' ? 'Permitido' : x.codigo ? 'Restrição ' + x.codigo : '—') + '. ' + x.texto, cp.grupos.filter((g) => g.com === x.com).map((g) => g.a + ' x ' + g.b + ': ' + g.efeito).join('; ') || '—']);
        B.push({ t: 'table', head: ['Item no local', 'Classes', 'Segregação (NBR 17160)', 'Reatividade (FDS)'], widths: [24, 12, 28, 36], rows });
      }
    }

    cenariosDoProduto(p, produtos).forEach((b) => B.push(b));
    B.push({ t: 'h1', text: '9 Pareceres externos e gatilho do PGR' });
    B.push({ t: 'kv', rows: [
      ['Parecer arquivado', sn(p.par.tem)], ['Descrição / referência', nz(p.par.descricao)],
      ['Indicador de PGR', p.par.pgrIndicador === 'requer' ? 'PGR: requer atualização' + (p.par.pgrPrazo ? ' | prazo ' + p.par.pgrPrazo : '') + (p.par.pgrResponsavel ? ' | responsável ' + p.par.pgrResponsavel : '') : p.par.pgrIndicador === 'nao_requer' ? 'PGR: não requer atualização' + (p.par.tem ? ' (parecer anexo)' : ' (sem parecer; justificativa do responsável técnico: ' + nz(p.par.pgrJustificativa, 'não registrada') + ')') : '—'],
    ] });

    {
      const mu = E.mudancaDe(p); const trocado = mu.substituiId ? O.Store.produto(mu.substituiId) : null;
      B.push({ t: 'h2', text: 'Gestão de mudança (MOC)' });
      B.push({ t: 'kv', rows: [
        ['Substitui outro produto', trocado ? trocado.nome + (trocado.fornecedor ? ' (' + trocado.fornecedor + ')' : '') : 'Não'],
        ...(trocado ? [['Motivo da troca', nz(mu.motivo)]] : []),
        ['MOC necessário', mu.exige === true ? 'Sim' : mu.exige === false ? 'Não' : 'Não avaliado'],
        ...(mu.exige === true ? [['Situação', (E.MOC_SIT.find((x) => x[0] === mu.situacao) || [0, 'não informada'])[1]], ['Referência (sistema externo)', nz(mu.ref)], ['Responsável', nz(mu.resp)], ['Data de conclusão', mu.data ? fmtData(mu.data) : '—']] : []),
        ...(mu.exige === false || mu.situacao === 'dispensado' ? [['Justificativa', nz(mu.just)]] : []),
      ] });
      B.push({ t: 'p', small: true, text: 'O MOC é conduzido em sistema próprio da organização: este registro só informa se é necessário e se foi concluído.' });
    }
    B.push({ t: 'h1', text: '10 Decisão e rastreabilidade' });
    B.push({ t: 'kv', rows: [
      ['Decisão', st[0]], ['Número do registro', nz(p.dec.numero)], ['Data da decisão', fmtData(p.dec.data)],
      ['Justificativa técnica / legal', nz(p.dec.justificativa)], ['Checklist de treinamento', p.trein.gerar === true ? 'Gerado' : p.trein.gerar === false ? 'Não solicitado' : '—'],
    ] });
    if (['homologado', 'condicionado'].includes(p.status)) B.push({ t: 'qr', text: linkRegistro(p), cap: 'Cadastro próprio na lista de homologados' + (p.dec.sharepoint ? ' (SharePoint)' : '') });
    B.push({ t: 'h2', text: 'Base técnico-legal consultada' });
    B.push({ t: 'list', items: T.BASE_LEGAL.map((b) => b.sigla + ': ' + b.titulo) });
    B.push({ t: 'p', small: true, text: 'A classe e a matriz de armazenamento seguem a ABNT NBR 17160:2024. A triagem CMR e PFC e as sugestões de controle são apoio à decisão. A decisão formal depende da FDS vigente do fornecedor, do Código IMDG e da avaliação do responsável técnico.' });
    B.push({ t: 'sign', rows: [[signer(p).nome, signer(p).registro ? signer(p).funcao + ' | ' + signer(p).registro : signer(p).funcao]] });
    return B;
  }

  // ---------------------------------------------------------------- Ficha de emergência
  function isolamento(classe) {
    return { '2.1': 100, '2.2': 50, '2.3': 100, '3': 50, '4.1': 50, '4.2': 50, '4.3': 50, '5.1': 50, '5.2': 50, '6.1': 100, '8': 50, '9': 25 }[classe] || 50;
  }
  function trecho(sec, chaves, max, fallback) {
    // extrai as linhas da seção que contêm uma das palavras-chave; sem correspondência, devolve o início da seção (salvo fallback === false)
    const linhas = (sec || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const achadas = linhas.filter((l) => chaves.some((k) => l.toLowerCase().includes(k)));
    if (!achadas.length && fallback === false) return '';
    return corta((achadas.length ? achadas : linhas).join('\n'), max || 500);
  }
  function telefones(p) {
    const c = cfg();
    return [['Corpo de Bombeiros', '193'], ['Defesa Civil', '199'], ['Polícia Rodoviária Federal', '191'], ['Pró-Química (ABIQUIM, 24 h)', '0800 11 8270'], ['Fabricante / fornecedor', p.emerg.telefoneFornecedor || '—'], ['Empresa / expedidor', c.telEmergencia || '—']];
  }

  // Ficha de emergência: sequência de campos da ABNT NBR 7503 (identificação, riscos, EPI, ações em caso de acidente, telefones)
  function prelim(p) {
    return ['homologado', 'condicionado'].includes(p.status) ? [] : [{ t: 'callout', tone: 'warn', title: 'Versão preliminar', text: 'Gerada a partir da leitura da FDS, antes da decisão de homologação. Confira os dados e use somente após a homologação.' }];
  }
  function fichaEmergencia(p) {
    const s = p.fds.secoes || {};
    const B = [];
    B.push(capa('Ficha de emergência', 'QUIM 360 | Ficha de Emergência | ' + nz(p.nome), p, [['Estrutura', 'ABNT NBR 7503, Resolução ANTT 5.998/2022 e Manual ABIQUIM']]));
    B.push(...prelim(p));
    B.push({ t: 'imgs', items: [{ svg: O.Pic.painel(p.imdg.numeroRisco, p.imdg.onu, 240), w: 240, h: 120, cap: 'Número de risco e número ONU' }].concat(E.classesDoProduto(p).map((cl, i) => ({ svg: O.Pic.transporte(cl, 110), w: 110, h: 110, cap: (i === 0 ? 'Risco principal ' : 'Risco subsidiário ') + cl }))) });
    B.push({ t: 'table', head: ['Nome apropriado para embarque', 'Classe ou subclasse', 'Grupo de embalagem'], widths: [58, 24, 18], rows: [[nz(p.imdg.nome || p.nome), nz(p.imdg.classe) + (p.imdg.subrisco ? ' (subsidiário ' + p.imdg.subrisco + ')' : ''), nz(p.imdg.pg)]] });
    B.push({ t: 'table', head: ['Aspecto', 'Descrição'], widths: [18, 82], rows: [['Estado físico, cor e odor', trecho(s[9], ['estado físico', 'aspecto', 'odor'], 220, false) || corta(s[9], 220) || '—'], ['Ponto de fulgor e densidade', [p.imdg.pontoFulgor !== '' ? 'Ponto de fulgor: ' + p.imdg.pontoFulgor + ' °C' : '', trecho(s[9], ['densidade'], 100, false)].filter(Boolean).join('. ') || '—']] });
    B.push({ t: 'h1', text: 'Riscos' });
    B.push({ t: 'table', head: ['Fogo e explosão', 'Saúde', 'Meio ambiente'], widths: [34, 33, 33], rows: [[
      trecho(s[5], ['perigo', 'explos', 'inflam', 'vapor', 'combust'], 420),
      ((p.ghs.h || []).length ? p.ghs.h.map((h) => h + ' ' + (G.hText(h) || '')).join('. ') : trecho(s[11], [], 300)),
      nz(p.amb.derramamento ? p.amb.derramamento : trecho(s[12], [], 300)),
    ]] });
    B.push({ t: 'h1', text: 'Equipamento de proteção individual para emergência' });
    B.push({ t: 'p', text: trecho(s[8], ['respirat', 'luva', 'olho', 'óculos', 'roupa', 'vestimenta', 'calçado', 'epi', 'proteção'], 500) || '—' });
    B.push({ t: 'h1', text: 'Em caso de acidente' });
    B.push({ t: 'p', bold: true, text: 'Isolamento inicial: no mínimo ' + isolamento(p.imdg.classe) + ' m em todas as direções (valor genérico por classe: confirme pelo número ONU no Manual ABIQUIM).' });
    B.push({ t: 'table', head: ['Vazamento ou derramamento', 'Fogo', 'Poluição'], widths: [34, 33, 33], rows: [[
      trecho(s[6], ['elimin', 'conter', 'absor', 'isol', 'ferrament', 'recolh'], 520),
      trecho(s[5], ['extin', 'espuma', 'pó', 'co2', 'água', 'bombeiro', 'combat'], 460),
      trecho(s[6], ['pluvial', 'corpo', 'esgoto', 'solo', 'ambient'], 300, false) || trecho(s[12], [], 260) || '—',
    ]] });
    B.push({ t: 'table', head: ['Primeiros socorros', 'Notas para o médico'], widths: [60, 40], rows: [[corta(s[4], 700) || '—', trecho(s[4], ['médico', 'sintoma', 'tratamento'], 300) || ((p.ghs.h || []).slice(0, 4).join(', ') || '—')]] });
    B.push({ t: 'h1', text: 'Telefones de emergência' });
    B.push({ t: 'table', head: ['Órgão', 'Telefone'], widths: [60, 40], rows: telefones(p) });
    B.push({ t: 'kv', rows: [['Observações', p.emerg.observacoes || ''], ['Descarte (Seção 13)', corta(s[13], 240) || '—'], ['Data de emissão', fmtData(new Date().toISOString())]] });
    B.push({ t: 'p', small: true, text: 'Conteúdo extraído da FDS do fornecedor. Em caso de divergência, vale a FDS vigente e o Manual para Atendimento de Emergências com Produtos Perigosos da ABIQUIM.' });
    return B;
  }

  // ---------------------------------------------------------------- Rotulagem
  function agrupaP(p) {
    const lista = (p.ghs.pComb && p.ghs.pComb.length) ? p.ghs.pComb : (p.ghs.p || []);
    const grp = { Prevenção: [], Resposta: [], Armazenamento: [], Disposição: [], Geral: [] };
    lista.forEach((comb) => {
      const first = comb.split('+')[0];
      const txt = comb.split('+').map((c) => G.pText(c) || c).join(' ');
      const k = /^P1/.test(first) ? 'Geral' : /^P2/.test(first) ? 'Prevenção' : /^P3/.test(first) ? 'Resposta' : /^P4/.test(first) ? 'Armazenamento' : 'Disposição';
      grp[k].push(comb + ' ' + txt);
    });
    return grp;
  }

  function rotulagem(p) {
    const c = cfg();
    const h = p.ghs.h || [];
    const pictos = (p.ghs.pictos && p.ghs.pictos.length) ? p.ghs.pictos : G.derive(h).pictos;
    const palavra = p.ghs.palavra || G.derive(h).palavra;
    const grp = agrupaP(p);
    const B = [];
    B.push(capa('Rotulagem', 'QUIM 360 | Rótulo GHS e rótulo de risco | ' + nz(p.nome), p, [['Base', 'ABNT NBR 14725-3, GHS, NR-26 e NBR 7500']]));
    B.push(...prelim(p));
    B.push({ t: 'h1', text: '1 Rótulo de recipiente (GHS)' });
    const inner = [];
    inner.push({ t: 'h2', text: nz(p.nome) });
    if (p.fds.composicao) inner.push({ t: 'p', small: true, text: 'Componentes perigosos: ' + p.fds.composicao });
    if (pictos.length) inner.push({ t: 'imgs', items: pictos.map((x) => ({ svg: O.Pic.ghs(x, 84), w: 84, h: 84, cap: '' })) });
    else inner.push({ t: 'p', small: true, text: 'Sem pictograma de perigo.' });
    inner.push({ t: 'p', bold: true, text: palavra || 'Sem palavra de advertência' });
    inner.push({ t: 'list', items: h.map((x) => x + ' ' + (G.hText(x) || '')) });
    Object.keys(grp).forEach((k) => { if (grp[k].length) { inner.push({ t: 'p', bold: true, small: true, text: 'Precaução: ' + k }); inner.push({ t: 'p', small: true, text: grp[k].join(' ') }); } });
    inner.push({ t: 'p', small: true, text: 'Fornecedor: ' + nz(p.fornecedor) + (p.emerg.telefoneFornecedor ? ' | Emergência: ' + p.emerg.telefoneFornecedor : '') });
    inner.push({ t: 'p', small: true, text: 'Consulte a FDS antes do uso.' });
    B.push({ t: 'box', border: '#dc2626', children: inner });
    if (!(p.ghs.pComb || []).length && !(p.ghs.p || []).length) B.push({ t: 'callout', tone: 'warn', title: 'Frases de precaução ausentes', text: 'Informe as frases P da Seção 2 da FDS para completar o rótulo.' });

    B.push({ t: 'h1', text: '2 Etiqueta de uso e de recipiente fracionado (NR-26)' });
    const mini = [{ t: 'h2', text: nz(p.nome) }];
    if (pictos.length) mini.push({ t: 'imgs', items: pictos.map((x) => ({ svg: O.Pic.ghs(x, 56), w: 56, h: 56, cap: '' })) });
    mini.push({ t: 'p', bold: true, text: palavra || '' });
    mini.push({ t: 'p', small: true, text: h.slice(0, 5).map((x) => x + ' ' + (G.hText(x) || '')).join('; ') });
    mini.push({ t: 'p', small: true, text: 'Local de uso: ' + nz(p.ctx.area) + ' | Armazenamento: ' + nz((localDe(p) || {}).nome) });
    mini.push({ t: 'p', small: true, text: 'Data de fracionamento: ____/____/______   Responsável: ______________________' });
    B.push({ t: 'box', border: '#dc2626', children: mini });

    B.push({ t: 'h1', text: '3 Rótulos de risco para transporte (NBR 7500 e IMDG)' });
    const cl = E.classesDoProduto(p);
    if (cl.length) {
      B.push({ t: 'imgs', items: cl.map((x, i) => ({ svg: O.Pic.transporte(x, 130), w: 130, h: 130, cap: (i === 0 ? 'Risco principal ' : 'Risco subsidiário ') + x + ' | ' + T.classeNome(x) })) });
      B.push({ t: 'kv', rows: [['Número ONU', nz(p.imdg.onu)], ['Nome apropriado para embarque', nz(p.imdg.nome)], ['Grupo de embalagem', nz(p.imdg.pg)], ['Poluente marinho (IMDG)', sn(p.imdg.poluente)]] });
    } else B.push({ t: 'callout', tone: 'warn', title: 'Classe de risco não informada', text: 'Preencha a classificação IMDG (etapa 10) para gerar o rótulo de risco.' });
    B.push({ t: 'p', small: true, text: 'Pictogramas e rótulos vetoriais ilustrativos. Na impressão final, use a arte oficial do GHS e as dimensões exigidas pela NBR 7500 e pelo Código IMDG para o tamanho da embalagem.' });
    return B;
  }

  // ---------------------------------------------------------------- Envelope (ABNT NBR 7503)
  function envelope(p) {
    const cl = E.classesDoProduto(p);
    const inner = [];
    inner.push({ t: 'p', bold: true, text: 'ENVELOPE PARA TRANSPORTE' });
    inner.push({ t: 'p', small: true, text: 'Transporte terrestre de produtos perigosos | ABNT NBR 7503 | Resolução ANTT 5.998/2022' });
    inner.push({ t: 'imgs', items: [{ svg: O.Pic.painel(p.imdg.numeroRisco, p.imdg.onu, 280), w: 280, h: 140, cap: 'Número de risco e número ONU' }].concat(cl.map((x, i) => ({ svg: O.Pic.transporte(x, 120), w: 120, h: 120, cap: (i === 0 ? 'Risco principal ' : 'Risco subsidiário ') + x }))) });
    inner.push({ t: 'table', head: ['Nome apropriado para embarque', 'Classe ou subclasse', 'Grupo de embalagem'], widths: [56, 24, 20], rows: [[nz(p.imdg.nome || p.nome), nz(p.imdg.classe) + (p.imdg.subrisco ? ' / ' + p.imdg.subrisco : ''), nz(p.imdg.pg)]] });
    inner.push({ t: 'p', bold: true, text: 'Telefones de emergência' });
    inner.push({ t: 'table', head: ['Órgão', 'Telefone'], widths: [62, 38], rows: telefones(p) });
    inner.push({ t: 'p', bold: true, text: 'Em caso de acidente ou emergência, o condutor deve:' });
    inner.push({ t: 'list', ordered: true, items: [
      'Parar o veículo em local seguro, desligar o motor e acionar o freio de estacionamento.', 'Sinalizar a via e afastar as pessoas, ficando de costas para o vento.', 'Não fumar e eliminar qualquer fonte de ignição.',
      'Acionar os telefones de emergência informando número ONU, nome do produto, local e quantidade.', 'Não tocar no produto nem tentar conter o vazamento sem EPI e treinamento.', 'Entregar a ficha de emergência e os documentos do transporte à equipe de resposta.',
    ] });
    inner.push({ t: 'p', bold: true, text: 'Contém: ficha de emergência, documento fiscal e documentos do transporte.' });
    inner.push({ t: 'kv', rows: [['Expedidor', ''], ['Destinatário', ''], ['Veículo (placa) e condutor', '']] });
    // a primeira página é a face do envelope; a capa da marca fica na ficha de emergência que vai dentro dele
    const B = [...prelim(p), { t: 'box', border: '#c2410c', bg: '#fdba74', children: inner }, { t: 'pagebreak' }];
    return B.concat(fichaEmergencia(p));
  }

  // ---------------------------------------------------------------- Treinamento
  function treinamento(p) {
    const loc = localDe(p);
    const sg = E.sugestoes(p);
    const split = (t) => (t || '').split(/\n|\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕ])/).map((x) => x.trim()).filter(Boolean);
    const B = [];
    B.push(capa('Checklist de treinamento', 'QUIM 360 | Treinamento: manuseio, armazenamento e descarte | ' + nz(p.nome), p));
    B.push({ t: 'h1', text: '1 Antes de manusear' });
    B.push({ t: 'check', items: ['FDS em português disponível no ponto de uso e lida pelo grupo.', 'Rótulo GHS legível em todos os recipientes, inclusive fracionados.', 'Pictogramas e frases H explicados: ' + ((p.ghs.h || []).slice(0, 6).join(', ') || 'conforme FDS') + '.', 'EPI disponível e em bom estado.', 'Local de uso confirmado: ' + nz(p.ctx.area) + '.'] });
    B.push({ t: 'h1', text: '2 Manuseio' });
    const man = [].concat(split(p.ocup.eng), split(p.ocup.adm), split(p.ocup.epi));
    B.push({ t: 'check', items: man.length ? man : sg.ocup.eng.concat(sg.ocup.adm, sg.ocup.epi) });
    B.push({ t: 'h1', text: '3 Armazenamento' });
    const arm = ['Armazenar somente em: ' + (loc ? loc.nome + ' (' + loc.tipo + ')' : 'local aprovado') + '.', 'Respeitar a segregação: ' + (p.comp.incompativeis || []).map(nomeG).join(', ') + (p.comp.incompativeis && p.comp.incompativeis.length ? ' não podem ficar junto.' : 'sem incompatibilidade declarada, conferir a matriz.')];
    (p.comp.controles || []).filter((x) => x !== 'nenhum').forEach((x) => arm.push(ctrlNome(x) + '.'));
    if (p.comp.limite) arm.push('Estoque máximo: ' + p.comp.limite + '.'); if (p.comp.tempMax) arm.push('Temperatura máxima: ' + p.comp.tempMax + '.');
    if (E.nr20(p).aplica) arm.push('NR-20: sem fontes de ignição, aterramento e equipamentos adequados à área.');
    B.push({ t: 'check', items: arm });
    B.push({ t: 'h1', text: '4 Descarte e resíduos' });
    const dsc = split(p.amb.residuos).concat(split(p.fds.secoes && p.fds.secoes[13] ? corta(p.fds.secoes[13], 300) : ''));
    B.push({ t: 'check', items: dsc.length ? dsc : ['Destinar resíduos e embalagens conforme a Seção 13 da FDS e a ABNT NBR 10004.'] });
    B.push({ t: 'h1', text: '5 Emergência' });
    B.push({ t: 'check', items: ['Localização de lava-olhos, chuveiro e kit de derramamento demonstrada.', 'Primeiros socorros: ' + (corta((p.fds.secoes || {})[4], 220) || 'conforme Seção 4 da FDS') , 'Contatos: Pró-Química 0800 11 8270 | Bombeiros 193.', 'Derramamento: ' + (corta(p.amb.derramamento || (p.fds.secoes || {})[6], 220) || 'conforme Seção 6 da FDS')] });
    B.push({ t: 'h1', text: '6 Verificação de aprendizado' });
    B.push({ t: 'check', items: ['O participante identifica o perigo principal do produto no rótulo.', 'O participante cita o que não pode ser armazenado junto.', 'O participante demonstra o uso correto do EPI.', 'O participante sabe a quem acionar em derramamento.'] });
    B.push({ t: 'h1', text: '7 Registro de presença' });
    const rows = []; for (let i = 0; i < 10; i++) rows.push(['', '', '', '']);
    B.push({ t: 'table', head: ['Nome', 'Matrícula', 'Assinatura', 'Data'], widths: [38, 18, 30, 14], rows, tall: true });
    B.push({ t: 'sign', rows: [['Instrutor', ''], [signer(p).nome, signer(p).registro ? signer(p).funcao + ' | ' + signer(p).registro : signer(p).funcao]] });
    return B;
  }

  // ---------------------------------------------------------------- Plano de ação
  // ações do plano (geradas pelas regras do app) com os dados de responsável, prazo e situação registrados em p.acoesPlano
  const SIT_ACAO = { fazer: 'A fazer', enviada: 'Enviada', andamento: 'Em andamento', concluida: 'Concluída' };
  function listaAcoes(p, produtos) {
    const av = E.avaliar(p, produtos);
    const ok = ['homologado', 'condicionado'].includes(p.status);
    const loc = localDe(p);
    const lim = cfg().anosValidadeFDS;
    const linhas = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const A = []; const DET = {};
    const add = (acao, origem, resp, prazo, sit) => { if (acao && !A.some((x) => x[1] === acao)) A.push([String(A.length + 1), acao, origem, resp || '', prazo || '', sit || 'A fazer']); };
    const st = D_STATUS(p);
    if (p.status === 'reprovado') {
      av.reprovacoes.forEach((r) => add('Comunicar a reprovação ao solicitante e ao fornecedor. Motivo: ' + r.replace(/^Critério interno \(GHS\): /, ''), 'Etapa 13 | Decisão', 'Responsável técnico', '', 'A fazer'));
      add('Buscar produto substituto sem cancerígeno, mutagênico, teratogênico ou PFC e iniciar nova homologação', 'Hierarquia de controle: substituição', 'Solicitante', '', 'A fazer');
      add('Manter o registro de reprovação no cadastro de produtos', 'Rastreabilidade', 'Responsável técnico', '', 'A fazer');
    }
    av.pendencias.forEach((x) => add(x, 'Pendência da análise', 'Responsável técnico', '', 'Pendente'));
    av.condicionantes.forEach((x) => add(x, 'Condicionante de liberação', 'Responsável técnico', '', 'Pendente'));
    {
      const mu = E.mudancaDe(p); const trocado = mu.substituiId ? O.Store.produto(mu.substituiId) : null;
      if (trocado) {
        if (ok && E.emEstoque(trocado)) add('Dar baixa no estoque do produto substituído "' + trocado.nome + '" e retirá-lo do local quando o novo produto entrar', 'Troca de produto | MOC', 'Gestor do local', 'Na troca');
        if (E.mudancaSugestao(p, produtos).divergencias.length) add('Atualizar treinamento, ficha de emergência e rotulagem: o perfil do produto novo difere do substituído', 'Troca de produto | MOC', 'SST / Gestor da área', 'Antes do primeiro uso');
      }
    }
    if (p.par.pgrIndicador === 'requer') add('Atualizar o PGR e o Inventário de Riscos com este produto antes da liberação de uso', 'NR-01 | Etapa 12', p.par.pgrResponsavel, p.par.pgrPrazo ? fmtData(p.par.pgrPrazo) : '', 'Pendente');
    if (E.cmrCarga(p) && !E.ehCarga(p)) { E.alternativas(p).itens.forEach((i) => add('Avaliar com o fornecedor e o solicitante alternativa a ' + i.nome + ' (orientações no relatório) e registrar o resultado', 'Etapa 7 | Substituição', 'Solicitante / SST', 'Em até 90 dias', 'Pendente')); add('Reavaliar periodicamente a viabilidade de substituição do agente CMR ou PFC', 'NR-01 | Hierarquia de controle', 'SST', 'A cada revisão do PGR', 'Pendente'); }
    if (E.cmrCarga(p)) {
      (p.cmr.controles || []).forEach((k) => add('Controle de exposição CMR ou PFC: ' + ((O.CMR_CONTROLES || []).find((x) => x[0] === k) || [k, k])[1], 'Etapa 7 | SST', 'SST / Higiene Ocupacional', 'Antes da liberação', p.cmr.controlesOk ? 'Implantado' : 'Pendente'));
      add('Obter e arquivar o parecer de Higiene Ocupacional para o agente CMR ou PFC', 'NR-01 | NR-15', 'Higiene Ocupacional', 'Antes da liberação', p.hig.parecerExigidoOk ? 'Concluído' : 'Pendente');
    }
    if (ok && p.armazenamento === 'granel') ['dique', 'nr20', 'aterramento', 'incendio', 'vapores', 'drenagem'].filter((k) => !(p.comp.granel || []).includes(k)).forEach((k) => add('Tanque: ' + ({ dique: 'confirmar bacia ou dique de contenção (NBR 17505)', nr20: 'confirmar classificação da instalação e prontuário (NR-20)', aterramento: 'confirmar aterramento e proteção contra descargas', incendio: 'confirmar proteção e combate a incêndio', vapores: 'confirmar controle de emissões e vapores', drenagem: 'confirmar drenagem e contenção de águas de combate' }[k]), 'NBR 17505 | NR-20', 'Segurança de processo', 'Antes da liberação', 'Pendente'));
    if (p.armazenamento === 'granel') {
      const at = E.analiseTanque(p, O.Store.bacias(), produtos);
      at.terminal.filter((v) => v.res.nivel === 'incompativel').forEach((v) => add('Definir com o responsável técnico se "' + p.nome + '" e "' + v.outro.nome + '" podem ficar na mesma bacia ou na drenagem comum (incompatibilidade). Bacia(s): ' + v.bacias.join(', '), 'Etapa 11.2 | Compatibilidade no terminal', 'Responsável técnico / Segurança de processo', 'Antes de receber o produto', 'Pendente'));
      at.terminal.filter((v) => v.res.nivel === 'sem_dados').forEach((v) => add('Consultar a compatibilidade com "' + v.outro.nome + '" na fonte externa e registrar o resultado', 'Etapa 11.2 | Compatibilidade no terminal', 'Segurança de processo', 'Antes de receber o produto', 'Pendente'));
      const nvc = O.RISCO.nivelCenario(E.tanqueDe(p).cenario);
      if (nvc.grave) add('Reduzir o risco do cenário de vazamento simultâneo de mais de um tanque (' + nvc.nome.toLowerCase() + ', score ' + nvc.v + ', lente ' + nvc.det + ')', 'Etapa 11.2 | Cenário de tanques', 'Segurança de processo', 'Antes de receber o produto', 'Pendente');
    }
    if (ok && p.armazenamento === 'granel') {
      const im = p.impl || {};
      if (!im.treinoData) add('Treinar operadores, brigada, motoristas e manutenção para o produto (plano de implantação) e registrar a data', 'Implantação | Plano de treinamento', 'SST / Gestor da operação', 'Antes de receber o produto', 'Pendente');
      if (!im.simuladoData) add('Realizar simulado de emergência com o produto, incluindo vazamento de mais de um tanque, e registrar a data', 'Implantação | Cenários da brigada', 'Brigada / Segurança de processo', 'Antes de receber o produto', 'Pendente');
      if (!im.comunicadoData) add('Comunicar as áreas envolvidas (operação, manutenção, laboratório, portaria) sobre o produto novo e registrar a data', 'Implantação | Comunicação', 'Gestor da operação', 'Antes de receber o produto', 'Pendente');
    }
    if (p.armazenamento === 'granel') E.exigenciasTanque(p).filter((x) => ['nao', 'depende'].includes(x.atende)).forEach((x) => add('Tanque: ' + x.rot + ' (' + (x.atende === 'nao' ? 'a frota não atende' : 'depende do tanque') + '). Verificar com a engenharia e, se houver adaptação, abrir MOC', 'Etapa 11.2 | Exigências do tanque', 'Engenharia / Segurança de processo', 'Antes de receber o produto', 'Pendente'));
    if (p.hig.dosimetria === true) add('Realizar a avaliação quantitativa (dosimetria ou varredura) antes da liberação de uso', 'NR-15 | Etapa 9.3', 'Higiene Ocupacional', '', 'Pendente');
    if (ok) {
      linhas(p.ocup.subst).forEach((x) => add('Substituição: ' + x, 'Etapa 8a | SST', 'Solicitante / SST', 'Antes da liberação'));
      linhas(p.ocup.eng).forEach((x) => add('Controle de engenharia: ' + x, 'Etapa 8a | SST', 'Gestor da área', 'Antes da liberação'));
      linhas(p.ocup.adm).forEach((x) => add('Controle administrativo: ' + x, 'Etapa 8a | SST', 'Gestor da área / SST', 'Antes da liberação'));
      linhas(p.ocup.epi).forEach((x) => add('EPI: ' + x, 'Etapa 8a | SST', 'Gestor da área', 'Antes do primeiro uso'));
      linhas(p.amb.contencao).forEach((x) => add('Contenção: ' + x, 'Etapa 8b | GA', 'Gestor do local', 'Antes do primeiro recebimento'));
      linhas(p.amb.derramamento).forEach((x) => add('Resposta a derramamento: ' + x, 'Etapa 8b | GA', 'Gestor do local', 'Antes do primeiro recebimento'));
      linhas(p.amb.residuos).forEach((x) => add('Resíduos: ' + x, 'Etapa 8b | GA', 'Meio ambiente', 'Antes do primeiro uso'));
      (p.comp.controles || []).filter((x) => x !== 'nenhum').forEach((x) => add('Armazenamento: ' + ctrlNome(x), 'Etapa 11.3 | PSM', 'Gestor do local', 'Antes do primeiro recebimento'));
      if (p.comp.limite) add('Fixar e controlar o estoque máximo de ' + p.comp.limite, 'Etapa 11.3 | PSM', 'Gestor do local', 'Antes do primeiro recebimento');
      if (p.comp.tempMax) add('Garantir temperatura de armazenamento até ' + p.comp.tempMax, 'Seção 7 da FDS | PSM', 'Gestor do local', 'Antes do primeiro recebimento');
      if (loc) {
        const cpx = E.compatibilidade(p, loc, produtos);
        cpx.pares.filter((x) => x.codigo && !['R', 'G'].includes(x.codigo)).forEach((x) => add('NBR 17160, restrição ' + x.codigo + ' com ' + x.com + ': ' + O.NBR17160.OBS[x.codigo], 'NBR 17160 | Figura 1', 'Gestor do local', 'Antes do primeiro recebimento'));
      }
      if (p.comp.localOk === 'conflito') add('Implantar a segregação física ou o local alternativo: ' + (p.comp.observacoes || 'conforme matriz'), 'Etapa 11.2 | PSM', 'Gestor do local', 'Antes do primeiro recebimento', 'Pendente');
      const n20 = E.nr20(p);
      if (n20.aplica) add('NR-20: verificar a classificação da instalação, as áreas classificadas, o aterramento e o prontuário (' + n20.categoria + ')', 'NR-20 | PSM', 'Segurança de processo', 'Antes do primeiro recebimento');
      if (loc && p.armazenamento !== 'granel') {
        if (E.gatilhosLocal) {
          if (p.comp.qtdKg === '' || p.comp.qtdKg == null) add('Informar a quantidade a armazenar em ' + loc.nome + ' para verificar as quantidades-limite da NBR 17160', 'NBR 17160 | Tabela 1', 'Responsável técnico', 'Antes do primeiro recebimento');
          else E.gatilhosLocal(loc, produtos, p).exige.forEach((x) => add(x, 'NBR 17160 | Tabela 1 e Seções 6 a 14', 'Responsável técnico / Gestor do local', 'Antes do primeiro recebimento'));
        }
      }
      if (loc && p.armazenamento !== 'granel') {
        if (!E.emEstoque(p)) add('Registrar a entrada do produto no estoque de ' + loc.nome + ' (data e quantidade) quando ele chegar: só o que está em estoque entra nos cálculos do local', 'Controle de estoque', 'Gestor do local', 'Na chegada do produto');
        E.analiseRiscoLocal(loc, produtos, p).cenarios.filter((c) => c.risco.grave).sort(porRisco).forEach((c) => { const ac = 'Reduzir o risco do cenário "' + c.titulo + '" em ' + loc.nome + ' (' + riscoTxt(c).toLowerCase() + ')'; add(ac, 'Análise de risco do armazém | ' + sevTxt(c) + '; probabilidade ' + c.prob, 'Gestor do local', 'Antes do primeiro recebimento'); DET[ac] = c.medidas.concat(c.obs ? ['Observação: ' + c.obs] : []); });
        const rq = E.requisitosLocal(loc, produtos, p);
        rq.itens.filter((i) => i.resp === 'nc').forEach((i) => add('Local ' + loc.nome + ', item ' + i.id + ': ' + i.texto.split(/;|:/)[0] + (i.obs ? ' (' + i.obs + ')' : ''), 'NBR 17160 | ' + i.id, 'Gestor do local / Engenharia', 'Antes do primeiro recebimento'));
        if (rq.cont.aberto) add('Concluir o checklist da NBR 17160 de ' + loc.nome + ': ' + rq.cont.aberto + ' requisito(s) sem resposta', 'NBR 17160 | Checklist do local', 'Responsável técnico', 'Antes do primeiro recebimento');
        if (rq.semInspecao) add('Registrar a inspeção de ' + loc.nome + ' antes da primeira utilização', 'NBR 17160 | 6.3.9.1', 'Gestor do local', 'Antes do primeiro recebimento');
        else if (rq.vencida) add('Inspeção de ' + loc.nome + ' vencida: realizar nova inspeção', 'NBR 17160 | 6.3.9', 'Gestor do local', 'Imediato');
        const ct = E.contencaoLocal(loc, produtos, p);
        if (ct.vol) add('Garantir a retenção da água de extinção de incêndio: cerca de ' + (Math.round(ct.total * 10) / 10).toLocaleString('pt-BR') + ' m³ em ' + loc.nome + ' (CPA ' + ct.cpa + ')', 'NBR 17160 | Anexo F', 'Meio ambiente / Engenharia', 'Antes do primeiro recebimento');
        else add('Informar a área do setor e a categoria de segurança de ' + loc.nome + ' para estimar a retenção da água de extinção (Anexo F)', 'NBR 17160 | Anexo F', 'Meio ambiente', 'Antes do primeiro recebimento');
      }
      add('Rotular recipientes e frações conforme o GHS (NBR 14725) e a NR-26', 'Rotulagem', 'Gestor do local', 'Antes do primeiro uso');
      add('Disponibilizar a FDS em português no ponto de uso e no local de armazenamento', 'NR-26', 'Gestor do local', 'Antes do primeiro uso');
      if (p.trein.gerar !== false) add('Treinar a equipe com o checklist de treinamento e arquivar a lista de presença', 'Etapa 14 | SST', 'SST / Gestor da área', 'Antes do primeiro uso');
      add('Disponibilizar a ficha de emergência e o kit de derramamento no local de armazenamento', 'ABIQUIM | NBR 7503', 'Gestor do local', 'Antes do primeiro uso');
      if (p.imdg.classe) add('Usar o envelope e a ficha de emergência em todo transporte do produto', 'NBR 7503 | ANTT 5.998/2022', 'Logística', 'Em cada transporte');
      add('Cadastrar o produto na lista de homologados e fixar o QR Code no local de armazenamento', 'Etapa 13 | Rastreabilidade', 'Responsável técnico', 'Na homologação');
      if (p.fds.dataRevisao) { const d = new Date(p.fds.dataRevisao); d.setFullYear(d.getFullYear() + lim); add('Solicitar nova versão da FDS ao fornecedor', 'ABNT NBR 14725', 'Compras / SST', fmtData(d.toISOString())); }
    }
    (p.acoesManuais || []).forEach((m) => add('manual:' + m.id, 'Ação criada pelo usuário', m.papel || 'Responsável técnico', '', 'A fazer'));
    if (p.status === 'pendente' || (!A.length && p.status === 'em_analise')) add('Registrar o retorno do fornecedor ou do parecer e retomar a análise na etapa pendente', 'Pendência da análise', 'Responsável técnico', '', 'Pendente');
    const reg = p.acoesPlano || {};
    const Af = A.filter((r) => !(reg[r[1]] || {}).eliminada).map((r, i) => [String(i + 1)].concat(r.slice(1))); // ações eliminadas pelo usuário saem da lista
    const acoes = Af.map((r) => { const o = reg[r[1]] || {}; const papel = r[3]; const resp = o.resp ? o.resp + (papel ? ' (' + papel + ')' : '') : papel; const prazo = o.prazo ? fmtData(o.prazo) : r[4]; const sit = o.sit ? SIT_ACAO[o.sit] || r[5] : r[5]; const texto = String(o.texto || '').trim() || r[1]; return { n: r[0], acao: r[1], texto, origem: r[2], papel, prazoTexto: r[4], sitTexto: r[5], reg: o, detalhe: DET[r[1]] || [], linha: [r[0], texto, r[2], resp, prazo, sit] }; });
    return { A: acoes.map((x) => x.linha), st, acoes };
  }
  function planoAcao(p, produtos) {
    const { A, st } = listaAcoes(p, produtos);
    const B = [];
    B.push(capa('Plano de ação', 'QUIM 360 | Plano de Ação | ' + nz(p.nome), p, [['Situação do produto', st[0]]]));
    B.push({ t: 'callout', tone: st[1], title: 'Situação: ' + st[0], text: p.status === 'condicionado' ? 'Uso liberado somente após as ações marcadas como pendentes.' : p.status === 'homologado' ? 'Ações para colocar o produto em uso com os controles definidos na análise.' : p.status === 'reprovado' ? 'Produto reprovado: ações de encerramento e substituição.' : 'Análise sem decisão: ações para destravar a homologação.' });
    B.push({ t: 'h1', text: 'Ações' });
    B.push({ t: 'table', head: ['Nº', 'Ação', 'Origem', 'Responsável', 'Prazo', 'Situação'], widths: [5, 37, 15, 13, 18, 12], rows: A.length ? A : [['1', 'Sem ações geradas', '', '', '', '']] });
    B.push({ t: 'p', small: true, text: 'Responsáveis e prazos em branco devem ser definidos pelo responsável técnico. Os prazos marcados como "antes de" valem a partir da liberação do uso.' });
    B.push({ t: 'sign', rows: [[signer(p).nome, signer(p).registro ? signer(p).funcao + ' | ' + signer(p).registro : signer(p).funcao], ['Aprovação da gestão', '']] });
    return B;
  }
  function D_STATUS(p) { return STATUS[p.status] || STATUS.em_analise; }

  // ---------------------------------------------------------------- Vencimentos e pendências (painel)
  // nivel: vencido | proximo | atencao | sem_registro
  function vencimentos(produtos, locais) {
    const c = cfg(); const jan = Number(c.alertaDias) || 30, janFds = Number(c.alertaDiasFds) || 90, anos = Number(c.anosValidadeFDS) || 5;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dias = (iso) => Math.round((new Date(String(iso).slice(0, 10) + 'T00:00:00') - hoje) / 86400000);
    const itens = []; const add = (o) => itens.push(o);
    const rel = (n, g) => (n < 0 ? 'vencid' + (g || 'o') + ' há ' + (-n) + ' dia(s)' : n === 0 ? 'vence hoje' : 'vence em ' + n + ' dia(s)');
    // FDS
    (produtos || []).filter((p) => ['homologado', 'condicionado'].includes(p.status)).forEach((p) => {
      const estoque = E.emEstoque(p) ? ' (em estoque)' : '';
      if (p.fds.dataRevisao) { const v = new Date(p.fds.dataRevisao); if (!isNaN(v)) { v.setFullYear(v.getFullYear() + anos); const iso = v.toISOString().slice(0, 10); const n = dias(iso); if (n < 0) add({ cat: 'FDS', nivel: 'vencido', titulo: p.nome + estoque, detalhe: 'FDS ' + rel(n, 'a') + ' (revisão de ' + fmtData(p.fds.dataRevisao) + ', validade de ' + anos + ' anos). Solicitar nova versão ao fornecedor.', data: iso, dias: n, link: '#/produto/' + p.id + '/resumo' }); else if (n <= janFds) add({ cat: 'FDS', nivel: 'proximo', titulo: p.nome + estoque, detalhe: 'FDS ' + rel(n, 'a') + '. Solicitar nova versão ao fornecedor.', data: iso, dias: n, link: '#/produto/' + p.id + '/resumo' }); } }
      else if (E.emEstoque(p)) add({ cat: 'FDS', nivel: 'sem_registro', titulo: p.nome + estoque, detalhe: 'Data de revisão da FDS não registrada.', data: '', dias: 9999, link: '#/produto/' + p.id + '/fds' });
    });
    // locais: inspeção e análise de risco
    (locais || []).forEach((l) => {
      const rq = E.requisitosLocal(l, produtos); const temEstoque = rq.gatilhos.itens.length > 0;
      if (temEstoque && rq.semInspecao) add({ cat: 'Inspeção', nivel: 'sem_registro', titulo: l.nome, detalhe: 'Nenhuma inspeção registrada (NBR 17160, 6.3.9.1).', data: '', dias: 9999, link: '#/locais' });
      else if (rq.proxima) { const n = dias(rq.proxima); if (n < 0) add({ cat: 'Inspeção', nivel: 'vencido', titulo: l.nome, detalhe: 'Inspeção ' + rel(n, 'a') + '.', data: rq.proxima, dias: n, link: '#/locais' }); else if (n <= jan) add({ cat: 'Inspeção', nivel: 'proximo', titulo: l.nome, detalhe: 'Inspeção ' + rel(n, 'a') + '.', data: rq.proxima, dias: n, link: '#/locais' }); }
      else if (rq.inspecoes.length && !rq.periodo) add({ cat: 'Inspeção', nivel: 'sem_registro', titulo: l.nome, detalhe: 'Intervalo entre inspeções não definido.', data: '', dias: 9999, link: '#/locais' });
      const an = l.analise || {};
      if (an.revisao) { const n = dias(an.revisao); if (n < 0) add({ cat: 'Análise de risco', nivel: 'vencido', titulo: l.nome, detalhe: 'Revisão da análise de risco ' + rel(n, 'a') + '.', data: an.revisao, dias: n, link: '#/locais' }); else if (n <= jan) add({ cat: 'Análise de risco', nivel: 'proximo', titulo: l.nome, detalhe: 'Revisão da análise de risco ' + rel(n, 'a') + '.', data: an.revisao, dias: n, link: '#/locais' }); }
      else if (temEstoque && !(an.conclusao || '').trim()) add({ cat: 'Análise de risco', nivel: 'sem_registro', titulo: l.nome, detalhe: 'Local com produtos em estoque e sem análise de risco concluída.', data: '', dias: 9999, link: '#/locais' });
      // ações do local
      listaAcoesLocal(l, produtos).forEach((a) => acao(a, l.nome, '#/locais'));
    });
    // ações dos produtos
    (produtos || []).filter((p) => p.status !== 'reprovado').forEach((p) => { try { listaAcoes(p, produtos).acoes.forEach((a) => acao(a, p.nome, '#/produto/' + p.id + '/acoes')); } catch (e) { /* produto incompleto */ } });
    function acao(a, onde, link) {
      const r = a.reg || {}; if (r.sit === 'concluida') return;
      if (r.prazo) { const n = dias(r.prazo); if (n < 0) add({ cat: 'Ação', nivel: 'vencido', titulo: onde + ': ' + a.acao.slice(0, 110), detalhe: 'Prazo ' + rel(n) + (r.resp ? '. Responsável: ' + r.resp : ''), data: r.prazo, dias: n, link }); else if (n <= jan) add({ cat: 'Ação', nivel: 'proximo', titulo: onde + ': ' + a.acao.slice(0, 110), detalhe: 'Prazo ' + rel(n) + (r.resp ? '. Responsável: ' + r.resp : ''), data: r.prazo, dias: n, link }); }
      const ult = (r.enviados || []).slice(-1)[0];
      if (ult && (!r.sit || r.sit === 'enviada')) { const dd = -dias(ult.data); if (dd >= 15) add({ cat: 'Ação', nivel: 'atencao', titulo: onde + ': ' + a.acao.slice(0, 110), detalhe: 'E-mail aberto há ' + dd + ' dias sem conclusão registrada.', data: ult.data.slice(0, 10), dias: -dd, link }); }
    }
    // homologações pendentes há muito tempo
    (produtos || []).filter((p) => p.status === 'pendente' && p.atualizadoEm).forEach((p) => { const dd = -dias(p.atualizadoEm); if (dd >= 30) add({ cat: 'Homologação', nivel: 'atencao', titulo: p.nome, detalhe: 'Pendente há ' + dd + ' dias.', data: p.atualizadoEm.slice(0, 10), dias: -dd, link: '#/homologar/' + p.id }); });
    // fila: prioridade alta sem FDS
    const f = (O.Store.fila ? O.Store.fila() : []).filter((i) => i.prioridade && i.prioridade.nivel === 'alta' && O.Fila.situacao(i).chave === 'fds_levantar').length;
    if (f) add({ cat: 'Fila', nivel: 'atencao', titulo: f + ' produto(s) de prioridade alta aguardando a FDS', detalhe: 'A composição na lista cita agentes de atenção. Levantar a FDS atual.', data: '', dias: 9998, link: '#/fila' });
    const ordem = { vencido: 0, proximo: 1, atencao: 2, sem_registro: 3 };
    itens.sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || a.dias - b.dias);
    return itens;
  }
  function vencimentosDoc(itens) {
    const sg = signer(null); const pseudo = { nome: 'Vencimentos e pendências', dec: { numero: '' }, rotulo: 'Documento', pseudo: true };
    const N = { vencido: 'Vencido', proximo: 'A vencer', atencao: 'Atenção', sem_registro: 'Sem registro' };
    const c = (n) => itens.filter((i) => i.nivel === n).length;
    const B = [capa('Vencimentos e pendências', 'QUIM 360 | Situação em ' + fmtData(new Date().toISOString()), pseudo, [['Itens', String(itens.length)]])];
    B.push({ t: 'table', head: ['Situação', 'Itens'], widths: [70, 30], rows: Object.keys(N).map((k) => [N[k], String(c(k))]) });
    B.push({ t: 'h1', text: 'Itens' });
    B.push({ t: 'table', head: ['Situação', 'Categoria', 'Item', 'Detalhe', 'Data'], widths: [11, 12, 28, 37, 12], rows: itens.length ? itens.map((i) => [N[i.nivel], i.cat, i.titulo, i.detalhe, i.data ? fmtData(i.data) : '—']) : [['Nenhum item', '', '', '', '']] });
    B.push({ t: 'p', small: true, text: 'Janelas de alerta definidas em Configurações. Itens "sem registro" indicam dado que falta para o app acompanhar o vencimento.' });
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao]] });
    return B;
  }


  // ações de um local: não conformidades do checklist, inspeção que falta ou venceu e pendências de inspeção
  function listaAcoesLocal(local, produtos) {
    const rq = E.requisitosLocal(local, produtos); const A = []; const reg = local.acoesPlano || {};
    const add = (acao, origem, papel, detalhe) => { if (!A.some((x) => x.acao === acao) && !(reg[acao] || {}).eliminada) { const o = reg[acao] || {}; const texto = String(o.texto || '').trim() || acao; A.push({ n: String(A.length + 1), acao, texto, origem, papel, prazoTexto: '', reg: o, detalhe: detalhe || [], linha: [String(A.length + 1), texto, origem, o.resp ? o.resp + ' (' + papel + ')' : papel, o.prazo ? fmtData(o.prazo) : '', o.sit ? SIT_ACAO[o.sit] || 'A fazer' : 'A fazer'] }); } };
    E.analiseRiscoLocal(local, produtos).cenarios.filter((c) => c.risco.grave).sort(porRisco).forEach((c) => add('Reduzir o risco do cenário "' + c.titulo + '" (' + riscoTxt(c).toLowerCase() + ')', 'Análise de risco do armazém | ' + sevTxt(c) + '; probabilidade ' + c.prob, 'Gestor do local', c.medidas.concat(c.obs ? ['Observação: ' + c.obs] : [])));
    rq.itens.filter((i) => i.resp === 'nc').forEach((i) => add('Corrigir o requisito ' + i.id + ' da NBR 17160: ' + i.texto.split(/;|\. /)[0].replace(/\.$/, '') + (i.obs ? ' (' + i.obs + ')' : ''), 'NBR 17160 | ' + i.id + ' | Checklist do local', 'Gestor do local'));
    if (rq.semInspecao) add('Realizar e registrar a inspeção do armazém antes da primeira utilização', 'NBR 17160 | 6.3.9.1', 'Gestor do local');
    else if (rq.vencida) add('Realizar a inspeção do armazém, vencida desde ' + fmtData(rq.proxima), 'NBR 17160 | 6.3.9', 'Gestor do local');
    (local.acoesManuais || []).forEach((m) => add('manual:' + m.id, 'Ação criada pelo usuário', m.papel || 'Gestor do local'));
    (local.inspecoes || []).filter((x) => x.resultado === 'pendencias').forEach((x) => add('Resolver a pendência da inspeção de ' + fmtData(x.data) + ': ' + nz(x.obs, 'sem descrição'), 'Inspeção de ' + fmtData(x.data) + ' | ' + nz(x.resp, 'responsável não informado'), 'Gestor do local'));
    return A;
  }
  function emailAcoesLocal(local, produtos, acoes, destino) {
    const sg = signer(null); const c = cfg(); const g = E.gatilhosLocal(local, produtos); const fm = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
    const L = [];
    L.push('Olá' + (destino && destino.nome ? ', ' + destino.nome : '') + ','); L.push('');
    L.push('Solicito a sua ação referente ao local de armazenamento abaixo.'); L.push('');
    L.push('LOCAL DE ARMAZENAMENTO');
    L.push(local.nome + ' (' + local.tipo + ')' + (local.areaM2 ? ', ' + local.areaM2 + ' m²' : '') + (local.aoArLivre ? ', ao ar livre' : '') + (local.armarioSeg ? ', armário de segurança' : ''));
    if (local.descricao) L.push('Descrição: ' + local.descricao);
    L.push(''); L.push('PRODUTOS EM ESTOQUE AGORA');
    if (g.itens.length) g.itens.forEach((i) => L.push('- ' + i.nome + (i.arm ? ' (classe de armazenamento ' + i.arm + ')' : '') + (i.qtd != null ? ': ' + fm(i.qtd) + ' kg' : ': quantidade não informada'))); else L.push('Nenhum produto em estoque registrado.');
    L.push(''); L.push('AÇÃO SOLICITADA');
    acoes.forEach((a, i) => { L.push((i + 1) + '. ' + (a.texto || a.acao)); L.push('   Origem: ' + a.origem + (a.linha[4] ? ' | Prazo: ' + a.linha[4] : '')); if ((a.detalhe || []).length) { L.push('   Medidas de controle:'); a.detalhe.forEach((d) => L.push('   - ' + d)); } if (a.reg && a.reg.obs) L.push('   Observação: ' + a.reg.obs); });
    L.push(''); L.push('Ao concluir, responda este e-mail informando a conclusão e anexe a evidência, se houver (foto, registro ou documento).'); L.push('');
    L.push('Atenciosamente,'); L.push(sg.nome || '[nome]'); L.push(sg.funcao + (sg.registro ? ' | ' + sg.registro : '')); if (c.organizacao) L.push(c.organizacao);
    return { para: (destino && destino.email) || '', assunto: '[QUIM 360] Ação solicitada | ' + local.nome, corpo: L.join('\n') };
  }


  // e-mail de solicitação de ação ao responsável: descrição do produto, local de armazenamento e ações pedidas
  function emailAcoes(p, produtos, acoes, destino) {
    const G = O.GHS; const loc = localDe(p); const sg = signer(p); const c = cfg();
    const h = (p.ghs.h || []).slice(0, 6).map((x) => x + ' ' + (G.hText(x) || '')).join('; ');
    const L = [];
    L.push('Olá' + (destino && destino.nome ? ', ' + destino.nome : '') + ',');
    L.push('');
    L.push('Solicito a sua ação referente ao produto químico abaixo.');
    L.push('');
    L.push('PRODUTO');
    L.push('Nome: ' + nz(p.nome) + (p.fornecedor ? ' | Fornecedor: ' + p.fornecedor : ''));
    L.push('Transporte: ' + [p.imdg.onu ? 'ONU ' + p.imdg.onu : '', p.imdg.classe ? 'classe ' + p.imdg.classe : '', p.imdg.pg ? 'grupo de embalagem ' + p.imdg.pg : '', p.imdg.numeroRisco ? 'número de risco ' + p.imdg.numeroRisco : ''].filter(Boolean).join(', ') || 'não informado');
    L.push('Perigos (FDS): ' + (p.ghs.palavra ? p.ghs.palavra + '. ' : '') + (h || 'não informados'));
    L.push('Uso previsto: ' + nz([p.finalidade, p.ctx.atividade].filter(Boolean).join(' | '), 'não informado'));
    L.push('Situação: ' + (STATUS[p.status] || STATUS.em_analise)[0] + (p.dec.numero ? ' (' + p.dec.numero + ')' : ''));
    L.push('');
    L.push('LOCAL DE ARMAZENAMENTO');
    L.push(loc ? loc.nome + ' (' + loc.tipo + ')' + (loc.areaM2 ? ', ' + loc.areaM2 + ' m²' : '') + (loc.aoArLivre ? ', ao ar livre' : '') + (p.comp.qtdKg !== '' && p.comp.qtdKg != null ? '. Quantidade prevista: ' + String(p.comp.qtdKg).replace('.', ',') + ' kg' : '') : 'Local não definido');
    L.push('');
    L.push('AÇÃO SOLICITADA');
    acoes.forEach((a, i) => { L.push((i + 1) + '. ' + (a.texto || a.acao)); L.push('   Origem: ' + a.origem + (a.linha[4] ? ' | Prazo: ' + a.linha[4] : '')); if ((a.detalhe || []).length) { L.push('   Medidas de controle:'); a.detalhe.forEach((d) => L.push('   - ' + d)); } if (a.reg && a.reg.obs) L.push('   Observação: ' + a.reg.obs); });
    L.push('');
    L.push('Ao concluir, responda este e-mail informando a conclusão e anexe a evidência, se houver (foto, registro ou documento).');
    L.push('');
    L.push('Atenciosamente,');
    L.push(sg.nome || '[nome]'); L.push(sg.funcao + (sg.registro ? ' | ' + sg.registro : '')); if (c.organizacao) L.push(c.organizacao);
    return { para: (destino && destino.email) || '', assunto: '[QUIM 360] Ação solicitada | ' + nz(p.nome) + (loc ? ' | ' + loc.nome : ''), corpo: L.join('\n') };
  }






  // risco por cenário: texto da severidade em cada lente avaliada e do nível final
  function sevTxt(c) {
    const R = O.RISCO; const d = (c.risco && c.risco.dims) || [];
    return d.length ? d.map((x) => 'severidade ' + x.curto.toLowerCase() + ' ' + x.sev + ' (' + R.sevNome(x.sev, x.dim) + ')').join(', ') : 'sem severidade avaliada';
  }
  function sevCel(c) { const R = O.RISCO; const d = (c.risco && c.risco.dims) || []; return d.length ? d.map((x) => x.curto + ': ' + x.sev + ' ' + R.sevNome(x.sev, x.dim)).join('\n') : '—'; }
  function riscoTxt(c) { const r = c.risco; return r.v ? 'risco ' + r.nome + ', score ' + r.v + ', lente ' + r.det : 'não avaliado'; }
  function riscoCel(c) { const r = c.risco; return r.v ? r.nome + ' (' + r.v + ', ' + r.det + ')' : 'Não avaliado'; }
  function porRisco(x, y) { return ((y.risco.rank || 0) - (x.risco.rank || 0)) || ((y.risco.v || 0) - (x.risco.v || 0)); }
  const PROB_NOME = (n) => (O.RISCO.PROB[n - 1] || [0, ''])[1];

  // matrizes, escalas e situações de enquadramento (usadas na análise de risco)
  function criterioRisco() {
    const R = O.RISCO; const B = [];
    B.push({ t: 'p', small: true, text: 'O risco é avaliado em três lentes: pessoas (acidente do trabalho), meio ambiente e processo e patrimônio (PSM). A severidade é escolhida em cada lente e a probabilidade é uma só (frequência, barreiras e histórico). Risco = severidade x probabilidade. A severidade é soberana: severidade 4 ou 5, ou score 12 ou mais, é Grave. Médio: score de 6 a 11 com severidade abaixo de 4. Baixo: 3 a 5. Desprezível: 2 ou menos. O nível do cenário é o mais alto entre as lentes avaliadas. PSIF (potencial de causar fatalidade) vale somente para a lente de pessoas; não se aplica a meio ambiente nem a PSM. O critério pode ser substituído pelo da organização.' });
    const tom = (n) => (n.grave ? 'crit' : n.nome === 'Médio' ? 'warn' : n.nome === 'Baixo' ? 'info' : 'ok');
    const grade = (dim) => ({ t: 'matrix', labels: ['1', '2', '3', '4', '5'], rows: [1, 2, 3, 4, 5].map((s) => [1, 2, 3, 4, 5].map((p) => { const n = R.nivel(s, p, dim); return { txt: String(s * p) + (n.psif ? ' PSIF' : ''), tone: tom(n) }; })) });
    B.push({ t: 'h2', text: 'Matriz da lente de pessoas (com PSIF)' });
    B.push({ t: 'p', small: true, text: 'Linhas: severidade de 1 a 5 (desprezível, baixa, média, grave, fatal). Colunas: probabilidade de 1 a 5 (muito baixa a muito alta).' });
    B.push(grade('pessoas'));
    B.push({ t: 'h2', text: 'Matriz das lentes de meio ambiente e PSM (sem PSIF)' });
    B.push({ t: 'p', small: true, text: 'Linhas: severidade de 1 a 5 (desprezível, baixa, média, grave, catastrófica). Colunas: probabilidade de 1 a 5.' });
    B.push(grade('amb'));
    B.push({ t: 'h2', text: 'Escala de severidade por lente' });
    B.push({ t: 'table', head: ['Nível', 'Pessoas', 'Meio ambiente', 'Processo e patrimônio (PSM)'], widths: [14, 30, 30, 26], rows: R.SEV_DESC.map((x) => [x.n + ' ' + x.nome + (x.nomeAlt !== x.nome ? ' (ambiente e PSM: ' + x.nomeAlt + ')' : ''), x.pessoas, x.ambiente, x.patrimonio]) });
    B.push({ t: 'h2', text: 'Escala de probabilidade' });
    B.push({ t: 'table', head: ['Nível', 'Descrição'], widths: [18, 82], rows: R.PROB_DESC.map((x) => [x.n + ' ' + x.nome, x.desc]) });
    B.push({ t: 'h2', text: 'Situações típicas para enquadramento' });
    B.push({ t: 'table', head: ['Situação', 'Sugestão'], widths: [70, 30], rows: R.EXEMPLOS.map((x) => [x.situacao, x.sev ? 'Severidade ' + x.sev + ' (' + R.sevNome(x.sev, x.dim) + '), lente ' + R.DIMS.find((d) => d.id === x.dim).curto : 'Probabilidade ' + x.prob + ' (' + PROB_NOME(x.prob) + ')']) });
    return B;
  }

  // ---------------------------------------------------------------- Fila de homologação (lista importada, sem FDS)
  function filaDoc(itens, op) {
    op = op || {}; const F = O.Fila; const sg = signer(null);
    const sit = (it) => F.situacao(it);
    const PRI = { alta: 0, media: 1, normal: 2 }; const PRI_TXT = { alta: 'Alta', media: 'Média', normal: 'Normal' };
    const ord = itens.slice().sort((a, b) => PRI[a.prioridade.nivel] - PRI[b.prioridade.nivel] || a.local.localeCompare(b.local) || a.nome.localeCompare(b.nome));
    const conta = (f) => itens.filter(f).length;
    const pseudo = { nome: 'Fila de homologação', dec: { numero: '' }, rotulo: 'Documento', pseudo: true };
    const B = [capa('Fila de homologação', 'QUIM 360 | Produtos a homologar | ' + fmtData(new Date().toISOString()), pseudo, [['Produtos na fila', String(itens.length)], ['Origem', 'Lista importada, sem FDS: dados de partida, a confirmar na FDS atual']])];
    B.push({ t: 'callout', tone: 'warn', title: 'A lista não traz FDS', text: 'Nome, fabricante, classe de transporte, composição e local vêm de um levantamento antigo. Para cada produto, levante a FDS atual: a homologação usa os dados da FDS, não os desta lista.' });
    B.push({ t: 'h1', text: '1 Resumo' });
    B.push({ t: 'table', head: ['Situação', 'Produtos'], widths: [70, 30], rows: [['FDS a levantar', conta((i) => sit(i).chave === 'fds_levantar')], ['FDS recebida', conta((i) => sit(i).chave === 'fds_recebida')], ['Em homologação ou pendentes', conta((i) => ['em_analise', 'pendente'].includes(sit(i).chave))], ['Homologados (inclui condicionantes)', conta((i) => ['homologado', 'condicionado', 'na_lista'].includes(sit(i).chave))], ['Reprovados', conta((i) => sit(i).chave === 'reprovado')], ['Descartados', conta((i) => sit(i).chave === 'descartado')]].map((r) => [r[0], String(r[1])]) });
    B.push({ t: 'table', head: ['Prioridade para levantar a FDS', 'Produtos'], widths: [70, 30], rows: [['Alta: composição cita agente de atenção', String(conta((i) => i.prioridade.nivel === 'alta'))], ['Média: solvente aromático ou classe de risco 3, 4.1, 6 ou 8', String(conta((i) => i.prioridade.nivel === 'media'))], ['Normal', String(conta((i) => i.prioridade.nivel === 'normal'))]] });
    B.push({ t: 'h1', text: '2 Prioridade alta' });
    B.push({ t: 'p', small: true, text: 'Produtos cuja composição, como descrita na lista, cita substâncias que costumam acionar o gatilho de CMR ou PFC. É indício de partida: a FDS atual confirma ou não.' });
    const alta = ord.filter((i) => i.prioridade.nivel === 'alta');
    B.push({ t: 'table', head: ['Produto', 'Fabricante', 'Local', 'Motivo', 'Situação'], widths: [24, 18, 16, 28, 14], rows: alta.length ? alta.map((i) => [i.nome, nz(i.fabricante), nz(i.local), i.prioridade.motivos.join('; '), sit(i).rotulo]) : [['Nenhum', '', '', '', '']] });
    B.push({ t: 'h1', text: '3 Qualidade da lista' });
    const q = [['Possíveis duplicados (mesmo nome e fabricante)', conta((i) => i.duplicado)], ['Sem fabricante', conta((i) => !i.fabricante)], ['Sem composição', conta((i) => !i.composicao)], ['Sem local de armazenamento definido', conta((i) => !i.local)], ['Sem quantidade informada', conta((i) => !i.quantidade)], ['Sem classe de risco informada ou "sem classe de risco" (classe de armazenamento não deduzível)', conta((i) => !i.classe || /^sem classe/i.test(i.classe))], ['Marcados como fora de uso', conta((i) => i.emUso === false)]];
    B.push({ t: 'table', head: ['Ponto de atenção', 'Produtos'], widths: [80, 20], rows: q.map((r) => [r[0], String(r[1])]) });
    B.push({ t: 'h1', text: '4 Lista completa, por prioridade e local' });
    B.push({ t: 'table', head: ['Produto', 'Fabricante', 'Classe (lista)', 'Local', 'Prioridade', 'Situação'], widths: [26, 18, 11, 16, 10, 19], rows: ord.map((i) => [i.nome + (i.duplicado ? ' (possível duplicado)' : ''), nz(i.fabricante), nz(i.classe), nz(i.local), PRI_TXT[i.prioridade.nivel], sit(i).rotulo]) });
    B.push({ t: 'p', small: true, text: 'Prioridade é apoio para organizar o trabalho e não classifica o perigo do produto. A classificação vem da FDS.' });
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao]] });
    return B;
  }

  // ---------------------------------------------------------------- Cenários de risco (treinamento, brigada, reuniões)
  const TOM_RISCO = { 'Grave / PSIF': 'crit', 'Grave': 'crit', 'Médio': 'warn', 'Baixo': 'info', 'Desprezível': 'ok' };
  // local: cenários do local (ativos e adicionados); sem local: catálogo geral (padrão e biblioteca da organização)
  // op: { soAltos, umaPorPagina (padrão sim), listaPresenca (padrão sim) }
  function cenariosDoc(local, produtos, op) {
    op = op || {}; const R = O.RISCO; const sg = signer(null);
    let lista;
    if (local) {
      lista = E.analiseRiscoLocal(local, produtos).cenarios.slice().sort(porRisco);
      if (op.soAltos) lista = lista.filter((c) => c.risco.grave);
    } else {
      const base = R.CENARIOS.map((c) => Object.assign({}, c, { risco: { v: 0, nome: 'Não avaliado' } }));
      const lib = (O.Store.config().bibliotecaCenarios || []).map((m) => ({ titulo: m.titulo, causas: m.causas, consequencias: m.consequencias, medidas: String(m.medidas || '').split('\n').map((x) => x.trim()).filter(Boolean), discussao: [], proprio: true, origem: m.origem, risco: { v: 0, nome: 'Não avaliado' } }));
      lista = base.concat(lib);
    }
    const pseudo = { nome: local ? local.nome : 'Catálogo geral', dec: { numero: '' }, rotulo: local ? 'Armazém' : 'Documento', pseudo: true };
    const B = [capa('Cenários de risco', 'QUIM 360 | Cenários para treinamento, DDS e reuniões | ' + pseudo.nome, pseudo, [['Local', local ? local.nome + ' (' + local.tipo + ')' : 'Catálogo geral (cenários padrão e biblioteca da organização)'], ['Cenários', String(lista.length) + (op.soAltos ? ' (somente risco grave)' : '')]])];
    B.push({ t: 'p', text: 'Este documento reúne os cenários de risco para treinamento da brigada, diálogo de segurança e discussão em reunião. Cada cenário traz como pode acontecer, o que pode acontecer, como prevenir e perguntas para a discussão, com espaço para anotações.' + (local ? '' : ' Sem local definido, os níveis de risco não são mostrados: eles dependem do que está armazenado e das avaliações de cada local.') });
    if (local && lista.length) B.push({ t: 'table', head: ['Nº', 'Cenário', 'Severidade por lente', 'Probabilidade', 'Risco'], widths: [6, 40, 20, 12, 22], rows: lista.map((c, i) => [String(i + 1), c.titulo, sevCel(c), c.prob ? c.prob + ' ' + PROB_NOME(c.prob) : '—', riscoCel(c)]) });
    if (!lista.length) B.push({ t: 'callout', tone: 'info', title: 'Sem cenários', text: 'Nenhum cenário atende ao filtro escolhido.' });
    lista.forEach((c, i) => {
      if (op.umaPorPagina !== false) B.push({ t: 'pagebreak' });
      B.push({ t: 'h1', text: (i + 1) + ' ' + c.titulo });
      if (c.risco.v) B.push({ t: 'callout', tone: TOM_RISCO[c.risco.nome] || 'info', title: 'Risco: ' + riscoCel(c), text: sevTxt(c).replace(/^./, (m) => m.toUpperCase()) + '; probabilidade ' + c.prob + ' (' + PROB_NOME(c.prob) + ').' + (c.risco.psif ? ' Potencial de causar fatalidade (PSIF, lente de pessoas).' : '') });
      if (c.proprio && (c.origem || c.ref)) B.push({ t: 'p', small: true, text: 'Origem: ' + nz(c.origem) + (c.ref ? ' | ' + c.ref : '') + (c.data ? ' | ' + fmtData(c.data) : '') });
      B.push({ t: 'kv', rows: [['Como pode acontecer', nz(c.causas)], ['O que pode acontecer', nz(c.consequencias)]] });
      B.push({ t: 'p', bold: true, text: 'Como prevenir' });
      B.push({ t: 'list', items: (c.medidas || []).length ? c.medidas : ['Medidas não registradas.'] });
      if ((c.discussao || []).length) { B.push({ t: 'p', bold: true, text: 'Para discutir' }); B.push({ t: 'list', ordered: true, items: c.discussao }); }
      if (c.obs) B.push({ t: 'kv', rows: [['Medidas adicionais e observações', c.obs]] });
      B.push({ t: 'table', head: ['Anotações e decisões da reunião ou do treinamento'], rows: [[' '], [' '], [' ']], tall: true });
    });
    if (op.listaPresenca !== false) {
      B.push({ t: 'pagebreak' });
      B.push({ t: 'h1', text: 'Lista de presença' });
      B.push({ t: 'kv', rows: [['Atividade', ''], ['Data', ''], ['Instrutor ou facilitador', '']] });
      B.push({ t: 'table', head: ['Nome', 'Função', 'Assinatura'], widths: [38, 28, 34], rows: Array.from({ length: 12 }, () => [' ', ' ', ' ']), tall: true });
    }
    B.push({ t: 'p', small: true, text: 'Cenários e medidas são pontos de partida, revistos pelo responsável técnico. Apoio ao treinamento: não substitui o plano de emergência do local.' });
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao]] });
    return B;
  }

  // seção do relatório de homologação: cenários do local de armazenamento do produto
  function cenariosDoProduto(p, produtos) {
    const lc = localDe(p); if (!lc || p.armazenamento === 'granel') return [];
    const ar = E.analiseRiscoLocal(lc, produtos, p); const R = O.RISCO;
    const B = [{ t: 'h2', text: 'Cenários de risco do local de armazenamento' }];
    B.push({ t: 'p', small: true, text: 'Cenários da análise de risco de ' + lc.nome + ', considerando este produto. A análise completa está no documento "Análise de risco do armazém" do local; os níveis dependem das avaliações de severidade e probabilidade ali registradas.' });
    B.push({ t: 'table', head: ['Cenário', 'Severidade por lente', 'Probabilidade', 'Risco'], widths: [38, 26, 14, 22], rows: ar.cenarios.map((c) => [c.titulo + (c.proprio ? ' (adicionado)' : ''), sevCel(c), c.prob ? c.prob + ' ' + PROB_NOME(c.prob) : '—', riscoCel(c)]) });
    const graves = ar.cenarios.filter((c) => c.risco.grave);
    if (graves.length) { B.push({ t: 'callout', tone: 'crit', title: graves.length + ' cenário(s) de risco grave', text: graves.map((c) => c.titulo).join('; ') + '. Confirme as medidas de controle antes do primeiro recebimento.' }); graves.forEach((c) => B.push({ t: 'kv', rows: [[c.titulo, c.medidas.join('\n')]] })); }
    else if (ar.resumo.semAvaliar) B.push({ t: 'p', small: true, text: ar.resumo.semAvaliar + ' cenário(s) ainda sem avaliação de severidade e probabilidade.' });
    return B;
  }

  // ---------------------------------------------------------------- Análise de risco do armazém (NBR 17160, Seção 5 e Anexo A)
  function analiseRiscoLocal(local, produtos) {
    const a = E.analiseRiscoLocal(local, produtos); const sg = signer(null);
    const pseudo = { nome: local.nome, dec: { numero: '' }, rotulo: 'Armazém', pseudo: true };
    const B = [capa('Análise de risco do armazém', 'QUIM 360 | Análise de risco | ABNT NBR 17160:2024, Seção 5 | ' + local.nome, pseudo, [['Local', local.nome + ' (' + local.tipo + ')'], ['Data da análise', a.data ? fmtData(a.data) : fmtData(new Date().toISOString())], ['Próxima revisão', a.revisao ? fmtData(a.revisao) : 'não definida']])];
    B.push({ t: 'callout', tone: a.resumo.grave ? 'crit' : a.resumo.semAvaliar ? 'warn' : 'ok', title: 'Resumo dos cenários', text: a.cenarios.length + ' cenários: ' + a.resumo.grave + ' grave(s)' + (a.resumo.psif ? ' (' + a.resumo.psif + ' com PSIF na lente de pessoas)' : '') + ', ' + a.resumo.medio + ' médio(s), ' + a.resumo.baixo + ' baixo(s), ' + a.resumo.desprezivel + ' desprezível(is), ' + a.resumo.semAvaliar + ' ainda sem avaliação de severidade e probabilidade.' });
    B.push({ t: 'h1', text: '1 Identificação do armazém' });
    B.push({ t: 'kv', rows: [['Local', local.nome], ['Tipo', local.tipo], ['Área do setor', local.areaM2 ? local.areaM2 + ' m²' : 'não informada'], ['Ao ar livre', local.aoArLivre ? 'Sim' : 'Não'], ['Armário de segurança', local.armarioSeg ? 'Sim' : 'Não'], ['Área de vendas ou instalação residencial', local.areaVendas ? 'Sim' : 'Não'], ['Descrição e contenção', nz(local.descricao)], ['Massa líquida total', Math.round(a.gatilhos.total).toLocaleString('pt-BR') + ' kg']] });
    B.push({ t: 'h1', text: '2 Aspectos da análise (5.1)' });
    B.push({ t: 'table', head: ['Item', 'Aspecto', 'Constatação'], widths: [8, 36, 56], rows: a.aspectos.map((x) => [x.id, x.texto, [x.auto, x.valor].filter(Boolean).join('\n') || 'Não registrado']) });
    B.push({ t: 'h1', text: '3 Considerações da análise (5.2)' });
    B.push({ t: 'table', head: ['Item', 'Consideração', 'Constatação'], widths: [8, 36, 56], rows: a.consid.map((x) => [x.id, x.texto, [x.auto, x.valor].filter(Boolean).join('\n') || 'Não registrado']) });
    B.push({ t: 'h1', text: '4 Informações adicionais (Anexo A, informativo)' });
    B.push({ t: 'table', head: ['Item', 'Ponto a considerar'], widths: [8, 92], rows: a.anexoA.map((x) => [x[0], x[1]]) });
    if (a.ameacas) B.push({ t: 'kv', rows: [['Análise de ameaças e vulnerabilidades (A.8)', a.ameacas]] });
    B.push({ t: 'h1', text: '5 Cenários de risco' });
    B.push({ t: 'p', small: true, text: 'Severidade (em cada lente: pessoas, meio ambiente e processo e patrimônio) e probabilidade de 1 a 5; risco = severidade x probabilidade. Grave: severidade 4 ou 5, ou score 12 ou mais; médio: 6 a 11; baixo: 3 a 5; desprezível: 2 ou menos. O nível do cenário é o da lente mais alta. PSIF só se aplica à lente de pessoas. O critério pode ser substituído pelo da organização. Cenários e medidas são pontos de partida a revisar pelo responsável técnico.' });
    B.push({ t: 'table', head: ['Cenário', 'Severidade por lente', 'Probabilidade', 'Risco', 'Checklist'], widths: [30, 22, 12, 18, 18], rows: a.cenarios.map((c) => [c.titulo, sevCel(c), c.prob ? c.prob + ' ' + PROB_NOME(c.prob) : '—', riscoCel(c), c.checklist.total ? c.checklist.c + ' conf., ' + c.checklist.nc + ' não conf., ' + c.checklist.aberto + ' sem resposta' : 'sem itens']) });
    a.cenarios.forEach((c, i) => {
      B.push({ t: 'h2', text: '5.' + (i + 1) + ' ' + c.titulo + (c.proprio ? ' (cenário adicionado)' : '') });
      B.push({ t: 'kv', rows: (c.proprio ? [['Origem', nz(c.origem) + (c.ref ? ' | ' + c.ref : '') + (c.data ? ' | ' + fmtData(c.data) : '')]] : []).concat([['Causas', c.causas], ['Consequências', c.consequencias], ['Medidas de controle', c.medidas.join('\n')], ['Severidade por lente', sevCel(c)], ['Probabilidade', c.prob ? c.prob + ' ' + PROB_NOME(c.prob) : 'não avaliada'], ['Nível de risco', c.risco.v ? riscoCel(c) + (c.risco.psif ? ' | PSIF (lente de pessoas)' : '') : 'não avaliado'], ['Medidas adicionais e observações', nz(c.obs)]]) });
    });
    if (a.desativados.length) { B.push({ t: 'h2', text: 'Cenários padrão desativados neste local' }); B.push({ t: 'table', head: ['Cenário', 'Justificativa'], widths: [40, 60], rows: a.desativados.map((c) => [c.titulo, nz(c.offJust)]) }); }
    B.push({ t: 'h1', text: '6 Conclusão' });
    B.push({ t: 'p', text: a.conclusao || 'Conclusão da análise não registrada.' });
    B.push({ t: 'p', small: true, text: 'A análise de risco deve ser revista quando houver mudança de produtos, de quantidades, do layout ou após incidentes. Apoio à decisão: a responsabilidade técnica é do profissional que assina.' });
    B.push({ t: 'h1', text: '7 Critério de risco: matrizes por lente e situações de enquadramento' });
    criterioRisco().forEach((b) => B.push(b));
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao], ['Gestor do local', '']] });
    return B;
  }

  // ---------------------------------------------------------------- Checklist do local (NBR 17160)
  function checklistLocal(local, produtos) {
    const RQ = O.NBR17160REQ; const r = E.requisitosLocal(local, produtos);
    const pseudo = { nome: local.nome, dec: { numero: '' }, rotulo: 'Armazém', pseudo: true };
    const RESP = { c: 'Conforme', nc: 'NÃO CONFORME', na: 'Não se aplica', '': 'Sem resposta' };
    const B = [capa('Checklist de requisitos da NBR 17160', 'QUIM 360 | Armazenamento seguro | ' + local.nome, pseudo, [['Local', local.nome + ' (' + local.tipo + ')' + (local.aoArLivre ? ', ao ar livre' : '') + (local.armarioSeg ? ', armário de segurança' : '')], ['Requisitos aplicáveis', String(r.cont.total)]])];
    B.push({ t: 'callout', tone: r.cont.nc ? 'crit' : r.cont.aberto ? 'warn' : 'ok', title: r.cont.nc ? r.cont.nc + ' requisito(s) não conforme(s)' : r.cont.aberto ? 'Checklist incompleto' : 'Sem não conformidades', text: r.cont.c + ' conformes, ' + r.cont.nc + ' não conformes, ' + r.cont.na + ' não se aplicam, ' + r.cont.aberto + ' sem resposta.' });
    if (r.gatilhos.exige.length) { B.push({ t: 'h2', text: 'Por que estes requisitos se aplicam' }); B.push({ t: 'list', items: r.gatilhos.exige }); }
    const nc = r.itens.filter((i) => i.resp === 'nc');
    if (nc.length) { B.push({ t: 'h1', text: 'Não conformidades' }); B.push({ t: 'table', head: ['Item', 'Requisito', 'Observação'], widths: [10, 60, 30], rows: nc.map((i) => [i.id, i.texto, i.obs || '—']) }); }
    let n = 0;
    Object.keys(RQ.GRUPOS).forEach((gk) => {
      const it = r.itens.filter((i) => i.grupo === gk); if (!it.length) return;
      B.push({ t: 'h1', text: (++n) + ' ' + RQ.GRUPOS[gk] });
      B.push({ t: 'table', head: ['Item', 'Requisito', 'Situação', 'Observação'], widths: [9, 53, 14, 24], rows: it.map((i) => [i.id, i.texto + (i.semTexto ? ' [texto não transcrito]' : ''), RESP[i.resp], i.obs || '—']) });
    });
    B.push({ t: 'h1', text: (++n) + ' Inspeções (6.3.9)' });
    B.push({ t: 'p', small: true, text: 'Intervalo definido pelo empregador: ' + (r.periodo ? r.periodo + ' dias' : 'não informado') + (r.proxima ? '. Próxima inspeção até ' + fmtData(r.proxima) + (r.vencida ? ' (vencida)' : '') : '') + '.' });
    B.push({ t: 'table', head: ['Data', 'Responsável', 'Resultado', 'Itens verificados', 'Observações'], widths: [14, 22, 16, 18, 30], rows: r.inspecoes.length ? r.inspecoes.map((x) => [fmtData(x.data), x.resp, x.resultado === 'conforme' ? 'Conforme' : 'Com pendências', (x.itens || []).length + ' de ' + RQ.INSPECAO.length, x.obs || '—']) : [['Sem inspeção registrada', '', '', '', '']] });
    B.push({ t: 'p', small: true, text: 'Requisitos condensados da ABNT NBR 17160:2024, com o número do item. A norma vigente prevalece; itens marcados "texto não transcrito" devem ser verificados diretamente na norma.' });
    B.push({ t: 'sign', rows: [[signer(null).nome, signer(null).funcao], ['Gestor do local', '']] });
    return B;
  }

  // ---------------------------------------------------------------- Inventário do local (NBR 17160, 6.1.5)
  const ST_TXT = { dentro: 'Dentro do limite', armazem: 'Exige armazém (6.3.1)', analise: 'Definir pela análise de risco', secoes: 'Seções adicionais' };
  function inventarioLocal(local, produtos) {
    const g = E.gatilhosLocal(local, produtos);
    const pseudo = { nome: local.nome, dec: { numero: '' }, rotulo: 'Armazém', pseudo: true };
    const B = [capa('Inventário de produtos perigosos', 'QUIM 360 | Inventário e quantidades-limite | ABNT NBR 17160:2024', pseudo, [['Local', local.nome + ' (' + local.tipo + ')'], ['Itens', String(g.itens.length)], ['Massa líquida total', Math.round(g.total).toLocaleString('pt-BR') + ' kg']])];
    B.push({ t: 'h1', text: '1 Inventário (6.1.5)' });
    B.push({ t: 'table', head: ['Produto', 'Classificação', 'Classe de armazenamento', 'Quantidade', 'Setor'], widths: [28, 22, 18, 14, 18], rows: g.itens.length ? g.itens.map((i) => [i.nome, (i.h || []).join(', ') || 'sem frases H informadas', i.arm || 'não definida' + (i.aprox ? ' (aprox.)' : ''), i.qtd != null ? String(i.qtd).replace('.', ',') + ' kg' : 'não informada', local.nome]) : [['Sem itens', '', '', '', '']] });
    if (g.semQtd.length) B.push({ t: 'callout', tone: 'warn', title: 'Quantidade não informada', text: g.semQtd.join('; ') + '. O inventário da NBR 17160 exige a quantidade de cada produto.' });
    B.push({ t: 'h1', text: '2 Quantidades-limite (Tabela 1)' });
    B.push({ t: 'p', small: true, text: 'Quantidade agregada por perigo: massa líquida em kg (gases em L; inflamáveis pelo volume nominal da embalagem, 6.2.8). Itens sem frase H usam a classe de armazenamento e são aproximados.' });
    B.push({ t: 'table', head: ['Perigo', 'Quantidade', 'Limite fora de armazém', 'Situação', 'Passa a valer'], widths: [34, 12, 16, 18, 20], rows: g.cats.length ? g.cats.map((x) => [x.rotulo + (x.aprox ? ' (aprox.)' : '') + ' | ' + x.itens.join(', '), String(Math.round(x.qtd * 100) / 100).replace('.', ',') + ' ' + x.unidade, x.fora != null ? String(x.fora).replace('.', ',') + ' ' + x.unidade : 'não indicado', ST_TXT[x.status], x.status === 'secoes' ? x.secoes : x.status === 'analise' ? x.analise : '—']) : [['Sem dados', '', '', '', '']] });
    if (g.exige.length) { B.push({ t: 'h1', text: '3 O que passa a valer neste local' }); B.push({ t: 'list', items: g.exige }); }
    g.conjuntas.forEach((j) => B.push({ t: 'callout', tone: 'warn', title: j.titulo.split(' |')[0] + ' | classes ' + j.classes.join(', ') + ': ' + Math.round(j.qtd) + ' kg (' + j.faixa + ')', text: j.texto }));
    const ct = E.contencaoLocal(local, produtos);
    B.push({ t: 'h1', text: (g.exige.length ? '4' : '3') + ' Contenção da água de extinção (Anexo F)' });
    if (ct.linhas.length) B.push({ t: 'table', head: ['Produto', 'Pontos', 'CPA', 'Composição'], widths: [34, 10, 10, 46], rows: ct.linhas.map((x) => [x.nome, String(x.pontos), 'CPA ' + x.cpa, x.detalhe.join('; ') || '—']) });
    if (ct.semDados.length) B.push({ t: 'p', small: true, text: 'Sem frases H (fora do cálculo): ' + ct.semDados.join('; ') + '.' });
    const fm = (n) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');
    B.push({ t: 'kv', rows: [['Área do setor', ct.areaM2 ? fm(ct.areaM2) + ' m²' : 'não informada'], ['Categoria de segurança', ct.catK || 'não informada (considerada K1/K2)'], ['Classe de perigo à água do local', 'CPA ' + ct.cpa], ['Volume pela Tabela F.1', ct.vol ? fm(ct.vol.base) + ' m³' : 'informe a área do setor'], ['Volume com fator de CPA', ct.vol ? fm(ct.vol.total) + ' m³' : '—'], ['Volume de material que pode vazar', ct.material ? fm(ct.material) + ' m³' : 'não informado'], ['Volume total a reter', ct.total != null ? fm(ct.total) + ' m³' : '—']] });
    B.push({ t: 'p', small: true, text: O.NBR17160.F1_NOTA + ' O Anexo F é informativo; considere as exigências do corpo de bombeiros e do órgão ambiental.' });
    const hs = E.historicoLocal(local, produtos);
    B.push({ t: 'h1', text: 'Histórico de entradas e saídas' });
    B.push({ t: 'p', small: true, text: 'O inventário e os cálculos acima consideram só o que está em estoque agora. Aqui ficam todos os movimentos registrados neste local.' });
    B.push({ t: 'table', head: ['Data', 'Produto', 'Movimento', 'Quantidade', 'Responsável', 'Observação'], widths: [11, 28, 12, 12, 17, 20], rows: hs.movs.length ? hs.movs.map((m) => [fmtData(m.data), m.produto, { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' }[m.tipo] || m.tipo, m.qtdKg !== '' && m.qtdKg != null ? String(m.qtdKg).replace('.', ',') + ' kg' : '—', nz(m.resp), nz(m.obs)]) : [['Sem movimentos registrados', '', '', '', '', '']] });
    if (hs.semEstoque.length) B.push({ t: 'p', small: true, text: 'Homologados para este local, sem estoque agora: ' + hs.semEstoque.join('; ') + '.' });
    B.push({ t: 'p', small: true, text: 'As seções 7 a 14 e os anexos exigidos devem ser atendidos conforme o texto da norma vigente. Este quadro orienta a análise e não substitui a decisão do responsável técnico.' });
    B.push({ t: 'sign', rows: [[signer(null).nome, signer(null).funcao], ['Gestor do local', '']] });
    return B;
  }

  // ---------------------------------------------------------------- Relatório da análise da FDS
  function analiseFds(p, produtos) {
    const av = E.avaliar(p, produtos);
    const st = STATUS[av.sugestao] || STATUS.em_analise;
    const idade = E.idadeFds(p);
    const B = [];
    B.push(capa('Relatório da análise da FDS', 'QUIM 360 | Análise da FDS | ' + fmtData(new Date().toISOString()) + ' | ' + nz(p.nome), p, [['Natureza', p.natureza === 'carga' ? 'Produto armazenado pelo terminal (carga)' : p.natureza === 'insumo' ? 'Insumo' : 'Não informada']]));
    const bloqueios = av.reprovacoes.concat(av.pendencias, av.condicionantes);
    B.push({ t: 'callout', tone: av.sugestao === 'reprovado' ? 'crit' : av.sugestao === 'homologado' ? 'ok' : 'warn', title: 'Resultado preliminar da análise: ' + st[0], text: bloqueios.length ? bloqueios.join(' ') : 'Nenhum impedimento identificado nos dados informados. A decisão formal é do responsável técnico.' });
    av.alertas.forEach((a) => B.push({ t: 'callout', tone: 'warn', title: 'Alerta', text: a }));

    B.push({ t: 'h1', text: '1 Identificação e validade da FDS' });
    const sec = p.fds.secoesOk || {};
    const faltam = Object.keys(sec).filter((k) => !sec[k]);
    B.push({ t: 'kv', rows: [
      ['Produto', nz(p.nome)], ['Fornecedor / fabricante', nz(p.fornecedor)], ['Data da revisão', fmtData(p.fds.dataRevisao)], ['Versão', nz(p.fds.versao)],
      ['Idade da FDS', idade == null ? '—' : idade.toFixed(1).replace('.', ',') + ' anos (limite configurado: ' + cfg().anosValidadeFDS + ')'],
      ['Idioma', p.fds.portugues === true ? 'Português' : p.fds.portugues === false ? 'Não identificado como português' : '—'],
      ['Seções localizadas', Object.keys(sec).length ? (Object.keys(sec).length - faltam.length) + ' de 16' : 'FDS não analisada'],
    ] });
    if (Object.keys(sec).length) B.push({ t: 'table', head: ['Seção', 'Título (ABNT NBR 14725)', 'Situação'], widths: [10, 66, 24], rows: O.FDS.SEC_TITLES.map((t, i) => [String(i + 1), t, sec[i + 1] ? 'Localizada' : 'Ausente']) });

    B.push({ t: 'h1', text: '2 Classificação GHS' });
    const dv = G.derive(p.ghs.h || []);
    const pict = (p.ghs.pictos && p.ghs.pictos.length) ? p.ghs.pictos : dv.pictos;
    if (pict.length) B.push({ t: 'imgs', items: pict.map((x) => ({ svg: O.Pic.ghs(x, 72), w: 72, h: 72, cap: G.PICTO[x] })) });
    B.push({ t: 'kv', rows: [['Palavra de advertência', nz(p.ghs.palavra || dv.palavra)]] });
    if ((p.ghs.h || []).length) B.push({ t: 'table', head: ['Frase H', 'Texto'], widths: [14, 86], rows: p.ghs.h.map((h) => [h, G.hText(h) || 'Frase não reconhecida']) });
    else B.push({ t: 'p', text: 'Nenhuma frase H informada ou lida na FDS.' });
    const gp = agrupaP(p);
    const linhasP = Object.keys(gp).filter((k) => gp[k].length).map((k) => [k, gp[k].join('\n')]);
    if (linhasP.length) B.push({ t: 'table', head: ['Precaução', 'Frases P'], widths: [18, 82], rows: linhasP });

    B.push({ t: 'h1', text: '3 Composição e triagem de cancerígeno, mutagênico, teratogênico e PFC' });
    const cas = p.fds.cas || [];
    const marca = (c) => { const m = []; [['cancerigeno', 'cancerígeno'], ['reprotoxico', 'tóxico à reprodução'], ['mutagenico', 'mutagênico'], ['pfas', 'PFAS']].forEach(([k, n]) => { const w = T.WATCH[k].find((x) => x[0] === c); if (w) m.push(n + ' (' + w[1] + ')'); }); return m.join('; '); };
    if (cas.length) B.push({ t: 'table', head: ['CAS', 'Lista de alerta'], widths: [26, 74], rows: cas.map((c) => [c, marca(c) || 'Sem registro na lista de alerta']) });
    const tri = av.tri;
    B.push({ t: 'table', head: ['Critério', 'Resultado'], widths: [34, 66], rows: [
      ['Cancerígeno', tri.criticos.some((c) => c.tipo === 'cancerigeno') ? 'Identificado' : 'Não identificado'],
      ['Mutagênico', tri.criticos.some((c) => c.tipo === 'mutagenico') ? 'Identificado' : 'Não identificado'],
      ['Teratogênico / tóxico à reprodução', tri.criticos.some((c) => c.tipo === 'teratogenico' || c.tipo === 'reprodutivo') ? 'Identificado' : 'Não identificado'],
      ['Contém PFCs / PFAS', tri.criticos.some((c) => c.tipo === 'pfc') ? 'Identificado' : 'Não identificado'],
    ] });
    if (tri.criticos.length) B.push({ t: 'list', items: tri.criticos.map((c) => c.detalhe + ' [' + c.fonte + ']') });
    blocosAlternativas(p).forEach((b) => B.push(b));
    B.push({ t: 'p', small: true, text: 'Cancerígeno, mutagênico, teratogênico e PFC acionam o gatilho de reprovação automática: o app sinaliza e a decisão é do responsável técnico, com justificativa, controles de exposição e parecer de Higiene Ocupacional.' });

    B.push({ t: 'h1', text: '4 Transporte e armazenamento' });
    const n20 = E.nr20(p); const ca = E.classeArm(p); const cb = E.combustivel(p);
    B.push({ t: 'kv', rows: [
      ['Número ONU', nz(p.imdg.onu)], ['Nome apropriado para embarque', nz(p.imdg.nome)], ['Classe / subclasse', nz(p.imdg.classe) + (p.imdg.subrisco ? ' / ' + p.imdg.subrisco : '')],
      ['Grupo de embalagem', nz(p.imdg.pg)], ['Número de risco', nz(p.imdg.numeroRisco)], ['Ponto de fulgor', p.imdg.pontoFulgor === '' ? '—' : p.imdg.pontoFulgor + ' °C'],
      ['NR-20', n20.aplica ? n20.categoria : 'Não aplicável pelo ponto de fulgor e frases H'],
      ['Classe de armazenamento (NBR 17160)', p.armazenamento === 'granel' ? 'Não se aplica: tanque está fora do escopo da NBR 17160 (NBR 17505 e NR-20)' : ca.id + ' | ' + O.NBR17160.nome(ca.id) + ' | ' + ca.motivo],
      ['Combustível', (cb.valor ? 'Sim' : 'Não') + ' | ' + cb.origem],
      ['Incompatível com (Seções 7 e 10)', (p.comp.incompativeis || []).length ? p.comp.incompativeis.map(nomeG).join(', ') : 'Nenhuma identificada'],
      ['Grupos de reatividade do produto', (p.comp.grupos || []).length ? p.comp.grupos.map(nomeG).join(', ') : '—'],
    ] });
    const lims = O.NBR17160.LIMITES.filter((l) => (p.ghs.h || []).some((c) => l.re.test(c)));
    if (lims.length && p.armazenamento !== 'granel') B.push({ t: 'table', head: ['Perigo', 'Limite fora de armazém', 'Acima do limite'], widths: [38, 24, 38], rows: lims.map((l) => [l.rotulo, l.limite, l.acima]) });

    B.push({ t: 'h1', text: '5 Controles sugeridos pela análise' });
    const sg = E.sugestoes(p);
    const linhasS = [['Substituição', sg.ocup.subst], ['Engenharia', sg.ocup.eng], ['Administrativos', sg.ocup.adm], ['EPI', sg.ocup.epi], ['Contenção ambiental', sg.amb.contencao], ['Resposta a derramamento', sg.amb.derramamento], ['Resíduos', sg.amb.residuos]].filter((x) => x[1].length).map((x) => [x[0], x[1].join('\n')]);
    if (linhasS.length) B.push({ t: 'table', head: ['Tipo', 'Sugestão'], widths: [24, 76], rows: linhasS });
    else B.push({ t: 'p', text: 'Nenhum controle adicional sugerido pelas frases H.' });
    if (sg.controlesArm.length) B.push({ t: 'p', text: 'Controles de armazenamento sugeridos: ' + sg.controlesArm.map(ctrlNome).join('; ') + '.' });

    B.push({ t: 'h1', text: '6 Dados que a FDS não traz e dependem de você' });
    B.push({ t: 'list', items: O.Auto.faltam(p) });
    B.push({ t: 'h2', text: 'Base técnico-legal' });
    B.push({ t: 'list', items: T.BASE_LEGAL.map((b) => b.sigla + ': ' + b.titulo) });
    B.push({ t: 'p', small: true, text: 'Análise automática da FDS: apoio à decisão. Valores lidos do texto devem ser conferidos contra a FDS vigente do fornecedor.' });
    B.push({ t: 'sign', rows: [[signer(p).nome, signer(p).funcao]] });
    return B;
  }

  // ---------------------------------------------------------------- Quadro de compatibilidade
  function quadroCompat(destaque, produtos, tituloLocal, incluir, planejamento) {
    const lista = (planejamento ? E.homologados(produtos) : E.estoqueAtivo(produtos)).filter((x) => x.armazenamento !== 'granel');
    (incluir || []).forEach((x) => { if (x.armazenamento !== 'granel' && !lista.some((y) => y.id === x.id)) lista.push(x); });
    if (destaque && !lista.some((x) => x.id === destaque.id) && destaque.armazenamento !== 'granel') lista.push(destaque);
    const L = lista.slice().sort((a, b) => ((localDe(a) || {}).nome || '').localeCompare((localDe(b) || {}).nome || '') || a.nome.localeCompare(b.nome));
    const pseudo = { nome: destaque ? destaque.nome : (tituloLocal || 'Produtos homologados'), dec: { numero: '' } };
    const B = [capa('Quadro de compatibilidade', 'QUIM 360 | Compatibilidade entre produtos | ABNT NBR 17160:2024', pseudo, [['Produtos comparados', String(L.length)], ['Critério', 'Matriz de incompatibilidade da NBR 17160 e reatividade pela Seção 10 da FDS']])];
    if (L.length < 2) { B.push({ t: 'callout', tone: 'info', title: 'Quadro indisponível', text: 'São necessários ao menos 2 produtos (homologados, ou o produto em análise mais 1 homologado) em armazenamento embalado.' }); return B; }
    const tom = { incompativel: ['crit', 'X'], restricao: ['warn', null], livre: ['ok', 'OK'], verificar: ['info', '?'] };
    let nProib = 0, nRest = 0, nLivre = 0, nVer = 0; const pares = [];
    const rows = L.map((a, i) => L.map((b, j) => {
      if (i === j) return { txt: '—', tone: 'self' };
      const r = E.compatPar(a, b); const t = tom[r.nivel];
      if (i < j) { if (r.nivel === 'incompativel') nProib++; else if (r.nivel === 'restricao') nRest++; else if (r.nivel === 'livre') nLivre++; else nVer++; if (r.nivel !== 'livre') pares.push([i + 1, j + 1, a, b, r]); }
      return { txt: t[1] || r.codigo || 'R', tone: t[0] };
    }));
    B.push({ t: 'callout', tone: nProib ? 'crit' : nRest ? 'warn' : 'ok', title: nProib + ' par(es) proibido(s), ' + nRest + ' com restrição, ' + nLivre + ' permitido(s)' + (nVer ? ', ' + nVer + ' a verificar' : ''), text: 'Entre ' + L.length + ' produtos, ' + (L.length * (L.length - 1) / 2) + ' pares avaliados.' });
    B.push({ t: 'h1', text: '1 Produtos comparados' });
    B.push({ t: 'table', head: ['Nº', 'Produto', 'Classe de armazenamento', 'Local', 'Registro'], widths: [6, 38, 20, 22, 14], rows: L.map((p, i) => [String(i + 1), p.nome + (destaque && p.id === destaque.id ? ' (em análise)' : ''), E.classeArm(p).id + ' | ' + O.NBR17160.nome(E.classeArm(p).id), (localDe(p) || {}).nome || '—', nz(p.dec.numero)]) });
    B.push({ t: 'h1', text: '2 Quadro comparativo' });
    B.push({ t: 'matrix', labels: L.map((_, i) => String(i + 1)), rows });
    B.push({ t: 'p', small: true, text: 'Legenda: X proibido | número restrição da NBR 17160 (ver observação) | OK permitido | ? classe não definida | — mesmo produto.' });
    B.push({ t: 'h1', text: '3 Pares que exigem atenção' });
    if (!pares.length) B.push({ t: 'callout', tone: 'ok', title: 'Nenhuma restrição', text: 'Todos os pares são permitidos pela matriz e sem reatividade declarada.' });
    else B.push({ t: 'table', head: ['Par', 'Classes', 'Resultado', 'Orientação'], widths: [24, 12, 14, 50], rows: pares.map(([i, j, a, b, r]) => [i + ' x ' + j + '\n' + a.nome + '\n' + b.nome, r.par.join(' x '), (r.nivel === 'incompativel' ? (r.codigo === 'R' ? 'Proibido (matriz)' : 'Proibido (reatividade da FDS)') : E.NIVEL[r.nivel] + (r.codigo && !['R', 'G'].includes(r.codigo) ? ' ' + r.codigo : '')), r.acao + (r.motivos.length ? '\n' + r.motivos.join('\n') : '')]) });
    B.push({ t: 'h1', text: '4 Grupos que podem dividir o mesmo setor de armazém' });
    const grupos = E.gruposCompativeis(L);
    B.push({ t: 'p', text: 'Cada grupo reúne produtos com todos os pares permitidos e sem restrição. Produtos de grupos diferentes devem ficar em setores, contêineres ou armários distintos, ou cumprir as restrições da seção 3.' });
    B.push({ t: 'table', head: ['Grupo', 'Produtos'], widths: [14, 86], rows: grupos.map((g, i) => ['Grupo ' + String.fromCharCode(65 + i), g.map((p) => (L.indexOf(p) + 1) + ' ' + p.nome).join('\n')]) });
    B.push({ t: 'p', small: true, text: 'Produtos a granel em tanque ficam fora do quadro (fora do escopo da NBR 17160). A matriz considera a classe de armazenamento; a incompatibilidade também depende de combustão, gases, corrosivos e substâncias instáveis formadas (item 9.1.1 da norma). Confirme nas Seções 7 e 10 da FDS.' });
    B.push({ t: 'sign', rows: [[signer(destaque || null).nome, signer(destaque || null).funcao]] });
    return B;
  }

  // ---------------------------------------------------------------- Solicitação ao fornecedor
  function solicitacaoFornecedor(p, motivos) {
    return 'Assunto: Solicitação de FDS corrigida: ' + nz(p.nome) + '\n\n' +
      'Prezados,\n\nA análise de homologação do produto ' + nz(p.nome) + ' identificou pendências na FDS:\n' +
      motivos.map((m) => '- ' + m).join('\n') + '\n\nSolicitamos o envio da FDS em português, conforme ABNT NBR 14725:2023, com as 16 seções completas e data de revisão atualizada.\n\nPróximo passo: envio até ____/____/______.\n\n' + cfg().responsavel + (cfg().registro ? ' | ' + cfg().registro : '');
  }

  // ---------------------------------------------------------------- Análise de compatibilidade do produto a granel
  function compatTanque(p, produtos) {
    const R = O.RISCO; const at = E.analiseTanque(p, O.Store.bacias(), produtos); const ce = R.CENARIO_TANQUE; const cn = E.tanqueDe(p).cenario; const nv = R.nivelCenario(cn); const sg = signer(p);
    const N = E.NIVEL_GRANEL;
    const base = (res) => (res.consulta ? 'Consulta: ' + nz(res.consulta.fonte) + ' em ' + fmtData(res.consulta.data) + (res.diverge ? ' | a FDS declara incompatibilidade (mantido o resultado mais conservador)' : '') : res.decl.length ? res.decl.join(' ') : res.fds === 'sem_dados' ? 'FDS sem dados suficientes' : 'FDS sem incompatibilidade declarada');
    const B = [capa('Análise de compatibilidade do produto a granel', 'QUIM 360 | Vazamento simultâneo de tanques | ' + nz(p.nome), p, [['Bacias analisadas', String(at.bacias.length)], ['Produtos do terminal considerados', String(at.terminal.length)]])];
    B.push({ t: 'callout', tone: at.resumo.incompativel ? 'crit' : (at.resumo.sem_dados || at.semBacias || at.resumo.restricao) ? 'warn' : 'ok', title: 'Resumo', text: at.semBacias ? 'Nenhuma bacia cadastrada: a compatibilidade com os produtos do terminal não foi analisada.' : at.terminal.length + ' produto(s) do terminal: ' + at.resumo.incompativel + ' incompatível(is), ' + at.resumo.restricao + ' com restrição, ' + at.resumo.sem_dados + ' sem dados, ' + at.resumo.nada + ' sem incompatibilidade declarada.' });
    B.push({ t: 'h1', text: '1 Método e limites' });
    B.push({ t: 'p', text: 'Em caso de emergência, mais de um tanque pode vazar e produtos diferentes se encontram na mesma bacia, na canaleta ou na drenagem comum. Esta análise compara o produto com cada bacia e com os produtos do terminal.' });
    B.push({ t: 'list', items: ['Base: incompatibilidades declaradas na Seção 10 das FDS e consulta externa registrada pelo analista (por exemplo, NOAA CAMEO Chemicals).', 'Não usa a matriz da ABNT NBR 17160, que trata de armazenamento embalado.', '"Sem incompatibilidade declarada" não prova compatibilidade: só indica que as FDS não declaram. Pares sem dados exigem consulta e registro.', 'Em caso de divergência entre FDS e consulta, prevalece o resultado mais conservador.', 'O resultado só sinaliza: a decisão de alocar o produto, as medidas e a justificativa são do responsável técnico.'] });
    B.push({ t: 'h1', text: '2 Produto contra cada bacia' });
    if (!at.bacias.length) B.push({ t: 'p', text: 'Nenhuma bacia cadastrada.' });
    at.bacias.forEach((x) => {
      B.push({ t: 'h2', text: 'Bacia ' + x.bacia.nome + ' | lista atualizada em ' + (x.bacia.atualizadoEm ? fmtData(x.bacia.atualizadoEm) : 'data não registrada') });
      B.push(x.pares.length ? { t: 'table', head: ['Produto na bacia', 'Resultado', 'Base'], widths: [30, 22, 48], rows: x.pares.map((q) => [q.outro.nome, N[q.res.nivel], base(q.res)]) } : { t: 'p', small: true, text: 'Sem outros produtos cadastrados nesta bacia.' });
    });
    if (at.desatualizadas.length) B.push({ t: 'callout', tone: 'warn', title: 'Listas desatualizadas', text: at.desatualizadas.map((d) => d.bacia.nome + (d.dias != null ? ' (' + d.dias + ' dias)' : '')).join('; ') + '. Confirme antes de confiar na análise.' });
    B.push({ t: 'h1', text: '3 Produto contra os produtos do terminal' });
    B.push(at.terminal.length ? { t: 'table', head: ['Produto', 'Bacia(s)', 'Resultado', 'Base'], widths: [24, 16, 20, 40], rows: at.terminal.map((v) => [v.outro.nome, v.bacias.join(', '), N[v.res.nivel], base(v.res)]) } : { t: 'p', text: 'Sem produtos cadastrados nas bacias.' });
    const cons = at.terminal.filter((v) => v.res.consulta);
    B.push({ t: 'h1', text: '4 Consultas externas registradas' });
    B.push(cons.length ? { t: 'table', head: ['Produto', 'Resultado', 'Fonte', 'Data', 'Transcrição'], widths: [20, 22, 16, 12, 30], rows: cons.map((v) => [v.outro.nome, (E.RES_CONSULTA.find((r) => r[0] === v.res.consulta.resultado) || [0, v.res.consulta.resultado])[1], nz(v.res.consulta.fonte), fmtData(v.res.consulta.data), nz(v.res.consulta.obs)]) } : { t: 'p', text: 'Nenhuma consulta externa registrada.' });
    B.push({ t: 'h1', text: '5 Cenário: ' + ce.titulo });
    B.push({ t: 'kv', rows: [['Causas', ce.causas], ['Consequências', ce.consequencias], ['Medidas de controle', ce.medidas.join('\n')], ['Severidade por lente', nv.dims.length ? nv.dims.map((x) => x.curto + ': ' + x.sev + ' ' + R.sevNome(x.sev, x.dim)).join('\n') : 'não avaliada'], ['Probabilidade', cn.prob ? cn.prob + ' ' + R.PROB[cn.prob - 1][1] : 'não avaliada'], ['Nível de risco', nv.v ? nv.nome + ' (' + nv.v + ', lente ' + nv.det + ')' + (nv.psif ? ' | PSIF (lente de pessoas)' : '') : 'não avaliado'], ['Observações', nz(cn.obs)]] });
    B.push({ t: 'p', bold: true, text: 'Para discutir com a brigada e a operação' });
    B.push({ t: 'list', ordered: true, items: ce.discussao });
    B.push({ t: 'h1', text: '6 Conclusão do responsável técnico' });
    B.push({ t: 'table', head: ['Conclusão, decisão de alocação e justificativa'], rows: [[' '], [' '], [' ']], tall: true });
    B.push({ t: 'p', small: true, text: 'Cenários e medidas são pontos de partida a revisar. Apoio à decisão: a responsabilidade técnica é do profissional que assina.' });
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao]] });
    return B;
  }

  // ---------------------------------------------------------------- Plano de implantação do produto a granel
  function prontidaoGranel(p, produtos) {
    const av = E.avaliar(p, produtos); const at = E.analiseTanque(p, O.Store.bacias(), produtos); const mu = E.mudancaDe(p); const sg = E.mudancaSugestao(p, produtos);
    const ex = E.exigenciasTanque(p); const im = p.impl || {}; const ok = ['homologado', 'condicionado'].includes(p.status);
    const nvc = O.RISCO.nivelCenario(E.tanqueDe(p).cenario);
    const I = [];
    const add = (item, sit, onde, nota) => I.push({ item, sit, onde, nota: nota || '' });
    add('FDS analisada e dentro da NBR 14725', p.fds.analisada && p.fds.completa !== false && p.fds.atualizada !== false ? 'Pronto' : 'Pendente', 'Etapas 3 a 5');
    add('Triagem CMR e PFC tratada', !E.cmrCarga(p) ? 'Pronto' : (String((p.cmr || {}).justificativa || '').trim() && p.hig.parecerExigidoOk ? 'Pronto' : 'Pendente'), 'Etapa 7', E.cmrCarga(p) ? 'Gatilho acionado: justificativa, controles e parecer de higiene ocupacional' : '');
    add('Exigências do produto para o tanque respondidas', ex.some((x) => !x.atende) ? 'Pendente' : ex.some((x) => ['nao', 'depende'].includes(x.atende)) ? 'Atenção' : 'Pronto', 'Etapa 11.2', ex.some((x) => ['nao', 'depende'].includes(x.atende)) ? 'A frota pode não atender: ver MOC' : '');
    add('Gestão de mudança (MOC) resolvida', mu.exige === true ? (mu.situacao === 'concluido' || (mu.situacao === 'dispensado' && String(mu.just).trim()) ? 'Pronto' : 'Pendente') : mu.exige === false ? (String(mu.just).trim() ? 'Pronto' : 'Pendente') : (sg.sugere ? 'Pendente' : 'Pronto'), 'Etapa 12.3', mu.ref ? 'Ref. ' + mu.ref : '');
    add('Compatibilidade com bacias e produtos do terminal', at.semBacias ? 'Pendente' : at.resumo.sem_dados ? 'Pendente' : at.resumo.incompativel ? 'Atenção' : 'Pronto', 'Etapa 11.2 e menu Bacias', at.resumo.incompativel ? 'Incompatibilidade a decidir pelo responsável técnico' : at.resumo.sem_dados ? at.resumo.sem_dados + ' par(es) sem dados' : '');
    add('Cenário de vazamento simultâneo avaliado', nvc.v ? 'Pronto' : 'Pendente', 'Etapa 11.2', nvc.v ? nvc.nome + ' (lente ' + nvc.det + ')' : '');
    add('Atualização do PGR', p.par.pgrIndicador === 'requer' ? 'Pendente' : 'Pronto', 'Etapa 12.2');
    add('Decisão de homologação registrada', ok ? 'Pronto' : 'Pendente', 'Etapa 13');
    add('Ficha de emergência, rotulagem e envelope emitidos', ok ? 'Pronto' : 'Pendente', 'Documentos do produto', 'Disponíveis após a decisão');
    add('Treinamento realizado', im.treinoData ? 'Pronto' : 'Pendente', 'Registro de implantação', im.treinoData ? fmtData(im.treinoData) : '');
    add('Simulado de emergência com o produto', im.simuladoData ? 'Pronto' : 'Pendente', 'Registro de implantação', im.simuladoData ? fmtData(im.simuladoData) : '');
    add('Comunicação às áreas envolvidas', im.comunicadoData ? 'Pronto' : 'Pendente', 'Registro de implantação', im.comunicadoData ? fmtData(im.comunicadoData) : '');
    return { itens: I, av, at };
  }
  function planoImplantacao(p, produtos) {
    const R = O.RISCO; const ce = R.CENARIO_TANQUE; const sg = signer(p); const ctx = prontidaoGranel(p, produtos); const at = ctx.at;
    const split = (t) => (t || '').split(/\n|\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕ])/).map((x) => x.trim()).filter(Boolean);
    const sec = p.fds.secoes || {}; const inc = at.terminal.filter((v) => v.res.nivel === 'incompativel');
    const pend = ctx.itens.filter((x) => x.sit !== 'Pronto').length;
    const B = [capa('Plano de implantação do produto a granel', 'QUIM 360 | Prontidão, treinamento e emergência | ' + nz(p.nome), p, [['Classe do líquido (NBR 17505-1)', E.classe17505(p).id || 'não definida'], ['Itens pendentes', String(pend)]])];
    B.push({ t: 'callout', tone: pend ? 'warn' : 'ok', title: 'Prontidão para receber o produto', text: pend ? pend + ' de ' + ctx.itens.length + ' itens ainda pendentes ou com atenção. O plano só sinaliza: a decisão de receber o produto é do responsável técnico.' : 'Todos os itens estão prontos.' });
    B.push({ t: 'h1', text: '1 Prontidão' });
    B.push({ t: 'table', head: ['Item', 'Situação', 'Onde tratar', 'Observação'], widths: [40, 12, 22, 26], rows: ctx.itens.map((x) => [x.item, x.sit, x.onde, x.nota || '—']) });
    B.push({ t: 'h1', text: '2 Plano de treinamento por público' });
    B.push({ t: 'p', small: true, text: 'Conteúdo mínimo sugerido a partir dos dados da análise do produto. O responsável técnico ajusta o conteúdo, a carga horária e os grupos conforme o procedimento da organização.' });
    const epi = split(p.ocup.epi).slice(0, 4).join('; ') || 'conforme a Seção 8 da FDS';
    const pares = inc.length ? 'Produtos incompatíveis no terminal: ' + inc.map((v) => v.outro.nome + ' (bacia ' + v.bacias.join(', ') + ')').join('; ') : '';
    const linhas = [
      ['Operadores de tanque, píer e plataforma', ['Perigos do produto, rótulo e FDS: ' + ((p.ghs.h || []).slice(0, 6).join(', ') || 'conforme FDS') + '.', 'EPI: ' + epi + '.', 'Procedimento de recebimento e expedição, controle de nível e prevenção de transbordo.', E.nr20(p).aplica ? 'Aterramento, ignição e áreas classificadas (NR-20).' : 'Controles de armazenamento conforme a análise.', 'Dreno da bacia fechado e produtos presentes em cada bacia.', pares, 'Derramamento: ' + (corta(p.amb.derramamento || sec[6], 220) || 'conforme Seção 6 da FDS') + '.'].filter(Boolean)],
      ['Brigada e equipe de emergência', ['Ficha de emergência do produto e EPI de emergência.', 'Incêndio: ' + (corta(sec[5], 220) || 'conforme Seção 5 da FDS') + '.', 'Cenário de vazamento simultâneo de mais de um tanque e reações entre produtos.', pares, 'Retenção da água de extinção e contenção do líquido misturado.', 'Primeiros socorros: ' + (corta(sec[4], 200) || 'conforme Seção 4 da FDS') + '.'].filter(Boolean)],
      ['Motoristas e equipe de recebimento rodoviário', ['Envelope de transporte, painel de segurança, rótulos de risco, número ONU ' + nz(p.imdg.onu, 'conforme FDS') + '.', 'Conduta em emergência no recebimento e no carregamento.', 'Pontos de aterramento e conexão, sentido de evacuação.']],
      ['Manutenção, inspeção e terceiros', ['Materiais compatíveis com o produto (tanque, juntas, vedações, mangotes, bombas).', 'Liberação de equipamento e limpeza ou descontaminação do tanque anterior (contaminação cruzada).', 'Permissão de trabalho e riscos específicos do produto.']],
      ['Laboratório e amostragem', ['EPI e controle de vapores na coleta de amostras.', 'Descarte de amostras e resíduos: ' + (corta(sec[13], 160) || 'conforme Seção 13 da FDS') + '.']],
    ];
    B.push({ t: 'table', head: ['Público', 'Conteúdo mínimo', 'Data e instrutor'], widths: [22, 58, 20], rows: linhas.map((l) => [l[0], l[1].join('\n'), ' ']), tall: true });
    B.push({ t: 'h1', text: '3 Cenários para treinamento da brigada' });
    B.push({ t: 'p', bold: true, text: ce.titulo });
    B.push({ t: 'kv', rows: [['Como pode acontecer', ce.causas], ['O que pode acontecer', ce.consequencias]] });
    if (inc.length) B.push({ t: 'callout', tone: 'crit', title: 'Pares incompatíveis a trabalhar no treinamento', text: inc.map((v) => p.nome + ' e ' + v.outro.nome + ' (bacia ' + v.bacias.join(', ') + ')').join('; ') + '.' });
    B.push({ t: 'p', bold: true, text: 'Como prevenir' }); B.push({ t: 'list', items: ce.medidas });
    B.push({ t: 'p', bold: true, text: 'Para discutir' }); B.push({ t: 'list', ordered: true, items: ce.discussao });
    B.push({ t: 'table', head: ['Anotações e decisões do treinamento ou do simulado'], rows: [[' '], [' '], [' ']], tall: true });
    B.push({ t: 'h1', text: '4 Verificação de aprendizado' });
    B.push({ t: 'check', items: ['O participante identifica o perigo principal do produto no rótulo e na ficha de emergência.', 'O participante cita quais produtos não podem se encontrar na bacia e na drenagem.', 'O participante demonstra o uso correto do EPI.', 'O participante sabe como agir e quem acionar em derramamento e em vazamento de mais de um tanque.'] });
    B.push({ t: 'h1', text: '5 Registro de presença' });
    B.push({ t: 'kv', rows: [['Atividade', ''], ['Data', ''], ['Instrutor ou facilitador', '']] });
    B.push({ t: 'table', head: ['Nome', 'Função', 'Assinatura'], widths: [38, 28, 34], rows: Array.from({ length: 12 }, () => [' ', ' ', ' ']), tall: true });
    B.push({ t: 'p', small: true, text: 'Conteúdos e cenários são pontos de partida a revisar. Apoio à decisão: a responsabilidade técnica é do profissional que assina.' });
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao], ['Gestor da operação', '']] });
    return B;
  }

  // ---------------------------------------------------------------- Lista de inspeção em campo (para imprimir e preencher à mão)
  function listaInspecao(local, produtos) {
    const RQ = O.NBR17160REQ; const r = E.requisitosLocal(local, produtos);
    const pseudo = { nome: local.nome, dec: { numero: '' }, rotulo: 'Armazém', pseudo: true };
    const ULT = { c: 'Conforme', nc: 'NÃO CONF.', na: 'N/A', '': '—' };
    const B = [capa('Lista de inspeção em campo', 'QUIM 360 | Para imprimir e levar à área | ' + local.nome, pseudo, [['Local', local.nome + ' (' + local.tipo + ')' + (local.aoArLivre ? ', ao ar livre' : '') + (local.armarioSeg ? ', armário de segurança' : '')], ['Itens a verificar', String(r.itens.length)]])];
    B.push({ t: 'p', text: 'Leve esta lista à área, marque cada item (C = conforme, NC = não conforme, NA = não se aplica) e anote a evidência. Na volta, registre as respostas no app, no checklist do local. A coluna "Último registro" mostra o que estava no app antes desta inspeção.' });
    B.push({ t: 'kv', rows: [['Data da inspeção', ''], ['Inspetor(es)', ''], ['Hora de início e término', ''], ['Condições (turno, clima, observações gerais)', '']] });
    let n = 0;
    Object.keys(RQ.GRUPOS).forEach((gk) => {
      const it = r.itens.filter((i) => i.grupo === gk); if (!it.length) return;
      B.push({ t: 'h1', text: (++n) + ' ' + RQ.GRUPOS[gk] });
      B.push({ t: 'table', head: ['Item', 'Requisito', 'Último registro', 'Marcar', 'Observação ou evidência'], widths: [8, 38, 12, 14, 28], rows: it.map((i) => [i.id, i.texto + (i.semTexto ? ' [texto não transcrito: ver a norma]' : ''), ULT[i.resp] + (i.resp === 'nc' && i.obs ? ': ' + i.obs : ''), '☐ C   ☐ NC   ☐ NA', ' ']), tall: true });
    });
    const emEst = E.estoqueAtivo(produtos).filter((p) => p.ctx && p.ctx.localId === local.id && p.armazenamento !== 'granel');
    B.push({ t: 'h1', text: (++n) + ' Conferência dos produtos em estoque' });
    B.push(emEst.length ? { t: 'table', head: ['Produto', 'Quantidade registrada', 'Contada em campo', 'Observação'], widths: [38, 20, 20, 22], rows: emEst.map((p) => [p.nome, p.comp.qtdKg === '' || p.comp.qtdKg == null ? '—' : p.comp.qtdKg + ' kg', ' ', ' ']), tall: true } : { t: 'p', text: 'Nenhum produto em estoque registrado neste local.' });
    B.push({ t: 'p', small: true, text: 'Produto em campo que não consta na lista acima: anote nome, quantidade e embalagem para cadastrar no app.' });
    B.push({ t: 'table', head: ['Produto encontrado fora da lista', 'Quantidade', 'Embalagem', 'Observação'], widths: [38, 18, 20, 24], rows: [[' ', ' ', ' ', ' '], [' ', ' ', ' ', ' '], [' ', ' ', ' ', ' ']], tall: true });
    B.push({ t: 'h1', text: (++n) + ' Resultado da inspeção (6.3.9)' });
    B.push({ t: 'p', small: true, text: 'Intervalo definido pelo empregador: ' + (r.periodo ? r.periodo + ' dias' : 'não informado') + (r.proxima ? '. Próxima inspeção até ' + fmtData(r.proxima) + (r.vencida ? ' (vencida)' : '') : '') + '.' });
    B.push({ t: 'kv', rows: [['Resultado', '☐ Conforme     ☐ Com não conformidades'], ['Não conformidades a tratar', ''], ['Próxima inspeção em', '']] });
    B.push({ t: 'sign', rows: [['Inspetor', ''], ['Gestor do local', '']] });
    return B;
  }

  // ---------------------------------------------------------------- Dossiê de evidência (local e terminal), versão interna e versão resumida
  // Reúne e resume os registros do app, com a data da emissão; cada seção remete ao documento de origem. A versão resumida
  // (para cliente ou órgão) não traz detalhes internos (não conformidades, observações e ações), mas mostra as contagens.
  function dossieCapa(titulo, nome, externo, extra) {
    const hoje = new Date();
    return capa(titulo, 'QUIM 360 | ' + (externo ? 'Versão resumida, para cliente ou órgão' : 'Versão completa, uso interno') + ' | ' + nome, { nome, dec: { numero: '' }, rotulo: 'Escopo', pseudo: true },
      [['Situação em', hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR').slice(0, 5)], ['Versão do documento', externo ? 'Resumida' : 'Completa']].concat(extra || []));
  }
  const NOTA_DOSSIE = 'Este dossiê reflete os registros do aplicativo na data de emissão e remete aos documentos de origem (relatórios de homologação, checklist, análise de risco e análise de compatibilidade). Dados desatualizados são sinalizados. Apoio à decisão: a responsabilidade técnica é do profissional que assina.';

  function dossieLocal(local, produtos, op) {
    op = op || {}; const ext = !!op.externo; const sg = signer(null); const R = O.RISCO;
    const g = E.gatilhosLocal(local, produtos); const rq = E.requisitosLocal(local, produtos); const ar = E.analiseRiscoLocal(local, produtos); const au = E.auditoriaLocal(local, produtos);
    const emEst = g.itens; // produtos homologados com entrada registrada e itens cadastrados à mão no local
    const acoes = listaAcoesLocal(local, produtos).filter((a) => !(a.reg && a.reg.sit === 'concluida'));
    const nPares = au.itens.length * (au.itens.length - 1) / 2; const proib = au.pares.filter((x) => x.nivel === 'incompativel').length; const rest = au.pares.length - proib;
    const B = [dossieCapa('Dossiê de evidência de armazenamento e compatibilidade', local.nome, ext, [['Local', local.nome + ' (' + local.tipo + ')'], ['Produtos em estoque', String(emEst.length)]])];
    const alertas = [];
    if (!emEst.length) alertas.push('nenhum produto com entrada registrada neste local');
    if (rq.vencida) alertas.push('inspeção do armazém vencida');
    if (rq.semInspecao) alertas.push('nenhuma inspeção registrada');
    if (rq.cont.aberto) alertas.push(rq.cont.aberto + ' item(ns) do checklist sem resposta');
    B.push({ t: 'callout', tone: alertas.length || rq.cont.nc ? 'warn' : 'ok', title: 'Resumo da situação', text: emEst.length + ' produto(s) em estoque; ' + nPares + ' par(es) avaliado(s) na segregação (' + proib + ' proibido(s), ' + rest + ' com restrição); checklist: ' + rq.cont.c + ' conforme(s), ' + rq.cont.nc + ' não conforme(s), ' + rq.cont.aberto + ' sem resposta; ' + (ext ? acoes.length + ' ação(ões) em tratamento' : acoes.length + ' ação(ões) aberta(s)') + '.' + (alertas.length ? ' Atenção: ' + alertas.join('; ') + '.' : '') });
    B.push({ t: 'h1', text: '1 Identificação do local' });
    B.push({ t: 'kv', rows: [['Local', local.nome], ['Tipo', local.tipo], ['Área do setor', local.areaM2 ? local.areaM2 + ' m²' : 'não informada'], ['Ao ar livre', local.aoArLivre ? 'Sim' : 'Não'], ['Armário de segurança', local.armarioSeg ? 'Sim' : 'Não'], ...(ext ? [] : [['Descrição e contenção', nz(local.descricao)]])] });
    B.push({ t: 'h1', text: '2 Estoque vigente e rastreabilidade da homologação' });
    B.push(emEst.length ? { t: 'table', head: ['Produto', 'Registro de homologação', 'Decisão', 'Classe de armazenamento', 'Quantidade', 'Em estoque desde'], widths: [26, 16, 14, 18, 12, 14], rows: emEst.map((i) => { const p = i.pid ? produtos.find((x) => x.id === i.pid) : null; return [i.nome, p ? nz(p.dec.numero, 'sem número') : 'Cadastro manual no local', p ? (STATUS[p.status] || STATUS.em_analise)[0] + (p.dec.data ? ' em ' + fmtData(p.dec.data) : '') : 'Sem relatório de homologação no app', (i.arm || 'não definida') + (i.aprox ? ' (aprox.)' : ''), i.qtd == null ? '—' : i.qtd + ' kg', p && p.estoque && p.estoque.desde ? fmtData(p.estoque.desde) : '—']; }) } : { t: 'p', text: 'Nenhum produto com entrada registrada neste local.' });
    B.push({ t: 'p', small: true, text: 'Cada produto homologado tem relatório próprio (FDS, triagem, impactos, compatibilidade, decisão e assinatura), disponível sob o número de registro acima. Itens de cadastro manual não passaram pela homologação no app.' });
    B.push({ t: 'h1', text: '3 Análise de compatibilidade e segregação' });
    B.push({ t: 'p', text: 'Método: cada par de produtos em estoque é avaliado pela matriz de segregação da ABNT NBR 17160 (armazenamento embalado), pela classe de armazenamento de cada um e pelas incompatibilidades declaradas na Seção 10 das FDS. ' + nPares + ' par(es) avaliado(s) entre ' + au.itens.length + ' produto(s).' });
    B.push(au.pares.length ? { t: 'table', head: ['Produto A', 'Produto B', 'Resultado', ext ? 'Restrição' : 'Orientação'], widths: [26, 26, 16, 32], rows: au.pares.map((x) => [x.a, x.b, x.nivel === 'incompativel' ? 'Proibido junto' : x.nivel === 'verificar' ? 'Verificar' : 'Com restrição' + (x.codigo ? ' ' + x.codigo : ''), ext ? (x.codigo ? 'Restrição ' + x.codigo + ' da NBR 17160' : 'Reatividade declarada') : nz(x.texto)]) } : { t: 'p', text: 'Todos os pares são permitidos pela matriz e sem reatividade declarada.' });
    B.push({ t: 'h1', text: '4 Quantidades-limite e contenção' });
    B.push({ t: 'p', text: 'Massa líquida total: ' + Math.round(g.total).toLocaleString('pt-BR') + ' kg. ' + (g.exige.length ? 'Requisitos que passam a valer neste local: ' + (ext ? g.exige.length + ' (detalhados no inventário do local).' : g.exige.join(' ')) : 'Nenhuma quantidade-limite excedida.') });
    B.push({ t: 'h1', text: '5 Análise de risco do armazém' });
    B.push({ t: 'p', text: ar.data ? 'Análise datada de ' + fmtData(ar.data) + (ar.revisao ? ', próxima revisão em ' + fmtData(ar.revisao) : '') + '. ' : 'Data da análise não registrada. ' });
    B.push({ t: 'p', text: ar.cenarios.length + ' cenário(s): ' + ar.resumo.grave + ' grave(s)' + (ar.resumo.psif ? ' (' + ar.resumo.psif + ' com PSIF na lente de pessoas)' : '') + ', ' + ar.resumo.medio + ' médio(s), ' + ar.resumo.baixo + ' baixo(s), ' + ar.resumo.desprezivel + ' desprezível(is), ' + ar.resumo.semAvaliar + ' sem avaliação.' });
    if (!ext) B.push({ t: 'table', head: ['Cenário', 'Severidade por lente', 'Probabilidade', 'Risco'], widths: [40, 26, 14, 20], rows: ar.cenarios.map((c) => [c.titulo, (c.risco.dims || []).map((x) => x.curto + ' ' + x.sev).join('; ') || '—', c.prob ? c.prob + ' ' + R.PROB[c.prob - 1][1] : '—', c.risco.v ? c.risco.nome + ' (' + c.risco.v + ', ' + c.risco.det + ')' : 'Não avaliado']) });
    B.push({ t: 'h1', text: '6 Checklist de requisitos e inspeções' });
    B.push({ t: 'p', text: 'Checklist da NBR 17160: ' + rq.itens.length + ' requisito(s) aplicável(is): ' + rq.cont.c + ' conforme(s), ' + rq.cont.nc + ' não conforme(s), ' + rq.cont.aberto + ' sem resposta, ' + rq.cont.na + ' não aplicável(is). Intervalo de inspeção: ' + (rq.periodo ? rq.periodo + ' dias' : 'não definido') + (rq.proxima ? '; próxima até ' + fmtData(rq.proxima) + (rq.vencida ? ' (vencida)' : '') : '') + '.' });
    const nc = rq.itens.filter((i) => i.resp === 'nc');
    if (!ext && nc.length) B.push({ t: 'table', head: ['Item', 'Requisito não conforme', 'Observação'], widths: [10, 60, 30], rows: nc.map((i) => [i.id, i.texto, i.obs || '—']) });
    B.push(rq.inspecoes.length ? { t: 'table', head: ['Data', ext ? 'Resultado' : 'Responsável', ext ? 'Itens verificados' : 'Resultado'], widths: [20, 40, 40], rows: rq.inspecoes.slice(-6).map((x) => [fmtData(x.data), ext ? (x.resultado === 'conforme' ? 'Conforme' : 'Com não conformidades') : nz(x.resp), ext ? String(x.lista ? x.lista.length : '—') : (x.resultado === 'conforme' ? 'Conforme' : 'Com não conformidades')]) } : { t: 'p', text: 'Nenhuma inspeção registrada.' });
    if (!ext) {
      B.push({ t: 'h1', text: '7 Ações em aberto' });
      B.push(acoes.length ? { t: 'table', head: ['Ação', 'Origem', 'Responsável', 'Prazo'], widths: [50, 22, 18, 10], rows: acoes.map((a) => [a.texto || a.acao, a.origem, a.reg && a.reg.resp ? a.reg.resp : a.papel, a.reg && a.reg.prazo ? fmtData(a.reg.prazo) : '—']) } : { t: 'p', text: 'Nenhuma ação em aberto.' });
    }
    B.push({ t: 'h1', text: (ext ? '7' : '8') + ' Base técnico-legal' });
    B.push({ t: 'list', items: T.BASE_LEGAL.map((b) => b.sigla + ': ' + b.titulo) });
    B.push({ t: 'p', small: true, text: NOTA_DOSSIE });
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao], ['Gestor do local', '']] });
    return B;
  }

  function dossieTerminal(produtos, op) {
    op = op || {}; const ext = !!op.externo; const sg = signer(null); const R = O.RISCO; const bacias = O.Store.bacias();
    const at = E.analiseTerminalGranel(bacias, produtos); const N = E.NIVEL_GRANEL; const dias = O.Store.config().alertaDiasBacia || 30;
    const desat = bacias.filter((b) => !b.atualizadoEm || (Date.now() - new Date(b.atualizadoEm).getTime()) / 86400000 > dias);
    const consultas = O.Store.all().consultas || {};
    const nomeDe = (id) => { const p = produtos.find((x) => x.id === id); return p ? p.nome : '(produto removido)'; };
    const B = [dossieCapa('Dossiê de evidência de compatibilidade do terminal (granel)', 'Terminal', ext, [['Bacias', String(bacias.length)], ['Produtos a granel nas bacias', String(at.produtos.length)]])];
    B.push({ t: 'callout', tone: at.resumo.incompativel || desat.length ? 'warn' : (!bacias.length ? 'warn' : 'ok'), title: 'Resumo da situação', text: !bacias.length ? 'Nenhuma bacia cadastrada: a compatibilidade do terminal ainda não foi analisada.' : at.produtos.length + ' produto(s) em ' + bacias.length + ' bacia(s); ' + at.pares.length + ' par(es) analisado(s): ' + at.resumo.incompativel + ' incompatível(is), ' + at.resumo.restricao + ' com restrição, ' + at.resumo.sem_dados + ' sem dados, ' + at.resumo.nada + ' sem incompatibilidade declarada.' + (desat.length ? ' Atenção: lista desatualizada em ' + desat.length + ' bacia(s).' : '') });
    B.push({ t: 'h1', text: '1 Método e limites' });
    B.push({ t: 'list', items: ['Tanques multiuso: o produto não é vinculado a um tanque; a análise considera os produtos presentes em cada bacia.', 'Base: incompatibilidades declaradas na Seção 10 das FDS e consulta externa registrada pelo analista (por exemplo, NOAA CAMEO Chemicals), com fonte e data. Não usa a matriz da NBR 17160, que é de armazenamento embalado.', '"Sem incompatibilidade declarada" não prova compatibilidade; pares sem dados exigem consulta.', 'Em divergência entre FDS e consulta, prevalece o resultado mais conservador.'] });
    B.push({ t: 'h1', text: '2 Bacias e produtos' });
    B.push(bacias.length ? { t: 'table', head: ['Bacia', 'Produtos a granel', 'Lista confirmada em'], widths: [20, 56, 24], rows: bacias.map((b) => [b.nome, (b.produtos || []).map(nomeDe).join('; ') || '—', b.atualizadoEm ? fmtData(b.atualizadoEm) + (desat.includes(b) ? ' (desatualizada)' : '') : 'nunca confirmada']) } : { t: 'p', text: 'Nenhuma bacia cadastrada.' });
    B.push({ t: 'h1', text: '3 Rastreabilidade dos produtos a granel' });
    B.push(at.produtos.length ? { t: 'table', head: ['Produto', 'Registro de homologação', 'Decisão', 'Classe NBR 17505-1', ext ? 'MOC' : 'MOC e exigências do tanque'], widths: [24, 16, 18, 14, 28], rows: at.produtos.map((v) => { const p = v.p; const mu = E.mudancaDe(p); const ex = E.exigenciasTanque(p); const moc = mu.exige === true ? 'Exigido' + (mu.situacao ? ' (' + (E.MOC_SIT.find((x) => x[0] === mu.situacao) || [0, mu.situacao])[1].toLowerCase() + ')' : '') : mu.exige === false ? 'Não exigido' : 'Não avaliado'; const exs = ex.filter((x) => ['nao', 'depende'].includes(x.atende)).length; return [p.nome, nz(p.dec.numero, 'sem número'), (STATUS[p.status] || STATUS.em_analise)[0] + (p.dec.data ? ' em ' + fmtData(p.dec.data) : ''), E.classe17505(p).id || '—', ext ? moc : moc + '; exigências com atenção: ' + exs]; }) } : { t: 'p', text: 'Sem produtos nas bacias.' });
    B.push({ t: 'h1', text: '4 Compatibilidade entre todos os produtos do terminal' });
    B.push({ t: 'p', text: at.pares.length + ' par(es) analisado(s). ' + (ext ? 'A tabela lista os pares com incompatibilidade, restrição ou sem dados; os demais constam como sem incompatibilidade declarada.' : '') });
    const linhas = at.pares.filter((x) => !ext || x.res.nivel !== 'nada');
    B.push(linhas.length ? { t: 'table', head: ['Produto A', 'Produto B', 'Mesma bacia', 'Resultado', 'Base'], widths: [22, 22, 14, 18, 24], rows: linhas.map((x) => [x.a.nome, x.b.nome, x.mesma ? 'Sim (' + x.bacias.join(', ') + ')' : 'Não', N[x.res.nivel], x.res.consulta ? 'Consulta: ' + nz(x.res.consulta.fonte) + ' em ' + fmtData(x.res.consulta.data) : x.res.decl.length ? 'FDS declara incompatibilidade' : x.res.fds === 'sem_dados' ? 'FDS sem dados suficientes' : 'FDS sem incompatibilidade declarada']) } : { t: 'p', text: 'Nenhum par exige atenção.' });
    const ks = Object.keys(consultas);
    B.push({ t: 'h1', text: '5 Consultas externas registradas' });
    B.push(ks.length ? { t: 'table', head: ext ? ['Par de produtos', 'Resultado', 'Fonte', 'Data'] : ['Par de produtos', 'Resultado', 'Fonte', 'Data', 'Transcrição'], widths: ext ? [40, 28, 18, 14] : [26, 20, 14, 12, 28], rows: ks.map((k) => { const c = consultas[k]; const [a, b] = k.split('|'); const base = [nomeDe(a) + ' e ' + nomeDe(b), (E.RES_CONSULTA.find((r) => r[0] === c.resultado) || [0, c.resultado])[1], nz(c.fonte), fmtData(c.data)]; return ext ? base : base.concat([nz(c.obs)]); }) } : { t: 'p', text: 'Nenhuma consulta externa registrada.' });
    B.push({ t: 'h1', text: '6 Cenário de vazamento simultâneo de mais de um tanque' });
    B.push({ t: 'p', text: R.CENARIO_TANQUE.consequencias });
    B.push(at.produtos.length ? { t: 'table', head: ['Produto', 'Nível de risco avaliado'], widths: [50, 50], rows: at.produtos.map((v) => { const nv = R.nivelCenario(E.tanqueDe(v.p).cenario); return [v.p.nome, nv.v ? nv.nome + (ext ? '' : ' (' + nv.v + ', lente ' + nv.det + ')') : 'Não avaliado']; }) } : { t: 'p', text: '—' });
    if (!ext) { B.push({ t: 'p', bold: true, text: 'Medidas de controle do cenário' }); B.push({ t: 'list', items: R.CENARIO_TANQUE.medidas }); }
    B.push({ t: 'h1', text: '7 Base técnico-legal' });
    B.push({ t: 'list', items: T.BASE_LEGAL.map((b) => b.sigla + ': ' + b.titulo).concat(T.FONTES_CONSULTA.map((b) => b.sigla + ': ' + b.titulo + ' (consulta externa)')) });
    B.push({ t: 'p', small: true, text: NOTA_DOSSIE });
    B.push({ t: 'sign', rows: [[sg.nome, sg.funcao], ['Gestor do terminal', '']] });
    return B;
  }

  O.Docs = { dossieLocal, dossieTerminal, listaInspecao, planoImplantacao, prontidaoGranel, compatTanque, vencimentos, vencimentosDoc, listaAcoesLocal, emailAcoesLocal, listaAcoes, emailAcoes, filaDoc, cenariosDoc, cenariosDoProduto, criterioRisco, analiseRiscoLocal, checklistLocal, signer, inventarioLocal, STATUS, analiseFds, quadroCompat, planoAcao, relatorio, fichaEmergencia, rotulagem, envelope, treinamento, solicitacaoFornecedor, fmtData, linkRegistro, agrupaP };
})(window.O360 = window.O360 || {});
