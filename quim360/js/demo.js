/* Dados de demonstração (fictícios) para conhecer o fluxo completo. */
(function (O) {
  const S = O.Store, E = O.Engine;

  function produtoBase(chave, localId) {
    const p = E.novoProduto();
    const text = O.SAMPLES[chave];
    O.Wizard.aplicarFds(p, text, O.FDS.parse(text));
    p.ctx = { area: 'Manutenção', atividade: 'Limpeza e desengraxe de peças', localId };
    p.finalidade = 'Limpeza'; p.aplicacao = 'Aplicação manual com pano e imersão de peças';
    p.lista.naLista = false; p.sim.ativa = false;
    p.fds.completa = true; p.fds.atualizada = true;
    return p;
  }

  O.Demo = {
    criar() {
      const pq = S.novoLocal('Contêiner de PQ 01 (demonstração)', 'Contêiner de PQ');
      pq.espacoM = 0; pq.descricao = 'Contêiner com bacia de contenção e ventilação natural.';
      pq.itens = [{ nome: 'Ácido clorídrico 33 % (demonstração)', classe: '8', subrisco: '', grupos: ['acido'], incompativeis: ['base', 'cianeto_sulfeto', 'hipoclorito', 'metais'] }];
      S.salvarLocal(pq);
      const of = S.novoLocal('Oficina mecânica (demonstração)', 'Oficina');
      of.espacoM = 8; of.descricao = 'Armário de inflamáveis aterrado e área ventilada.';
      of.itens = [{ nome: 'Tinta alquídica (demonstração)', classe: '3', subrisco: '', grupos: ['organico_combustivel'], incompativeis: ['oxidante'] }];
      S.salvarLocal(of);

      const a = produtoBase('solvente', of.id);
      a.ghs.nenhum = true; a.ghs.confirmado = true;
      a.ocup = { risco: true, subst: 'Avaliar solvente de maior ponto de fulgor.', eng: 'Exaustão local e aterramento na transferência.', adm: 'Permissão de trabalho a quente na área; treinamento prévio.', epi: 'Luvas de nitrila, óculos de ampla visão, respirador para vapores orgânicos.' };
      a.amb = { risco: false, contencao: '', residuos: '', derramamento: '' };
      a.hig = { tlv: true, parecerExigidoOk: true, pgr: 'coberto', dosimetria: false, justificativa: 'Cobertura por avaliação quantitativa de solventes similares.', tlvAgentes: 'Acetato de etila, TLV-TWA 400 ppm' };
      a.imdg.incompativelOperacao = false;
      a.comp.incompDeclaradas = true; a.comp.localOk = 'sim'; a.comp.controles = ['temp_vent', 'sinalizacao', 'bacia']; a.comp.limite = '200 L'; a.comp.tempMax = '35 °C';
      a.par = { tem: true, descricao: 'Parecer de Higiene Ocupacional (demonstração)', pgrIndicador: 'nao_requer', pgrPrazo: '', pgrResponsavel: '' };
      a.dec = { valor: 'sim', justificativa: 'Atende aos critérios internos. Homologado para limpeza de peças na oficina.', data: new Date().toISOString(), numero: S.proximoNumero(), sharepoint: '' };
      a.trein.gerar = true; a.status = 'homologado';
      ['ctx', 'ident', 'finalidade', 'lista', 'sim', 'fds', 'fds2', 'ghs', 'impactos', 'pgr', 'imdg', 'compat', 'pareceres', 'decisao', 'plano'].forEach((k) => { a.confirmadas[k] = new Date().toISOString(); });
      a.etapa = 'saida';
      S.salvarProduto(a);

      const b = produtoBase('benzeno', of.id);
      b.ghs.cancerigeno = true; b.ghs.mutagenico = true; b.ghs.confirmado = true;
      b.rejeicaoAuto = true;
      b.dec = { valor: 'nao', justificativa: E.avaliar(b, []).reprovacoes.join(' '), data: new Date().toISOString(), numero: '', sharepoint: '' };
      b.status = 'reprovado';
      ['ctx', 'ident', 'finalidade', 'lista', 'sim', 'fds', 'fds2', 'ghs', 'decisao'].forEach((k) => { b.confirmadas[k] = new Date().toISOString(); });
      b.etapa = 'saida';
      S.salvarProduto(b);
    },
  };
})(window.O360 = window.O360 || {});
