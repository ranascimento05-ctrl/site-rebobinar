# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repositório

- `index.html` (raiz): página de portfólio pessoal, independente do app.
- `quim360/`: o app **QUIM 360 (Orbit 360)**, gestão de produtos químicos (homologação a partir da FDS, armazenamento, compatibilidade, documentos). É onde se trabalha. O `quim360/README.md` descreve as funções; o `quim360/CONFERENCIA-NBR17160.md` registra o que foi conferido contra o PDF da NBR 17160.
- Textos de interface, commits e comentários em português do Brasil.

## Executar, testar, entregar

Não há build, lint nem suite de testes. É um app estático de scripts clássicos (sem módulos ES, sem bundler, sem backend).

- Rodar: `cd quim360 && python3 -m http.server 8765` e abrir `/` (ou abrir `quim360/index.html` por `file://`, que também funciona).
- Verificação: Playwright (`require('playwright')`, `chromium.launch()`) abrindo a página e chamando o app por `window.O360` via `page.evaluate` (por exemplo `O360.Demo.criar()` carrega dados de demonstração; `O360.Docs.*` gera blocos de documento; `O360.Render.docx(blocos)` e `O360.Pdf.blob(blocos)` geram Word e PDF). Capture `pageerror` para achar exceções.
- Entrega: `quim360/QUIM360-standalone.html` (CSS e JS do `index.html` embutidos, abre offline) e `quim360/QUIM360-codigo.zip` são versionados e precisam ser **regerados a cada mudança**. Standalone: substituir no `index.html` o `<link rel="stylesheet" href="css/app.css">` e cada `<script src="...">` pelo conteúdo inline (escapando `</script`). Zip: `zip -qr QUIM360-codigo.zip index.html README.md CONFERENCIA-NBR17160.md LISTA-DE-CONFERENCIA.docx css js vendor`.
- Desenvolvimento no branch `claude/intelligent-darwin-cif0t0`; não abrir PR sem pedido.

## Arquitetura

Tudo vive no namespace global `window.O360` (cada arquivo é um IIFE que recebe `O` e se registra nele). **A ordem dos `<script>` em `quim360/index.html` é a ordem de dependência**: vendor (docx, qrcode, jszip, pdfmake) → `data/*` (inclui `risco.js`, cenários e critério da análise de risco do armazém, `nbr17160-req.js`, requisitos do checklist por local, e `alternativas.js`, orientações de substituição por CAS e por tipo de perigo, usadas por `Engine.alternativas`) → `store` → `engine` → `fds-parser` → `auto` → `fila` (importa lista de produtos .xlsx ou .csv sem FDS para a fila de homologação, guardada em `fila` no estado) → `pictos`/`logo` → `docs` → `render` → `pdf` → `ui` → `wizard` → `views` → `demo` → `app`. Arquivo novo precisa entrar nessa lista, e as ordens do assistente/rotas ficam em `wizard.js` (`ORDER`) e `app.js` (`NAV` e rotas por hash).

Fluxo de dados: o estado inteiro (produtos, locais, config) fica em `localStorage` na chave `quim360.v1`, gerido por `store.js` (com export/import JSON). Um produto nasce em `Engine.novoProduto()`, que define o esquema do registro; campos novos entram ali e, para dados antigos, precisam tolerar `undefined`.

