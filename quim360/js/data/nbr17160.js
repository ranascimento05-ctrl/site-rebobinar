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
    1: 'Um responsável técnico deve avaliar e autorizar formalmente o armazenamento conjunto. Verificar regulamentação específica.',
    2: 'Gases pressurizados: no máximo 50 recipientes (no máximo 25 de gás inflamável, oxidante ou tóxico), separados por parede de material não combustível com pelo menos 2 m de altura, mantendo 5 m entre a parede e os materiais combustíveis.',
    3: 'Cilindros de gás pressurizado no mesmo armazém: até 150 cilindros ou 15 contêineres pressurizados de gases inflamáveis, oxidantes ou tóxicos (H331); gases inertes em qualquer quantidade; mais de 15 cilindros de gases altamente tóxicos (H330) em local separado; 2 m entre inflamáveis e oxidantes; sem restrição ao ar livre.',
    4: 'Permitido conforme a quantidade total: Tabela 3 (classes 3, 5.1B, 6.1A e 6.1B) ou Tabela 4 (classes 4.1B e 6.1A).',
    5: 'Materiais que propagam incêndio com rapidez (papel, têxteis, madeira, aparas, feno, palha, papelão) não podem ficar na área de armazenamento, salvo se fizerem parte da unitização da carga de inflamáveis.',
    6: 'Só podem ficar juntos se a interação indesejada não originar um novo risco.',
    7: 'Oxidantes com materiais combustíveis: até 1 t no total sem limitação; acima de 1 t, consultar responsável técnico. Seguir também a observação 5.',
    8: 'Só é permitido com segregação por distanciamento mínimo de 5 m entre os corrosivos ácidos e os corrosivos básicos (alcalinos), combustíveis ou não.',
  };

  const TABELA3 = { titulo: 'Tabela 3 | Armazenamento conjunto entre as classes 3, 5.1B, 6.1A e 6.1B', linhas: [
    ['Até 1 t', 'Sem restrições.'],
    ['Até 20 t', 'Sem restrições se o armazém tiver sistema automático de extinção de incêndio, ou sistema automático de alarme de incêndio com extinção não automática e brigada de incêndio no local.'],
  ] };
  const TABELA4 = { titulo: 'Tabela 4 | Armazenamento conjunto entre as classes 4.1B e 6.1A', linhas: [
    ['Até 1 t', 'Sem restrições.'],
    ['Até 20 t', 'Sem restrições se, em armazéns, houver sistema automático de alarme de incêndio. Ao ar livre: detecção e alarme com monitoramento de hora em hora e evidência de funcionamento do sistema automático.'],
    ['Até 50 t', 'Sem restrições se houver alarme automático de incêndio e brigada que chegue ao local em até 10 min.'],
    ['Até 100 t', 'Sem restrições se houver extinção automática, ou alarme automático com extinção não automática e brigada no local.'],
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
    { re: /^H271$/, rotulo: 'Oxidante líquido, categoria 1, 2 ou 3 (H271)', limite: '1 kg', acima: 'Seções 7 e 11 acima de 5 kg' },
    { re: /^H272$/, rotulo: 'Oxidante sólido (H272)', limite: '50 kg', acima: 'Seções 7 e 11 acima de 200 kg' },
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
    { k: 'gas', rotulo: 'Gás sob pressão, inflamável ou oxidante (H220, H221, H270, H280, H281) | volume em L', re: /^H(220|221|270|280|281)$/, classes: ['2A'], unidade: 'L', fora: 2.5, faixas: [{ acima: 2.5, secoes: 'Seção 12' }, { acima: 200, secoes: 'Seções 7 e 8 (inflamáveis e oxidantes, em kg)' }], analise: '' },
    { k: 'aer', rotulo: 'Aerossol (H222, H223)', re: /^H(222|223)$/, classes: ['2B'], fora: 20, faixas: [{ acima: 200, secoes: 'Seções 8 e 13' }], analise: '' },
    { k: 'corr', rotulo: 'Corrosivo (H290, H314)', re: /^H(290|314)$/, classes: ['8A', '8B'], fora: 1000, faixas: [{ acima: 200, secoes: 'Seção 7' }], analise: '' },
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
    EUH029: ['eu', 2], H300: ['agudo', 4], H301: ['agudo', 3], H302: ['agudo', 1], H304: ['agudo', 1], H310: ['agudo', 4], H311: ['agudo', 3], H312: ['agudo', 1],
    H340: ['gen', 9], H341: ['gen', 2], H350: ['gen', 9], H351: ['gen', 2], H360: ['rep', 4], H361: ['rep', 4],
    H370: ['stotU', 4], H371: ['stotU', 2], H372: ['stotR', 4], H373: ['stotR', 2],
    H400: ['aq', 6], H410: ['aq', 8], H411: ['aq', 6], H412: ['aq', 4],
  };
  const F1_NOTA = 'Pontuação simplificada: dentro de cada grupo (toxicidade aguda, mutagênico e cancerígeno, reprodução, órgãos-alvo por exposição única ou repetida, ambiente aquático) vale a maior pontuação, sem somar, como indica a coluna de prioridade da Tabela F.2. Confira a tabela na norma.';

  const BY = {}; CLASSES.forEach((c) => { BY[c[0]] = { id: c[0], nome: c[1], criterio: c[2] }; });

  O.NBR17160 = {
    CLASSES, ORDEM, MATRIZ, OBS, TABELA3, TABELA4, REGRAS, LIMITES, LIMITE_GERAL, CATS, CONJUNTAS, F1, CATK, F2, F1_NOTA, BY,
    nome(id) { return BY[id] ? BY[id].nome : ''; },
    // 'R' | 'G' | '1'..'8' | null (classe fora da matriz, por exemplo 9)
    par(a, b) { return MATRIZ[a] && MATRIZ[a][b] !== undefined ? MATRIZ[a][b] : null; },
  };
})(window.O360 = window.O360 || {});
