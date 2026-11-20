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
    { k: 'inflam', discussao: ['Quais fontes de ignição existem hoje perto dos inflamáveis e como são controladas?', 'Onde ficam os extintores adequados e quem está treinado para usá-los?', 'Como se faz o desligamento de energia e o isolamento da área em caso de incêndio?'], titulo: 'Incêndio ou explosão de líquidos e vapores inflamáveis', quando: ['inf12', 'inf3'],
      causas: 'Fonte de ignição (elétrica, estática, trabalho a quente, superfície quente), vazamento, ventilação insuficiente, resíduos como panos com solvente.',
      consequencias: 'Incêndio, explosão, queimaduras, danos à instalação, vazamento de água de extinção contaminada.',
      medidas: ['Eliminar fontes de ignição e usar equipamento adequado à área (6.2.5, 6.3.1.5).', 'Ventilação e zoneamento de atmosfera explosiva (Anexo E).', 'Contenção, extinção e separação por resistência ao fogo (Seções 8 e 14).', 'Autorização de trabalho para atividades com risco de ignição (8.2.13).'],
      grupos: ['s8', 's14', 'aE'], ids: ['6.2.5', '6.3.1.5'] },
    { k: 'tox', discussao: ['Quem tem acesso ao setor e como esse acesso é controlado?', 'Quais EPI e equipamentos de respiração estão disponíveis e onde ficam?', 'Qual é o primeiro atendimento previsto e quem aciona o socorro especializado?'], titulo: 'Liberação de substância com toxicidade aguda (derramamento, incêndio, ruptura)', quando: ['tox'],
      causas: 'Ruptura de embalagem, queda de recipiente, manuseio inadequado, incêndio envolvendo o produto.',
      consequencias: 'Intoxicação aguda, necessidade de evacuação e de primeiros socorros especializados, contaminação do ambiente.',
      medidas: ['Setor identificado, com acesso restrito e pessoas treinadas (6.2.12, 7.3, 10.2).', 'EPI, lava-olhos, chuveiro e kit de derramamento (6.3.6 a 6.3.8).', 'Plano de emergência e simulados (7.4).'],
      grupos: ['s10', 's7'], ids: ['6.2.12', '6.2.13', '6.3.6.1', '6.3.7', '6.3.8'] },
    { k: 'cmr', discussao: ['Quem está exposto, em quais tarefas e por quanto tempo?', 'Os controles do PGR e a vigilância da saúde (PCMSO) estão em dia?', 'Já foi avaliada alternativa de menor perigo?'], titulo: 'Exposição crônica a agentes cancerígenos, mutagênicos ou tóxicos à reprodução', quando: ['cmr', 'stot'],
      causas: 'Exposição por inalação ou contato na movimentação, fracionamento e vazamentos; falhas de higiene; vigilância da saúde insuficiente.',
      consequencias: 'Doenças ocupacionais de longa latência, efeitos sobre a reprodução, passivo trabalhista e legal.',
      medidas: ['Setor identificado e acesso restrito (6.2.12).', 'Agente no PGR e vigilância da saúde (PCMSO), conforme a avaliação de exposição.', 'Substituição quando viável (ver alternativas na homologação do produto).', 'Higiene e EPI (6.3.6 e 6.3.7).'],
      grupos: ['s7'], ids: ['6.2.12', '6.3.6.1', '6.3.7'] },
    { k: 'corr', discussao: ['O dique ou a bacia comporta o maior recipiente?', 'Onde estão o lava-olhos, o chuveiro de emergência e o kit de derramamento?', 'Ácidos e bases estão separados como a norma exige?'], titulo: 'Vazamento de corrosivos (queimaduras, danos às embalagens, estrutura e equipamentos)', quando: ['corr'],
      causas: 'Embalagem inadequada ou danificada, empilhamento instável, mistura de ácidos e bases, infiltração no piso.',
      consequencias: 'Queimaduras químicas, geração de calor e gases na mistura, corrosão de racks e piso, contaminação.',
      medidas: ['Contenção com capacidade do maior recipiente (6.2.10, 7.2.3).', 'Segregação entre ácidos e bases por parede ou 5 m (observação 8).', 'Materiais do armazém resistentes aos produtos (7.2.2).'],
      grupos: [], ids: ['6.2.10', '7.2.2', '7.2.3', '6.3.3.3', '6.3.3.5'] },
    { k: 'ox', discussao: ['Há materiais combustíveis (paletes, papel, panos) perto dos oxidantes?', 'Como se limpa um derramamento sem usar material combustível?', 'Quais produtos não podem ficar juntos dos oxidantes?'], titulo: 'Intensificação de incêndio ou reação por oxidantes em contato com combustíveis', quando: ['ox1', 'ox23'],
      causas: 'Contato do oxidante com materiais combustíveis (embalagem, paletes, serragem, panos), contaminação, aquecimento.',
      consequencias: 'Incêndio de propagação rápida, explosão, liberação de gases tóxicos.',
      medidas: ['Afastar materiais combustíveis e usar paletes não combustíveis quando exigido (11.2.4).', 'Não limpar derramamento com material combustível (11.2.1).', 'Separação e resistência ao fogo (11.3).'],
      grupos: ['s11'], ids: [] },
    { k: 'gas', discussao: ['Os cilindros estão presos e com as válvulas protegidas?', 'Há ventilação e detecção adequadas ao gás armazenado?', 'Qual é a conduta ao ouvir o alarme de vazamento?'], titulo: 'Liberação ou projeção de recipientes de gás pressurizado', quando: ['gasp', 'gasinf', 'gasox'],
      causas: 'Queda ou tombamento do recipiente, dano à válvula, aquecimento, vazamento em conexões.',
      consequencias: 'Projeção do cilindro, atmosfera inflamável, tóxica ou asfixiante, incêndio ou explosão.',
      medidas: ['Proteção contra queda e válvulas protegidas (12.2.1).', 'Ventilação, zonas de segurança e proteção contra explosão (12.3 e 12.4).', 'Distância de 2 m entre inflamáveis e oxidantes (observação 3).'],
      grupos: ['s12'], ids: [] },
    { k: 'aer', discussao: ['Existe área separada e protegida por grade?', 'Há fonte de calor ou sol direto sobre as embalagens?', 'O que fazer se o incêndio atingir o setor?'], titulo: 'Incêndio com projeção de aerossóis e cartuchos de gás', quando: ['aer'],
      causas: 'Aquecimento acima de 50 °C, impacto, incêndio na vizinhança.',
      consequencias: 'Embalagens projetadas pelo armazém, propagação do incêndio.',
      medidas: ['Proteção contra o calor (6.2.6).', 'Área separada e protegida por grades (9.1.1.4 d).', 'Requisitos estruturais e de incêndio (13.2).'],
      grupos: ['s13'], ids: ['6.2.6', '9.1.1.4 d'] },
    { k: 'agua', discussao: ['Quais produtos reagem com água e onde estão?', 'As áreas onde a água não pode ser usada estão sinalizadas?', 'Qual agente extintor deve ser usado nessa área?'], titulo: 'Reação com água (inclusive água de extinção) e liberação de gases inflamáveis', quando: ['h260'],
      causas: 'Contato com água de chuva, umidade ou água de combate a incêndio.',
      consequencias: 'Liberação de gás inflamável ou tóxico, calor, explosão.',
      medidas: ['Avaliar a reatividade com água de cada produto (9.1.1.3 k).', 'Sinalização de áreas onde a água não pode ser usada (8.2.6).'],
      grupos: [], ids: ['9.1.1.3 k', '8.2.6'] },
    { k: 'conjunto', discussao: ['Quais pares de produtos são proibidos ou restritos neste local?', 'A segregação (parede ou distância) está respeitada na prática?', 'O que acontece se duas embalagens incompatíveis se romperem?'], titulo: 'Reação por incompatibilidade em armazenamento conjunto', quando: ['@pares'],
      causas: 'Produtos incompatíveis no mesmo setor, vazamento ou ruptura que provoque contato.',
      consequencias: 'Incêndio, explosão, calor, gases inflamáveis, tóxicos ou asfixiantes, substâncias corrosivas ou instáveis.',
      medidas: ['Respeitar a matriz de incompatibilidade (Figura 1) e as observações de cada par.', 'Segregação física ou distância; extintores adequados a todos os produtos (9.1.1.4 a).', 'Condições de armazenamento iguais ou semelhantes (9.1.1.4 b).'],
      grupos: ['s9'], ids: [] },
    { k: 'ambiente', discussao: ['Para onde vai um vazamento? Há ligação com a drenagem de águas pluviais?', 'A retenção da água de extinção está dimensionada e disponível?', 'Quem avisa os órgãos ambientais e como?'], titulo: 'Contaminação do ambiente por vazamento e por água de extinção contaminada', quando: ['@sempre'],
      causas: 'Vazamentos sem contenção, deságue em pluvial, ausência de retenção da água de extinção.',
      consequencias: 'Contaminação do solo e da água, passivo ambiental, interdição.',
      medidas: ['Contenção, sem deságue em águas pluviais ou esgoto (6.2.10, 7.2.6).', 'Retenção da água de extinção dimensionada (Anexo F).', 'Resíduos de vazamento com destinação adequada.'],
      grupos: [], ids: ['6.2.10', '7.2.6', '14.4.10'] },
    { k: 'empilha', discussao: ['Qual é a altura máxima de empilhamento e a capacidade dos racks?', 'Os operadores de empilhadeira estão treinados para produtos perigosos?', 'O que fazer ao encontrar uma embalagem danificada?'], titulo: 'Queda ou tombamento de embalagens e acidentes na movimentação (empilhadeira, racks)', quando: ['@sempre'],
      causas: 'Empilhamento acima da capacidade, embalagens frágeis, operador sem treinamento, colisão com racks.',
      consequencias: 'Ruptura de embalagens, vazamento, lesões nos trabalhadores.',
      medidas: ['Estabilidade, altura máxima e capacidade dos racks sinalizada (6.3.3.3 e 6.3.3.4).', 'Operadores treinados (6.3.3.4).', 'Proteção contra colisão nas áreas de carga (6.3.3.2).'],
      grupos: [], ids: ['6.3.3.2', '6.3.3.3', '6.3.3.4', '6.3.3.5'] },
    { k: 'emergencia', discussao: ['O plano de emergência está atualizado e visível?', 'Todos conhecem as rotas de fuga e o ponto de encontro?', 'Quando foi o último simulado e o que mudou depois dele?'], titulo: 'Falha na resposta a emergência (alarme, fuga, primeiros socorros)', quando: ['@sempre'],
      causas: 'Plano desatualizado, rotas obstruídas, pessoas sem treinamento, ausência de simulados.',
      consequencias: 'Agravamento de acidentes, lesões e atraso no atendimento.',
      medidas: ['Plano de emergência atualizado, rotas de fuga livres e alerta antecipado (6.3.5).', 'Simulados em intervalos regulares (7.4.5).', 'Primeiros socorros, lava-olhos e chuveiros (6.3.7 e 6.3.8).'],
      grupos: [], ids: ['6.3.5', '7.4.1', '7.4.5', '6.3.8', '6.3.9.1'] },
  ];

  // Lentes de avaliação. A severidade é avaliada em cada lente; a probabilidade é única (barreiras, frequência e histórico).
  // PSIF (potencial de causar fatalidade) só existe na lente de pessoas (acidente do trabalho): não se aplica a ambiente nem a processo e patrimônio.
  const DIMS = [
    { id: 'pessoas', rot: 'Pessoas (acidente do trabalho)', curto: 'Pessoas', campo: 'sev', psif: true },
    { id: 'amb', rot: 'Meio ambiente', curto: 'Ambiente', campo: 'sevAmb', psif: false },
    { id: 'psm', rot: 'Processo e patrimônio (PSM)', curto: 'PSM', campo: 'sevPsm', psif: false },
  ];
  const SEV = [[1, 'Desprezível'], [2, 'Baixa'], [3, 'Média'], [4, 'Grave'], [5, 'Fatal']];
  const PROB = [[1, 'Muito baixa'], [2, 'Baixa'], [3, 'Média'], [4, 'Alta'], [5, 'Muito alta']];
  // o nível 5 de ambiente e de processo não é "fatal": chama-se catastrófico
  function sevNome(n, dim) { const x = SEV[(Number(n) || 0) - 1]; if (!x) return ''; return x[0] === 5 && dim && dim !== 'pessoas' ? 'Catastrófica' : x[1]; }
  // Gravidade_Classe (guia de classificação): a severidade é soberana.
  //   Grave (e PSIF, só na lente de pessoas): severidade 4 ou 5, ou score 12 ou mais
  //   Médio: score 6 a 11 com severidade abaixo de 4; Baixo: 3 a 5; Desprezível: 2 ou menos
  function nivel(s, p, dim) {
    dim = dim || 'pessoas'; s = Number(s) || 0; p = Number(p) || 0;
    const v = s * p; const psifLente = dim === 'pessoas';
    if (!v) return { v: 0, nome: 'Não avaliado', tom: '', grave: false, psif: false, rank: 0, dim };
    if (s >= 4 || v >= 12) return { v, nome: psifLente ? 'Grave / PSIF' : 'Grave', tom: 'crit', grave: true, psif: psifLente, rank: 4, dim };
    if (v >= 6) return { v, nome: 'Médio', tom: 'warn', grave: false, psif: false, rank: 3, dim };
    if (v >= 3) return { v, nome: 'Baixo', tom: 'info', grave: false, psif: false, rank: 2, dim };
    return { v, nome: 'Desprezível', tom: 'ok', grave: false, psif: false, rank: 1, dim };
  }
  // risco do cenário: avalia cada lente informada e fica com a mais alta (dimensão determinante)
  function nivelCenario(o) {
    o = o || {}; const dims = [];
    DIMS.forEach((d) => { if (Number(o[d.campo]) && Number(o.prob)) dims.push(Object.assign(nivel(o[d.campo], o.prob, d.id), { sev: Number(o[d.campo]), rot: d.rot, curto: d.curto })); });
    if (!dims.length) return { v: 0, nome: 'Não avaliado', tom: '', grave: false, psif: false, rank: 0, dim: '', det: '', dims: [] };
    const best = dims.reduce((a, b) => (b.rank > a.rank || (b.rank === a.rank && b.v > a.v) ? b : a));
    return Object.assign({}, best, { det: best.curto, dims, psif: dims.some((x) => x.psif) });
  }

  // Escalas descritivas: ajudam a enquadrar severidade (por lente) e probabilidade. A lente de pessoas segue o guia de classificação;
  // as de meio ambiente e de processo e patrimônio são pontos de partida para a organização validar.
  const SEV_DESC = [
    { n: 1, nome: 'Desprezível', nomeAlt: 'Desprezível', pessoas: 'Sem potencial de lesão. Apenas desconforto momentâneo ou inconveniência; não requer atendimento médico.', ambiente: 'Sem liberação de produto, ou liberação mínima retida na própria embalagem; sem efeito ambiental.', patrimonio: 'Sem perda de contenção; dano desprezível; sem interrupção da operação.' },
    { n: 2, nome: 'Baixa', nomeAlt: 'Baixa', pessoas: 'Lesões leves tratáveis com primeiros socorros; sem afastamento nem atendimento médico externo; recuperação em horas.', ambiente: 'Vazamento pequeno retido na contenção primária (bacia, dique ou piso estanque), sem contato com solo ou drenagem; limpeza imediata na rotina do local.', patrimonio: 'Perda de contenção pequena, controlada pelo operador; dano pequeno e reparável; parada breve (horas) sem efeito na entrega.' },
    { n: 3, nome: 'Média', nomeAlt: 'Média', pessoas: 'Lesões que requerem atendimento médico; afastamento temporário (dias ou semanas); recuperação completa esperada.', ambiente: 'Vazamento que ultrapassa a contenção primária, mas é retido dentro da área da empresa (canaleta, caixa separadora, contenção secundária); recuperação completa, com resíduo a destinar e sem comunicação externa obrigatória.', patrimonio: 'Perda de contenção relevante, controlada pela brigada ou por procedimento; dano relevante a carga ou equipamento; interrupção parcial (dias).' },
    { n: 4, nome: 'Grave', nomeAlt: 'Grave', pessoas: 'Lesões permanentes ou incapacitantes; hospitalização prolongada; perda de função ou de membro; múltiplas vítimas possíveis.', ambiente: 'Liberação para fora da área da empresa ou para solo, drenagem pluvial, corpo d\'água ou atmosfera, com efeito mensurável; comunicação ao órgão ambiental; remediação necessária.', patrimonio: 'Perda de contenção maior, incêndio ou reação sem controle imediato; acionamento do plano de emergência; dano grande; paralisação prolongada (semanas) do armazém.' },
    { n: 5, nome: 'Fatal', nomeAlt: 'Catastrófica', pessoas: 'Morte; lesões catastróficas; múltiplas fatalidades; evento com repercussão nacional ou internacional.', ambiente: 'Contaminação extensa ou irreversível de solo, água subterrânea, manancial ou ecossistema; população atingida; repercussão regulatória e pública (incluindo água de extinção contaminada fora da contenção).', patrimonio: 'Incêndio, explosão ou reação com perda total ou interdição do armazém; efeito dominó sobre instalações vizinhas.' },
  ];
  const PROB_DESC = [
    { n: 1, nome: 'Muito baixa', desc: 'Cenário hipotético e extremamente improvável; exige falha simultânea de vários sistemas. Frequência: pode ocorrer 1 vez em mais de 10 anos. Barreiras: 3 ou mais barreiras independentes e eficazes. Histórico: nunca ocorreu no local nem em instalações semelhantes.' },
    { n: 2, nome: 'Baixa', desc: 'Improvável, mas possível; exige falha de múltiplas barreiras. Frequência: 1 vez a cada 5 a 10 anos. Barreiras: 2 barreiras independentes e eficazes. Histórico: raros casos na indústria.' },
    { n: 3, nome: 'Média', desc: 'Pode ocorrer eventualmente; depende de falha humana. Frequência: 1 vez a cada 1 a 5 anos. Barreiras: 1 barreira eficaz ou várias parciais, presentes mas não totalmente confiáveis. Histórico: casos ocasionais no local ou na indústria.' },
    { n: 4, nome: 'Alta', desc: 'Provável de ocorrer em breve; condições perigosas observadas repetidamente. Frequência: 1 vez a cada 6 a 12 meses. Barreiras: ausentes ou reconhecidamente ineficazes (por exemplo, não conformidade aberta no checklist ou inspeção vencida). Histórico: eventos similares recorrentes.' },
    { n: 5, nome: 'Muito alta', desc: 'Iminente: ocorrerá se não for corrigido imediatamente. Frequência: várias vezes por ano (mensal ou semanal). Barreiras: completamente ausentes. Histórico: eventos frequentes e documentados.' },
  ];
  // situações típicas para apoiar o enquadramento (sugestão de severidade por lente e de probabilidade)
  const EXEMPLOS = [
    { situacao: 'Queda de embalagem sem ruptura, sem vazamento', dim: 'pessoas', sev: 1 },
    { situacao: 'Respingo de produto irritante com primeiros socorros no local', dim: 'pessoas', sev: 2 },
    { situacao: 'Exposição de trabalhador a vapor irritante ou corrosivo com atendimento médico e afastamento', dim: 'pessoas', sev: 3 },
    { situacao: 'Intoxicação aguda com internação, ou mistura de incompatíveis liberando gás tóxico', dim: 'pessoas', sev: 4 },
    { situacao: 'Explosão de atmosfera inflamável ou reação violenta entre incompatíveis com vítimas', dim: 'pessoas', sev: 5 },
    { situacao: 'Embalagem pequena derramada e retida na bacia, sem chegar ao piso', dim: 'amb', sev: 2 },
    { situacao: 'Vazamento de tambor ou IBC que passa da bacia, mas fica na canaleta ou na caixa separadora da empresa', dim: 'amb', sev: 3 },
    { situacao: 'Vazamento que chega à drenagem pluvial, ao solo fora da contenção ou a um corpo d\'água', dim: 'amb', sev: 4 },
    { situacao: 'Incêndio com água de extinção contaminada saindo da contenção e atingindo manancial', dim: 'amb', sev: 5 },
    { situacao: 'Perda de contenção pequena controlada pelo operador, sem parada', dim: 'psm', sev: 2 },
    { situacao: 'Vazamento de líquido inflamável retido no dique, sem ignição, com interrupção parcial', dim: 'psm', sev: 3 },
    { situacao: 'Incêndio de inflamáveis com acionamento do plano de emergência e paralisação do armazém', dim: 'psm', sev: 4 },
    { situacao: 'Incêndio ou explosão com perda total ou interdição do armazém e efeito dominó', dim: 'psm', sev: 5 },
    { situacao: 'Três ou mais barreiras independentes eficazes e verificadas; nunca ocorreu', prob: 1 },
    { situacao: 'Duas barreiras eficazes; casos raros na indústria', prob: 2 },
    { situacao: 'Uma barreira eficaz, ou manutenção atrasada; depende de comportamento correto', prob: 3 },
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

  // cenário de produtos a granel: vazamento de mais de um tanque com produtos diferentes (mistura na bacia, na canaleta ou na drenagem comum)
  const CENARIO_TANQUE = {
    titulo: 'Vazamento simultâneo de mais de um tanque com produtos diferentes',
    causas: 'Ruptura, transbordo ou falha de mangote ou de válvula em mais de um tanque (incêndio, explosão, falha estrutural ou evento externo), com os produtos se encontrando na mesma bacia, na canaleta ou na caixa separadora.',
    consequencias: 'Reação entre produtos incompatíveis (calor, gás tóxico ou inflamável, pressurização), incêndio de inflamável na presença de oxidante, contaminação do ambiente, água de extinção misturada e dificuldade de resposta da brigada.',
    medidas: ['Conhecer, para cada bacia, os produtos presentes e os pares incompatíveis, com a consulta de compatibilidade registrada.', 'Evitar produtos com incompatibilidade declarada ou consultada na mesma bacia; se for inevitável, decidir com o responsável técnico e registrar a justificativa.', 'Verificar a separação das drenagens e canaletas entre bacias com produtos incompatíveis.', 'Plano de emergência e treinamento da brigada para vazamento de mais de um produto, com a ficha de emergência de cada um à mão.', 'Manter a lista de produtos de cada bacia atualizada.'],
    discussao: ['Quais pares de produtos do terminal reagem entre si?', 'Se dois tanques da mesma bacia vazarem juntos, o que acontece e como a brigada responde?', 'Para onde vai o líquido misturado e a água de extinção?'],
  };
  O.RISCO = { CENARIO_TANQUE, SEV_DESC, PROB_DESC, EXEMPLOS, ORIGENS, sugestaoProb, ASPECTOS, CONSIDERACOES, ANEXO_A, CENARIOS, SEV, PROB, nivel, nivelCenario, sevNome, DIMS };
})(window.O360 = window.O360 || {});