- `engine.js`: motor de regras puro. Triagem CMR/PFC, `avaliar()` (devolve `reprovacoes`, `pendencias`, `condicionantes`, `alertas`, `gatilhos` e uma `sugestao` de status), classe de armazenamento da NBR 17160 (`classeArm`, fluxograma do Anexo D), compatibilidade (`avaliaPar`, `compatibilidade`, `compatPar`), quantidades-limite e gatilhos das Seções 7 a 14 (`gatilhosLocal`) contenção de água de extinção do Anexo F (`contencaoLocal`) e o checklist de requisitos por local (`requisitosLocal`, que decide quais itens de `nbr17160-req.js` se aplicam pelas quantidades e pelas marcações do local).
- `data/`: tabelas transcritas. `nbr17160.js` (classes, matriz, observações, Tabelas 1, 3, 4, F.1, F.2) vem de exemplar licenciado da norma: conferir qualquer alteração contra o PDF e não reescrever de memória. `ghs.js` (frases H/P), `transport.js` (classes, grupos de reatividade, lista de alerta CAS, controles).
- `fds-parser.js` lê o texto da FDS (16 seções, H/P, CAS, ONU, fulgor etc.). `prepara()` normaliza o texto antes da análise (espaços repetidos, cabeçalho repetido por página, rótulos quebrados em várias linhas), porque o texto que o pdf.js entrega de PDFs em tabela vem assim; para testar com PDF real, extraia o texto com `pdfjs-dist@3.11.174` do mesmo jeito que `lerArquivo` e passe a `O360.FDS.parse`; `auto.js` usa o resultado para pré-preencher e confirmar etapas do assistente sem intervenção (`PREP`, `OK`).
- `wizard.js`: assistente de 15 etapas (`STEPS`, cada uma com `render`/`validar`/`depois`) e `autoAvancar`, que confirma sozinho as etapas que a FDS responde por completo e para nas que exigem o analista.
- `docs.js` monta cada documento como **lista de blocos neutros** (`cover`, `h1`, `p`, `kv`, `table`, `list`, `check`, `callout`, `imgs`, `box`, `qr`, `sign`, `matrix`, `pagebreak`). `render.js` converte os blocos para HTML (pré-visualização/impressão), Word (`docx`) e texto; `pdf.js` converte para PDF direto (`pdfmake`). **Bloco novo exige suporte nos dois renderizadores** (`render.js` e `pdf.js`). `views.js` expõe o catálogo de documentos (`V.catalogo`), botões Word/PDF/pacote e todas as telas.
- Assinante e logo dos documentos: `Docs.signer(p)` (assinante da análise, senão o padrão em Configurações) e `O.Logo` (logo própria ou Orbit 360).

## Regras de negócio que não devem ser quebradas

- Gestão de mudança: o app **não executa o MOC** (feito em outro sistema); só levanta se é necessário (`Engine.mudancaSugestao`) e registra situação e referência (`p.mudanca`, etapa 12.3). MOC necessário e não concluído vira condicionante, nunca bloqueio. Produtos a granel não são vinculados a tanque (os tanques são multiuso). Compatibilidade em tanque e bacia não usa a NBR 17160 (que é de armazenamento embalado): usa a Seção 10 das FDS e consulta externa registrada pelo analista (CAMEO).
- Risco do armazém (`data/risco.js`): três lentes de severidade (pessoas, meio ambiente, processo e patrimônio/PSM) e uma probabilidade só. Classes pelo guia de classificação: Grave se severidade ≥ 4 ou score ≥ 12 (a severidade é soberana); Médio 6 a 11; Baixo 3 a 5; Desprezível ≤ 2. **PSIF só existe na lente de pessoas**: nunca marcar PSIF em ambiente nem em PSM. O nível do cenário é o da lente mais alta (`nivelCenario`). Campos do cenário: `sev` (pessoas), `sevAmb`, `sevPsm`, `prob`; dados antigos só têm `sev` e `prob`.
- O gatilho de reprovação automática (CMR e PFC) **só sinaliza**: nunca bloqueia nem dispensa etapas. A decisão é do responsável técnico, que registra justificativa; produto liberado com gatilhos ou pendências sai como "condicionado" e o relatório lista o que foi assumido (`dec.sobrepoe`). `Engine.rejeitaAuto` retorna sempre falso por esse motivo.
- A classe de armazenamento é o primeiro perigo aplicável no fluxograma do Anexo D; produtos a granel em tanque ficam fora da NBR 17160 (aplicam-se NBR 17505 e NR-20) e fora do quadro de compatibilidade.
- Só o que está **em estoque agora** entra nos cálculos de um local (segregação, quantidades-limite, checklist, análise de risco, quadros de compatibilidade): `Engine.emEstoque(p)`, `estoqueAtivo`, `registrarEntrada`, `registrarAjuste` e `registrarSaida` mantêm o histórico em `p.movs`. Regra estrita: só conta o que teve entrada registrada; produto sem `p.estoque` (registro antigo) não está em estoque. Na etapa 11 o usuário informa se o produto já está no terminal (`p.estoqueAgora`) e a quantidade, e a decisão de homologar registra a entrada (ou o ajuste) sozinha. A fila de homologação e as listas importadas nunca entram nos cálculos.
- Sem referência a nenhuma empresa específica no código ou nos documentos.
