# Conferência do conteúdo da ABNT NBR 17160:2024 no QUIM 360

Registro do que foi conferido contra o PDF da norma (exemplar licenciado) e do que ainda não foi transcrito.

| Item | Como foi conferido | Resultado |
| --- | --- | --- |
| Figura 1, matriz (300 células) | Cores lidas por pixel na página 26 e comparadas por programa com `data/nbr17160.js` | 297 coincidem; 3 células da última linha amostradas sobre a borda e confirmadas visualmente (permitido) |
| Figura 1, números das 62 células amarelas | Leitura visual da página 26, célula a célula | Coincidem |
| Figura 1, observações 1 a 8 | Comparadas com o texto da legenda (p. 26 e 27) | Reescritas com o texto da norma |
| Tabelas 3 e 4 | Comparadas com as páginas 27 e 28 | Reescritas com o texto da norma |
| Anexo D, fluxograma | Páginas 45 a 48 | Ordem e critérios coincidem; classe 9 não tem procedimento (D.10.2); classe 4.1 sem H228 exige análise individual (D.10.1) |
| Tabela 1 | Páginas 6 a 9 | Limites e seções coincidem; rótulos de H271 e H272 corrigidos |
| Tabela F.1 | Página 53 | Valores coincidem; "≥ 1 000 m²" consta na tabela |
| Tabela F.2 | Páginas 54 e 55 | Regra de prioridade corrigida (antes usava o maior valor por grupo, o que não é o que a tabela diz); F.2.3.3 (ensaio) incluído |

## Checklist por local (`js/data/nbr17160-req.js`)
142 requisitos condensados, cada um com o número do item, das Seções 5 a 14 (inclui 9.1.1.3 e 9.1.1.4) e dos Anexos B, C e E.

Conferência contra o PDF (reenviado em 17/11/2026):
- Todos os números e unidades dos itens das Seções 5 a 11, 14 e dos Anexos C e E foram comparados por programa com o parágrafo correspondente da norma: coincidem (as únicas diferenças são referências cruzadas a outros itens).
- Seções 12 e 13 e Anexo B, antes sem texto, foram transcritas e conferidas da mesma forma. A Tabela B.1 foi lida na imagem da página (a extração de texto a embaralha).
- Um item do app agrupa 14.3.8 e 14.3.9 a 14.3.11 (rotulado "14.3.8 e 14.3.9"); 6.2.8, 7.1.2, 10.1.2 e 14.2 (quantidades) ficam em `gatilhosLocal`, não no checklist.

Divergência da própria norma: o texto de 13.1.1 manda aplicar a Seção 13 a aerossóis acima de 20 kg, e a Tabela 1 diz 200 kg para H222 e H223. O app usa 20 kg (mais conservador) e mostra a nota.

Ainda não houve conferência por uma segunda pessoa, e os textos são condensados, não literais.
