# Registro de decisões

Decisões do responsável do projeto, por tema. Cada item diz o que foi decidido e o que foi descartado.

## Postura do app
- Gatilho de reprovação (CMR e PFC) **só sinaliza**; a decisão é do responsável técnico com justificativa. Descartado: reprovação automática que bloqueia.
- Sem "engessar": o app aponta, o responsável decide.

- PGR "não requer atualização" sem parecer é permitido com justificativa registrada. Descartado: exigir parecer anexo para dispensar a atualização do PGR.

## Estoque
- Regra **estrita**: só conta o que teve entrada registrada. Descartado: tratar produtos antigos como em estoque. A lista importada da era FISPQ é fila de trabalho, não estoque.

## Publicação e dados
- O app roda **localmente**; nada será publicado (TI fechada, risco de LGPD). Descartado: hospedar em site público.
- Dados no navegador, com backup em arquivo; migrado para IndexedDB por causa do limite do localStorage (FDS reais completas passam de dezenas de produtos).
- O e-mail pessoal padrão foi removido; o e-mail das ações abre o programa de e-mail do usuário.

## Risco
- Matriz de risco do guia, adaptada às lentes de **meio ambiente** e **PSM**. **PSIF não se aplica** a essas lentes.
- Critérios ambientais e de PSM propostos pelo assistente: a validar pelo responsável.

## Tanques e granel
- **NR-13 e gerenciador de integridade ficam fora** do app.
- **MOC fica fora do app**: o app só levanta se é necessário e registra se foi feito.
- Tanques **multiuso**: sem cativação de produto a tanque; perfil de exigências do produto para qualquer tanque.
- Compatibilidade no terminal: **não usar a NBR 17160** nem como aproximação. Usar Seção 10 das FDS e consulta externa (CAMEO) registrada com fonte e data.
- Bacias de contenção cadastradas só com a lista de produtos de cada uma (e prazo de atualização).

## Documentos
- Dossiê de evidência por **local** e do **terminal**, em versão **completa** e **resumida** (cliente ou órgão).
- Lista de inspeção em campo para imprimir; modelo de planilha para a fila de homologação.
- Plano de ação: cada ação pode ser editada (texto) ou eliminada (com motivo registrado e possibilidade de restaurar).
- Logotipo editável: inserir, trocar, tirar ou voltar ao padrão.

## Citação legal
- Resolução ANTT 5.947/21 (revogada) substituída por **5.998/2022**.

## Pendências
- Ficha de emergência por número ONU: aguarda o ERG ou o manual da ABIQUIM enviado pelo usuário.
- Checklist de tanques: aguarda a NBR 17505-2 e a NR-20.
- Revisão por especialista das bases próprias (alternativas, cenários, escalas) e abertura dos `.docx` no Word real.
