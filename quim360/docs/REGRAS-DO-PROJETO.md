# Regras do projeto

Regras de negócio e de engenharia do QUIM 360 que **não devem ser quebradas**, com o motivo. A versão curta, lida automaticamente pelo assistente de código, é o `CLAUDE.md` da raiz do repositório: ao mudar uma regra, atualize os dois.

## 1. Postura do app: sinaliza, não bloqueia

- O gatilho de reprovação automática (CMR e PFC) **só sinaliza**. A decisão é do responsável técnico, que registra a justificativa. Produto liberado com gatilhos ou pendências sai como **condicionado**, e o relatório lista o que foi assumido (`dec.sobrepoe`). `Engine.rejeitaAuto` retorna sempre falso.
- O mesmo vale para MOC pendente, incompatibilidade em bacia, exigência de tanque que a frota não atende e qualquer alerta: viram pendência, condicionante ou ação, nunca bloqueio.
- Motivo: o app é apoio à decisão. A responsabilidade técnica é do profissional que assina; um app "engessado" seria contornado.

## 2. Estoque: regra estrita

- Só o que está **em estoque agora** entra nos cálculos de um local (segregação, quantidades-limite, checklist, análise de risco, quadros de compatibilidade).
- Só conta o que teve **entrada registrada** (`Engine.emEstoque`, `registrarEntrada`, `registrarAjuste`, `registrarSaida`, histórico em `p.movs`). Produto sem `p.estoque` (registro antigo) não está em estoque.
- Na etapa 11 o usuário informa se o produto já está no terminal e a quantidade; a decisão de homologar registra a entrada sozinha.
- A fila de homologação e as listas importadas **nunca** entram nos cálculos.

## 3. Norma e fonte de cada regra

- **NBR 17160:2024** é de armazenamento de produtos químicos **embalados**. As tabelas (`data/nbr17160.js`) vêm de exemplar licenciado: conferir qualquer alteração contra o PDF, nunca reescrever de memória. A classe de armazenamento é o primeiro perigo aplicável no fluxograma do Anexo D.
- **Granel em tanque** fica fora da NBR 17160 (aplicam-se NBR 17505 e NR-20) e fora do quadro de compatibilidade de embalados. A NBR 17160 **não é usada, nem como referência aproximada**, para tanque, bacia ou distanciamento.
- A classe do líquido a granel segue a NBR 17505-1:2013, Tabela 1 (ponto de fulgor e de ebulição).
- Base própria do app (alternativas, cenários, escalas, dicas de exigência de tanque) é ponto de partida e **não foi revisada por especialista**: deve ser apresentada assim.

## 4. Risco: três lentes, PSIF só em pessoas

- Três lentes de severidade: pessoas (acidente do trabalho), meio ambiente e processo e patrimônio (PSM). Uma probabilidade só.
- Classes pelo guia de classificação: **Grave** se severidade ≥ 4 ou score ≥ 12 (a severidade é soberana); Médio 6 a 11; Baixo 3 a 5; Desprezível ≤ 2.
- **PSIF (potencial de causar fatalidade) só existe na lente de pessoas.** Nunca marcar PSIF em meio ambiente nem em PSM.
- O nível do cenário é o da lente mais alta (`nivelCenario`). Campos: `sev` (pessoas), `sevAmb`, `sevPsm`, `prob`; dados antigos só têm `sev` e `prob`.
- Os critérios de meio ambiente e PSM são proposta a validar pelo responsável; a lente de pessoas segue o guia original.

## 5. Gestão de mudança (MOC) e produtos a granel

- O app **não executa o MOC** (feito em outro sistema): só levanta se é necessário (`Engine.mudancaSugestao`) e registra situação, referência, responsável e data (`p.mudanca`, etapa 12.3).
- Troca de produto é mudança: o produto novo registra qual substitui e o motivo, com comparação das FDS.
- Os tanques são **multiuso**: produto a granel não é vinculado a tanque. O app registra as **exigências do produto** para qualquer tanque (etapa 11.2) e pergunta à engenharia se a frota atual atende.
- A compatibilidade no terminal usa as bacias (só guardam quais produtos estão em cada uma), a Seção 10 das FDS e a **consulta externa registrada pelo analista** (NOAA CAMEO, com fonte e data). "Sem incompatibilidade declarada" não prova compatibilidade; sem dados vira "confirmar". Em divergência prevalece o resultado mais conservador.

## 6. Dados e privacidade

- O app roda localmente, sem servidor e sem publicação. Os dados ficam só no navegador (IndexedDB, com fallback em localStorage). O backup em arquivo é a garantia contra perda.
- Versão do esquema (`SCHEMA_VERSION`) com migração e cópia automática antes de migrar, importar ou apagar tudo. Dados de versão mais nova ficam em somente leitura.
- A cópia automática nunca pode tirar o espaço dos dados principais; importação sem espaço não altera nada.
- O app nunca envia e-mail sozinho: o botão abre o programa de e-mail do usuário (`mailto:`), com o contato cadastrado.
- **Sem referência a nenhuma empresa específica** no código ou nos documentos gerados. O logotipo é do usuário (inserir, trocar, tirar) ou Orbit 360.

## 7. Documentos gerados

- Cada documento é uma **lista de blocos neutros** (`docs.js`), convertida para HTML, Word (`render.js`) e PDF (`pdf.js`). Bloco novo exige suporte nos dois renderizadores.
- O **dossiê de evidência** (por local e do terminal) existe em duas versões: completa (uso interno) e resumida (cliente ou órgão, sem não conformidades, observações e ações, mas **com as contagens**: o resumo nunca esconde problema). Todo dossiê traz a data da emissão e sinaliza dados desatualizados.
- Escopo de cada documento: o relatório de homologação prova como o produto foi aprovado; o dossiê prova a situação vigente do estoque e da compatibilidade.

## 8. Escopo: o que fica de fora

- Gerenciador de integridade de equipamentos e NR-13: **fora do app** (outro sistema). No máximo, um campo com o TAG do tanque, se for pedido.
- Projeto de tanque, distanciamento, combate a incêndio e cálculo de bacia: fora do app. Sem a NBR 17505-2, o app pergunta, não responde.
- Ficha de emergência por número ONU depende de fonte (ERG ou manual da ABIQUIM) enviada pelo usuário.
