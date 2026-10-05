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
      comp: { incompDeclaradas: null, grupos: [], incompativeis: [], incompTexto: '', localOk: '', solucao: '', controles: [], limite: '', tempMax: '', observacoes: '' },
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

  // ---------- Compatibilidade ----------
  function classesDoProduto(p) {
    const c = [];
    if (p.imdg.classe) c.push(p.imdg.classe);
    if (p.imdg.subrisco) p.imdg.subrisco.split(/[,;\s]+/).filter(Boolean).forEach((s) => c.push(s));
    return c;
  }

  const rank = { '4': 4, '3': 3, '2': 2, '1': 1, 'X': 0.5, '-': 0 };
  function maiorCodigo(clsA, clsB) {
    let best = null; let par = null;
    clsA.forEach((a) => clsB.forEach((b) => {
      let code = T.seg(a, b);
      if (code == null) return;
      if (a === b) code = '-';
      if (best == null || rank[code] > rank[best]) { best = code; par = [a, b]; }
    }));
    return { codigo: best, par };
  }

  function itensDoLocal(local, produtos, excluirId) {
    const itens = (local.itens || []).map((i) => ({ nome: i.nome, classes: [i.classe, ...(i.subrisco ? i.subrisco.split(/[,;\s]+/).filter(Boolean) : [])].filter(Boolean), grupos: i.grupos || [], incompativeis: i.incompativeis || [], origem: 'manual' }));
    (produtos || []).forEach((q) => {
      if (q.id === excluirId) return;
      if (q.ctx && q.ctx.localId === local.id && ['homologado', 'condicionado'].includes(q.status)) {
        itens.push({ nome: q.nome, classes: classesDoProduto(q), grupos: q.comp.grupos || [], incompativeis: q.comp.incompativeis || [], origem: 'homologado', pid: q.id });
      }
    });
    return itens;
  }

  function compatibilidade(p, local, produtos) {
    const res = { local: local ? local.nome : '', pares: [], grupos: [], itens: 0, status: 'sem_local', exigeM: 0, mensagens: [] };
    if (!local) return res;
    const mine = classesDoProduto(p);
    const itens = itensDoLocal(local, produtos, p.id);
    res.itens = itens.length;
    res.status = 'compativel';
    const espaco = Number(local.espacoM) || 0;
    itens.forEach((it) => {
      if (mine.length && it.classes.length) {
        const r = maiorCodigo(mine, it.classes);
        if (r.codigo != null) {
          const leg = T.SEG_LEGEND[r.codigo];
          res.pares.push({ com: it.nome, par: r.par, codigo: r.codigo, texto: r.codigo === '-' ? 'Mesma classe: sem segregação pela matriz. Confirme a reatividade pela FDS.' : leg.nome });
          if (r.codigo === '2' || r.codigo === '3' || r.codigo === '4') {
            const need = leg.metros;
            if (espaco < need) { res.status = 'conflito'; res.exigeM = Math.max(res.exigeM, need); }
            else if (res.status !== 'conflito') res.status = 'com_medidas';
          } else if ((r.codigo === '1' || r.codigo === 'X') && res.status === 'compativel') res.status = 'com_medidas';
        }
      }
      // grupos de reatividade: pares da tabela de regras e incompatibilidades declaradas na FDS (Seção 10)
      const nomeG = (k) => (T.RG.find((r) => r[0] === k) || [k, k])[1];
      const mg = p.comp.grupos || [];
      mg.forEach((ta) => (it.grupos || []).forEach((tb) => {
        T.RG_RULES.forEach(([a, b, efeito]) => {
          if ((a === ta && b === tb) || (a === tb && b === ta)) { res.grupos.push({ com: it.nome, a: nomeG(ta), b: nomeG(tb), efeito }); res.status = 'conflito'; }
        });
      }));
      (p.comp.incompativeis || []).forEach((k) => { if ((it.grupos || []).includes(k) && k !== 'ignicao') { res.grupos.push({ com: it.nome, a: 'FDS do produto', b: nomeG(k), efeito: 'A FDS do produto declara incompatibilidade com este grupo' }); res.status = 'conflito'; } });
      (it.incompativeis || []).forEach((k) => { if (mg.includes(k) && k !== 'ignicao') { res.grupos.push({ com: it.nome, a: 'FDS do item armazenado', b: nomeG(k), efeito: 'A FDS do item armazenado declara incompatibilidade com o grupo deste produto' }); res.status = 'conflito'; } });
    });
    // conflito entre os próprios grupos declarados do produto não é avaliado; incompatibilidade com o ambiente depende do local
    if (res.status === 'conflito') res.mensagens.push('Há conflito de segregação. Defina local alternativo ou segregação física (bacias separadas, armários distintos, distanciamento).');
    if (res.status === 'com_medidas') res.mensagens.push('Compatível com medidas: separar fisicamente (bacia ou armário próprio) e verificar as Seções 7 e 10 da FDS.');
    return res;
  }

  // ---------- Compatibilidade entre dois produtos (aplicação prática da matriz) ----------
  function compatPar(a, b) {
    const ca = classesDoProduto(a), cb = classesDoProduto(b);
    const r = maiorCodigo(ca, cb);
    const nomeG = (k) => (T.RG.find((x) => x[0] === k) || [k, k])[1];
    const motivos = [];
    const ga = a.comp.grupos || [], gb = b.comp.grupos || [];
    T.RG_RULES.forEach(([x, y, ef]) => { if ((ga.includes(x) && gb.includes(y)) || (ga.includes(y) && gb.includes(x))) motivos.push(nomeG(x) + ' x ' + nomeG(y) + ': ' + ef); });
    (a.comp.incompativeis || []).forEach((k) => { if (gb.includes(k) && k !== 'ignicao') motivos.push('FDS de ' + a.nome + ' declara incompatibilidade com ' + nomeG(k)); });
    (b.comp.incompativeis || []).forEach((k) => { if (ga.includes(k) && k !== 'ignicao') motivos.push('FDS de ' + b.nome + ' declara incompatibilidade com ' + nomeG(k)); });
    let nivel = 'livre';
    if (motivos.length) nivel = 'incompativel';
    else if (['2', '3', '4'].includes(r.codigo)) nivel = 'segregar';
    else if (r.codigo === '1') nivel = 'longe';
    else if (r.codigo === 'X' || r.codigo == null) nivel = 'verificar';
    const metros = r.codigo && T.SEG_LEGEND[r.codigo] ? T.SEG_LEGEND[r.codigo].metros : null;
    const acao = {
      incompativel: 'Não armazenar no mesmo local nem na mesma bacia de contenção.',
      segregar: 'Armazenar separados' + (metros ? ' (mínimo ' + metros + ' m) ' : ' ') + 'e sem remonte.',
      longe: 'Pode ocupar a mesma área com bacias ou armários distintos.',
      verificar: 'Sem regra geral na matriz: verificar as Seções 7 e 10 das duas FDS.',
      livre: 'Pode compartilhar o local. Confirme a reatividade nas FDS.',
    }[nivel];
    return { codigo: r.codigo, par: r.par, motivos, nivel, metros, acao };
  }
  const NIVEL = { incompativel: 'Incompatível', segregar: 'Segregar', longe: 'Longe de', verificar: 'Verificar', livre: 'Compatível' };
  function homologados(produtos) { return (produtos || []).filter((x) => ['homologado', 'condicionado'].includes(x.status)); }

  // ---------- Sugestões prontas (hierarquia de controles) ----------
  function sugestoes(p) {
    const h = p.ghs.h || [];
    const has = (re) => h.some((c) => re.test(c));
    const s = { ocup: { subst: [], eng: [], adm: [], epi: [] }, amb: { contencao: [], residuos: [], derramamento: [] }, controlesArm: [], risco: { ocup: false, amb: false } };
    const grave = has(/^H(300|310|330|340|350|360|370|372|304|314|334)/);
    if (grave) { s.ocup.subst.push('Avaliar produto equivalente de menor perigo antes de aprovar (substituição).'); s.risco.ocup = true; }
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
      const A = itens[i], B = itens[j];
      const r = maiorCodigo(A.classes, B.classes);
      const motivos = [];
      T.RG_RULES.forEach(([a, b, ef]) => { if ((A.grupos.includes(a) && B.grupos.includes(b)) || (A.grupos.includes(b) && B.grupos.includes(a))) motivos.push(ef); });
      (A.incompativeis || []).forEach((k) => { if (B.grupos.includes(k) && k !== 'ignicao') motivos.push('FDS de ' + A.nome + ' declara incompatibilidade com o grupo de ' + B.nome); });
      (B.incompativeis || []).forEach((k) => { if (A.grupos.includes(k) && k !== 'ignicao') motivos.push('FDS de ' + B.nome + ' declara incompatibilidade com o grupo de ' + A.nome); });
      if ((r.codigo && !['-'].includes(r.codigo) && r.codigo !== 'X') || r.codigo === 'X' || motivos.length) out.push({ a: A.nome, b: B.nome, codigo: r.codigo, par: r.par, motivos });
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

  // ---------- Avaliação consolidada ----------
  function avaliar(p, produtos) {
    const cfg = O.Store.config();
    const r = { reprovacoes: [], pendencias: [], condicionantes: [], alertas: [], sugestao: 'em_analise', tri: null };
    r.tri = triagem(p, cfg);
    if (r.tri.reprovado) {
      const rot = { cancerigeno: 'Cancerígeno', mutagenico: 'Mutagênico', teratogenico: 'Teratogênico', reprodutivo: 'Tóxico à reprodução', pfc: 'Contém PFCs ou PFAS' };
      const g = {};
      r.tri.criticos.forEach((c) => { (g[c.tipo] = g[c.tipo] || []).push(c.fonte === 'analista' ? 'marcado pelo analista' : c.fonte + (c.detalhe.includes('componente ') ? ' (' + c.detalhe.split('componente ')[1].split(' consta')[0] + ')' : '')); });
      Object.keys(g).forEach((k) => r.reprovacoes.push('Critério interno (GHS): ' + rot[k] + ' [' + g[k].join('; ') + '].'));
    }
    r.tri.suspeitos.forEach((c) => r.alertas.push(c.detalhe));

    if (p.lista.naLista === true) { r.sugestao = 'na_lista'; return r; }
    if (p.fds.completa === false) r.pendencias.push('FDS fora da ABNT NBR 14725:2023: solicitar correção ao fornecedor.');
    if (p.fds.atualizada === false) r.pendencias.push('FDS desatualizada ou fora do português: solicitar versão atualizada.');
    const idade = idadeFds(p);
    if (idade != null && idade > cfg.anosValidadeFDS) r.alertas.push('FDS com revisão há ' + idade.toFixed(1).replace('.', ',') + ' anos (limite configurado: ' + cfg.anosValidadeFDS + ').');

    if (['1', '6.2', '7'].includes(p.imdg.classe)) r.pendencias.push('Classe ' + p.imdg.classe + ' (' + T.classeNome(p.imdg.classe) + ') fora do escopo geral do aplicativo: exige análise especial e exceção legal para armazenamento em área comum.');
    if (p.imdg.incompativelOperacao) r.reprovacoes.push('Classificação IMDG incompatível com as operações do local de uso.');
    if (p.hig.tlv === true && !p.hig.parecerExigidoOk) r.pendencias.push('Parecer formal de Higiene Ocupacional exigido antes da decisão (agente com limite NR-15 ou TLV).');
    if (p.hig.pgr === 'requer' || p.par.pgrIndicador === 'requer') r.condicionantes.push('PGR / Inventário de Riscos exige atualização antes da liberação de uso.');
    if (p.hig.pgr === 'indefinido') r.pendencias.push('Cobertura do PGR indefinida: encaminhar FDS ao elaborador do PGR.');
    if (p.hig.dosimetria === true) r.condicionantes.push('Avaliação quantitativa (dosimetria ou varredura) pendente antes da liberação de uso.');
    if (p.comp.localOk === 'insuficiente') r.pendencias.push('Informação insuficiente na FDS para avaliar o armazenamento: solicitar complementação ao fornecedor.');
    if (p.comp.localOk === 'conflito') {
      if (p.comp.solucao === 'reprovar') r.reprovacoes.push('Conflito de segregação no local de armazenamento sem solução viável.');
      else if (p.comp.solucao === 'condicionar') r.condicionantes.push('Conflito de segregação: homologação condicionada a medida de segregação ou local alternativo.');
      else r.pendencias.push('Conflito de segregação sem solução definida (etapa 11.2).');
    }
    if (p.par.pgrIndicador === '' && p.confirmadas['12']) r.pendencias.push('Indicador de PGR não registrado (etapa 12.2).');
    if (simplificadaVigente(p)) {
      const ref = O.Store.produto(p.sim.refId);
      const dv = divergencias(p, ref).filter((x) => x.tipo === 'relevante');
      if (dv.length) r.alertas.push('Divergência em relação à referência: a via simplificada deve ser encerrada. ' + dv.map((x) => x.texto).join(' '));
    }
    if (r.reprovacoes.length) r.sugestao = 'reprovado';
    else if (r.pendencias.length) r.sugestao = 'pendente';
    else if (r.condicionantes.length) r.sugestao = 'condicionado';
    else r.sugestao = 'homologado';
    return r;
  }

  O.Engine = { novoProduto, triagem, nr20, compatibilidade, compatPar, NIVEL, homologados, sugestoes, gruposSugeridos, divergencias, auditoriaLocal, simplificadaVigente, criteriosSimOk, idadeFds, avaliar, classesDoProduto, itensDoLocal };
})(window.O360 = window.O360 || {});
