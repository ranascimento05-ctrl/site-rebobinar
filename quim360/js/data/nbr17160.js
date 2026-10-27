/* ABNT NBR 17160:2024 | Armazenamento seguro de produtos químicos (embalados e fracionados).
   Conteúdo transcrito da Tabela 2, da Figura 1 (matriz de incompatibilidade), das observações da Figura 1,
   das Tabelas 3 e 4, do Anexo D (classificação) e da Tabela 1 (quantidades-limite). Os textos das observações
   estão resumidos. Uso interno do licenciado da norma: não redistribuir. A norma vigente prevalece sobre este resumo. */
(function (O) {
  // 25 classes de armazenamento (Tabela 2). A norma usa 24 na matriz: a classe 9 (não perigoso) não consta nela.
  const CLASSES = [
    ['1', 'Substâncias explosivas', 'Subclasses 1.1 a 1.4, H200 a H205 ou rótulo classe 1'],
    ['2A', 'Gases (exceto aerossol)', 'UN1051, UN1052 ou H220, H221, H270, H280, H281'],
    ['2B', 'Aerossol ou aplicadores de aerossol', 'UN1057, UN1950 ou H222, H223'],
    ['3', 'Líquidos inflamáveis', 'H224, H225, H226'],
    ['4.1A', 'Outros produtos potencialmente explosivos', 'Explosivos dos GE I e II ou H240, H241'],
    ['4.1B', 'Sólidos inflamáveis', 'H228'],
    ['4.2', 'Pirofóricas ou sujeitas a autoaquecimento', 'H250, H251, H252'],
    ['4.3', 'Emitem gases inflamáveis em contato com a água', 'H260, H261'],
    ['5.1A', 'Substâncias altamente oxidantes', 'H271'],
    ['5.1B', 'Substâncias oxidantes', 'H272'],
    ['5.1C', 'Nitrato de amônio ou misturas com nitrato de amônio', 'UN1942, UN2067, UN2071, UN2426, UN3375'],
    ['5.2', 'Peróxidos orgânicos ou autorreagentes', 'H242'],
    ['6.1A', 'Toxicidade aguda GE I e II, combustíveis', 'H300, H310, H330'],
    ['6.1B', 'Toxicidade aguda GE I e II, não combustíveis', 'H300, H310, H330'],
    ['6.1C', 'Toxicidade aguda GE III ou efeitos crônicos, combustíveis', 'H301, H311, H331, H340, H350, H360, H370, H372'],
    ['6.1D', 'Toxicidade aguda GE III ou efeitos crônicos, não combustíveis', 'H301, H311, H331, H340, H350, H360, H370, H372'],
    ['6.2', 'Substâncias infectantes', 'Subclasse 6.2'],
    ['7', 'Material radioativo', 'Classe 7'],
    ['8A', 'Corrosivas, combustíveis', 'H290, H314'],
    ['8B', 'Corrosivas, não combustíveis', 'H290, H314'],
    ['9', 'Materiais não perigosos (transporte e GHS)', 'sem classificação'],
    ['10', 'Líquidos combustíveis não enquadrados em outra classe', 'demais perigos e frases H'],
    ['11', 'Sólidos combustíveis não enquadrados em outra classe', 'demais perigos e frases H'],
    ['12', 'Líquidos não combustíveis não enquadrados em outra classe', 'demais perigos e frases H'],
    ['13', 'Sólidos não combustíveis não enquadrados em outra classe', 'demais perigos e frases H'],
  ];
  // ordem das linhas da matriz (Figura 1), de cima para baixo
  const ORDEM = ['1', '2A', '2B', '3', '4.1A', '4.1B', '4.2', '4.3', '5.1A', '5.1B', '5.1C', '5.2', '6.1A', '6.1B', '6.1C', '6.1D', '6.2', '7', '8A', '8B', '10', '11', '12', '13'];
  // R = armazenamento conjunto proibido | G = permitido | 1 a 8 = permitido com restrição (ver OBS)
  const LINHAS = {
    '1': '1,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R',
    '2A': 'R,3,2,R,R,R,R,R,R,R,1,R,R,R,R,R,R,R,2,G,R,2,G,G',
    '2B': 'R,2,G,G,R,R,R,R,R,R,1,R,G,G,G,G,R,R,G,G,G,G,G,G',
    '3': 'R,R,G,G,R,R,R,R,R,4,R,R,G,R,G,6,R,R,G,G,G,5,G,G',
    '4.1A': 'R,R,R,R,1,1,R,R,R,R,R,1,R,R,R,R,R,R,1,1,1,1,1,1',
    '4.1B': 'R,R,R,R,1,G,6,6,R,4,R,1,4,R,G,6,R,R,G,G,G,G,G,G',
    '4.2': 'R,R,R,R,R,6,G,6,R,R,R,R,R,R,6,6,R,R,6,6,6,6,G,G',
    '4.3': 'R,R,R,R,R,6,6,G,R,R,R,R,R,R,6,6,R,R,6,6,6,6,6,G',
    '5.1A': 'R,R,R,R,R,R,R,R,G,G,R,R,R,R,R,R,R,R,R,R,R,R,G,G',
    '5.1B': 'R,R,R,4,R,4,R,R,G,G,1,R,4,4,6,6,R,R,7,G,7,7,G,G',
    '5.1C': 'R,1,1,R,R,R,R,R,R,1,1,R,R,R,R,R,R,R,1,1,1,1,1,1',
    '5.2': 'R,R,R,R,1,1,R,R,R,R,R,G,R,R,R,R,R,R,R,R,1,1,G,G',
    '6.1A': 'R,R,G,G,R,4,R,R,R,4,R,R,G,G,G,G,R,R,G,G,G,5,G,G',
    '6.1B': 'R,R,G,R,R,R,R,R,R,4,R,R,G,G,G,G,R,R,G,G,G,5,G,G',
    '6.1C': 'R,R,G,G,R,G,6,6,R,6,R,R,G,G,G,G,R,R,G,G,G,G,G,G',
    '6.1D': 'R,R,G,6,R,6,6,6,R,6,R,R,G,G,G,G,R,R,G,G,G,G,G,G',
    '6.2': 'R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,G,R,R,R,R,R,R,R',
    '7': 'R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,1,R,R,R,R,R,R',
    '8A': 'R,2,G,G,1,G,6,6,R,7,1,R,G,G,G,G,R,R,8,8,G,G,G,G',
    '8B': 'R,G,G,G,1,G,6,6,R,G,1,R,G,G,G,G,R,R,8,8,G,G,G,G',
    '10': 'R,R,G,G,1,G,6,6,R,7,1,1,G,G,G,G,R,R,G,G,G,G,G,G',
    '11': 'R,2,G,5,1,G,6,6,R,7,1,1,5,5,G,G,R,R,G,G,G,G,G,G',
    '12': 'R,G,G,G,1,G,G,6,G,G,1,G,G,G,G,G,R,R,G,G,G,G,G,G',
    '13': 'R,G,G,G,1,G,G,G,G,G,1,G,G,G,G,G,R,R,G,G,G,G,G,G',
  };
  const MATRIZ = {};
  ORDEM.forEach((a) => { const v = LINHAS[a].split(','); MATRIZ[a] = {}; ORDEM.forEach((b, j) => { MATRIZ[a][b] = v[j]; }); });

  const OBS = {
    1: 'Um responsável técnico deve avaliar e autorizar formalmente o armazenamento dessas substâncias. Regulamentações específicas para armazenamento em conjunto de produtos perigosos devem ser avaliadas.',
    2: 'Armazenamento conjunto só é permitido se houver um máximo de 50 recipientes contendo gás pressurizados, desde que não mais de 25 recipientes sejam de gás inflamável, oxidante ou tóxicos; e forem separados por uma parede de pelo menos 2 m de altura feita de materiais não combustíveis; e seja mantida uma distância mínima de 5 m entre a parede e os materiais combustíveis.',
    3: 'Cilindros contendo gás pressurizado podem ser armazenados em conjunto no mesmo armazém, desde que: recipientes de gases comprimidos contendo gases inflamáveis, oxidantes, tóxicos identificados com a frase H331 ou gases tóxicos podem ser armazenados desde que não se exceda o número de 150 cilindros ou 15 contêineres pressurizados (pressure barrels); além disso, podem ser armazenados recipientes com gases inertes em qualquer quantidade; recipientes pressurizados com gases inflamáveis e com gases inertes podem ser armazenados em qualquer quantidade; recipientes pressurizados com gases oxidantes e com gases inertes podem ser armazenados em qualquer quantidade; recipientes pressurizados com gases tóxicos identificados com H331 ou gases altamente tóxicos e com gases inertes podem ser armazenados em qualquer quantidade; nos casos de 1 a 3, podem ser armazenados mais de 15 cilindros ou um contêiner pressurizado com gases altamente tóxicos agudos identificados com H330; maiores quantidades com gases tóxicos devem ser armazenadas em um local separado; deve ser mantida uma distância mínima de 2 m entre os recipientes contendo inflamáveis e recipientes contendo gases oxidantes; não há restrições para o armazenamento ao ar livre.',
    4: 'Armazenamento é permitido nas seguintes condições: armazenamento entre as classes 3, 5.1B, 6.1A e 6.1B deve seguir a Tabela 3; armazenamento entre as classes 4.1B e 6.1A deve seguir a Tabela 4.',
    5: 'Materiais que possam contribuir para a rápida propagação de incêndios devido a sua natureza ou quantidade, como, por exemplo, papel, têxteis, madeira, aparas de madeira, feno, palha, papelão, não podem ser armazenados na área de armazenamento, a não ser que eles sejam parte da unitização da carga de inflamáveis.',
    6: 'Diferentes materiais somente podem ser armazenados juntos se o resultado da interação indesejada dessas substâncias não originar um novo risco.',
    7: 'Substâncias oxidantes podem ser armazenadas com materiais combustíveis desde que: em quantidades de até um total de 1 t, sem limitação; em quantidades superiores a 1 t, consultar um responsável técnico para orientação; os requisitos da observação 5 também devem ser seguidos.',
    8: 'Só é permitido se houver segregação por distanciamento mínimo de 5 m entre os corrosivos ácidos, combustíveis ou não, com os corrosivos básicos (alcalino), combustíveis ou não.',
  };

  const TABELA3 = { titulo: 'Tabela 3 | Requisitos para o armazenamento conjunto entre as classes 3, 5.1 B, 6.1 A e 6.1 B', linhas: [
    ['≤ 1 t', 'Sem restrições.'],
    ['≤ 20 t', 'Sem restrições caso o armazém possua: sistema de extinção automática de incêndios; ou sistema automático de alarme de incêndio em conjunto com um sistema de extinção de incêndios não automática e uma brigada de incêndio no local.'],
  ] };
  const TABELA4 = { titulo: 'Tabela 4 | Requisitos para o armazenamento conjunto entre as classes 4.1 B e 6.1 A', linhas: [
    ['≤ 1 t', 'Sem restrições.'],
    ['≤ 20 t', 'Sem restrições se: em armazéns, possuir sistema de alarme de incêndio automático; ao ar livre, sistema de detecção e alarme de incêndios assegurados por monitoramento de hora em hora, com opções de notificação, como telefone, alarme de incêndio, rádio etc., e haver evidências de que um sistema automático de alarme e detecção de incêndio funcione no local.'],
    ['≤ 50 t', 'Sem restrições se possuir: sistema de alarme de incêndio automático; e brigada de incêndio que possa chegar ao local em até 10 min depois que o alarme foi acionado.'],
    ['≤ 100 t', 'Sem restrições se possuir: sistema de extinção automática de incêndios; ou sistema automático de alarme de incêndio em conjunto com um sistema de extinção de incêndios não automática e uma brigada de incêndio no local.'],
  ] };

  // regras gerais do armazenamento conjunto (9.1.1.3 e 9.1.1.4)
  const REGRAS = [
    'Cada produto recebe uma única classe de armazenamento, definida pelo primeiro perigo aplicável no fluxograma do Anexo D. Os riscos principal e subsidiário do transporte são considerados.',
    'A matriz não basta sozinha: a incompatibilidade também depende de combustão, calor, gases inflamáveis, tóxicos ou asfixiantes, substâncias corrosivas ou instáveis formadas (9.1.1.1).',
    'Corrosivos ácidos e básicos (alcalinos), combustíveis ou não: segregação física ou distância mínima de 5 m.',
    'Avaliar a reatividade do produto com a água, inclusive a água de extinção de incêndio.',
    'Mesmo setor de armazém só com agentes extintores adequados a todos os produtos e com condições de armazenamento iguais ou semelhantes (temperatura, ventilação).',
    'Alimentos, cosméticos, medicamentos e produtos de consumo humano ou animal: avaliar conforme regulamentação específica.',
    'Aerossóis: áreas separadas e protegidas por grades, para evitar a projeção das embalagens pelo armazém.',
    'Barreiras de produtos não combustíveis entre incompatíveis devem ser das classes 12 e 13.',
  ];

  // Tabela 1: quantidade-limite (kg) permitida fora de armazéns e seções aplicáveis acima do limite
  const LIMITES = [
    { re: /^H(300|301|310|311|330|331)$/, rotulo: 'Toxicidade aguda, categorias 1 a 3', limite: '50 kg', acima: 'Seções 7 e 10 acima de 200 kg' },
    { re: /^H(340|350|360)/, rotulo: 'Mutagênico, cancerígeno ou tóxico à reprodução, categoria 1A ou 1B', limite: '50 kg', acima: 'Seção 7 acima de 200 kg' },
    { re: /^H(370|372)$/, rotulo: 'Toxicidade para órgãos-alvo, categoria 1', limite: '50 kg', acima: 'Seção 7 acima de 200 kg' },
    { re: /^H(224|225)$/, rotulo: 'Líquido inflamável, categoria 1 ou 2', limite: '20 kg (no máximo 10 kg extremamente inflamável)', acima: 'Seções 7, 8 e 14 acima de 200 kg; Anexos B, C e E' },
    { re: /^H226$/, rotulo: 'Líquido inflamável, categoria 3', limite: '100 kg', acima: 'Seções 7, 8 e 14 acima de 1 000 kg; Anexos B, C e E' },
    { re: /^H228$/, rotulo: 'Sólido inflamável', limite: 'sem quantidade indicada na tabela', acima: 'Seção 8 acima de 200 kg' },
    { re: /^H250$/, rotulo: 'Pirofórico', limite: 'sem quantidade indicada na tabela', acima: 'Seções 7 e 8 acima de 200 kg' },
    { re: /^H(251|252)$/, rotulo: 'Sujeito a autoaquecimento', limite: 'sem quantidade indicada na tabela', acima: 'Seção 8 acima de 200 kg' },
    { re: /^H242$/, rotulo: 'Autorreativo', limite: 'sem quantidade indicada na tabela', acima: 'Seção 8 acima de 200 kg' },
    { re: /^H271$/, rotulo: 'Líquidos e sólidos oxidantes, categoria 1 (H271)', limite: '1 kg', acima: 'Seções 7 e 11 acima de 5 kg' },
    { re: /^H272$/, rotulo: 'Líquidos e sólidos oxidantes, categoria 2 ou 3 (H272)', limite: '50 kg', acima: 'Seções 7 e 11 acima de 200 kg' },
    { re: /^H(280|281)$/, rotulo: 'Gás sob pressão', limite: '2,5 L', acima: 'Seção 12 acima de 2,5 L' },
    { re: /^H(220|221)$/, rotulo: 'Gás inflamável / aerossol inflamável', limite: '2,5 L (gás) ou 20 kg (aerossol)', acima: 'Seções 7, 8 e 12; Seção 13 e Anexo B para aerossóis' },
    { re: /^H(222|223)$/, rotulo: 'Aerossol', limite: '20 kg', acima: 'Seção 8 e Seção 13 acima de 200 kg; Anexo B' },
    { re: /^H270$/, rotulo: 'Gás oxidante', limite: '2,5 L', acima: 'Seção 7 acima de 200 kg e Seção 12 acima de 2,5 L' },
    { re: /^H(260|261)$/, rotulo: 'Emite gás inflamável em contato com a água', limite: '200 kg', acima: 'Seção 8 acima de 200 kg' },
    { re: /^H227$/, rotulo: 'Líquido inflamável, categoria 4 (classe de armazenamento 10)', limite: '1 000 kg', acima: 'Seção 8 acima de 1 000 kg' },
    { re: /^H(290|314)$/, rotulo: 'Corrosivo', limite: '1 000 kg', acima: 'Seção 7 acima de 200 kg' },
  ];
  const LIMITE_GERAL = { rotulo: 'Produtos perigosos não especificados', limite: '1 000 kg', acima: 'Seção 6.3 acima de 1 000 kg; armazenamento conjunto (Seção 9) acima de 200 kg' };


  // Tabela 1 e subitens 6.3.1.2, 7.1, 8.1, 10.1, 11.1, 12.1, 13 e 14.1 | categorias para somar a quantidade agregada.
  // fora: quantidade permitida fora de armazém (kg; L para gases). faixas: acima da quantidade, passam a valer as seções.
  // analise: faixa intermediária em que a medida é definida pela análise de risco. classes: uso quando o item só tem a classe de armazenamento (aproximado).
  const CATS = [
    { k: 'tox', rotulo: 'Toxicidade aguda, categorias 1 a 3 (H300, H301, H310, H311, H330, H331)', re: /^H(300|301|310|311|330|331)$/, classes: ['6.1A', '6.1B', '6.1C', '6.1D'], fora: 50, faixas: [{ acima: 200, secoes: 'Seções 7 e 10' }], analise: '10.1.2 (entre 50 e 200 kg)' },
    { k: 'cmr', rotulo: 'Mutagênico, cancerígeno ou tóxico à reprodução, 1A ou 1B (H340, H350, H360)', re: /^H(340|350|360)/, classes: [], fora: 50, faixas: [{ acima: 200, secoes: 'Seção 7' }], analise: '7.1.2 (entre 50 e 200 kg)' },
    { k: 'stot', rotulo: 'Órgãos-alvo, categoria 1 (H370, H372)', re: /^H(370|372)$/, classes: [], fora: 50, faixas: [{ acima: 200, secoes: 'Seção 7' }], analise: '7.1.2 (entre 50 e 200 kg)' },
    { k: 'inf12', rotulo: 'Líquido inflamável, categoria 1 ou 2 (H224, H225)', re: /^H(224|225)$/, classes: ['3'], fora: 20, sub: { re: /^H224$/, limite: 10, texto: 'H224 (extremamente inflamável) acima de 10 kg' }, faixas: [{ acima: 200, secoes: 'Seções 7, 8 e 14; Anexos B, C e E' }], analise: '14.1.2 (acima de 10 kg de H224 ou 20 kg de H225, até 200 kg)' },
    { k: 'inf3', rotulo: 'Líquido inflamável, categoria 3 (H226)', re: /^H226$/, classes: [], fora: 100, faixas: [{ acima: 1000, secoes: 'Seções 7, 8 e 14; Anexos B, C e E' }], analise: '14.1.2 (entre 100 e 1 000 kg)' },
    { k: 'h227', rotulo: 'Líquido combustível, categoria 4 (H227)', re: /^H227$/, classes: [], fora: 1000, faixas: [{ acima: 1000, secoes: 'Seção 8' }], analise: '' },
    { k: 'solinf', rotulo: 'Sólido inflamável (H228)', re: /^H228$/, classes: ['4.1B'], fora: null, faixas: [{ acima: 200, secoes: 'Seção 8' }], analise: '' },
    { k: 'piro', rotulo: 'Pirofórico (H250)', re: /^H250$/, classes: ['4.2'], fora: 200, faixas: [{ acima: 200, secoes: 'Seções 7 e 8' }], analise: '' },
    { k: 'auto', rotulo: 'Autoaquecimento (H251, H252)', re: /^H(251|252)$/, classes: [], fora: null, faixas: [{ acima: 200, secoes: 'Seção 8' }], analise: '' },
    { k: 'autorr', rotulo: 'Autorreativo (H242)', re: /^H242$/, classes: ['5.2'], fora: null, faixas: [{ acima: 200, secoes: 'Seção 8' }], analise: '' },
    { k: 'h260', rotulo: 'Emite gás inflamável em contato com a água (H260, H261)', re: /^H(260|261)$/, classes: ['4.3'], fora: 200, faixas: [{ acima: 200, secoes: 'Seção 8' }], analise: '' },
    { k: 'ox1', rotulo: 'Altamente oxidante, categoria 1 ou grupo de embalagem I (H271)', re: /^H271$/, classes: ['5.1A'], fora: 1, faixas: [{ acima: 5, secoes: 'Seções 7 e 11' }], analise: '11.1.3 (entre 1 e 5 kg)' },
    { k: 'ox23', rotulo: 'Oxidante, categoria 2 ou 3 (H272)', re: /^H272$/, classes: ['5.1B'], fora: 50, faixas: [{ acima: 200, secoes: 'Seções 7 e 11' }], analise: '11.1.3 (entre 50 e 200 kg)' },
    { k: 'gasp', rotulo: 'Gás sob pressão: comprimido, liquefeito, refrigerado ou dissolvido (H280, H281) | volume em L', re: /^H(280|281)$/, classes: [], unidade: 'L', fora: 2.5, faixas: [{ acima: 2.5, secoes: 'Seção 12' }], analise: '' },
    { k: 'gasinf', rotulo: 'Gás inflamável, categoria 1 ou 2 (H220, H221) | volume em L', re: /^H(220|221)$/, classes: ['2A'], unidade: 'L', fora: 2.5, faixas: [{ acima: 2.5, secoes: 'Seção 12' }], analise: '', nota: 'Acima de 200 kg: Seções 7 e 8 também valem.' },
    { k: 'gasox', rotulo: 'Gás oxidante, categoria 1 (H270) | volume em L', re: /^H270$/, classes: [], unidade: 'L', fora: 2.5, faixas: [{ acima: 2.5, secoes: 'Seção 12' }], analise: '', nota: 'Acima de 200 kg: Seção 7 também vale.' },
    { k: 'aer', rotulo: 'Aerossol (H222, H223)', re: /^H(222|223)$/, classes: ['2B'], fora: 20, faixas: [{ acima: 200, secoes: 'Seções 8 e 13' }], analise: '', nota: 'Anexo B quando aplicável (áreas de venda), a partir de qualquer quantidade.' },
    { k: 'corr', rotulo: 'Corrosivo (H290, H314)', re: /^H(290|314)$/, classes: ['8A', '8B'], fora: 1000, faixas: [{ acima: 200, secoes: 'Seção 7' }], analise: '' },
    { k: 'solcomb', rotulo: 'Sólido combustível (classe de armazenamento 11, sem frase H)', re: /^$/, classes: ['11'], fora: null, faixas: [], analise: 'quantidade-limite a ser determinada pelo empregador, normalmente em toneladas (Tabela 1)', empregador: true },
  ];
  // quantidades das Tabelas 3 e 4 (kg) para o armazenamento conjunto
  const CONJUNTAS = [
    { obs: 3, titulo: 'Tabela 3', classes: ['3', '5.1B', '6.1A', '6.1B'], faixas: [1000, 20000], t: 'TABELA3' },
    { obs: 4, titulo: 'Tabela 4', classes: ['4.1B', '6.1A'], faixas: [1000, 20000, 50000, 100000], t: 'TABELA4' },
  ];


  // Anexo F | contenção de águas de extinção de incêndio (informativo)
  // Tabela F.1: área do setor (m²) → volume (m³) para CPA 1, colunas K1/K2 e K3/K4
  const F1 = [[25, 6, 6], [50, 12, 12], [75, 18, 18], [100, 25, 25], [150, 45, 40], [200, 70, 55], [250, 100, 70], [300, 135, 90], [400, 200, 125], [500, 250, 150], [600, 300, 150], [700, 350, 150], [800, 400, 150], [900, 450, 150], [1000, 500, 150]];
  const CATK = [
    ['K1', 'K1 | corpo de bombeiros público, hidrantes, sem detecção prévia de incêndio'],
    ['K2', 'K2 | corpo de bombeiros público, hidrantes, com detecção prévia de incêndio'],
    ['K3', 'K3 | brigada de incêndio profissional, hidrantes e detecção prévia'],
    ['K4', 'K4 | brigada ou bombeiros, detecção prévia e extinção automática (sprinklers)'],
  ];
  // Tabela F.2: pontos por frase H. grupo: pontos do mesmo grupo não se somam (vale o maior, conforme a coluna de prioridade)
  const F2 = {
    EUH029: [2, []], H300: [4, []], H301: [3, ['H310']], H302: [1, ['H311', 'H310']], H304: [1, ['H312', 'H302']],
    H310: [4, ['H300']], H311: [3, ['H301', 'H300']], H312: [1, ['H302', 'H301', 'H300']],
    H340: [9, ['H350']], H341: [2, ['H351']], H350: [9, []], H351: [2, []], H360: [4, []], H361: [4, []],
    H370: [4, []], H371: [2, []], H372: [4, []], H373: [2, []],
    H400: [6, []], H410: [8, []], H411: [6, []], H412: [4, []],
  };
  // F.2.3.3: pontos de precaução quando há ensaio ecotoxicológico mas nenhuma frase H ambiental
  const F2_ENSAIO = [['lt1', 'Menor que 1 mg/L', 8], ['1a10', 'De 1 a 10 mg/L', 6], ['10a100', 'De 10 a 100 mg/L', 4], ['gt100', 'Maior que 100 mg/L', 2]];
  const F1_NOTA = 'Pontuação pela Tabela F.2: cada frase H soma seus pontos, exceto quando a frase indicada na coluna "prioridade sobre outros perigos" também está presente (ex.: H301 não soma com H310).';

  const BY = {}; CLASSES.forEach((c) => { BY[c[0]] = { id: c[0], nome: c[1], criterio: c[2] }; });

  O.NBR17160 = {
    CLASSES, ORDEM, MATRIZ, OBS, TABELA3, TABELA4, REGRAS, LIMITES, LIMITE_GERAL, CATS, CONJUNTAS, F1, CATK, F2, F2_ENSAIO, F1_NOTA, BY,
    nome(id) { return BY[id] ? BY[id].nome : ''; },
    // 'R' | 'G' | '1'..'8' | null (classe fora da matriz, por exemplo 9)
    par(a, b) { return MATRIZ[a] && MATRIZ[a][b] !== undefined ? MATRIZ[a][b] : null; },
  };
})(window.O360 = window.O360 || {});
