# QUIM 360 | Orbit 360

Aplicativo para gerenciar produtos químicos: homologação, uso, armazenamento e compatibilidade, a partir da análise da FDS.

Abrir `quim360/index.html` por um servidor estático (ex.: `python3 -m http.server` na raiz do repositório e acessar `/quim360/`). Sem build, sem backend. Os dados ficam no `localStorage` do navegador (exportar e importar JSON em Configurações).

## O que faz

- **Análise automática**: ao enviar a FDS, o app preenche as etapas que a FDS responde por completo (identificação, validação, data e idioma, triagem GHS, impactos, classificação IMDG, incompatibilidades, controles de armazenamento) e para só nas que exigem o analista: uso e local, cobertura do PGR, pareceres, conflito de segregação e decisão. Tudo que foi preenchido é listado para revisão na decisão.
- **Capa** com apresentação do app e logo oficial da Orbit 360 (recorte da arte original) em todas as telas e documentos.
- **Compatibilidade entre produtos**: cada produto contra os demais homologados (matriz de segregação mais reatividade), por produto e em grade.
- **Analisador de FDS**: lê o texto (colado, .txt ou .pdf) e localiza as 16 seções da ABNT NBR 14725, frases H e P, CAS, ponto de fulgor, ONU, classe, grupo de embalagem e incompatibilidades.
- **Assistente de homologação** (contexto de uso e armazenamento + 15 etapas), uma confirmação por etapa: identificação, finalidade, lista de homologados, similaridade (read-across), validação e data/idioma da FDS, triagem GHS, impactos ocupacionais e ambientais (avaliações separadas), interface com o PGR, classificação IMDG, compatibilidade e segregação, pareceres e gatilho do PGR, decisão, plano de ação e saída.
- **Rejeição automática**: cancerígeno, mutagênico, teratogênico e PFC/PFAS, por frases H, CAS da lista de alerta e marcação do analista. Marcar "Nenhum" não anula evidência encontrada.
- **Via simplificada**: nunca dispensa FDS própria, triagem, IMDG, segregação no local real, pareceres e registro próprio. Divergência relevante a encerra.
- **Matriz de segregação** (Anexo da NR-29 / IMDG) e grupos de reatividade da Seção 10, aplicados ao local de armazenamento e à auditoria do local.
- **Documentos em Word (.docx) e PDF**: relatório de homologação, ficha de emergência, rotulagem (GHS e rótulos de risco), envelope de transporte e checklist de treinamento. O envelope segue a estrutura da ABNT NBR 7503 (face do envelope e ficha de emergência), a validar contra o texto licenciado da norma. O PDF usa a impressão do navegador ("Salvar como PDF").

## Base técnico-legal

Resolução ANTT 5.947/21 e IMDG; NR-20; Manual ABIQUIM; ABNT NBR 14725 e GHS; NR-29 e ABNT NBR 7500; NBR 7503; NR-26; NR-01 e NR-15.

## Limites

- A matriz de segregação reproduz a base do acervo. Confirme cada par na tabela 7.2.4 do Código IMDG antes de decisão formal.
- A lista de alerta CMR/PFAS por CAS é de triagem e não exaustiva.
- Pictogramas e rótulos são vetoriais simplificados: use a arte oficial na impressão final.
- Distâncias de isolamento na ficha são valores genéricos por classe: confirme no Manual ABIQUIM pelo número ONU.
- Leitura de PDF carrega o pdf.js do cdnjs; sem rede, cole o texto da FDS.
- Marca: paleta e tipografia da skill marca-orbit360.

## Estrutura

`js/data` dados GHS, transporte e FDS de exemplo | `js/engine.js` regras | `js/fds-parser.js` análise da FDS | `js/docs.js` documentos | `js/render.js` HTML, Word e PDF | `js/wizard.js` etapas | `js/views.js` telas | `vendor/` docx e qrcode-generator (MIT)
