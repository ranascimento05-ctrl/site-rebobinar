/* Orientações para buscar alternativa a produto ou composição com gatilho de reprovação (CMR e PFC).
   São pontos de partida genéricos, sem marca: toda alternativa precisa de FDS própria, teste de desempenho e nova triagem no app.
   Lista não exaustiva; a escolha e a decisão são do responsável técnico. */
(function (O) {
  // por componente (CAS da lista de alerta)
  const CAS = {
    '71-43-2': { nome: 'Benzeno', sug: ['Exigir do fornecedor produto isento de benzeno ou com teor comprovadamente abaixo do limite legal (especificação de pureza e laudo).', 'Solventes alifáticos desaromatizados ou isoparafínicos, quando o poder de solvência exigido permitir.', 'Para limpeza e desengraxe, sistemas aquosos (alcalinos ou neutros) ou emulsões.'], nota: 'Verifique a NR-15, Anexo 13-A (benzeno), e o programa de vigilância da saúde aplicável.' },
    '108-88-3': { nome: 'Tolueno', sug: ['Diluentes e solventes sem aromáticos: hidrocarbonetos alifáticos desaromatizados ou isoparafínicos.', 'Ésteres (como acetato de etila ou de butila) e cetonas, escolhidos conforme a resina ou o revestimento, conferindo a classificação de cada candidato na FDS.', 'Limpeza de equipamentos e ferramentas: desengraxantes de base aquosa ou limpeza mecânica quando o processo permitir.', 'Reduzir o consumo: dosagem controlada, recipientes fechados e reaproveitamento do solvente de limpeza.'], nota: 'Compare a FDS do substituto com a triagem do app: ésteres e cetonas costumam ser inflamáveis e podem agravar o risco de incêndio.' },
    '79-01-6': { nome: 'Tricloroetileno', sug: ['Desengraxantes aquosos (alcalinos ou neutros) com lavagem por imersão, jato ou ultrassom.', 'Biossolventes e hidrocarbonetos isoparafínicos, quando o resíduo e a inflamabilidade puderem ser controlados.'], nota: '' },
    '127-18-4': { nome: 'Tetracloroetileno', sug: ['Limpeza aquosa com ultrassom ou jato.', 'Hidrocarbonetos isoparafínicos em equipamento fechado, quando a inflamabilidade puder ser controlada.'], nota: '' },
    '75-09-2': { nome: 'Diclorometano', sug: ['Removedores de tinta e verniz à base de álcool benzílico ou de ésteres dibásicos, conferindo a FDS de cada candidato.', 'Remoção mecânica (jato, lixamento com aspiração) ou térmica, quando o substrato permitir.'], nota: '' },
    '56-23-5': { nome: 'Tetracloreto de carbono', sug: ['Sem uso técnico que justifique a manutenção: buscar o solvente ou o processo que cumpra a mesma função (limpeza aquosa, solventes de menor perigo).'], nota: '' },
    '107-06-2': { nome: '1,2-Dicloroetano', sug: ['Buscar solvente de menor perigo para a mesma função, ou alteração de processo com sistema fechado.'], nota: 'Se for matéria-prima de processo, a substituição exige mudança de processo; priorize contenção e controle de exposição.' },
    '50-00-0': { nome: 'Formaldeído', sug: ['Produtos (resinas, adesivos, conservantes) sem formaldeído adicionado ou de baixa emissão com laudo.', 'Para uso como biocida ou preservante, avaliar alternativas conforme o sistema, com a FDS do substituto.'], nota: '' },
    '1333-82-0': { nome: 'Cromo hexavalente (trióxido de cromo)', sug: ['Tratamentos de superfície com cromo trivalente ou sistemas sem cromo (por exemplo à base de zircônio ou titânio).', 'Primers e tintas isentos de cromatos.'], nota: '' },
    '109-86-4': { nome: '2-Metoxietanol', sug: ['Éteres de glicol da série do propileno (por exemplo 1-metoxi-2-propanol), conferindo a classificação na FDS.', 'Ésteres ou álcoois de menor perigo, conforme a função na formulação.'], nota: '' },
    '110-80-5': { nome: '2-Etoxietanol', sug: ['Éteres de glicol da série do propileno, conferindo a classificação na FDS.', 'Ésteres ou álcoois de menor perigo, conforme a função na formulação.'], nota: '' },
    '872-50-4': { nome: 'N-Metil-2-pirrolidona (NMP)', sug: ['Solventes apróticos polares sem classificação de toxicidade à reprodução, avaliados caso a caso com o fornecedor.', 'Para remoção de tintas, formulações à base de ésteres dibásicos ou de álcool benzílico.'], nota: 'Confira cada candidato: alguns solventes análogos têm o mesmo perigo.' },
    '68-12-2': { nome: 'N,N-Dimetilformamida (DMF)', sug: ['Solventes apróticos polares sem classificação de toxicidade à reprodução, avaliados caso a caso com o fornecedor.'], nota: 'Confira cada candidato: alguns solventes análogos têm o mesmo perigo.' },
    '7439-92-1': { nome: 'Chumbo', sug: ['Ligas, soldas e pigmentos isentos de chumbo.'], nota: '' },
    '10043-35-3': { nome: 'Ácido bórico', sug: ['Avaliar, conforme a função (tampão, preservante, fluxo), alternativa de menor perigo com a FDS do fornecedor.'], nota: '' },
    '1303-96-4': { nome: 'Bórax', sug: ['Avaliar, conforme a função, alternativa de menor perigo com a FDS do fornecedor.'], nota: '' },
    '80-05-7': { nome: 'Bisfenol A', sug: ['Resinas e revestimentos sem bisfenol A.'], nota: 'Confira que o substituto não é um análogo de bisfenol com perfil de perigo semelhante.' },
    '1332-21-4': { nome: 'Amianto (asbesto)', sug: ['Materiais isentos de amianto, com laudo do fornecedor.'], nota: 'O uso do amianto é vedado no Brasil.' },
    '75-21-8': { nome: 'Óxido de etileno', sug: ['Esterilização por vapor, radiação ou peróxido de hidrogênio vaporizado, conforme o material.'], nota: '' },
    '79-06-1': { nome: 'Acrilamida', sug: ['Polímeros com teor residual de monômero comprovadamente baixo, com laudo, ou sistema que dispense o monômero.'], nota: '' },
    '302-01-2': { nome: 'Hidrazina', sug: ['Desoxigenantes de tratamento de água de caldeira como sulfito, eritorbato ou dietilhidroxilamina, avaliados com o fornecedor do sistema.'], nota: '' },
    '75-01-4': { nome: 'Cloreto de vinila', sug: ['Matéria-prima de processo: a substituição depende de mudança de processo; priorize sistema fechado e controle de exposição.'], nota: '' },
    '106-99-0': { nome: '1,3-Butadieno', sug: ['Matéria-prima de processo: a substituição depende de mudança de processo; priorize sistema fechado e controle de exposição.'], nota: '' },
  };
  // PFAS por CAS
  ['335-67-1', '1763-23-1', '355-46-4', '375-95-1', '9002-84-0', '27619-97-2', '13252-13-6', '375-73-5', '307-24-4'].forEach((c) => {
    CAS[c] = { nome: 'PFAS (per e polifluorados)', sug: ['Espumas de combate a incêndio sem flúor.', 'Revestimentos antiaderentes, repelentes e antiaderentes de papel e têxteis sem flúor (silicones, ceras, hidrocarbonetos), conforme o desempenho exigido.', 'Exigir declaração de ausência de PFAS na composição e no processo de fabricação.'], nota: 'Há exceções de desempenho em usos críticos; documente a justificativa se não houver substituto.' };
  });

  // por tipo de perigo (quando não há componente conhecido)
  const TIPO = {
    cancerigeno: { rotulo: 'Cancerígeno', sug: ['Pedir ao fornecedor versão da formulação sem o agente cancerígeno ou com teor residual abaixo do limite aplicável.', 'Identificar qual componente da Seção 3 causa a classificação (frases H350 ou H351) e buscar produto equivalente sem ele.'] },
    mutagenico: { rotulo: 'Mutagênico', sug: ['Pedir ao fornecedor versão da formulação sem o agente mutagênico.', 'Identificar na Seção 3 o componente que causa a classificação (H340 ou H341) e buscar produto equivalente sem ele.'] },
    teratogenico: { rotulo: 'Teratogênico ou tóxico ao desenvolvimento', sug: ['Pedir ao fornecedor versão da formulação sem o agente tóxico à reprodução.', 'Identificar na Seção 3 o componente que causa a classificação (H360 ou H361) e buscar produto equivalente sem ele.', 'Se o uso continuar, considere o efeito sobre trabalhadoras gestantes e lactantes na avaliação do PGR.'] },
    reprodutivo: { rotulo: 'Tóxico à fertilidade', sug: ['Pedir ao fornecedor versão da formulação sem o agente tóxico à fertilidade.', 'Identificar na Seção 3 o componente que causa a classificação (H360F ou H361f) e buscar produto equivalente sem ele.'] },
    pfc: { rotulo: 'PFAS ou PFC', sug: ['Exigir declaração de ausência de PFAS e buscar formulação sem flúor.', 'Revisar a função do componente fluorado (repelência, antiaderência, espuma) para escolher a tecnologia alternativa.'] },
  };

  // passos gerais de substituição
  const GERAIS = [
    'Defina a função do produto no processo (o que ele precisa fazer) antes de procurar o substituto.',
    'Peça ao fornecedor uma versão sem o agente ou uma formulação alternativa, com FDS completa.',
    'Passe a FDS do candidato pelo Analisador de FDS do app: não aceite substituto que acione outro gatilho de CMR ou PFC.',
    'Confira os perigos novos do candidato (inflamabilidade, corrosividade, toxicidade, perigo ao ambiente) e a compatibilidade de armazenamento pela NBR 17160 e pela matriz do local.',
    'Teste o desempenho em pequena escala e registre o resultado.',
    'Se não houver substituto viável, registre a justificativa e mantenha os controles (PGR, PCMSO, plano de emergência) e reavalie a viabilidade de substituição periodicamente.',
    'Reduza a exposição enquanto isso: menor quantidade, recipientes fechados, transferência em sistema fechado, ventilação local e EPI adequado.',
  ];

  O.ALTERNATIVAS = { CAS, TIPO, GERAIS };
})(window.O360 = window.O360 || {});
