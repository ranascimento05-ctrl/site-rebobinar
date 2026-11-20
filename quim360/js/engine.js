/* Motor de regras da homologação: triagem GHS (CMR/PFC), compatibilidade e segregação, interface com PGR,
   via simplificada (read-across) e decisão. Funções puras, sem DOM. */
(function (O) {
  const T = O.TRANSPORT, G = O.GHS;

  function novoProduto() {
    return {
      id: O.Store.uid('prd'),
      modoAuto: true, autoConf: {}, auto: {},
      criadoEm: new Date().toISOString(),
      status: 'em_analise',
      etapa: 'fds0',
      confirmadas: {},
      ctx: { area: '', atividade: '', localId: '' },
      nome: '', fornecedor: '', codigoFornecedor: '',
      assina: { nome: '', registro: '', funcao: '' },
      cpa: { semToxAguda: false, semAmbiental: false, biodegradavel: false, ensaio: '' },
      estoque: { ativo: false, localId: '', qtdKg: '', desde: '' }, movs: [], estoqueAgora: null,
      natureza: '', armazenamento: '', cmr: { justificativa: '', alternativas: '', controles: [], controlesOk: false },
      finalidade: '', aplicacao: '',
      lista: { naLista: null, numero: '' },
      sim: { ativa: null, refId: '', familia: false, forma: false, componentes: false, parecerCitaFamilia: false, divergencia: '', encerrada: false },
      fds: {
        texto: '', secoes: {}, secoesOk: {}, completa: null, atualizada: null, portugues: null,
        dataRevisao: '', versao: '', ph: '', pendencia: '', cas: [], composicao: '', parseAvisos: [],
      },
      ghs: {
        h: [], p: [], pComb: [], palavra: '', pictos: [],
        cancerigeno: false, teratogenico: false, mutagenico: false, pfc: false, nenhum: false,
        evidencias: [], confirmado: false,
      },
      ocup: { risco: null, subst: '', eng: '', adm: '', epi: '' },
      amb: { risco: null, contencao: '', residuos: '', derramamento: '' },
      hig: { tlv: null, parecerExigidoOk: false, pgr: '', dosimetria: null, justificativa: '', tlvAgentes: '' },
      imdg: { onu: '', nome: '', classe: '', subrisco: '', pg: '', numeroRisco: '', ems: '', poluente: false, pontoFulgor: '', incompativelOperacao: false, naoRegulado: false },
      comp: { granel: [], classeArm: '', combustivel: null, estado: '', incompDeclaradas: null, grupos: [], incompativeis: [], incompTexto: '', localOk: '', solucao: '', controles: [], limite: '', qtdKg: '', tempMax: '', observacoes: '' },
      par: { tem: null, descricao: '', pgrIndicador: '', pgrPrazo: '', pgrResponsavel: '' },
      dec: { valor: '', justificativa: '', data: '', numero: '', sharepoint: '' },
      trein: { gerar: null },
      emerg: { telefoneFornecedor: '', observacoes: '' },
    };
  }

  // ---------- Triagem GHS: rejeição automática ----------
  function triagem(p, cfg) {
    cfg = cfg || O.Store.config();
    const out = { criticos: [], suspeitos: [], informativos: [] };
    const h = p.ghs.h || [];
    const cmr = G.cmrFromH(h);
    const add = (lista, tipo, fonte, detalhe) => lista.push({ tipo, fonte, detalhe });

    const grupo = (arr, tipo, rotulo) => {
      arr.forEach((c) => {
        const susp = cmr.suspeitos.includes(c);
        if (susp && !cfg.cat2Reprova) add(out.suspeitos, tipo, c, rotulo + ' (suspeita, categoria 2): ' + (G.hText(c) || ''));
        else add(out.criticos, tipo, c, rotulo + ': ' + (G.hText(c) || c));
      });
    };
    grupo(cmr.cancerigeno, 'cancerigeno', 'Cancerígeno');
    grupo(cmr.mutagenico, 'mutagenico', 'Mutagênico');
    grupo(cmr.teratogenico, 'teratogenico', 'Teratogênico / tóxico ao desenvolvimento');
    cmr.reprotoxicoFertilidade.forEach((c) => {
      if (!cmr.teratogenico.includes(c)) {
        const susp = cmr.suspeitos.includes(c);
        if (susp && !cfg.cat2Reprova) add(out.suspeitos, 'reprodutivo', c, 'Tóxico à fertilidade (suspeita): ' + (G.hText(c) || ''));
        else add(out.criticos, 'reprodutivo', c, 'Tóxico à reprodução (fertilidade): ' + (G.hText(c) || c));
      }
    });
    // Marcação manual do analista
    if (p.ghs.cancerigeno && !out.criticos.some((x) => x.tipo === 'cancerigeno')) add(out.criticos, 'cancerigeno', 'analista', 'Cancerígeno (marcado pelo analista)');
    if (p.ghs.teratogenico && !out.criticos.some((x) => x.tipo === 'teratogenico')) add(out.criticos, 'teratogenico', 'analista', 'Teratogênico (marcado pelo analista)');
    if (p.ghs.mutagenico && !out.criticos.some((x) => x.tipo === 'mutagenico')) add(out.criticos, 'mutagenico', 'analista', 'Mutagênico (marcado pelo analista)');
    if (p.ghs.pfc) add(out.criticos, 'pfc', 'analista', 'Contém PFCs / PFAS (marcado pelo analista)');

    // Lista de alerta por CAS (componentes declarados)
    const cas = p.fds.cas || [];
    const chk = [['cancerigeno', 'Cancerígeno', 'cancerigeno'], ['reprotoxico', 'Tóxico à reprodução', 'teratogenico'], ['mutagenico', 'Mutagênico', 'mutagenico'], ['pfas', 'PFAS / PFC', 'pfc']];
    chk.forEach(([k, rotulo, tipo]) => {
      cas.forEach((x) => {
        const w = T.WATCH[k].find((i) => i[0] === x);
        if (w && !out.criticos.some((c) => c.fonte === 'CAS ' + x && c.tipo === tipo)) add(out.criticos, tipo, 'CAS ' + x, rotulo + ': componente ' + w[1] + ' consta na lista de alerta');
      });
    });
    // termos PFAS no texto da FDS
    if (p.fds.texto && T.PFAS_TERMS.test(p.fds.texto) && !out.criticos.some((c) => c.tipo === 'pfc')) {
      add(out.suspeitos, 'pfc', 'texto da FDS', 'Termo associado a PFAS encontrado: "' + (p.fds.texto.match(T.PFAS_TERMS) || [''])[0] + '". Confirme se há substância per/polifluorada na Seção 3.');
    }
    // Sem informação não é ausência de perigo
    if (!h.length && !p.ghs.nenhum && !out.criticos.length) out.informativos.push('Nenhuma frase H informada. Confirme se a FDS declara o produto como não classificado.');
    out.reprovado = out.criticos.length > 0;
    return out;
  }

  // Produto armazenado ou movimentado pelo terminal (carga): a reprovação automática de CMR e PFC vale só para insumos
  const ehCarga = (p) => p.natureza === 'carga';
  // Gatilho de reprovação automática (CMR e PFC): sempre sinalizado, nunca bloqueia. A decisão é do responsável técnico.
  const gatilhoCMR = (p) => triagem(p).reprovado;
  const rejeitaAuto = () => false;
  const cmrCarga = gatilhoCMR;

  // ---------- NR-20 ----------
  function nr20(p) {
    const pf = p.imdg.pontoFulgor === '' || p.imdg.pontoFulgor == null ? null : parseFloat(p.imdg.pontoFulgor);
    const h = p.ghs.h || [];
    const r = { aplica: false, categoria: '', texto: '' };
    if (h.some((c) => /^H22[0-3]$/.test(c) || c === 'H220' || c === 'H221')) { r.aplica = true; r.categoria = 'Gás inflamável'; }
    if (pf != null && !isNaN(pf)) {
      if (pf <= 60) { r.aplica = true; r.categoria = pf < 23 ? 'Líquido inflamável (ponto de fulgor abaixo de 23 °C)' : 'Líquido inflamável (ponto de fulgor entre 23 e 60 °C)'; }
      else if (pf <= 93) { r.aplica = true; r.categoria = 'Líquido combustível (ponto de fulgor acima de 60 °C até 93 °C)'; }
    } else if (h.some((c) => /^H22[4-6]$/.test(c))) { r.aplica = true; r.categoria = 'Líquido inflamável (por frase H)'; }
    else if (h.includes('H227')) { r.aplica = true; r.categoria = 'Líquido combustível (por frase H)'; }
    if (r.aplica) r.texto = 'NR-20 aplicável: verificar classificação da instalação pela quantidade armazenada, áreas classificadas, equipamentos elétricos adequados, aterramento e prontuário. Fonte do dado: ' + (pf != null && !isNaN(pf) ? 'ponto de fulgor informado (' + pf + ' °C).' : 'frases H.');
    return r;
  }

  // ---------- Compatibilidade (ABNT NBR 17160:2024) ----------
  function classesDoProduto(p) {
    const c = [];
    if (p.imdg.classe) c.push(p.imdg.classe);
    if (p.imdg.subrisco) p.imdg.subrisco.split(/[,;\s]+/).filter(Boolean).forEach((s) => c.push(s));
    return c;
  }
  const N = () => O.NBR17160;
  const RK = () => O.RISCO;

  // "combustível" no sentido da NBR 17160 (9.1.1.3 h): tem ponto de fulgor ou comprovadamente queima
  function combustivel(p) {
    if (typeof p.comp.combustivel === 'boolean') return { valor: p.comp.combustivel, incerto: false, origem: 'definido pelo analista' };
    const h = p.ghs.h || [];
    const pf = p.imdg.pontoFulgor === '' || p.imdg.pontoFulgor == null ? null : parseFloat(p.imdg.pontoFulgor);
    if (h.some((c) => /^H22[0-8]$/.test(c))) return { valor: true, incerto: false, origem: 'frase H de inflamabilidade' };
    if (pf != null && !isNaN(pf)) return { valor: true, incerto: false, origem: 'ponto de fulgor de ' + pf + ' °C' };
    const ph = parseFloat(String(p.fds.ph || '').replace(',', '.'));
    if (!isNaN(ph)) return { valor: false, incerto: false, origem: 'produto aquoso (pH informado) sem ponto de fulgor' };
    return { valor: true, incerto: true, origem: 'informação ausente: assumido combustível por segurança' };
  }

  // Anexo D | fluxograma de atribuição da classe de armazenamento: vale o primeiro perigo aplicável
  function classeArm(p) {
    if (p.comp.classeArm) return { id: p.comp.classeArm, motivo: 'definida pelo analista', manual: true };
    const h = p.ghs.h || [];
    const has = (re) => h.some((c) => re.test(c));
    const cl = classesDoProduto(p);
    const onu = String(p.imdg.onu || '');
    const pg = p.imdg.pg;
    const comb = combustivel(p).valor;
    const R = (id, motivo) => ({ id, motivo });
    if (has(/^H20[0-5]$/) || cl.includes('1')) return R('1', 'explosivo (H200 a H205 ou classe 1)');
    if (cl.includes('6.2')) return R('6.2', 'substância infectante');
    if (cl.includes('7')) return R('7', 'material radioativo');
    if (has(/^H22[23]$/) || ['1950', '1057'].includes(onu)) return R('2B', 'aerossol (H222, H223 ou ONU 1950/1057)');
    if (has(/^H(220|221|270|280|281)$/) || cl.some((c) => /^2\./.test(c)) || ['1051', '1052'].includes(onu)) return R('2A', 'gás (H220, H221, H270, H280, H281 ou classe 2)');
    if (has(/^H24[01]$/)) return R('4.1A', 'potencialmente explosivo (H240, H241)');
    if (has(/^H242$/) || cl.includes('5.2')) return R('5.2', 'peróxido orgânico ou autorreativo (H242 ou classe 5.2)');
    if (has(/^H25[012]$/) || cl.includes('4.2')) return R('4.2', 'pirofórico ou autoaquecimento (H250 a H252 ou classe 4.2)');
    if (has(/^H26[01]$/) || cl.includes('4.3')) return R('4.3', 'emite gás inflamável com água (H260, H261 ou classe 4.3)');
    if (has(/^H228$/) || cl.includes('4.1')) return R('4.1B', 'sólido inflamável (H228 ou classe 4.1)' + (has(/^H228$/) ? '' : '; classe 4.1 sem H228 exige análise individual (Anexo D, D.10.1)'));
    if (['1942', '2067', '2071', '2426', '3375'].includes(onu)) return R('5.1C', 'nitrato de amônio (ONU ' + onu + ')');
    if (has(/^H271$/) || (cl.includes('5.1') && pg === 'I')) return R('5.1A', 'fortemente oxidante (H271 ou classe 5.1, grupo I)');
    if (has(/^H272$/) || cl.includes('5.1')) return R('5.1B', 'oxidante (H272 ou classe 5.1)');
    if (has(/^H22[456]$/) || cl.includes('3')) return R('3', 'líquido inflamável (H224 a H226 ou classe 3)');
    if (has(/^H(300|310|330)$/) || (cl.includes('6.1') && (pg === 'I' || pg === 'II' || !pg && !has(/^H(301|311|331)$/)))) return R(comb ? '6.1A' : '6.1B', 'toxicidade aguda GE I ou II, ' + (comb ? 'combustível' : 'não combustível'));
    if (has(/^H(301|311|331|340|350|360|370|372)/) || cl.includes('6.1')) return R(comb ? '6.1C' : '6.1D', 'toxicidade aguda GE III ou efeito crônico, ' + (comb ? 'combustível' : 'não combustível'));
    const soMetais = has(/^H290$/) && !has(/^H314$/);
    if ((has(/^H314$/) || cl.includes('8')) && !soMetais) return R(comb ? '8A' : '8B', 'corrosivo, ' + (comb ? 'combustível' : 'não combustível'));
    // classes 10 a 13: opcionais, para o que não cai em nenhuma outra
    const semPerigo = !h.length && !cl.length;
    if (semPerigo && (p.imdg.naoRegulado || !p.imdg.onu)) return R('9', 'sem perigo GHS nem de transporte');
    const solido = p.comp.estado === 'solido';
    if (has(/^H227$/)) return R('10', 'líquido combustível (H227)');
    return R(solido ? (comb ? '11' : '13') : (comb ? '10' : '12'), (solido ? 'sólido' : 'líquido') + (comb ? ' combustível' : ' não combustível') + ' sem classe de perigo própria');
  }

  // converte o cadastro antigo de item de local (classe de transporte) em classe de armazenamento aproximada
  const LEGADO = { '1': '1', '2.1': '2A', '2.2': '2A', '2.3': '2A', '3': '3', '4.1': '4.1B', '4.2': '4.2', '4.3': '4.3', '5.1': '5.1B', '5.2': '5.2', '6': '6.1B', '6.1': '6.1B', '8': '8B', '8a': '8B', '8b': '8B', '9': '9' };
  function armDoItem(i) { return i.classeArm || LEGADO[String(i.classe)] || ''; }

  function numQtd(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && n >= 0 && String(v).trim() !== '' ? n : null; }

  function itensDoLocal(local, produtos, excluirId) {
    const itens = (local.itens || []).map((i) => ({ nome: i.nome, arm: armDoItem(i), aprox: !i.classeArm, grupos: i.grupos || [], incompativeis: i.incompativeis || [], origem: 'manual', h: O.GHS.splitCodes(i.h || '', 'H'), qtd: numQtd(i.qtdKg) }));
    (produtos || []).forEach((q) => {
      if (q.id === excluirId) return;
      if (q.ctx && q.ctx.localId === local.id && ['homologado', 'condicionado'].includes(q.status) && q.armazenamento !== 'granel' && emEstoque(q)) {
        itens.push({ nome: q.nome, arm: classeArm(q).id, grupos: q.comp.grupos || [], incompativeis: q.comp.incompativeis || [], origem: 'homologado', pid: q.id, h: q.ghs.h || [], qtd: numQtd(q.comp.qtdKg) });
      }
    });
    return itens;
  }

  // avalia um par de itens {nome, arm, grupos, incompativeis}
  function avaliaPar(A, B) {
    const nomeG = (k) => (T.RG.find((x) => x[0] === k) || [k, k])[1];
    const code = N().par(A.arm, B.arm);
    const ambos8 = /^8/.test(A.arm) && /^8/.test(B.arm);
    const motivos = [];
    const ga = A.grupos || [], gb = B.grupos || [];
    T.RG_RULES.forEach(([x, y, ef]) => {
      if ((ga.includes(x) && gb.includes(y)) || (ga.includes(y) && gb.includes(x))) {
        // ácido x base entre corrosivos: a NBR 17160 permite com 5 m ou segregação física (observação 8)
        if (ambos8 && ((x === 'acido' && y === 'base') || (x === 'base' && y === 'acido'))) return;
        motivos.push(nomeG(x) + ' x ' + nomeG(y) + ': ' + ef);
      }
    });
    (A.incompativeis || []).forEach((k) => { if (gb.includes(k) && k !== 'ignicao' && !(ambos8 && (k === 'acido' || k === 'base'))) motivos.push('FDS de ' + A.nome + ' declara incompatibilidade com ' + nomeG(k)); });
    (B.incompativeis || []).forEach((k) => { if (ga.includes(k) && k !== 'ignicao' && !(ambos8 && (k === 'acido' || k === 'base'))) motivos.push('FDS de ' + B.nome + ' declara incompatibilidade com ' + nomeG(k)); });
    let nivel; let texto;
    if (code === 'R') { nivel = 'incompativel'; texto = 'Armazenamento conjunto proibido (NBR 17160, Figura 1).'; }
    else if (code === 'G') { nivel = 'livre'; texto = 'Armazenamento conjunto permitido (NBR 17160, Figura 1).'; }
    else if (code === null) { nivel = (A.arm === '9' || B.arm === '9') ? 'livre' : 'verificar'; texto = nivel === 'livre' ? 'Produto sem perigo (classe 9): sem restrição pela matriz.' : 'Classe de armazenamento não definida: verificar.'; }
    else { nivel = 'restricao'; texto = 'Permitido com restrição ' + code + ': ' + N().OBS[code]; }
    if (motivos.length) { nivel = 'incompativel'; texto = (code === 'G' ? 'A matriz permite, mas há reatividade declarada. ' : '') + texto; }
    return { codigo: code, par: [A.arm, B.arm], motivos, nivel, texto, metros: code === '8' ? 5 : null };
  }

  function compatibilidade(p, local, produtos) {
    const res = { local: local ? local.nome : '', pares: [], grupos: [], itens: 0, status: 'sem_local', exigeM: 0, mensagens: [], classe: null };
    if (!local) return res;
    const ca = classeArm(p); res.classe = ca;
    if (p.armazenamento === 'granel') { res.status = 'compativel'; res.granel = true; res.mensagens.push('Armazenamento a granel em tanque: fora do escopo da NBR 17160. Aplicam-se a NBR 17505 e a NR-20.'); return res; }
    const mine = { nome: p.nome, arm: ca.id, grupos: p.comp.grupos || [], incompativeis: p.comp.incompativeis || [] };
    const itens = itensDoLocal(local, produtos, p.id);
    res.itens = itens.length;
    res.status = 'compativel';
    const espaco = Number(local.espacoM) || 0;
    const sobe = (st) => { const ord = { compativel: 0, com_medidas: 1, conflito: 2 }; if (ord[st] > ord[res.status]) res.status = st; };
    itens.forEach((it) => {
      const r = avaliaPar(mine, it);
      res.pares.push({ com: it.nome, par: r.par, codigo: r.codigo, texto: r.texto, aprox: it.aprox });
      if (r.nivel === 'incompativel') sobe('conflito');
      else if (r.nivel === 'restricao') {
        if (r.codigo === '8') { if (espaco < 5) { sobe('conflito'); res.exigeM = Math.max(res.exigeM, 5); } else sobe('com_medidas'); }
        else sobe('com_medidas');
      } else if (r.nivel === 'verificar') sobe('com_medidas');
      r.motivos.forEach((m) => res.grupos.push({ com: it.nome, a: 'Reatividade', b: '', efeito: m }));
    });
    if (res.status === 'conflito') res.mensagens.push('Há conflito de segregação. Defina local alternativo ou segregação física (bacias separadas, armários distintos, distanciamento).');
    if (res.status === 'com_medidas') res.mensagens.push('Permitido com restrições da NBR 17160: confira as observações de cada par e as condições das Seções 7 e 10 da FDS.');
    return res;
  }


  // ---------- Quantidades-limite e gatilhos (NBR 17160, Tabela 1, 6.3.1 e Seções 7 a 14) ----------
  // Cada item entra em todas as categorias de perigo que tiver (quantidade agregada, 4.5). Sem frase H, usa a classe de armazenamento (aproximado).
  function catsDoItem(it) {
    const NB = N();
    const porH = NB.CATS.filter((c) => (it.h || []).some((x) => c.re.test(x)));
    if (porH.length) return { cats: porH, aprox: false };
    const porClasse = NB.CATS.filter((c) => c.classes.includes(it.arm));
    return { cats: porClasse, aprox: porClasse.length > 0 };
  }
  function itemDe(p) { return { nome: p.nome, arm: classeArm(p).id, grupos: p.comp.grupos || [], incompativeis: p.comp.incompativeis || [], origem: 'homologado', pid: p.id, h: p.ghs.h || [], qtd: numQtd(p.comp.qtdKg) }; }
  // extra: produto em análise que ainda não conta como homologado no local
  function gatilhosLocal(local, produtos, extra) {
    const NB = N();
    const itens = itensDoLocal(local, produtos, extra && extra.id);
    if (extra && extra.armazenamento !== 'granel') itens.push(itemDe(extra));
    const res = { itens, semQtd: itens.filter((i) => i.qtd == null).map((i) => i.nome), total: 0, informado: itens.some((i) => i.qtd != null), cats: [], total1500: false, conjuntas: [], obs7: [], exige: [] };
    itens.forEach((i) => { if (i.qtd != null) res.total += i.qtd; });
    res.total1500 = res.total > 1500;
    const geral = { k: 'geral', rotulo: 'Perigosos não especificados na Tabela 1', fora: 1000, faixas: [{ acima: 200, secoes: 'Seção 9 (armazenamento conjunto)', conjunto: true }], analise: '' };
    const por = {};
    itens.forEach((it) => {
      const { cats, aprox } = catsDoItem(it);
      (cats.length ? cats : [geral]).forEach((c) => { (por[c.k] = por[c.k] || { c, qtd: 0, itens: [], aprox: false, sub: 0 }); const g = por[c.k]; g.itens.push(it.nome); if (it.qtd != null) { g.qtd += it.qtd; if (c.sub && (it.h || []).some((x) => c.sub.re.test(x))) g.sub += it.qtd; } if (aprox) g.aprox = true; });
    });
    Object.keys(por).forEach((k) => {
      const g = por[k], c = g.c, q = g.qtd;
      const ativas = c.faixas.filter((f) => q > f.acima && (!f.conjunto || g.itens.length > 1));
      let status = 'dentro';
      if (c.fora != null && q > c.fora) status = 'armazem';
      if (c.analise && c.fora != null && q > c.fora && !ativas.length) status = 'analise';
      if (c.sub && g.sub > c.sub.limite && status === 'dentro') status = 'armazem';
      if (ativas.length) status = 'secoes';
      if (c.empregador && q > 0) status = 'analise';
      const secoes = ativas.map((f) => f.secoes).join('; ');
      const r = { k, rotulo: c.rotulo, unidade: c.unidade || 'kg', qtd: q, fora: c.fora, status, secoes, analise: c.analise, nota: c.nota || '', itens: g.itens, aprox: g.aprox, subTexto: c.sub && g.sub > c.sub.limite ? c.sub.texto : '' };
      res.cats.push(r);
      if (status === 'secoes') res.exige.push(c.rotulo.split(' (')[0] + ': ' + q + ' ' + r.unidade + ' acima de ' + Math.max.apply(null, ativas.map((f) => f.acima)) + ' ' + r.unidade + ' → ' + secoes + '.' + (c.nota && q > 200 ? ' ' + c.nota : ''));
      else if (status === 'analise' && c.empregador) res.exige.push(c.rotulo.split(' (')[0] + ': ' + q + ' kg, ' + c.analise + '.');
      else if (status === 'analise') res.exige.push(c.rotulo.split(' (')[0] + ': ' + q + ' ' + r.unidade + ', faixa em que as medidas saem da análise de risco (' + c.analise + ').');
      else if (status === 'armazem') res.exige.push(c.rotulo.split(' (')[0] + ': ' + q + ' ' + r.unidade + ' acima de ' + (c.fora != null && q > c.fora ? c.fora : c.sub.limite) + ' ' + r.unidade + ' → armazenar em armazém segregado (6.3.1)' + (r.subTexto ? ' [' + r.subTexto + ']' : '') + '.');
    });
    if (res.total1500) res.exige.push('Massa líquida total de ' + Math.round(res.total) + ' kg acima de 1 500 kg: armazenamento conforme a Tabela 1, mesmo abaixo dos limites de cada categoria (6.3.1.3).');
    // armazenamento conjunto com restrição 3 ou 4 (Tabelas 3 e 4) e restrição 7 (oxidante com combustível)
    NB.CONJUNTAS.forEach((cj) => {
      const grupo = itens.filter((i) => cj.classes.includes(i.arm));
      const tem = grupo.some((a, ia) => grupo.some((b, ib) => ib > ia && a.arm !== b.arm && NB.par(a.arm, b.arm) === '4'));
      if (!tem) return;
      const q = grupo.reduce((s, i) => s + (i.qtd || 0), 0);
      const linhas = NB[cj.t].linhas; const idx = cj.faixas.findIndex((lim) => q <= lim);
      res.conjuntas.push({ titulo: NB[cj.t].titulo, classes: cj.classes, qtd: q, faixa: idx >= 0 ? linhas[idx][0] : 'acima de ' + (cj.faixas[cj.faixas.length - 1] / 1000) + ' t', texto: idx >= 0 ? linhas[idx][1] : 'Acima da maior faixa da tabela: exige análise de risco e autorização do responsável técnico (observação 1).', itens: grupo.map((i) => i.nome) });
      res.exige.push('Armazenamento conjunto de classes ' + cj.classes.join(', ') + ' (' + NB[cj.t].titulo.split(' |')[0] + '): ' + Math.round(q) + ' kg, ' + (idx >= 0 ? linhas[idx][0].toLowerCase() + '. ' + linhas[idx][1] : 'fora das faixas da tabela.'));
    });
    itens.forEach((a, ia) => itens.forEach((b, ib) => {
      if (ib <= ia || NB.par(a.arm, b.arm) !== '7') return;
      const q = (a.qtd || 0) + (b.qtd || 0);
      if (q > 1000) { res.obs7.push({ a: a.nome, b: b.nome, qtd: q }); res.exige.push(a.nome + ' e ' + b.nome + ' (oxidante com combustível): ' + Math.round(q) + ' kg acima de 1 t. Consultar o responsável técnico (observação 7).'); }
    }));
    return res;
  }


  // ---------- Anexo F | classe de perigo à água (CPA) e volume de contenção da água de extinção ----------
  function pontosAgua(hs, flags) {
    const NB = N(); const fl = flags || {}; const det = []; let t = 0;
    const tem = (c) => (hs || []).includes(c);
    Object.keys(NB.F2).forEach((c) => {
      if (!tem(c)) return;
      const [pts, anula] = NB.F2[c];
      const sup = anula.find(tem);
      if (sup) { det.push(c + ' (0, não soma com ' + sup + ')'); return; }
      t += pts; det.push(c + ' (' + pts + ')');
    });
    if (fl.semToxAguda) { t += 4; det.push('sem dados de toxicidade aguda oral e dérmica (4)'); }
    const temAmb = ['H400', 'H410', 'H411', 'H412'].some(tem);
    if (fl.semAmbiental) { const v = fl.biodegradavel ? 6 : 8; t += v; det.push('sem informação ambiental (' + v + ')'); }
    else if (fl.ensaio && !temAmb && !fl.biodegradavel) { const e = NB.F2_ENSAIO.find((x) => x[0] === fl.ensaio); if (e) { t += e[2]; det.push('ensaio ecotoxicológico ' + e[1] + ' (' + e[2] + ')'); } }
    return { pontos: t, cpa: t > 8 ? 3 : t > 4 ? 2 : 1, detalhe: det };
  }
  function cpaProduto(p) { return pontosAgua(p.ghs.h || [], p.cpa || {}); }
  function volumeAgua(areaM2, catK, cpa) {
    const F1 = N().F1; const col = (catK === 'K3' || catK === 'K4') ? 2 : 1;
    const a = Number(areaM2) || 0; if (a <= 0) return null;
    let v;
    if (a <= F1[0][0]) v = F1[0][col] * a / F1[0][0];
    else if (a >= F1[F1.length - 1][0]) v = F1[F1.length - 1][col];
    else { const i = F1.findIndex((r) => r[0] >= a); const lo = F1[i - 1], hi = F1[i]; v = lo[col] + (hi[col] - lo[col]) * (a - lo[0]) / (hi[0] - lo[0]); }
    return { base: v, fator: cpa === 3 ? 2 : cpa === 2 ? 1.5 : 1, total: v * (cpa === 3 ? 2 : cpa === 2 ? 1.5 : 1) };
  }
  function contencaoLocal(local, produtos, extra) {
    const itens = itensDoLocal(local, produtos, extra && extra.id);
    if (extra && extra.armazenamento !== 'granel') itens.push(itemDe(extra));
    const linhas = []; const semDados = [];
    itens.forEach((it) => {
      const prod = it.pid ? (it.pid === (extra && extra.id) ? extra : (produtos || []).find((x) => x.id === it.pid)) : null;
      const hs = prod ? (prod.ghs.h || []) : (it.h || []);
      if (!hs.length) { semDados.push(it.nome); return; }
      linhas.push(Object.assign({ nome: it.nome }, pontosAgua(hs, prod ? prod.cpa : {})));
    });
    const cpa = linhas.reduce((m, x) => Math.max(m, x.cpa), 1);
    const vol = volumeAgua(local.areaM2, local.catK, cpa);
    const mat = Number(local.volMaterialM3) || 0;
    return { linhas, semDados, cpa, vol, catK: local.catK || '', areaM2: Number(local.areaM2) || 0, material: mat, total: vol ? vol.total + mat : null };
  }


  // ---------- Checklist de requisitos da NBR 17160 por local ----------
  // Aplica cada requisito conforme o que está armazenado (quantidades) e as características do local.
  function requisitosLocal(local, produtos, extra) {
    const RQ = O.NBR17160REQ;
    const g = gatilhosLocal(local, produtos, extra);
    const secoes = {};
    g.cats.filter((c) => c.status === 'secoes').forEach((c) => { (c.secoes.match(/\b(7|8|10|11|12|13|14)\b/g) || []).forEach((n) => { secoes['sec' + n] = true; }); });
    const tem = (...ks) => g.cats.some((c) => ks.includes(c.k) && c.qtd > 0);
    const prods = itensDoLocal(local, produtos, extra && extra.id).map((i) => (produtos || []).find((x) => x.id === i.pid)).filter(Boolean);
    if (extra) prods.push(extra);
    const cond = {
      sempre: true,
      inflam: tem('inf12', 'inf3'),
      toxcmr: tem('tox', 'cmr'),
      p405: prods.some((x) => (x.ghs.p || []).includes('P405')),
      conjunto: g.itens.length > 1,
      aerosol: tem('aer'),
      arlivre: !!local.aoArLivre,
      armario: !!local.armarioSeg,
      vendasInflam: !!local.areaVendas && tem('inf12', 'inf3'),
      vendasAer: !!local.areaVendas && tem('aer'),
    };
    Object.assign(cond, secoes);
    const chk = local.check || {};
    const itens = RQ.REQ.filter((r) => {
      if (r.quando !== 'arlivre') return !!cond[r.quando];
      // itens de armazenamento ao ar livre: local externo e a seção do item aplicável
      const sec = { '10': 'sec10', '11': 'sec11', '12': 'sec12', '14': 'sec14', 'E': 'sec14' }[r.id.split('.')[0]];
      return cond.arlivre && !!cond[sec];
    }).map((r) => Object.assign({}, r, { resp: (chk[r.id] || {}).r || '', obs: (chk[r.id] || {}).obs || '' }));
    const cont = { total: itens.length, c: 0, nc: 0, na: 0, aberto: 0 };
    itens.forEach((i) => { if (i.resp === 'c') cont.c++; else if (i.resp === 'nc') cont.nc++; else if (i.resp === 'na') cont.na++; else cont.aberto++; });
    // inspeções (6.3.9)
    const insp = (local.inspecoes || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const per = Number(local.periodoInspecaoDias) || 0;
    let proxima = null, vencida = false;
    if (insp[0] && per) { const d = new Date(insp[0].data + 'T00:00:00'); d.setDate(d.getDate() + per); proxima = d.toISOString().slice(0, 10); vencida = proxima < new Date().toISOString().slice(0, 10); }
    return { itens, cont, cond, inspecoes: insp, periodo: per, proxima, vencida, semInspecao: !insp.length, gatilhos: g };
  }


  // ---------- Alternativas e orientações de substituição para quem aciona o gatilho CMR ou PFC ----------
  function alternativas(p) {
    const A = O.ALTERNATIVAS; const tri = triagem(p);
    const res = { aplica: tri.criticos.length > 0, carga: ehCarga(p), itens: [], porTipo: [], gerais: A.GERAIS, avaliadas: (p.cmr && p.cmr.alternativas) || '' };
    if (!res.aplica) return res;
    const vistos = {};
    const cas = (p.fds.cas || []).filter((c) => A.CAS[c]);
    // componentes declarados que têm orientação própria (mesmo que o gatilho tenha vindo pela frase H)
    const dosGatilho = tri.criticos.map((c) => (c.fonte.match(/CAS (\S+)/) || [])[1]).filter(Boolean);
    dosGatilho.concat(cas).forEach((c) => { if (A.CAS[c] && !vistos[c]) { vistos[c] = 1; res.itens.push({ cas: c, nome: A.CAS[c].nome, sug: A.CAS[c].sug, nota: A.CAS[c].nota }); } });
    const tipos = [...new Set(tri.criticos.map((c) => c.tipo))];
    tipos.forEach((t) => { if (A.TIPO[t]) res.porTipo.push({ tipo: t, rotulo: A.TIPO[t].rotulo, sug: A.TIPO[t].sug }); });
    return res;
  }


  // ---------- Análise de risco do armazém (NBR 17160, Seção 5 e Anexo A) ----------
  function analiseRiscoLocal(local, produtos, extra) {
    const R = O.RISCO; const rq = requisitosLocal(local, produtos, extra); const g = rq.gatilhos;
    const an = local.analise || {}; const cenAn = an.cenarios || {}; const campos = an.campos || {};
    const aud = auditoriaLocal(local, produtos); const ct = contencaoLocal(local, produtos, extra);
    const tem = (ks) => g.cats.some((c) => ks.includes(c.k) && c.qtd > 0);
    const nomes = (ks) => [...new Set([].concat(...g.cats.filter((c) => ks.includes(c.k) && c.qtd > 0).map((c) => c.itens)))];
    const prods = itensDoLocal(local, produtos, null).map((i) => (produtos || []).find((x) => x.id === i.pid)).filter(Boolean);
    const fm = (n) => (Math.round(n * 10) / 10).toLocaleString('pt-BR');
    const prox = aud.pares.filter((x) => x.nivel === 'incompativel').length, rest = aud.pares.filter((x) => x.nivel === 'restricao').length;
    const auto = {
      '5.1.1': nomes(['tox', 'cmr', 'stot', 'corr']).length ? 'Produtos com perigo à saúde: ' + nomes(['tox', 'cmr', 'stot', 'corr']).join('; ') + '.' : 'Nenhum produto com perigo agudo ou crônico à saúde identificado pelas frases H informadas.',
      '5.1.2': [prods.filter((x) => x.comp.tempMax).map((x) => x.nome + ': temperatura máxima ' + x.comp.tempMax).join('; '), tem(['gasp', 'gasinf', 'gasox']) ? 'Há gases pressurizados (pressão e calor).' : '', tem(['aer']) ? 'Há aerossóis (não aquecer acima de 50 °C).' : '', tem(['h260']) ? 'Há produtos reativos com a água (umidade).' : '', tem(['ox1', 'ox23']) ? 'Há oxidantes (calor e contaminação).' : ''].filter(Boolean).join(' ') || 'Sem condição física crítica identificada nos dados do app: confirme nas Seções 7 e 10 das FDS.',
      '5.1.4': g.itens.length < 2 ? 'Um só item no local: sem armazenamento conjunto.' : prox + ' par(es) proibido(s) e ' + rest + ' com restrição na auditoria de segregação.' + (prox ? ' Há conflito a resolver.' : ''),
      '5.1.5': (ct.vol ? 'Classe de perigo à água do local: CPA ' + ct.cpa + '. Volume de água de extinção a reter estimado em ' + fm(ct.total) + ' m³.' : 'Área do setor não informada: volume de água de extinção não calculado (Anexo F).') + ' Contenção de líquidos: ver itens 6.2.10 e 7.2 do checklist.',
      '5.1.6': tem(['inf12', 'inf3']) ? 'Há líquidos inflamáveis: classificar as áreas com risco de explosão e selecionar equipamentos conforme a série ABNT NBR IEC 60079 (Anexo E).' : 'Sem inflamáveis nas quantidades informadas: confirme se há outra fonte de atmosfera explosiva (poeiras, gases).',
      '5.2.1': g.itens.length ? g.itens.map((i) => i.nome + ' (classe ' + (i.arm || 'não definida') + (i.aprox ? ', aprox.' : '') + ')').join('; ') + '.' : 'Nenhum item no local.',
      '5.2.2': g.informado ? g.cats.map((c) => c.rotulo.split(' (')[0] + ': ' + fm(c.qtd) + ' ' + c.unidade).join('; ') + '. Massa líquida total: ' + Math.round(g.total).toLocaleString('pt-BR') + ' kg.' : 'Quantidades não informadas.',
      '5.2.5': g.itens.length < 2 ? 'Sem armazenamento conjunto.' : prox + ' par(es) proibido(s) e ' + rest + ' com restrição (ver auditoria de segregação do local).',
    };
    const chaveCampo = { '5.1.3': 'regulamentacaoEstadual' };
    const aspectos = R.ASPECTOS.map(([id, texto]) => ({ id, texto, auto: auto[id] || '', valor: campos[chaveCampo[id]] || '', campo: chaveCampo[id] || '' }));
    const consid = R.CONSIDERACOES.map(([id, texto, campo]) => ({ id, texto, auto: campo === 'auto' ? (auto[id] || '') : '', campo: campo === 'auto' ? '' : campo, valor: campo === 'auto' ? '' : (campos[campo] || '') }));
    const linhas = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const padrao = R.CENARIOS.filter((c) => c.quando.some((q) => q === '@sempre' || (q === '@pares' ? aud.pares.length > 0 : tem([q])))).map((c) => {
      const rel = rq.itens.filter((i) => c.grupos.includes(i.grupo) || c.ids.includes(i.id));
      const cont = { total: rel.length, c: 0, nc: 0, aberto: 0 };
      rel.forEach((i) => { if (i.resp === 'c') cont.c++; else if (i.resp === 'nc') cont.nc++; else if (i.resp !== 'na') cont.aberto++; });
      const a = cenAn[c.k] || {};
      return Object.assign({}, c, { padrao: true, causas: a.causas || c.causas, consequencias: a.consequencias || c.consequencias, medidas: a.medidasTxt ? linhas(a.medidasTxt) : c.medidas, editado: !!(a.causas || a.consequencias || a.medidasTxt), off: !!a.off, offJust: a.offJust || '', sev: a.sev || '', sevAmb: a.sevAmb || '', sevPsm: a.sevPsm || '', prob: a.prob || '', obs: a.obs || '', checklist: cont, sugProb: R.sugestaoProb(cont), risco: R.nivelCenario(a) });
    });
    const proprios = (an.proprios || []).map((x) => Object.assign({}, x, { k: 'p:' + x.id, proprio: true, medidas: linhas(x.medidas), checklist: { total: 0, c: 0, nc: 0, aberto: 0 }, sugProb: null, risco: R.nivelCenario(x) }));
    const desativados = padrao.filter((c) => c.off);
    const cenarios = padrao.filter((c) => !c.off).concat(proprios);
    const resumo = { grave: 0, psif: 0, medio: 0, baixo: 0, desprezivel: 0, semAvaliar: 0 };
    cenarios.forEach((c) => { const r = c.risco; if (r.grave) resumo.grave++; if (r.psif && r.grave) resumo.psif++; else if (r.nome === 'Médio') resumo.medio++; else if (r.nome === 'Baixo') resumo.baixo++; else if (r.nome === 'Desprezível') resumo.desprezivel++; else if (!r.grave) resumo.semAvaliar++; });
    return { aspectos, consid, anexoA: R.ANEXO_A, cenarios, desativados, resumo, campos, ameacas: campos.ameacas || '', conclusao: an.conclusao || '', data: an.data || '', revisao: an.revisao || '', rq, gatilhos: g };
  }

  // ---------- Compatibilidade entre dois produtos (aplicação prática da matriz) ----------
  function compatPar(a, b) {
    const A = { nome: a.nome, arm: classeArm(a).id, grupos: a.comp.grupos || [], incompativeis: a.comp.incompativeis || [] };
    const B = { nome: b.nome, arm: classeArm(b).id, grupos: b.comp.grupos || [], incompativeis: b.comp.incompativeis || [] };
    const r = avaliaPar(A, B);
    const acao = {
      incompativel: 'Não armazenar no mesmo setor de armazém, contêiner, armário ou bacia de contenção.',
      restricao: r.codigo ? 'Permitido com restrição ' + r.codigo + '. ' + N().OBS[r.codigo] : 'Permitido com restrições.',
      verificar: 'Classe de armazenamento não definida: verificar as Seções 7 e 10 das duas FDS.',
      livre: 'Pode compartilhar o setor de armazém. Confirme a reatividade nas FDS e o disposto em 9.1.1.4 da norma.',
    }[r.nivel];
    return { codigo: r.codigo, par: r.par, motivos: r.motivos, nivel: r.nivel, metros: r.metros, acao };
  }
  const NIVEL = { incompativel: 'Proibido', restricao: 'Com restrição', verificar: 'Verificar', livre: 'Permitido' };
  // Agrupa produtos que podem dividir o mesmo setor de armazém (todos os pares permitidos, sem restrição)
  function gruposCompativeis(lista) {
    const base = lista.filter((x) => x.armazenamento !== 'granel');
    const conflitos = (a) => base.filter((b) => b.id !== a.id && compatPar(a, b).nivel !== 'livre').length;
    const ordenados = base.slice().sort((a, b) => conflitos(b) - conflitos(a));
    const grupos = [];
    ordenados.forEach((p) => {
      const g = grupos.find((gr) => gr.every((q) => compatPar(p, q).nivel === 'livre'));
      if (g) g.push(p); else grupos.push([p]);
    });
    return grupos;
  }
  function homologados(produtos) { return (produtos || []).filter((x) => ['homologado', 'condicionado'].includes(x.status)); }

  // ---------- Estoque: só o que está armazenado ou em uso agora entra nos cálculos do local; o resto fica no histórico ----------
  // Regra estrita: só conta o que teve entrada registrada. Produto sem o campo (registro antigo) não está em estoque.
  function emEstoque(p) { return !!(p.estoque && p.estoque.ativo); }
  function estoqueAtivo(produtos) { return homologados(produtos).filter(emEstoque); }
  const hoje = () => new Date().toISOString().slice(0, 10);
  function addMov(p, m) { p.movs = p.movs || []; p.movs.push(Object.assign({ id: O.Store.uid('mov'), data: hoje(), resp: '', obs: '' }, m)); }
  function registrarEntrada(p, d) {
    const q = numQtd(d.qtdKg);
    p.estoque = { ativo: true, localId: d.localId, qtdKg: q == null ? '' : q, desde: d.data || hoje() };
    p.ctx.localId = d.localId; if (q != null) p.comp.qtdKg = q;
    addMov(p, { tipo: 'entrada', data: d.data || hoje(), localId: d.localId, qtdKg: q == null ? '' : q, resp: d.resp || '', obs: d.obs || '' });
  }
  function registrarAjuste(p, d) {
    const q = numQtd(d.qtdKg); if (q == null) return;
    const loc = (p.estoque && p.estoque.localId) || p.ctx.localId;
    p.estoque = Object.assign({ ativo: true, localId: loc, desde: hoje() }, p.estoque, { ativo: true, qtdKg: q }); p.comp.qtdKg = q;
    addMov(p, { tipo: 'ajuste', data: d.data || hoje(), localId: loc, qtdKg: q, resp: d.resp || '', obs: d.obs || '' });
  }
  function registrarSaida(p, d) {
    const loc = (p.estoque && p.estoque.localId) || p.ctx.localId; const q = p.estoque && p.estoque.qtdKg !== undefined ? p.estoque.qtdKg : p.comp.qtdKg;
    addMov(p, { tipo: 'saida', data: d.data || hoje(), localId: loc, qtdKg: q === undefined ? '' : q, resp: d.resp || '', obs: d.obs || '' });
    p.estoque = { ativo: false, localId: loc, qtdKg: '', desde: '' };
  }
  // movimentos de entrada, ajuste e saída dos produtos num local, e produtos homologados para o local que não estão em estoque
  function historicoLocal(local, produtos) {
    const movs = []; const semEstoque = [];
    (produtos || []).forEach((q) => {
      (q.movs || []).forEach((m) => { if (m.localId === local.id) movs.push(Object.assign({ produto: q.nome, pid: q.id }, m)); });
      if (['homologado', 'condicionado'].includes(q.status) && q.ctx && q.ctx.localId === local.id && q.armazenamento !== 'granel' && !emEstoque(q)) semEstoque.push(q.nome);
    });
    movs.sort((a, b) => String(b.data).localeCompare(String(a.data)));
    return { movs, semEstoque };
  }

  // ---------- Sugestões prontas (hierarquia de controles) ----------
  function sugestoes(p) {
    const h = p.ghs.h || [];
    const has = (re) => h.some((c) => re.test(c));
    const s = { ocup: { subst: [], eng: [], adm: [], epi: [] }, amb: { contencao: [], residuos: [], derramamento: [] }, controlesArm: [], risco: { ocup: false, amb: false } };
    const grave = has(/^H(300|310|330|340|350|360|370|372|304|314|334)/);
    if (grave) { s.ocup.subst.push(ehCarga(p) ? 'Substituição não se aplica: o produto é a carga do terminal. Priorizar controles de engenharia e administrativos.' : 'Avaliar produto equivalente de menor perigo antes de aprovar (substituição).'); s.risco.ocup = true; }
    if (has(/^H(33\d|335|336|334)$/) || has(/^H22[0-6]$/)) { s.ocup.eng.push('Ventilação geral diluidora ou exaustão local no ponto de uso; usar em local ventilado ou ao ar livre.'); s.ocup.epi.push('Proteção respiratória com filtro adequado ao agente (Seção 8 da FDS), se a exposição não ficar sob controle.'); s.risco.ocup = true; }
    if (has(/^H(31\d|314|317)$/)) { s.ocup.epi.push('Luvas de material resistente ao produto (conforme Seção 8 da FDS) e vestimenta de proteção.'); s.ocup.adm.push('Higiene pessoal após o manuseio; trocar de imediato roupa contaminada.'); s.risco.ocup = true; }
    if (has(/^H(314|318|319|320)$/)) { s.ocup.epi.push('Óculos de ampla visão; protetor facial na transferência de volumes.'); s.ocup.eng.push('Lava-olhos e chuveiro de emergência a menos de 10 s do ponto de uso.'); s.risco.ocup = true; }
    if (has(/^H30\d$/)) { s.ocup.adm.push('Proibido comer, beber ou fumar na área de manuseio e armazenagem.'); s.risco.ocup = true; }
    if (has(/^H(22\d|24\d|25\d|26\d|27\d)$/)) { s.ocup.eng.push('Aterramento e equivalência de potencial na transferência; equipamentos elétricos adequados à área classificada.'); s.ocup.adm.push('Permissão de trabalho a quente e proibição de fontes de ignição no entorno.'); s.ocup.epi.push('Ferramentas antifaiscantes e calçado antiestático.'); s.risco.ocup = true; }
    if (has(/^H(29\d|31[4])$/)) { s.ocup.eng.push('Recipientes e bombas compatíveis com o material (corrosão).'); }
    if (!s.ocup.adm.length) s.ocup.adm.push('Treinamento prévio, sinalização GHS e FDS disponível no ponto de uso.');
    else s.ocup.adm.push('Treinamento prévio, sinalização GHS e FDS disponível no ponto de uso.');
    if (has(/^H4[0-2]\d$/) || p.imdg.poluente) {
      s.risco.amb = true;
      s.amb.contencao.push('Bacia de contenção com volume mínimo do maior recipiente e piso impermeável.');
      s.amb.derramamento.push('Kit de absorção no local; impedir chegada a drenagem pluvial, solo e corpo hídrico.');
      s.amb.residuos.push('Destinar resíduos e embalagens contaminadas como resíduo perigoso, conforme classificação da ABNT NBR 10004.');
    }
    if (p.imdg.poluente) s.amb.derramamento.push('Poluente marinho (IMDG): evitar qualquer liberação em operação portuária; acionar o plano de emergência em caso de contato com a água.');
    const n20 = nr20(p);
    if (n20.aplica) s.controlesArm.push('temp_vent', 'sinalizacao', 'bacia');
    if (has(/^H(314|290|40\d|41\d)$/) || p.imdg.classe === '8') s.controlesArm.push('bacia');
    s.controlesArm.push('sinalizacao');
    if ((p.imdg.classe === '5.2') || has(/^H24[0-2]$/)) s.controlesArm.push('temp_vent');
    s.controlesArm = [...new Set(s.controlesArm)];
    return s;
  }

  function gruposSugeridos(p) {
    const g = new Set();
    const cl = classesDoProduto(p);
    const ph = parseFloat(String(p.fds.ph || '').replace(',', '.'));
    const h = p.ghs.h || [];
    const cas = p.fds.cas || [];
    if (cl.includes('5.1')) g.add('oxidante');
    if (cl.includes('5.2')) g.add('peroxido');
    if (cl.includes('4.3')) g.add('agua_reativo');
    if (cl.includes('3') || cl.includes('4.1') || h.some((c) => /^H22[0-8]$/.test(c))) g.add('organico_combustivel');
    if (cl.includes('8') && !isNaN(ph)) g.add(ph >= 10 ? 'base' : ph <= 4 ? 'acido' : '');
    if (cas.includes('7681-52-9')) g.add('hipoclorito');
    if (cas.includes('7664-41-7') || cas.includes('1336-21-6')) g.add('amonia_aminas');
    if (cas.some((c) => ['143-33-9', '151-50-8', '57-12-5'].includes(c))) g.add('cianeto_sulfeto');
    if (cas.some((c) => ['1310-58-3', '1310-73-2'].includes(c))) g.add('base');
    if (cas.some((c) => ['7647-01-0', '7664-93-9', '7697-37-2', '7664-38-2'].includes(c))) g.add('acido');
    g.delete('');
    return [...g];
  }

  // ---------- Similaridade (read-across) ----------
  function divergencias(p, ref) {
    const d = [];
    if (!ref) return d;
    const R = (texto) => d.push({ tipo: 'relevante', texto });
    const C = (texto) => d.push({ tipo: 'contexto', texto });
    const novos = (p.fds.cas || []).filter((c) => !(ref.fds.cas || []).includes(c));
    if (novos.length) R('Componentes (CAS) ausentes no produto de referência: ' + novos.join(', ') + '.');
    const hn = (p.ghs.h || []).filter((c) => !(ref.ghs.h || []).includes(c));
    if (hn.length) R('Frases H adicionais em relação à referência: ' + hn.join(', ') + '.');
    if (p.imdg.classe && ref.imdg.classe && p.imdg.classe !== ref.imdg.classe) R('Classe de risco distinta (' + p.imdg.classe + ' contra ' + ref.imdg.classe + ').');
    const tn = (p.comp.incompativeis || []).filter((t) => !(ref.comp.incompativeis || []).includes(t));
    if (tn.length) R('Incompatibilidades diferentes da referência: ' + tn.map((t) => (T.RG.find((r) => r[0] === t) || [t, t])[1]).join(', ') + '.');
    if (p.sim.divergencia) R('Divergência registrada pelo analista: ' + p.sim.divergencia);
    if (ref.finalidade && p.finalidade && ref.finalidade !== p.finalidade) C('Finalidade de uso distinta da referência (' + ref.finalidade + '): avaliação ocupacional e ambiental não pode ser aproveitada.');
    if (ref.ctx && p.ctx.localId && ref.ctx.localId !== p.ctx.localId) C('Local de armazenamento distinto da referência: avaliação ocupacional e ambiental não pode ser aproveitada.');
    return d;
  }
  function auditoriaLocal(local, produtos) {
    const itens = itensDoLocal(local, produtos, null);
    const out = [];
    for (let i = 0; i < itens.length; i++) for (let j = i + 1; j < itens.length; j++) {
      const r = avaliaPar(itens[i], itens[j]);
      if (r.nivel !== 'livre') out.push({ a: itens[i].nome, b: itens[j].nome, codigo: r.codigo, par: r.par, motivos: r.motivos, nivel: r.nivel, texto: r.texto, metros: r.metros });
    }
    return { itens, pares: out };
  }
  function simplificadaVigente(p) { return p.sim.ativa === true && !p.sim.encerrada; }
  function criteriosSimOk(p) { return p.sim.familia && p.sim.forma && p.sim.componentes && !!p.sim.refId; }

  // ---------- Validade da FDS ----------
  function idadeFds(p) {
    if (!p.fds.dataRevisao) return null;
    const d = new Date(p.fds.dataRevisao);
    if (isNaN(d)) return null;
    return (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  }

  // ---------- Exigências do produto a granel para os tanques ----------
  // Os tanques são multiuso: o app não vincula produto a tanque. Cada item é uma pergunta à engenharia e à operação; o app não calcula projeto.
  const ATENDE = [['sim', 'Sim, a frota atende sem modificação'], ['nao', 'Não atende: exige adaptação'], ['depende', 'Depende do tanque'], ['na', 'Não se aplica']];
  function tanqueDe(p) { const t = p.tanque || {}; return { pontoEbulicao: t.pontoEbulicao || '', obs: t.obs || '', itens: t.itens || {}, cenario: Object.assign({ sev: '', sevAmb: '', sevPsm: '', prob: '', obs: '' }, t.cenario || {}) }; }
  // classe do líquido pela NBR 17505-1:2013, Tabela 1 (página 19 da norma)
  function classe17505(p) {
    const pf = p.imdg.pontoFulgor === '' || p.imdg.pontoFulgor == null ? NaN : parseFloat(String(p.imdg.pontoFulgor).replace(',', '.'));
    if (isNaN(pf)) return { id: '', texto: 'Informe o ponto de fulgor (etapa 10) para classificar o líquido pela NBR 17505-1.' };
    if (pf < 22.8) {
      const pe = parseFloat(String(tanqueDe(p).pontoEbulicao).replace(',', '.'));
      if (isNaN(pe)) return { id: 'I', texto: 'Classe I (IA ou IB): ponto de fulgor abaixo de 22,8 °C. Informe o ponto de ebulição para separar IA (abaixo de 37,8 °C) de IB.' };
      return pe < 37.8 ? { id: 'IA', texto: 'Classe IA: ponto de fulgor abaixo de 22,8 °C e ponto de ebulição abaixo de 37,8 °C.' } : { id: 'IB', texto: 'Classe IB: ponto de fulgor abaixo de 22,8 °C e ponto de ebulição de 37,8 °C ou mais.' };
    }
    if (pf < 37.8) return { id: 'IC', texto: 'Classe IC: ponto de fulgor de 22,8 °C até menos de 37,8 °C.' };
    if (pf < 60) return { id: 'II', texto: 'Classe II: ponto de fulgor de 37,8 °C até menos de 60 °C.' };
    if (pf < 93) return { id: 'IIIA', texto: 'Classe IIIA: ponto de fulgor de 60 °C até menos de 93 °C.' };
    return { id: 'IIIB', texto: 'Classe IIIB: ponto de fulgor de 93 °C ou mais.' };
  }
  function exigenciasTanque(p) {
    const h = p.ghs.h || []; const inf = h.some((c) => /^H22[0-6]$/.test(c)) || ['IA', 'IB', 'IC', 'II', 'I'].includes(classe17505(p).id);
    const corr = h.some((c) => /^H(290|314)$/.test(c)) || classesDoProduto(p).includes('8');
    const amb = h.some((c) => /^H4[01]\d$/.test(c)) || p.imdg.poluente;
    const tox = h.some((c) => /^H3(0|3)\d$/.test(c));
    const T = tanqueDe(p).itens;
    const mk = (k, rot, dica) => ({ k, rot, dica, atende: (T[k] || {}).atende || '' });
    return [
      mk('teto', 'Tipo de teto e selagem do tanque', inf ? 'Líquido inflamável: o tipo de teto e a selagem devem servir ao produto e à sua pressão de vapor.' : 'Confirme se o tipo de teto atual serve ao produto (Seção 7 da FDS).'),
      mk('respiro', 'Respiro, válvulas de alívio e inertização', inf ? 'Vapores inflamáveis: conferir respiro, corta-chamas e necessidade de inertização.' : 'Conferir se o produto pede respiro especial ou atmosfera inerte (Seções 7 e 10 da FDS).'),
      mk('material', 'Material do tanque, juntas, vedações, mangotes e bombas', corr ? 'Produto corrosivo: conferir a compatibilidade de cada material em contato.' : 'Confirme os materiais compatíveis e incompatíveis (Seções 7 e 10 da FDS).'),
      mk('aquecimento', 'Aquecimento, serpentina ou controle de temperatura', p.comp.tempMax ? 'A FDS indica temperatura máxima de ' + p.comp.tempMax + '. Conferir também ponto de fusão e viscosidade.' : 'Conferir ponto de fusão, viscosidade e temperatura de armazenamento (Seções 7 e 9 da FDS).'),
      mk('contaminacao', 'Contaminação cruzada e limpeza do tanque', 'O tanque que receber o produto pode ter armazenado outro: há limite de contaminação ou exigência de limpeza ou descontaminação?'),
      mk('contencao', 'Bacia de contenção e retenção da água de extinção', amb ? 'Perigoso ao ambiente aquático: avaliar retenção de vazamento e de água de extinção contaminada.' : 'Conferir se a bacia atende ao volume e ao produto.'),
      mk('combate', 'Sistema de combate a incêndio adequado ao produto', inf ? 'Inflamável: conferir se o sistema (resfriamento, espuma) serve ao produto, inclusive o tipo de espuma.' : 'Conferir se o sistema de combate existente serve ao produto (Seção 5 da FDS).'),
      mk('aterramento', 'Aterramento e controle de fontes de ignição', inf ? 'Inflamável: aterramento, equivalência de potencial e áreas classificadas.' : 'Conferir se há exigência de aterramento ou de área classificada.'),
      mk('saude', 'Vapores tóxicos, EPI e drenagem', tox ? 'Há perigo de toxicidade: conferir controle de emissões, EPI e drenagem.' : 'Conferir controle de emissões, EPI e drenagem (Seção 8 da FDS).'),
    ];
  }

  // ---------- Compatibilidade de produtos a granel (tanques e bacias) ----------
  // Base: incompatibilidades declaradas na Seção 10 das FDS e consulta externa registrada pelo analista (por exemplo, NOAA CAMEO).
  // Não usa a matriz da NBR 17160, que é de armazenamento embalado.
  const RES_CONSULTA = [['incompativel', 'Incompatível (reação perigosa)'], ['restricao', 'Compatível com restrição'], ['sem_incompat', 'Nenhuma incompatibilidade encontrada'], ['sem_dados', 'Consultei e não há dados']];
  const NIVEL_GRANEL = { incompativel: 'Incompatível', restricao: 'Com restrição', sem_dados: 'Sem dados: confirmar', nada: 'Nenhuma incompatibilidade declarada' };
  const ORD_GRANEL = { incompativel: 3, restricao: 2, sem_dados: 1, nada: 0 };
  function compatGranel(a, b) {
    const rot = (g) => (T.RG.find((r) => r[0] === g) || [g, g])[1];
    const gA = a.comp.grupos || [], gB = b.comp.grupos || [], iA = a.comp.incompativeis || [], iB = b.comp.incompativeis || [];
    const decl = [];
    iA.filter((g) => gB.includes(g)).forEach((g) => decl.push('A FDS de "' + a.nome + '" declara incompatibilidade com ' + rot(g).toLowerCase() + ' (grupo de "' + b.nome + '").'));
    iB.filter((g) => gA.includes(g)).forEach((g) => decl.push('A FDS de "' + b.nome + '" declara incompatibilidade com ' + rot(g).toLowerCase() + ' (grupo de "' + a.nome + '").'));
    const semDados = a.comp.incompDeclaradas == null || b.comp.incompDeclaradas == null || (!gA.length && !gB.length);
    const fds = decl.length ? 'incompativel' : semDados ? 'sem_dados' : 'nada';
    const c = O.Store.consulta(a.id, b.id); let nivel = fds; let diverge = false;
    if (c) {
      if (c.resultado === 'incompativel') nivel = 'incompativel';
      else if (c.resultado === 'restricao') nivel = fds === 'incompativel' ? 'incompativel' : 'restricao';
      else if (c.resultado === 'sem_incompat') { nivel = fds === 'incompativel' ? 'incompativel' : 'nada'; diverge = fds === 'incompativel'; }
    }
    return { nivel, fds, decl, consulta: c, diverge };
  }
  // terminal inteiro: todos os pares de produtos a granel que constam nas bacias (para o dossiê)
  function analiseTerminalGranel(bacias, produtos) {
    const reg = {};
    (bacias || []).forEach((b) => (b.produtos || []).forEach((id) => { const p = (produtos || []).find((x) => x.id === id); if (p) (reg[id] = reg[id] || { p, bacias: [] }).bacias.push(b.nome); }));
    const lista = Object.values(reg); const pares = []; const resumo = { incompativel: 0, restricao: 0, sem_dados: 0, nada: 0 };
    for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
      const res = compatGranel(lista[i].p, lista[j].p); const comuns = lista[i].bacias.filter((x) => lista[j].bacias.includes(x));
      pares.push({ a: lista[i].p, b: lista[j].p, mesma: comuns.length > 0, bacias: comuns, res }); resumo[res.nivel]++;
    }
    pares.sort((x, y) => ORD_GRANEL[y.res.nivel] - ORD_GRANEL[x.res.nivel] || (y.mesma ? 1 : 0) - (x.mesma ? 1 : 0));
    return { produtos: lista, pares, resumo };
  }
  function analiseTanque(p, bacias, produtos) {
    const dias = O.Store.config().alertaDiasBacia || 30;
    const out = { bacias: [], terminal: [], resumo: { incompativel: 0, restricao: 0, sem_dados: 0, nada: 0 }, semBacias: !(bacias || []).length, desatualizadas: [] };
    const vistos = {};
    (bacias || []).forEach((b) => {
      const lista = (b.produtos || []).map((id) => (produtos || []).find((x) => x.id === id)).filter((x) => x && x.id !== p.id);
      const pares = lista.map((o) => ({ outro: o, res: compatGranel(p, o) }));
      const pior = pares.reduce((m, x) => (ORD_GRANEL[x.res.nivel] > ORD_GRANEL[m] ? x.res.nivel : m), 'nada');
      out.bacias.push({ bacia: b, pares, pior });
      const idade = b.atualizadoEm ? (Date.now() - new Date(b.atualizadoEm).getTime()) / 86400000 : Infinity;
      if (idade > dias) out.desatualizadas.push({ bacia: b, dias: isFinite(idade) ? Math.floor(idade) : null });
      lista.forEach((o) => { (vistos[o.id] = vistos[o.id] || { outro: o, bacias: [] }).bacias.push(b.nome); });
    });
    Object.values(vistos).forEach((v) => { const res = compatGranel(p, v.outro); out.terminal.push(Object.assign({}, v, { res })); out.resumo[res.nivel]++; });
    return out;
  }

  // ---------- Gestão de mudança (MOC) ----------
  // O app não faz o MOC (feito em outro sistema): levanta se é necessário e registra se foi feito.
  const MOC_SIT = [['nao_aberto', 'Ainda não aberto'], ['andamento', 'Em andamento'], ['concluido', 'Concluído'], ['dispensado', 'Dispensado (com justificativa)']];
  function mudancaDe(p) { return Object.assign({ exige: null, substituiId: '', motivo: '', situacao: '', ref: '', resp: '', data: '', just: '' }, p.mudanca || {}); }
  function mudancaSugestao(p, produtos) {
    const m = mudancaDe(p); const motivos = []; let dv = []; let ref = null;
    if (m.substituiId) {
      ref = (produtos || []).find((x) => x.id === m.substituiId) || O.Store.produto(m.substituiId);
      if (ref) {
        dv = divergencias(p, ref).filter((x) => x.tipo === 'relevante');
        motivos.push('Troca de produto: substitui "' + ref.nome + '".' + (dv.length ? ' O perfil mudou em relação ao produto substituído (ver diferenças).' : ' Pelos dados do app o perfil não mudou de forma relevante: confirme nas FDS.'));
      }
    }
    if (p.armazenamento === 'granel') {
      const it = exigenciasTanque(p); const nao = it.filter((x) => x.atende === 'nao').map((x) => x.rot); const dep = it.filter((x) => x.atende === 'depende').map((x) => x.rot);
      if (nao.length || dep.length) motivos.push('A frota pode não atender ao produto sem modificação.' + (nao.length ? ' Não atende: ' + nao.join('; ') + '.' : '') + (dep.length ? ' Depende do tanque: ' + dep.join('; ') + '.' : '') + ' Obra ou adaptação de tanque exige MOC de engenharia.');
      else motivos.push('Produto a granel nos tanques do terminal: responda às exigências do produto para o tanque (etapa 11.2). Se a frota não atender, é necessário MOC de engenharia.');
    }
    if (p.comp && p.comp.localOk === 'conflito' && ['alternativo', 'condicionar'].includes(p.comp.solucao)) motivos.push('Segregação física ou local alternativo implica mudança no armazenamento.');
    return { sugere: motivos.length > 0, motivos, divergencias: dv, ref };
  }
  function substituidoPor(p, produtos) { return (produtos || []).filter((q) => q.id !== p.id && mudancaDe(q).substituiId === p.id); }

  // ---------- Avaliação consolidada ----------
  function avaliar(p, produtos) {
    const cfg = O.Store.config();
    const r = { reprovacoes: [], pendencias: [], condicionantes: [], alertas: [], sugestao: 'em_analise', tri: null };
    r.tri = triagem(p, cfg);
    if (r.tri.reprovado) {
      const rot = { cancerigeno: 'Cancerígeno', mutagenico: 'Mutagênico', teratogenico: 'Teratogênico', reprodutivo: 'Tóxico à reprodução', pfc: 'Contém PFCs ou PFAS' };
      const g = {};
      r.tri.criticos.forEach((c) => { (g[c.tipo] = g[c.tipo] || []).push(c.fonte === 'analista' ? 'marcado pelo analista' : c.fonte + (c.detalhe.includes('componente ') ? ' (' + c.detalhe.split('componente ')[1].split(' consta')[0] + ')' : '')); });
      const lista = Object.keys(g).map((k) => rot[k] + ' [' + g[k].join('; ') + ']');
      {
        // gatilho de reprovação automática: sinaliza, pede justificativa e controles, e deixa a decisão com o responsável técnico
        r.cmr = lista;
        r.gatilhos = [(ehCarga(p) ? 'Produto armazenado pelo terminal' : 'Insumo') + ' com perigo CMR ou PFC: ' + lista.join('; ') + '.'];
        r.alertas.push('Gatilho de reprovação automática acionado: ' + lista.join('; ') + '. O app não bloqueia: a decisão é do responsável técnico, com justificativa, controles de exposição (PGR, PCMSO, plano de emergência) e parecer de Higiene Ocupacional.');
        const c = p.cmr || {};
        if (!String(c.justificativa || '').trim()) r.pendencias.push('Justificativa de não substituição do agente CMR ou PFC não registrada (etapa 7).');
        if (!(c.controles || []).length) r.pendencias.push('Controles de exposição a agentes CMR ou PFC não selecionados, etapa 7.');
        if (!p.hig.parecerExigidoOk) r.pendencias.push('Parecer formal de Higiene Ocupacional exigido antes da decisão (agente CMR ou PFC).');
        if ((c.controles || []).length && !c.controlesOk) r.condicionantes.push('Implantar e verificar os controles de exposição a agentes CMR ou PFC: ' + c.controles.map((k) => ((O.CMR_CONTROLES || []).find((x) => x[0] === k) || [k, k])[1]).join('; ') + '.');
      }
    }
    r.tri.suspeitos.forEach((c) => r.alertas.push(c.detalhe));

    // quantidades-limite da NBR 17160 no local de armazenamento (alerta; a decisão segue com o analista)
    const locQ = p.armazenamento !== 'granel' && p.ctx && p.ctx.localId ? O.Store.local(p.ctx.localId) : null;
    if (locQ) {
      if (numQtd(p.comp.qtdKg) == null) r.alertas.push('Quantidade a armazenar no local não informada (etapa 11): não é possível verificar as quantidades-limite da NBR 17160.');
      else gatilhosLocal(locQ, produtos, p).exige.forEach((x) => r.alertas.push('NBR 17160 | ' + locQ.nome + ': ' + x));
    }

    if (p.lista.naLista === true) { r.sugestao = 'na_lista'; return r; }
    if (p.fds.completa === false) r.pendencias.push('FDS fora da ABNT NBR 14725:2023: solicitar correção ao fornecedor.');
    if (p.fds.atualizada === false) r.pendencias.push('FDS desatualizada ou fora do português: solicitar versão atualizada.');
    const idade = idadeFds(p);
    if (idade != null && idade > cfg.anosValidadeFDS) r.alertas.push('FDS com revisão há ' + idade.toFixed(1).replace('.', ',') + ' anos (limite configurado: ' + cfg.anosValidadeFDS + ').');

    if (['1', '6.2', '7'].includes(p.imdg.classe)) r.pendencias.push('Classe ' + p.imdg.classe + ' (' + T.classeNome(p.imdg.classe) + ') fora do escopo geral do aplicativo: exige análise especial e exceção legal para armazenamento em área comum.');
    if (p.imdg.incompativelOperacao) r.alertas.push('Classificação IMDG incompatível com as operações do local de uso: sinalizado, a decisão é do responsável técnico.');
    if (p.hig.tlv === true && !p.hig.parecerExigidoOk) r.pendencias.push('Parecer formal de Higiene Ocupacional exigido antes da decisão (agente com limite NR-15 ou TLV).');
    if (p.hig.pgr === 'requer' || p.par.pgrIndicador === 'requer') r.condicionantes.push('PGR / Inventário de Riscos exige atualização antes da liberação de uso.');
    if (p.hig.pgr === 'indefinido') r.pendencias.push('Cobertura do PGR indefinida: encaminhar FDS ao elaborador do PGR.');
    if (p.hig.dosimetria === true) r.condicionantes.push('Avaliação quantitativa (dosimetria ou varredura) pendente antes da liberação de uso.');
    if (p.comp.localOk === 'insuficiente') r.pendencias.push('Informação insuficiente na FDS para avaliar o armazenamento: solicitar complementação ao fornecedor.');
    if (p.comp.localOk === 'conflito') {
      if (p.comp.solucao === 'reprovar') r.alertas.push('Conflito de segregação no local de armazenamento sem solução viável: sinalizado, a decisão é do responsável técnico.');
      else if (p.comp.solucao === 'condicionar') r.condicionantes.push('Conflito de segregação: homologação condicionada a medida de segregação ou local alternativo.');
      else r.pendencias.push('Conflito de segregação sem solução definida (etapa 11.2).');
    }
    if (p.par.pgrIndicador === '' && p.confirmadas['12']) r.pendencias.push('Indicador de PGR não registrado (etapa 12.2).');
    if (p.armazenamento === 'granel') {
      const at = analiseTanque(p, O.Store.bacias(), produtos);
      if (at.semBacias) r.alertas.push('Nenhuma bacia de contenção cadastrada: a compatibilidade com os produtos do terminal não foi analisada (menu Bacias de contenção).');
      else {
        const inc = at.terminal.filter((x) => x.res.nivel === 'incompativel');
        if (inc.length) r.alertas.push('Incompatibilidade com produto(s) do terminal: ' + inc.map((x) => x.outro.nome + ' (bacia ' + x.bacias.join(', ') + ')').join('; ') + '. A decisão é do responsável técnico, com justificativa.');
        if (at.resumo.sem_dados) r.pendencias.push('Compatibilidade sem dados com ' + at.resumo.sem_dados + ' produto(s) do terminal: consultar a fonte externa e registrar o resultado (etapa 11.2).');
        at.desatualizadas.forEach((d) => r.alertas.push('Lista de produtos da bacia "' + d.bacia.nome + '" desatualizada' + (d.dias != null ? ' (há ' + d.dias + ' dias)' : '') + ': confirme antes de confiar na análise.'));
      }
      if (!RK().nivelCenario(tanqueDe(p).cenario).v) r.pendencias.push('Avaliar o cenário de vazamento simultâneo de mais de um tanque (etapa 11.2).');
    }
    {
      const m = mudancaDe(p); const sg = mudancaSugestao(p, produtos);
      if (m.exige === true) {
        if (m.situacao === 'concluido') { if (!String(m.ref).trim()) r.pendencias.push('MOC concluído sem número ou referência registrada (etapa 12.3).'); }
        else if (m.situacao === 'dispensado') { if (!String(m.just).trim()) r.pendencias.push('MOC dispensado sem justificativa (etapa 12.3).'); }
        else r.condicionantes.push('Gestão de mudança (MOC) necessária e ainda não concluída' + (m.ref ? ' (ref. ' + m.ref + ')' : '') + ': ' + ((MOC_SIT.find((x) => x[0] === m.situacao) || [0, 'situação não informada'])[1]).toLowerCase() + '.');
      } else if (m.exige === false) {
        if (p.armazenamento === 'granel' && exigenciasTanque(p).some((x) => ['nao', 'depende'].includes(x.atende))) r.alertas.push('Há exigências do produto que a frota pode não atender (etapa 11.2), mas o MOC foi marcado como não exigido: confirme.');
        if (sg.sugere && !String(m.just).trim()) r.pendencias.push('Justificativa de que não há MOC não registrada (etapa 12.3).');
      } else if (sg.sugere) r.pendencias.push('Definir se o produto exige gestão de mudança (MOC), etapa 12.3: ' + sg.motivos[0]);
    }
    if (simplificadaVigente(p)) {
      const ref = O.Store.produto(p.sim.refId);
      const dv = divergencias(p, ref).filter((x) => x.tipo === 'relevante');
      if (dv.length) r.alertas.push('Divergência em relação à referência: a via simplificada deve ser encerrada. ' + dv.map((x) => x.texto).join(' '));
    }
    if (r.reprovacoes.length) r.sugestao = 'reprovado';
    else if (p.imdg.incompativelOperacao || p.comp.solucao === 'reprovar') r.sugestao = 'pendente';
    else if (r.pendencias.length) r.sugestao = 'pendente';
    else if (r.condicionantes.length) r.sugestao = 'condicionado';
    else r.sugestao = 'homologado';
    return r;
  }

  O.Engine = { emEstoque, estoqueAtivo, registrarEntrada, registrarAjuste, registrarSaida, historicoLocal, analiseRiscoLocal, alternativas, requisitosLocal, gatilhoCMR, contencaoLocal, cpaProduto, volumeAgua, gatilhosLocal, itensDoLocal, gruposCompativeis, novoProduto, ehCarga, rejeitaAuto, cmrCarga, triagem, nr20, combustivel, classeArm, armDoItem, avaliaPar, compatibilidade, compatPar, NIVEL, homologados, sugestoes, gruposSugeridos, divergencias, auditoriaLocal, simplificadaVigente, criteriosSimOk, idadeFds, avaliar, classesDoProduto, itensDoLocal, RES_CONSULTA, NIVEL_GRANEL, compatGranel, analiseTanque, analiseTerminalGranel, MOC_SIT, ATENDE, tanqueDe, classe17505, exigenciasTanque, mudancaDe, mudancaSugestao, substituidoPor };
})(window.O360 = window.O360 || {});
