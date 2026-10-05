/* Dados de transporte e armazenamento: classes ONU/IMDG, matriz de segregação, grupos de reatividade,
   lista de alerta CMR/PFC e base técnico-legal.
   A matriz de segregação reproduz a base do acervo (Anexo da NR-29 / Código IMDG).
   Antes de uso em decisão formal, confirme cada par na tabela 7.2.4 do Código IMDG e nas Seções 7 e 10 da FDS. */
(function (O) {
  const CLASSES = [
    ['2.1', 'Gases inflamáveis'],
    ['2.2', 'Gases não inflamáveis e não tóxicos'],
    ['2.3', 'Gases tóxicos'],
    ['3', 'Líquidos inflamáveis'],
    ['4.1', 'Sólidos inflamáveis'],
    ['4.2', 'Substâncias sujeitas a combustão espontânea'],
    ['4.3', 'Substâncias que emitem gases inflamáveis em contato com água'],
    ['5.1', 'Substâncias oxidantes'],
    ['5.2', 'Peróxidos orgânicos'],
    ['6.1', 'Substâncias tóxicas'],
    ['8', 'Substâncias corrosivas'],
    ['9', 'Substâncias e artigos perigosos diversos'],
  ];
  const CLASS_EXTRA = [
    ['1', 'Explosivos'],
    ['6.2', 'Substâncias infectantes'],
    ['7', 'Material radioativo'],
  ];

  const ORDER = CLASSES.map((c) => c[0]);
  // linhas na ordem de ORDER
  const ROWS = [
    ['X', 'X', 'X', '2', '1', '2', 'X', '2', '2', 'X', '1', 'X'],
    ['X', 'X', 'X', '1', 'X', '1', 'X', 'X', '1', 'X', 'X', 'X'],
    ['X', 'X', 'X', '2', 'X', '2', 'X', 'X', '2', 'X', 'X', 'X'],
    ['2', '1', '2', 'X', 'X', '2', '1', '2', '2', 'X', 'X', 'X'],
    ['1', 'X', 'X', 'X', 'X', '1', 'X', '1', '2', 'X', '1', 'X'],
    ['2', '1', '2', '2', '1', 'X', '1', '2', '2', '1', '1', 'X'],
    ['X', 'X', 'X', '1', 'X', '1', 'X', '2', '2', 'X', '1', 'X'],
    ['2', 'X', 'X', '2', '1', '2', '2', 'X', '2', '1', '2', 'X'],
    ['2', '1', '2', '2', '2', '2', '2', '2', 'X', '1', '2', 'X'],
    ['X', 'X', 'X', 'X', 'X', '1', 'X', '1', '1', 'X', 'X', 'X'],
    ['1', 'X', 'X', 'X', '1', '1', '1', '2', '2', 'X', 'X', 'X'],
    ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
  ];
  const MATRIX = {};
  ORDER.forEach((a, i) => { MATRIX[a] = {}; ORDER.forEach((b, j) => { MATRIX[a][b] = ROWS[i][j]; }); });

  const SEG_LEGEND = {
    '1': { nome: 'Longe de', texto: 'Pode ocupar a mesma área, desde que os produtos não se misturem em caso de vazamento.', metros: null, nivel: 1 },
    '2': { nome: 'Separado de', texto: 'Espaço neutro mínimo de 6 m no sentido longitudinal e 2,4 m no transversal. Remonte (empilhamento direto) proibido.', metros: 6, nivel: 2 },
    '3': { nome: 'Separado por um compartimento completo', texto: 'Um espaço longitudinal (6 m) e dois transversais (4,8 m). Remonte proibido.', metros: 6, nivel: 3 },
    '4': { nome: 'Separado longitudinalmente por um compartimento completo', texto: 'Distância mínima de 24 m. Remonte proibido.', metros: 24, nivel: 4 },
    'X': { nome: 'Segregação específica', texto: 'Sem regra geral na matriz. Verifique as Seções 7 e 10 da FDS e a Lista de Produtos Perigosos do IMDG antes de aprovar o mesmo local.', metros: null, nivel: 0 },
  };

  // Cores de rótulo de risco (NBR 7500 / IMDG): [fundo, texto, descrição]
  const LABELS = {
    '1': { bg: '#f97316', fg: '#000', txt: 'Explosivos' },
    '2.1': { bg: '#dc2626', fg: '#fff', txt: 'Gás inflamável' },
    '2.2': { bg: '#16a34a', fg: '#fff', txt: 'Gás não inflamável' },
    '2.3': { bg: '#ffffff', fg: '#000', txt: 'Gás tóxico' },
    '3': { bg: '#dc2626', fg: '#fff', txt: 'Líquido inflamável' },
    '4.1': { bg: '#ffffff', fg: '#000', txt: 'Sólido inflamável', stripes: '#dc2626' },
    '4.2': { bg: '#ffffff', fg: '#000', txt: 'Combustão espontânea', half: '#dc2626' },
    '4.3': { bg: '#2563eb', fg: '#fff', txt: 'Perigoso quando molhado' },
    '5.1': { bg: '#facc15', fg: '#000', txt: 'Oxidante' },
    '5.2': { bg: '#dc2626', fg: '#000', txt: 'Peróxido orgânico', half: '#facc15' },
    '6.1': { bg: '#ffffff', fg: '#000', txt: 'Tóxico' },
    '6.2': { bg: '#ffffff', fg: '#000', txt: 'Substância infectante' },
    '7': { bg: '#facc15', fg: '#000', txt: 'Radioativo' },
    '8': { bg: '#ffffff', fg: '#fff', txt: 'Corrosivo', half: '#000', halfPos: 'bottom' },
    '9': { bg: '#ffffff', fg: '#000', txt: 'Diversos', stripesTop: '#000' },
  };

  // Número de risco (Kemler): sugestões somente para os casos usuais. Confirmar na ficha do produto na ANTT 5.947/21.
  function riscoSugerido(classe, pg, pf) {
    if (classe === '3') return pf != null && pf < 23 ? '33' : '30';
    if (classe === '8') return pg === 'I' ? '88' : '80';
    if (classe === '6.1') return pg === 'I' ? '66' : '60';
    if (classe === '5.1') return pg === 'I' ? '559' : '50';
    if (classe === '2.1') return '23';
    if (classe === '2.2') return '20';
    if (classe === '2.3') return '26';
    if (classe === '9') return '90';
    return '';
  }

  // Grupos de reatividade (marcar a partir da Seção 10 da FDS)
  const RG = [
    ['acido', 'Ácidos'],
    ['base', 'Bases / álcalis'],
    ['oxidante', 'Oxidantes'],
    ['redutor', 'Redutores'],
    ['organico_combustivel', 'Orgânicos combustíveis / inflamáveis'],
    ['agua_reativo', 'Reativos com água (metais alcalinos, hidretos, carbetos)'],
    ['agua_umidade', 'Água / umidade'],
    ['cianeto_sulfeto', 'Cianetos / sulfetos'],
    ['hipoclorito', 'Hipocloritos / cloro ativo'],
    ['amonia_aminas', 'Amônia / aminas'],
    ['metais', 'Metais ativos (Al, Zn, Mg) / pós metálicos'],
    ['peroxido', 'Peróxidos orgânicos'],
    ['ignicao', 'Fontes de ignição / calor'],
  ];
  // Cada regra: [A, B, efeito]
  const RG_RULES = [
    ['acido', 'base', 'Reação exotérmica violenta (neutralização), risco de projeção'],
    ['acido', 'cianeto_sulfeto', 'Libera gás cianídrico ou sulfeto de hidrogênio (letal)'],
    ['acido', 'hipoclorito', 'Libera cloro gasoso'],
    ['acido', 'metais', 'Libera hidrogênio inflamável'],
    ['acido', 'amonia_aminas', 'Reação exotérmica intensa'],
    ['base', 'metais', 'Libera hidrogênio inflamável (Al, Zn)'],
    ['base', 'hipoclorito', 'Instabilidade e liberação de cloro em contaminação ácida'],
    ['hipoclorito', 'amonia_aminas', 'Forma cloraminas tóxicas'],
    ['hipoclorito', 'organico_combustivel', 'Ignição ou reação exotérmica'],
    ['oxidante', 'organico_combustivel', 'Ignição ou explosão por contato'],
    ['oxidante', 'redutor', 'Reação exotérmica violenta'],
    ['oxidante', 'acido', 'Pode liberar gases oxidantes tóxicos e aumentar a intensidade da reação'],
    ['oxidante', 'metais', 'Ignição de pós metálicos'],
    ['oxidante', 'amonia_aminas', 'Pode formar compostos instáveis'],
    ['agua_reativo', 'agua_umidade', 'Libera gás inflamável e calor; risco de ignição'],
    ['agua_reativo', 'acido', 'Reação violenta com liberação de gás inflamável'],
    ['peroxido', 'acido', 'Decomposição acelerada'],
    ['peroxido', 'base', 'Decomposição acelerada'],
    ['peroxido', 'metais', 'Decomposição catalisada por metais'],
    ['peroxido', 'organico_combustivel', 'Ignição ou explosão'],
    ['peroxido', 'redutor', 'Reação exotérmica violenta'],
    ['peroxido', 'ignicao', 'Decomposição térmica auto-acelerada'],
    ['organico_combustivel', 'ignicao', 'Ignição de vapores'],
    ['redutor', 'ignicao', 'Ignição'],
  ];

  // Lista de alerta de triagem (não exaustiva). Editável em Configurações.
  const WATCH = {
    cancerigeno: [
      ['71-43-2', 'Benzeno'], ['50-00-0', 'Formaldeído'], ['79-01-6', 'Tricloroetileno'],
      ['75-01-4', 'Cloreto de vinila'], ['106-99-0', '1,3-Butadieno'], ['75-21-8', 'Óxido de etileno'],
      ['79-06-1', 'Acrilamida'], ['1332-21-4', 'Amianto (asbesto)'], ['7440-43-9', 'Cádmio'],
      ['56-23-5', 'Tetracloreto de carbono'], ['107-06-2', '1,2-Dicloroetano'], ['302-01-2', 'Hidrazina'],
      ['92-87-5', 'Benzidina'], ['91-59-8', '2-Naftilamina'], ['75-09-2', 'Diclorometano'],
      ['127-18-4', 'Tetracloroetileno'], ['1333-82-0', 'Trióxido de cromo (cromo hexavalente)'],
    ],
    reprotoxico: [
      ['872-50-4', 'N-Metil-2-pirrolidona (NMP)'], ['68-12-2', 'N,N-Dimetilformamida (DMF)'],
      ['109-86-4', '2-Metoxietanol'], ['110-80-5', '2-Etoxietanol'], ['7439-92-1', 'Chumbo'],
      ['10043-35-3', 'Ácido bórico'], ['1303-96-4', 'Bórax'], ['80-05-7', 'Bisfenol A'],
      ['108-88-3', 'Tolueno (suspeito; H361d)'],
    ],
    mutagenico: [
      ['71-43-2', 'Benzeno'], ['75-21-8', 'Óxido de etileno'], ['79-06-1', 'Acrilamida'],
      ['1333-82-0', 'Trióxido de cromo (cromo hexavalente)'],
    ],
    pfas: [
      ['335-67-1', 'PFOA'], ['1763-23-1', 'PFOS'], ['355-46-4', 'PFHxS'], ['375-95-1', 'PFNA'],
      ['9002-84-0', 'PTFE (fluoropolímero)'], ['27619-97-2', 'Sulfonato de fluorotelômero 6:2'],
      ['13252-13-6', 'GenX (HFPO-DA)'], ['375-73-5', 'PFBS'], ['307-24-4', 'PFHxA'],
    ],
  };
  const PFAS_TERMS = /(pfas|pfc\b|pfcs\b|perfluor|polifluor|per-?\s?e\s?polifluor|fluorotel[oô]mer|fluoropol[ií]mer|fluorosurfactante|pfoa|pfos|ptfe|c6\s*fluor)/i;

  // Tipos de local de armazenamento
  const LOCAIS_TIPO = ['Contêiner de PQ', 'Oficina', 'Almoxarifado', 'Área operacional', 'Obra / campo', 'Outro'];
  const FINALIDADES = ['Operação', 'Manutenção', 'Limpeza', 'Conservação', 'Obra'];

  const CONTROLES_ARM = [
    ['sinalizacao', 'Sinalização NR-26 / GHS no local'],
    ['bacia', 'Bacia de contenção dedicada'],
    ['temp_vent', 'Controle de temperatura / ventilação'],
    ['limite', 'Quantidade máxima armazenada (limite de estoque)'],
    ['nenhum', 'Nenhum controle adicional'],
  ];

  const BASE_LEGAL = [
    { sigla: 'ANTT 5.947/21', titulo: 'Resolução ANTT nº 5.947/2021', uso: 'Transporte terrestre de produtos perigosos: número ONU, classe, grupo de embalagem, número de risco, ficha de emergência e envelope. Atualizada pelas instruções complementares.', onde: 'Classificação de transporte, ficha de emergência, envelope' },
    { sigla: 'IMDG', titulo: 'Código Marítimo Internacional de Mercadorias Perigosas (IMO)', uso: 'Classes, grupos de embalagem, poluente marinho (marine pollutant), EmS e segregação em operação portuária e marítima.', onde: 'Classificação IMDG (etapa 10), matriz de segregação' },
    { sigla: 'NR-20', titulo: 'NR-20 Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis', uso: 'Líquidos inflamáveis (ponto de fulgor até 60 °C), combustíveis (acima de 60 °C até 93 °C) e gases inflamáveis: classificação de instalação, áreas classificadas, prontuário e controle de ignição.', onde: 'Armazenamento e alerta NR-20 no relatório' },
    { sigla: 'ABIQUIM', titulo: 'Manual para Atendimento de Emergências com Produtos Perigosos (ABIQUIM)', uso: 'Estrutura de ação de emergência por número ONU: isolamento, fogo, derramamento, primeiros socorros. Pró-Química 0800 11 8270.', onde: 'Ficha de emergência' },
    { sigla: 'NBR 14725', titulo: 'ABNT NBR 14725:2023 (partes 1 a 4)', uso: 'Terminologia, classificação, rotulagem e FDS de 16 seções.', onde: 'Validação da FDS, rotulagem' },
    { sigla: 'GHS / ONU', titulo: 'Sistema Globalmente Harmonizado (Livro Púrpura)', uso: 'Categorias de perigo, pictogramas, palavras de advertência e frases H e P.', onde: 'Triagem CMR/PFC, rotulagem' },
    { sigla: 'NR-29', titulo: 'NR-29 Segurança e Saúde no Trabalho Portuário', uso: 'Operação portuária com cargas perigosas e segregação (Anexo, base IMDG).', onde: 'Matriz de segregação' },
    { sigla: 'NBR 7500', titulo: 'ABNT NBR 7500', uso: 'Símbolos de risco e manuseio para transporte e armazenamento.', onde: 'Rótulos de risco e painel de segurança' },
    { sigla: 'NBR 7503', titulo: 'ABNT NBR 7503', uso: 'Ficha de emergência e envelope para o transporte terrestre de produtos perigosos.', onde: 'Ficha de emergência e envelope' },
    { sigla: 'NR-26', titulo: 'NR-26 Sinalização de Segurança', uso: 'Rotulagem preventiva e FDS no local de trabalho conforme GHS.', onde: 'Controles de armazenamento' },
    { sigla: 'NR-01 / NR-15', titulo: 'NR-01 (GRO/PGR) e NR-15 (Atividades e operações insalubres)', uso: 'Interface com o Inventário de Riscos e limites de tolerância.', onde: 'Etapas 9 e 12' },
  ];

  O.TRANSPORT = {
    CLASSES, CLASS_EXTRA, ORDER, MATRIX, SEG_LEGEND, LABELS, riscoSugerido,
    RG, RG_RULES, WATCH, PFAS_TERMS, LOCAIS_TIPO, FINALIDADES, CONTROLES_ARM, BASE_LEGAL,
    classeNome(c) { const f = CLASSES.concat(CLASS_EXTRA).find((x) => x[0] === c); return f ? f[1] : ''; },
    // retorna código da matriz entre duas classes; null se fora do escopo
    seg(a, b) {
      if (!MATRIX[a] || !MATRIX[b]) return null;
      return MATRIX[a][b];
    },
  };
})(window.O360 = window.O360 || {});
