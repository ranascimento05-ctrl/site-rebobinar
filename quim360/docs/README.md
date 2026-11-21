# Documentação do QUIM 360

Esta pasta guarda a documentação do projeto: o que foi conferido contra as normas, a metodologia de risco, as regras de negócio e o registro das decisões. O app em si não lê nada daqui.

## Conteúdo

| Arquivo | O que é |
|---|---|
| `REGRAS-DO-PROJETO.md` | Regras de negócio que não devem ser quebradas, com o motivo de cada uma. A versão curta, que o assistente de código lê sozinho, fica no `CLAUDE.md` da raiz do repositório. |
| `DECISOES.md` | Registro das decisões tomadas pelo responsável do projeto, por tema, com o que foi descartado e por quê. |
| `conferencia/CONFERENCIA-NBR17160.md` | O que foi conferido contra o PDF da NBR 17160:2024 (matriz de segregação, Tabelas 1, 3, 4, F.1 e F.2, observações, requisitos). |
| `conferencia/LISTA-DE-CONFERENCIA.docx` | Tabelas e requisitos transcritos da norma e a base técnica própria do app, com coluna para o especialista conferir e assinar. |
| `metodologia/GUIA-CLASSIFICACAO-RISCO-LENTES-AMBIENTAL-PSM.docx` | Guia qualitativo de classificação de risco adaptado às lentes de meio ambiente e PSM (sem PSIF), mantendo integralmente a lente de pessoas. |

## Onde colocar documentos novos

- Conferência de tabelas ou requisitos de norma: `conferencia/`.
- Metodologia, critérios e guias (risco, compatibilidade, classificação): `metodologia/`.
- Nova regra de negócio: `REGRAS-DO-PROJETO.md` e, em versão curta, `CLAUDE.md`.
- Nova decisão do responsável: `DECISOES.md`.

## Observações

- Os documentos que o app **gera** (relatório de homologação, dossiês, plano de ação, fichas e demais) são produzidos na hora, em Word, PDF e tela, a partir dos dados do navegador. Eles não ficam nesta pasta: o que fica aqui é a base que os sustenta.
- A `LISTA-DE-CONFERENCIA.docx` é gerada por um script (`mk_lista.py`) a partir de um dump das tabelas do app. Se as tabelas mudarem, ela precisa ser regerada e conferida de novo.
- Normas licenciadas (NBR 17160 e demais) são de uso interno. Estes documentos citam itens e transcrevem tabelas conferidas; não devem ser entregues fora da organização sem verificar a licença.
