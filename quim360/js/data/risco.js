/* Análise de risco do armazém (ABNT NBR 17160:2024, Seção 5 e Anexo A).
   ASPECTOS e CONSIDERACOES seguem os itens 5.1.1 a 5.1.6 e 5.2.1 a 5.2.7; ANEXO_A lista os pontos A.1 a A.8 (informativo).
   CENARIOS são cenários-padrão por tipo de perigo, escritos para o app: causas, consequências e medidas são pontos de partida
   para o responsável técnico revisar. O critério de risco (severidade x probabilidade) é da organização. */
(function (O) {
  const ASPECTOS = [
    ['5.1.1', 'Saúde e segurança do trabalhador, considerando fatores humanos e organizacionais das atividades do armazém'],
    ['5.1.2', 'Efeitos físicos (pressão, temperatura, umidade etc.) sobre os produtos estocados'],
    ['5.1.3', 'Regulamentações de proteção contra incêndio do estado onde está o armazém'],
    ['5.1.4', 'Reações químicas e requisitos de compatibilidade para armazenamento (Seção 9)'],
    ['5.1.5', 'Proteção ambiental: contenção de vazamentos, resíduos de vazamentos e contenção de águas contaminadas de extinção (Anexo F)'],
    ['5.1.6', 'Presença de atmosferas explosivas: classificação de áreas Ex (ABNT NBR IEC 60079-10-1)'],
  ];
  // campo: chave em local.analise.campos
  const CONSIDERACOES = [
    ['5.2.1', 'Propriedades, estado físico e embalagens dos produtos, conforme as FDS', 'auto'],
    ['5.2.2', 'Quantidade de produtos perigosos em cada seção do armazém', 'auto'],
    ['5.2.3', 'Tipo de armazenamento: configuração e geometria interna do armazém (paletes, racks, prateleiras, altura de empilhamento)', 'tipoArmazenamento'],
    ['5.2.4', 'Atividades realizadas durante o armazenamento, como manutenções em geral', 'atividades'],
    ['5.2.5', 'Armazenamento conjunto de produtos perigosos', 'auto'],
    ['5.2.6', 'Condições de trabalho e ambientais: tipo de armazém, tamanho da sala, clima, impactos externos e período de armazenamento', 'condicoes'],
    ['5.2.7', 'Atividades e operações: posicionamento e movimentação, transporte interno, remoção de produtos em vazamentos e armazenamento temporário (até 24 h, item 3.5)', 'operacoes'],
  ];
  const ANEXO_A = [
    ['A.1', 'Embalagens inadequadas podem vazar (corrosão, fragilização, ruptura) e as propriedades dos produtos podem mudar com luz, calor ou umidade.'],
    ['A.2', 'Grandes quantidades implicam riscos adicionais: em incêndio ou vazamento, o risco pode extrapolar a área de armazenamento e afetar a vizinhança e o meio ambiente.'],
    ['A.3', 'Substâncias de propriedades diferentes armazenadas juntas podem reagir em caso de vazamento (ex.: ácidos e cianeto liberam gás venenoso; combustíveis com oxidantes causam incêndio e explosão).'],
    ['A.4', 'Vazamentos podem reagir com a embalagem ou com o equipamento de manuseio (ex.: embalagem combustível com oxidante); corrosivos podem danificar recipientes, equipamentos e o prédio.'],
    ['A.5', 'Agente extintor não recomendado pode reagir com a substância; atenção quando produtos que exigem agentes diferentes estão juntos.'],
    ['A.6', 'Atenção especial a reações entre substâncias armazenadas que não aparecem na classificação ou na rotulagem (GHS).'],
    ['A.7', 'Substâncias instáveis podem se decompor ou reagir com ar, umidade, materiais estranhos ou temperatura excessiva, liberando calor e elevando a pressão até a ruptura da embalagem (informação na FDS).'],
    ['A.8', 'Considerar análise de ameaças e vulnerabilidades quanto à proteção dos produtos, do processo e das instalações (invasão de terceiros, sabotagem, infraestrutura).'],
  ];

  // grupos de requisitos do checklist (nbr17160-req.js) e ids avulsos usados para mostrar o estado das medidas de cada cenário
  const CENARIOS = [
    { k: 'inflam', titulo: 'Incêndio ou explosão de líquidos e vapores inflamáveis', quando: ['inf12', 'inf3'],
      causas: 'Fonte de ignição (elétrica, estática, trabalho a quente, superfície quente), vazamento, ventilação insuficiente, resíduos como panos com solvente.',
      consequencias: 'Incêndio, explosão, queimaduras, danos à instalação, vazamento de água de extinção contaminada.',
      medidas: ['Eliminar fontes de ignição e usar equipamento adequado à área (6.2.5, 6.3.1.5).', 'Ventilação e zoneamento de atmosfera explosiva (Anexo E).', 'Contenção, extinção e separação por resistência ao fogo (Seções 8 e 14).', 'Autorização de trabalho para atividades com risco de ignição (8.2.13).'],
      grupos: ['s8', 's14', 'aE'], ids: ['6.2.5', '6.3.1.5'] },
    { k: 'tox', titulo: 'Liberação de substância com toxicidade aguda (derramamento, incêndio, ruptura)', quando: ['tox'],
      causas: 'Ruptura de embalagem, queda de recipiente, manuseio inadequado, incêndio envolvendo o produto.',
      consequencias: 'Intoxicação aguda, necessidade de evacuação e de primeiros socorros especializados, contaminação do ambiente.',
      medidas: ['Setor identificado, com acesso restrito e pessoas treinadas (6.2.12, 7.3, 10.2).', 'EPI, lava-olhos, chuveiro e kit de derramamento (6.3.6 a 6.3.8).', 'Plano de emergência e simulados (7.4).'],
      grupos: ['s10', 's7'], ids: ['6.2.12', '6.2.13', '6.3.6.1', '6.3.7', '6.3.8'] },
    { k: 'cmr', titulo: 'Exposição crônica a agentes cancerígenos, mutagênicos ou tóxicos à reprodução', quando: ['cmr', 'stot'],
      causas: 'Exposição por inalação ou contato na movimentação, fracionamento e vazamentos; falhas de higiene; vigilância da saúde insuficiente.',
      consequencias: 'Doenças ocupacionais de longa latência, efeitos sobre a reprodução, passivo trabalhista e legal.',
      medidas: ['Setor identificado e acesso restrito (6.2.12).', 'Agente no PGR e vigilância da saúde (PCMSO), conforme a avaliação de exposição.', 'Substituição quando viável (ver alternativas na homologação do produto).', 'Higiene e EPI (6.3.6 e 6.3.7).'],
      grupos: ['s7'], ids: ['6.2.12', '6.3.6.1', '6.3.7'] },
    { k: 'corr', titulo: 'Vazamento de corrosivos (queimaduras, danos às embalagens, estrutura e equipamentos)', quando: ['corr'],
      causas: 'Embalagem inadequada ou danificada, empilhamento instável, mistura de ácidos e bases, infiltração no piso.',
      consequencias: 'Queimaduras químicas, geração de calor e gases na mistura, corrosão de racks e piso, contaminação.',
      medidas: ['Contenção com capacidade do maior recipiente (6.2.10, 7.2.3).', 'Segregação entre ácidos e bases por parede ou 5 m (observação 8).', 'Materiais do armazém resistentes aos produtos (7.2.2).'],
      grupos: [], ids: ['6.2.10', '7.2.2', '7.2.3', '6.3.3.3', '6.3.3.5'] },
    { k: 'ox', titulo: 'Intensificação de incêndio ou reação por oxidantes em contato com combustíveis', quando: ['ox1', 'ox23'],
      causas: 'Contato do oxidante com materiais combustíveis (embalagem, paletes, serragem, panos), contaminação, aquecimento.',
      consequencias: 'Incêndio de propagação rápida, explosão, liberação de gases tóxicos.',
      medidas: ['Afastar materiais combustíveis e usar paletes não combustíveis quando exigido (11.2.4).', 'Não limpar derramamento com material combustível (11.2.1).', 'Separação e resistência ao fogo (11.3).'],
      grupos: ['s11'], ids: [] },
    { k: 'gas', titulo: 'Liberação ou projeção de recipientes de gás pressurizado', quando: ['gasp', 'gasinf', 'gasox'],
      causas: 'Queda ou tombamento do recipiente, dano à válvula, aquecimento, vazamento em conexões.',
      consequencias: 'Projeção do cilindro, atmosfera inflamável, tóxica ou asfixiante, incêndio ou explosão.',
      medidas: ['Proteção contra queda e válvulas protegidas (12.2.1).', 'Ventilação, zonas de segurança e proteção contra explosão (12.3 e 12.4).', 'Distância de 2 m entre inflamáveis e oxidantes (observação 3).'],
      grupos: ['s12'], ids: [] },
    { k: 'aer', titulo: 'Incêndio com projeção de aerossóis e cartuchos de gás', quando: ['aer'],
      causas: 'Aquecimento acima de 50 °C, impacto, incêndio na vizinhança.',
      consequencias: 'Embalagens projetadas pelo armazém, propagação do incêndio.',
      medidas: ['Proteção contra o calor (6.2.6).', 'Área separada e protegida por grades (9.1.1.4 d).', 'Requisitos estruturais e de incêndio (13.2).'],
      grupos: ['s13'], ids: ['6.2.6', '9.1.1.4 d'] },
    { k: 'agua', titulo: 'Reação com água (inclusive água de extinção) e liberação de gases inflamáveis', quando: ['h260'],
      causas: 'Contato com água de chuva, umidade ou água de combate a incêndio.',
      consequencias: 'Liberação de gás inflamável ou tóxico, calor, explosão.',
      medidas: ['Avaliar a reatividade com água de cada produto (9.1.1.3 k).', 'Sinalização de áreas onde a água não pode ser usada (8.2.6).'],
      grupos: [], ids: ['9.1.1.3 k', '8.2.6'] },
    { k: 'conjunto', titulo: 'Reação por incompatibilidade em armazenamento conjunto', quando: ['@pares'],
      causas: 'Produtos incompatíveis no mesmo setor, vazamento ou ruptura que provoque contato.',
      consequencias: 'Incêndio, explosão, calor, gases inflamáveis, tóxicos ou asfixiantes, substâncias corrosivas ou instáveis.',
      medidas: ['Respeitar a matriz de incompatibilidade (Figura 1) e as observações de cada par.', 'Segregação física ou distância; extintores adequados a todos os produtos (9.1.1.4 a).', 'Condições de armazenamento iguais ou semelhantes (9.1.1.4 b).'],
      grupos: ['s9'], ids: [] },
    { k: 'ambiente', titulo: 'Contaminação do ambiente por vazamento e por água de extinção contaminada', quando: ['@sempre'],
      causas: 'Vazamentos sem contenção, deságue em pluvial, ausência de retenção da água de extinção.',
      consequencias: 'Contaminação do solo e da água, passivo ambiental, interdição.',
      medidas: ['Contenção, sem deságue em águas pluviais ou esgoto (6.2.10, 7.2.6).', 'Retenção da água de extinção dimensionada (Anexo F).', 'Resíduos de vazamento com destinação adequada.'],
      grupos: [], ids: ['6.2.10', '7.2.6', '14.4.10'] },
    { k: 'empilha', titulo: 'Queda ou tombamento de embalagens e acidentes na movimentação (empilhadeira, racks)', quando: ['@sempre'],
      causas: 'Empilhamento acima da capacidade, embalagens frágeis, operador sem treinamento, colisão com racks.',
      consequencias: 'Ruptura de embalagens, vazamento, lesões nos trabalhadores.',
      medidas: ['Estabilidade, altura máxima e capacidade dos racks sinalizada (6.3.3.3 e 6.3.3.4).', 'Operadores treinados (6.3.3.4).', 'Proteção contra colisão nas áreas de carga (6.3.3.2).'],
      grupos: [], ids: ['6.3.3.2', '6.3.3.3', '6.3.3.4', '6.3.3.5'] },
    { k: 'emergencia', titulo: 'Falha na resposta a emergência (alarme, fuga, primeiros socorros)', quando: ['@sempre'],
      causas: 'Plano desatualizado, rotas obstruídas, pessoas sem treinamento, ausência de simulados.',
      consequencias: 'Agravamento de acidentes, lesões e atraso no atendimento.',
      medidas: ['Plano de emergência atualizado, rotas de fuga livres e alerta antecipado (6.3.5).', 'Simulados em intervalos regulares (7.4.5).', 'Primeiros socorros, lava-olhos e chuveiros (6.3.7 e 6.3.8).'],
      grupos: [], ids: ['6.3.5', '7.4.1', '7.4.5', '6.3.8', '6.3.9.1'] },
  ];

  const SEV = [[1, 'Insignificante'], [2, 'Leve'], [3, 'Moderada'], [4, 'Grave'], [5, 'Catastrófica']];
  const PROB = [[1, 'Improvável'], [2, 'Remota'], [3, 'Possível'], [4, 'Provável'], [5, 'Frequente']];
  // critério padrão: matriz 5x5 (severidade x probabilidade); a organização pode adotar outro
  function nivel(s, p) {
    const v = (Number(s) || 0) * (Number(p) || 0);
    if (!v) return { v: 0, nome: 'Não avaliado', tom: '' };
    if (v >= 15) return { v, nome: 'Crítico', tom: 'crit' };
    if (v >= 10) return { v, nome: 'Alto', tom: 'crit' };
    if (v >= 5) return { v, nome: 'Médio', tom: 'warn' };
    return { v, nome: 'Baixo', tom: 'ok' };
  }


  // Escalas descritivas da matriz 5x5: ajudam a enquadrar severidade e probabilidade. Pontos de partida: a organização pode adotar critérios próprios.
  const SEV_DESC = [
    { n: 1, nome: 'Insignificante', pessoas: 'Sem lesão ou lesão tratada com primeiros socorros no local, sem afastamento.', ambiente: 'Sem liberação, ou liberação mínima retida na embalagem ou na contenção.', patrimonio: 'Dano desprezível; sem interrupção da operação.' },
    { n: 2, nome: 'Leve', pessoas: 'Lesão ou exposição com atendimento ambulatorial, sem afastamento.', ambiente: 'Vazamento pequeno contido na bacia ou no dique do armazém.', patrimonio: 'Dano pequeno e reparável; interrupção curta.' },
    { n: 3, nome: 'Moderada', pessoas: 'Lesão com afastamento ou exposição que exige acompanhamento médico.', ambiente: 'Vazamento que ultrapassa a contenção, mas é retido dentro da área da empresa.', patrimonio: 'Dano relevante; interrupção parcial da operação.' },
    { n: 4, nome: 'Grave', pessoas: 'Lesão grave ou incapacitante, doença ocupacional, ou várias pessoas atingidas.', ambiente: 'Liberação para fora da área, atingindo solo, drenagem ou corpo d\'água; comunicação a órgãos ambientais.', patrimonio: 'Dano grande; paralisação prolongada do armazém.' },
    { n: 5, nome: 'Catastrófica', pessoas: 'Morte ou múltiplas vítimas graves; efeito sobre a vizinhança.', ambiente: 'Contaminação extensa ou irreversível, ou que afete a população.', patrimonio: 'Perda total do armazém ou interdição.' },
  ];
  const PROB_DESC = [
    { n: 1, nome: 'Improvável', desc: 'Não há registro no setor nem em armazéns semelhantes; exige falha simultânea de várias barreiras. Controles do cenário todos conformes e verificados.' },
    { n: 2, nome: 'Remota', desc: 'Já ocorreu em armazéns semelhantes, mas não aqui; exige falha de pelo menos duas barreiras. Controles em sua maioria conformes.' },
    { n: 3, nome: 'Possível', desc: 'Pode ocorrer durante a vida útil do armazém, ou já houve quase-acidente aqui. Controles parcialmente implantados ou ainda não verificados.' },
    { n: 4, nome: 'Provável', desc: 'Ocorre de forma ocasional ou há falhas conhecidas nos controles (não conformidade aberta no checklist ou pendência de inspeção).' },
    { n: 5, nome: 'Frequente', desc: 'Ocorre rotineiramente ou o controle não existe ou é ignorado na operação.' },
  ];
  // situações típicas para apoiar o enquadramento (sugestão de severidade e de probabilidade)
  const EXEMPLOS = [
    { situacao: 'Queda de embalagem sem ruptura, sem vazamento', sev: 1 },
    { situacao: 'Derramamento de uma embalagem pequena de corrosivo ou solvente retido na bacia', sev: 2 },
    { situacao: 'Vazamento de tambor ou IBC de líquido inflamável retido no dique, sem ignição', sev: 3 },
    { situacao: 'Exposição de trabalhador a vapor irritante ou corrosivo com atendimento médico', sev: 3 },
    { situacao: 'Vazamento de produto tóxico ou corrosivo que ultrapassa a contenção e chega à drenagem', sev: 4 },
    { situacao: 'Intoxicação aguda com internação, ou mistura de incompatíveis liberando gás tóxico', sev: 4 },
    { situacao: 'Incêndio de líquidos inflamáveis com propagação para outros setores', sev: 5 },
    { situacao: 'Explosão de atmosfera inflamável ou reação violenta entre incompatíveis com vítimas', sev: 5 },
    { situacao: 'Controles do cenário conformes e verificados, sem histórico de ocorrência', prob: 1 },
    { situacao: 'Ocorreu em armazém semelhante, mas nunca no local', prob: 2 },
    { situacao: 'Houve quase-acidente ou há controle ainda não verificado', prob: 3 },
    { situacao: 'Há não conformidade aberta ou inspeção vencida relacionada ao cenário', prob: 4 },
    { situacao: 'Controle inexistente ou desrespeitado na rotina', prob: 5 },
  ];
  const ORIGENS = ['Inspeção', 'Incidente ou quase-acidente', 'Mudança de produto', 'Mudança de layout ou processo', 'Auditoria', 'Revisão da análise', 'Outra'];
  // sugestão de probabilidade a partir do checklist do cenário (apenas orientação)
  function sugestaoProb(cont) {
    if (!cont || !cont.total) return null;
    if (cont.nc) return { n: 4, txt: 'há ' + cont.nc + ' não conformidade(s) relacionada(s) no checklist' };
    if (cont.aberto) return { n: 3, txt: cont.aberto + ' item(ns) relacionado(s) ainda sem resposta no checklist' };
    return { n: 2, txt: 'todos os itens relacionados estão conformes no checklist' };
  }

  O.RISCO = { SEV_DESC, PROB_DESC, EXEMPLOS, ORIGENS, sugestaoProb, ASPECTOS, CONSIDERACOES, ANEXO_A, CENARIOS, SEV, PROB, nivel };
})(window.O360 = window.O360 || {});
