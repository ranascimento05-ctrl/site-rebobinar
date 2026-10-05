/* Dados GHS / ABNT NBR 14725: frases H e P, pictogramas, palavras de advertência.
   Textos em português conforme redação usual do GHS (Livro Púrpura) adotada na NBR 14725. */
(function (O) {
  // pictogramas: GHS01..GHS09
  const PICTO = {
    GHS01: 'Bomba explodindo',
    GHS02: 'Chama',
    GHS03: 'Chama sobre círculo',
    GHS04: 'Botijão de gás',
    GHS05: 'Corrosão',
    GHS06: 'Caveira e ossos cruzados',
    GHS07: 'Ponto de exclamação',
    GHS08: 'Perigo à saúde',
    GHS09: 'Meio ambiente',
  };

  // [texto, pictogramas, palavra (D = Perigo, A = Atenção, '' = nenhuma)]
  const H = {
    H200: ['Explosivo instável', ['GHS01'], 'D'],
    H201: ['Explosivo; perigo de explosão em massa', ['GHS01'], 'D'],
    H202: ['Explosivo; perigo grave de projeção', ['GHS01'], 'D'],
    H203: ['Explosivo; perigo de incêndio, de sopro ou de projeção', ['GHS01'], 'D'],
    H204: ['Perigo de incêndio ou de projeção', ['GHS01'], 'A'],
    H205: ['Perigo de explosão em massa em caso de incêndio', ['GHS01'], 'D'],
    H220: ['Gás extremamente inflamável', ['GHS02'], 'D'],
    H221: ['Gás inflamável', ['GHS02'], 'A'],
    H222: ['Aerossol extremamente inflamável', ['GHS02'], 'D'],
    H223: ['Aerossol inflamável', ['GHS02'], 'A'],
    H224: ['Líquido e vapores extremamente inflamáveis', ['GHS02'], 'D'],
    H225: ['Líquido e vapores altamente inflamáveis', ['GHS02'], 'D'],
    H226: ['Líquido e vapores inflamáveis', ['GHS02'], 'A'],
    H227: ['Líquido combustível', [], 'A'],
    H228: ['Sólido inflamável', ['GHS02'], 'A'],
    H229: ['Recipiente pressurizado: pode explodir sob ação do calor', [], 'A'],
    H230: ['Pode reagir explosivamente mesmo na ausência de ar', ['GHS02'], 'D'],
    H231: ['Pode reagir explosivamente mesmo na ausência de ar a pressão e/ou temperatura elevadas', ['GHS02'], 'D'],
    H240: ['Pode explodir sob ação do calor', ['GHS01'], 'D'],
    H241: ['Pode incendiar ou explodir sob ação do calor', ['GHS01', 'GHS02'], 'D'],
    H242: ['Pode incendiar sob ação do calor', ['GHS02'], 'D'],
    H250: ['Inflama-se espontaneamente em contato com o ar', ['GHS02'], 'D'],
    H251: ['Sujeito a autoaquecimento; pode inflamar', ['GHS02'], 'D'],
    H252: ['Sujeito a autoaquecimento em grandes quantidades; pode inflamar', ['GHS02'], 'A'],
    H260: ['Em contato com a água libera gases inflamáveis que podem inflamar espontaneamente', ['GHS02'], 'D'],
    H261: ['Em contato com a água libera gases inflamáveis', ['GHS02'], 'A'],
    H270: ['Pode provocar ou agravar um incêndio; comburente', ['GHS03'], 'D'],
    H271: ['Pode provocar incêndio ou explosão; muito comburente', ['GHS03'], 'D'],
    H272: ['Pode agravar um incêndio; comburente', ['GHS03'], 'A'],
    H280: ['Contém gás sob pressão; pode explodir sob ação do calor', ['GHS04'], 'A'],
    H281: ['Contém gás refrigerado; pode provocar queimaduras ou lesões criogênicas', ['GHS04'], 'A'],
    H290: ['Pode ser corrosivo para os metais', ['GHS05'], 'A'],
    H300: ['Fatal se ingerido', ['GHS06'], 'D'],
    H301: ['Tóxico se ingerido', ['GHS06'], 'D'],
    H302: ['Nocivo se ingerido', ['GHS07'], 'A'],
    H303: ['Pode ser nocivo se ingerido', [], 'A'],
    H304: ['Pode ser fatal se ingerido e penetrar nas vias respiratórias', ['GHS08'], 'D'],
    H305: ['Pode ser nocivo se ingerido e penetrar nas vias respiratórias', [], 'A'],
    H310: ['Fatal em contato com a pele', ['GHS06'], 'D'],
    H311: ['Tóxico em contato com a pele', ['GHS06'], 'D'],
    H312: ['Nocivo em contato com a pele', ['GHS07'], 'A'],
    H313: ['Pode ser nocivo em contato com a pele', [], 'A'],
    H314: ['Provoca queimaduras graves na pele e lesões oculares graves', ['GHS05'], 'D'],
    H315: ['Provoca irritação à pele', ['GHS07'], 'A'],
    H316: ['Provoca irritação moderada à pele', [], 'A'],
    H317: ['Pode provocar reações alérgicas na pele', ['GHS07'], 'A'],
    H318: ['Provoca lesões oculares graves', ['GHS05'], 'D'],
    H319: ['Provoca irritação ocular grave', ['GHS07'], 'A'],
    H320: ['Provoca irritação ocular', [], 'A'],
    H330: ['Fatal se inalado', ['GHS06'], 'D'],
    H331: ['Tóxico se inalado', ['GHS06'], 'D'],
    H332: ['Nocivo se inalado', ['GHS07'], 'A'],
    H333: ['Pode ser nocivo se inalado', [], 'A'],
    H334: ['Pode provocar sintomas de alergia ou asma ou dificuldades respiratórias se inalado', ['GHS08'], 'D'],
    H335: ['Pode provocar irritação das vias respiratórias', ['GHS07'], 'A'],
    H336: ['Pode provocar sonolência ou vertigem', ['GHS07'], 'A'],
    H340: ['Pode provocar defeitos genéticos', ['GHS08'], 'D'],
    H341: ['Suspeito de provocar defeitos genéticos', ['GHS08'], 'A'],
    H350: ['Pode provocar câncer', ['GHS08'], 'D'],
    H350i: ['Pode provocar câncer por inalação', ['GHS08'], 'D'],
    H351: ['Suspeito de provocar câncer', ['GHS08'], 'A'],
    H360: ['Pode prejudicar a fertilidade ou o feto', ['GHS08'], 'D'],
    H360F: ['Pode prejudicar a fertilidade', ['GHS08'], 'D'],
    H360D: ['Pode prejudicar o feto', ['GHS08'], 'D'],
    H360FD: ['Pode prejudicar a fertilidade; pode prejudicar o feto', ['GHS08'], 'D'],
    H360Fd: ['Pode prejudicar a fertilidade; suspeito de prejudicar o feto', ['GHS08'], 'D'],
    H360Df: ['Pode prejudicar o feto; suspeito de prejudicar a fertilidade', ['GHS08'], 'D'],
    H361: ['Suspeito de prejudicar a fertilidade ou o feto', ['GHS08'], 'A'],
    H361f: ['Suspeito de prejudicar a fertilidade', ['GHS08'], 'A'],
    H361d: ['Suspeito de prejudicar o feto', ['GHS08'], 'A'],
    H361fd: ['Suspeito de prejudicar a fertilidade; suspeito de prejudicar o feto', ['GHS08'], 'A'],
    H362: ['Pode provocar danos a crianças em amamentação', [], 'A'],
    H370: ['Provoca danos aos órgãos', ['GHS08'], 'D'],
    H371: ['Pode provocar danos aos órgãos', ['GHS08'], 'A'],
    H372: ['Provoca danos aos órgãos por exposição repetida ou prolongada', ['GHS08'], 'D'],
    H373: ['Pode provocar danos aos órgãos por exposição repetida ou prolongada', ['GHS08'], 'A'],
    H400: ['Muito tóxico para os organismos aquáticos', ['GHS09'], 'A'],
    H401: ['Tóxico para os organismos aquáticos', [], ''],
    H402: ['Nocivo para os organismos aquáticos', [], ''],
    H410: ['Muito tóxico para os organismos aquáticos, com efeitos prolongados', ['GHS09'], 'A'],
    H411: ['Tóxico para os organismos aquáticos, com efeitos prolongados', ['GHS09'], ''],
    H412: ['Nocivo para os organismos aquáticos, com efeitos prolongados', [], ''],
    H413: ['Pode provocar efeitos nocivos prolongados para os organismos aquáticos', [], ''],
    H420: ['Prejudica a saúde pública e o meio ambiente ao destruir o ozônio na atmosfera superior', [], 'A'],
  };

  const P = {
    P101: 'Se for necessário consultar um médico: tenha à mão a embalagem ou o rótulo.',
    P102: 'Mantenha fora do alcance das crianças.',
    P103: 'Leia o rótulo antes de utilizar.',
    P201: 'Obtenha instruções específicas antes da utilização.',
    P202: 'Não manuseie o produto antes de ter lido e compreendido todas as precauções de segurança.',
    P210: 'Mantenha afastado do calor, superfícies quentes, faíscas, chamas abertas e outras fontes de ignição. Não fume.',
    P211: 'Não pulverize sobre chama aberta ou outra fonte de ignição.',
    P220: 'Mantenha afastado de roupas e outros materiais combustíveis.',
    P222: 'Não deixe entrar em contato com o ar.',
    P223: 'Mantenha afastado de qualquer contato com a água.',
    P230: 'Mantenha umedecido com o produto indicado pelo fabricante.',
    P231: 'Manuseie em atmosfera de gás inerte.',
    P233: 'Mantenha o recipiente hermeticamente fechado.',
    P234: 'Conserve somente no recipiente original.',
    P235: 'Mantenha em local fresco.',
    P240: 'Aterre o recipiente e o equipamento receptor.',
    P241: 'Utilize equipamento elétrico, de ventilação e de iluminação à prova de explosão.',
    P242: 'Utilize apenas ferramentas antifaiscantes.',
    P243: 'Evite o acúmulo de cargas eletrostáticas.',
    P244: 'Mantenha as válvulas redutoras livres de graxa e óleo.',
    P250: 'Evite abrasão, impacto e fricção.',
    P251: 'Não perfure nem queime, mesmo após o uso.',
    P260: 'Não inale as poeiras, fumos, gases, névoas, vapores ou aerossóis.',
    P261: 'Evite inalar as poeiras, fumos, gases, névoas, vapores ou aerossóis.',
    P262: 'Evite o contato com os olhos, a pele ou a roupa.',
    P263: 'Evite o contato durante a gravidez e a amamentação.',
    P264: 'Lave cuidadosamente após o manuseio.',
    P270: 'Não coma, beba ou fume durante a utilização deste produto.',
    P271: 'Utilize somente ao ar livre ou em locais bem ventilados.',
    P272: 'A roupa de trabalho contaminada não pode sair do local de trabalho.',
    P273: 'Evite a liberação para o meio ambiente.',
    P280: 'Use luvas de proteção, roupa de proteção, proteção ocular e proteção facial.',
    P281: 'Use o equipamento de proteção individual requerido.',
    P282: 'Use luvas de isolamento térmico e protetor facial ou ocular.',
    P283: 'Use roupa resistente a fogo ou retardante de chama.',
    P284: 'Use proteção respiratória.',
    P231_P232: 'Manuseie em atmosfera de gás inerte. Proteja da umidade.',
    P301: 'EM CASO DE INGESTÃO:',
    P302: 'EM CASO DE CONTATO COM A PELE:',
    P303: 'EM CASO DE CONTATO COM A PELE (ou o cabelo):',
    P304: 'EM CASO DE INALAÇÃO:',
    P305: 'EM CASO DE CONTATO COM OS OLHOS:',
    P306: 'EM CASO DE CONTATO COM A ROUPA:',
    P308: 'EM CASO DE exposição ou suspeita de exposição:',
    P310: 'Ligue imediatamente para um CENTRO DE INFORMAÇÃO TOXICOLÓGICA ou um médico.',
    P311: 'Ligue para um CENTRO DE INFORMAÇÃO TOXICOLÓGICA ou um médico.',
    P312: 'Caso sinta indisposição, ligue para um CENTRO DE INFORMAÇÃO TOXICOLÓGICA ou um médico.',
    P313: 'Consulte um médico.',
    P314: 'Em caso de mal-estar, consulte um médico.',
    P315: 'Consulte imediatamente um médico.',
    P320: 'É urgente um tratamento específico (ver instruções suplementares neste rótulo).',
    P321: 'Tratamento específico (ver instruções suplementares neste rótulo).',
    P330: 'Enxágue a boca.',
    P331: 'NÃO provoque vômito.',
    P332: 'Em caso de irritação cutânea:',
    P333: 'Em caso de irritação ou erupção cutânea:',
    P334: 'Mergulhe em água fria ou envolva com compressas úmidas.',
    P335: 'Retire do corpo as partículas soltas.',
    P336: 'Descongele as partes congeladas com água morna. Não esfregue a área afetada.',
    P337: 'Caso a irritação ocular persista:',
    P338: 'Retire as lentes de contato, se presentes e se for fácil. Continue enxaguando.',
    P340: 'Retire a pessoa para um local ao ar livre e mantenha-a em repouso numa posição que não dificulte a respiração.',
    P342: 'Em caso de sintomas respiratórios:',
    P351: 'Enxágue cuidadosamente com água durante vários minutos.',
    P352: 'Lave com água e sabão em abundância.',
    P353: 'Enxágue a pele com água ou tome uma ducha.',
    P360: 'Enxágue imediatamente as roupas e a pele contaminadas com água abundante antes de retirar a roupa.',
    P361: 'Retire imediatamente toda a roupa contaminada.',
    P362: 'Retire a roupa contaminada.',
    P363: 'Lave a roupa contaminada antes de a reutilizar.',
    P370: 'Em caso de incêndio:',
    P371: 'Em caso de incêndio de grandes proporções e de grandes quantidades:',
    P372: 'Risco de explosão em caso de incêndio.',
    P373: 'NÃO combata o incêndio quando o fogo atingir explosivos.',
    P375: 'Combata o incêndio à distância, devido ao risco de explosão.',
    P376: 'Detenha o vazamento se for seguro faze-lo.',
    P377: 'Vazamento de gás em chamas: não apague, a menos que o vazamento possa ser detido com segurança.',
    P378: 'Para a extinção utilize o meio indicado na FDS.',
    P380: 'Evacue a área.',
    P381: 'Elimine todas as fontes de ignição se for seguro faze-lo.',
    P390: 'Absorva o derramamento para prevenir danos materiais.',
    P391: 'Recolha o material derramado.',
    P401: 'Armazene conforme indicado na FDS.',
    P402: 'Armazene em local seco.',
    P403: 'Armazene em local bem ventilado.',
    P404: 'Armazene em recipiente fechado.',
    P405: 'Armazene em local fechado à chave.',
    P406: 'Armazene em recipiente resistente à corrosão com revestimento interno resistente.',
    P407: 'Mantenha um espaço de ar entre pilhas ou paletes.',
    P410: 'Proteja da luz solar.',
    P411: 'Armazene a temperaturas não superiores ao indicado na FDS.',
    P412: 'Não exponha a temperaturas superiores a 50 °C.',
    P413: 'Armazene quantidades a granel superiores ao indicado na FDS a temperaturas não superiores ao indicado.',
    P420: 'Armazene separadamente.',
    P422: 'Armazene sob atmosfera de gás inerte.',
    P501: 'Descarte o conteúdo e/ou recipiente conforme a regulamentação local, estadual ou federal aplicável.',
  };
  delete P.P231_P232;

  O.GHS = {
    PICTO, H, P,
    // normaliza códigos como "H225+H319" ou "P301 + P310"
    splitCodes(str, prefix) {
      if (!str) return [];
      const re = new RegExp(prefix + '\\d{3}[A-Za-z]{0,2}', 'g');
      const out = [];
      (String(str).match(re) || []).forEach((c) => { if (!out.includes(c)) out.push(c); });
      return out;
    },
    hText(code) {
      const k = Object.keys(H).find((x) => x.toLowerCase() === code.toLowerCase());
      return k ? H[k][0] : null;
    },
    pText(code) { return P[code] || null; },
    // pictogramas e palavra de advertência derivados das frases H
    derive(hCodes) {
      const pics = new Set();
      let word = '';
      hCodes.forEach((c) => {
        const k = Object.keys(H).find((x) => x.toLowerCase() === c.toLowerCase());
        if (!k) return;
        H[k][1].forEach((p) => pics.add(p));
        if (H[k][2] === 'D') word = 'D';
        else if (H[k][2] === 'A' && word !== 'D') word = 'A';
      });
      // Precedência GHS: GHS06 suprime GHS07 de toxicidade aguda; GHS05 suprime GHS07 de irritação cutânea/ocular
      const ghs07Reasons = hCodes.filter((c) => /^H(302|312|332|315|317|319|335|336)$/.test(c));
      if (pics.has('GHS07')) {
        const hasAcute = pics.has('GHS06');
        const hasCorr = pics.has('GHS05');
        const remaining = ghs07Reasons.filter((c) => {
          if (hasAcute && /^H(302|312|332)$/.test(c)) return false;
          if (hasCorr && /^H(315|319)$/.test(c)) return false;
          return true;
        });
        if (!remaining.length && (hasAcute || hasCorr)) pics.delete('GHS07');
      }
      return { pictos: [...pics].sort(), palavra: word === 'D' ? 'Perigo' : word === 'A' ? 'Atenção' : '' };
    },
    // Classificação CMR / PFC a partir de frases H
    cmrFromH(hCodes) {
      const r = { cancerigeno: [], mutagenico: [], teratogenico: [], reprotoxicoFertilidade: [], suspeitos: [] };
      hCodes.forEach((c) => {
        if (/^H350/i.test(c)) r.cancerigeno.push(c);
        if (/^H351/i.test(c)) { r.cancerigeno.push(c); r.suspeitos.push(c); }
        if (/^H340/i.test(c)) r.mutagenico.push(c);
        if (/^H341/i.test(c)) { r.mutagenico.push(c); r.suspeitos.push(c); }
        if (/^H360$/.test(c) || /^H360.*D/.test(c) || /^H360D/i.test(c)) r.teratogenico.push(c);
        if (/^H361$/.test(c)) { r.teratogenico.push(c); r.suspeitos.push(c); }
        if (/^H361.*d/.test(c)) { r.teratogenico.push(c); r.suspeitos.push(c); }
        if (/^H360F$/.test(c) || /^H360Fd$/.test(c)) r.reprotoxicoFertilidade.push(c);
        if (/^H361f$/.test(c)) { r.reprotoxicoFertilidade.push(c); r.suspeitos.push(c); }
        if (/^H360/.test(c) && /F/.test(c) && !r.reprotoxicoFertilidade.includes(c)) r.reprotoxicoFertilidade.push(c);
      });
      return r;
    },
  };
})(window.O360 = window.O360 || {});
