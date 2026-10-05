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
  const nomeG = (k) => (T.RG.find((r) => r[0] === k) || [k, k])[1];
  const ctrlNome = (k) => (T.CONTROLES_ARM.find((c) => c[0] === k) || [k, k])[1];

  function capa(titulo, sub, p, extra) {
    const c = cfg();
    return {
      t: 'cover', titulo, sub,
      meta: [
        ['Produto', nz(p.nome)],
        ['Registro', nz(p.dec.numero, 'sem número de homologação')],
        ['Data', fmtData(new Date().toISOString())],
        ['Responsável técnico', c.responsavel + (c.registro ? ' | ' + c.registro : '')],
      ].concat(extra || []),
      org: c.organizacao,
    };
  }

  function linkRegistro(p) {
    if (p.dec.sharepoint) return p.dec.sharepoint;
    return location.href.split('#')[0] + '#/produto/' + p.id;
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
    if (p.status === 'pendente') B.push({ t: 'list', items: av.pendencias });
    if (p.status === 'condicionado') B.push({ t: 'p', text: 'Condicionantes antes da liberação de uso:', bold: true }, { t: 'list', items: av.condicionantes });
    if (av.alertas.length) B.push({ t: 'callout', tone: 'warn', title: 'Alertas', text: av.alertas.join(' ') });

    B.push({ t: 'h1', text: '1 Identificação e contexto' });
    B.push({ t: 'kv', rows: [
      ['Produto', nz(p.nome)], ['Fornecedor / fabricante', nz(p.fornecedor)], ['Código do fornecedor', nz(p.codigoFornecedor)],
      ['Onde será utilizado', nz([p.ctx.area, p.ctx.atividade].filter(Boolean).join(' | '))],
      ['Finalidade', nz(p.finalidade)], ['Aplicação / forma de uso', nz(p.aplicacao)],
      ['Local de armazenamento', loc ? loc.nome + ' (' + loc.tipo + ')' : '—'],
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
    ] });

    B.push({ t: 'h1', text: '4 Triagem GHS: rejeição automática' });
    const tri = av.tri;
    B.push({ t: 'table', head: ['Critério', 'Resultado'], widths: [34, 66], rows: [
      ['Cancerígeno', tri.criticos.some((c) => c.tipo === 'cancerigeno') ? 'Identificado' : 'Não identificado'],
      ['Mutagênico', tri.criticos.some((c) => c.tipo === 'mutagenico') ? 'Identificado' : 'Não identificado'],
      ['Teratogênico / tóxico à reprodução', tri.criticos.some((c) => c.tipo === 'teratogenico' || c.tipo === 'reprodutivo') ? 'Identificado' : 'Não identificado'],
      ['Contém PFCs / PFAS', tri.criticos.some((c) => c.tipo === 'pfc') ? 'Identificado' : 'Não identificado'],
    ] });
    if (tri.criticos.length) B.push({ t: 'list', items: tri.criticos.map((c) => c.detalhe + ' [' + c.fonte + ']') });
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

    B.push({ t: 'h1', text: '7 Classificação de transporte (ANTT 5.947/21 e IMDG)' });
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
      ['Incompatibilidades declaradas (Seções 7 e 10)', p.comp.incompDeclaradas === true ? (p.comp.incompativeis || []).map(nomeG).join(', ') + (p.comp.incompTexto ? '. ' + p.comp.incompTexto : '') : p.comp.incompDeclaradas === false ? 'Nenhuma declarada' : '—'],
      ['Local avaliado', loc ? loc.nome + ' (' + loc.tipo + ')' : '—'],
      ['Resultado para o local', p.comp.localOk === 'sim' ? 'Compatível' : p.comp.localOk === 'conflito' ? 'Conflito de segregação' : p.comp.localOk === 'insuficiente' ? 'Informação insuficiente na FDS' : '—'],
      ['Solução para o conflito', p.comp.localOk === 'conflito' ? ({ alternativo: 'Local alternativo / segregação física', condicionar: 'Homologação condicionada', reprovar: 'Sem solução viável' }[p.comp.solucao] || '—') : '—'],
      ['Controles adicionais', (p.comp.controles || []).length ? p.comp.controles.map(ctrlNome).join('; ') : '—'],
      ['Estoque máximo', nz(p.comp.limite)], ['Temperatura máxima', nz(p.comp.tempMax)],
    ] });
    if (loc) {
      const cp = E.compatibilidade(p, loc, produtos);
      if (cp.pares.length || cp.grupos.length) {
        const rows = cp.pares.map((x) => [x.com, x.par.join(' / '), x.codigo === '-' ? x.texto : x.codigo + ': ' + x.texto, cp.grupos.filter((g) => g.com === x.com).map((g) => g.a + ' x ' + g.b + ': ' + g.efeito).join('; ') || '—']);
        B.push({ t: 'table', head: ['Item no local', 'Classes', 'Segregação (IMDG / NR-29)', 'Reatividade (FDS)'], widths: [24, 12, 28, 36], rows });
      }
    }

    B.push({ t: 'h1', text: '9 Pareceres externos e gatilho do PGR' });
    B.push({ t: 'kv', rows: [
      ['Parecer arquivado', sn(p.par.tem)], ['Descrição / referência', nz(p.par.descricao)],
      ['Indicador de PGR', p.par.pgrIndicador === 'requer' ? 'PGR: requer atualização' + (p.par.pgrPrazo ? ' | prazo ' + p.par.pgrPrazo : '') + (p.par.pgrResponsavel ? ' | responsável ' + p.par.pgrResponsavel : '') : p.par.pgrIndicador === 'nao_requer' ? 'PGR: não requer atualização (parecer anexo)' : '—'],
    ] });

    B.push({ t: 'h1', text: '10 Decisão e rastreabilidade' });
    B.push({ t: 'kv', rows: [
      ['Decisão', st[0]], ['Número do registro', nz(p.dec.numero)], ['Data da decisão', fmtData(p.dec.data)],
      ['Justificativa técnica / legal', nz(p.dec.justificativa)], ['Checklist de treinamento', p.trein.gerar === true ? 'Gerado' : p.trein.gerar === false ? 'Não solicitado' : '—'],
    ] });
    if (['homologado', 'condicionado'].includes(p.status)) B.push({ t: 'qr', text: linkRegistro(p), cap: 'Cadastro próprio na lista de homologados' + (p.dec.sharepoint ? ' (SharePoint)' : '') });
    B.push({ t: 'h2', text: 'Base técnico-legal consultada' });
    B.push({ t: 'list', items: T.BASE_LEGAL.map((b) => b.sigla + ': ' + b.titulo) });
    B.push({ t: 'p', small: true, text: 'Matriz de segregação, triagem CMR e PFC e sugestões de controle são apoio à decisão. A decisão formal depende da FDS vigente do fornecedor, do Código IMDG e da avaliação do responsável técnico.' });
    B.push({ t: 'sign', rows: [[cfg().responsavel, cfg().registro || 'Responsável técnico']] });
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
  function fichaEmergencia(p) {
    const s = p.fds.secoes || {};
    const B = [];
    B.push(capa('Ficha de emergência', 'QUIM 360 | Ficha de Emergência | ' + nz(p.nome), p, [['Estrutura', 'ABNT NBR 7503, Resolução ANTT 5.947/21 e Manual ABIQUIM']]));
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
    inner.push({ t: 'p', small: true, text: 'Transporte terrestre de produtos perigosos | ABNT NBR 7503 | Resolução ANTT 5.947/21' });
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
    const B = [{ t: 'box', border: '#c2410c', bg: '#fdba74', children: inner }, { t: 'pagebreak' }];
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
    B.push({ t: 'sign', rows: [['Instrutor', ''], [cfg().responsavel, cfg().registro]] });
    return B;
  }

  // ---------------------------------------------------------------- Solicitação ao fornecedor
  function solicitacaoFornecedor(p, motivos) {
    return 'Assunto: Solicitação de FDS corrigida: ' + nz(p.nome) + '\n\n' +
      'Prezados,\n\nA análise de homologação do produto ' + nz(p.nome) + ' identificou pendências na FDS:\n' +
      motivos.map((m) => '- ' + m).join('\n') + '\n\nSolicitamos o envio da FDS em português, conforme ABNT NBR 14725:2023, com as 16 seções completas e data de revisão atualizada.\n\nPróximo passo: envio até ____/____/______.\n\n' + cfg().responsavel + (cfg().registro ? ' | ' + cfg().registro : '');
  }

  O.Docs = { STATUS, relatorio, fichaEmergencia, rotulagem, envelope, treinamento, solicitacaoFornecedor, fmtData, linkRegistro, agrupaP };
})(window.O360 = window.O360 || {});
