# O que falta no front e no back

Levantamento feito a partir do Documento de Requisitos e do Plano de Testes, comparando com a `main` dos dois repositórios em 21/11/2026 (front depois do #27, back em `692e28b`). Não há telas no Figma: tudo segue a estrutura das páginas que já existem.

## Front

-

### Depende do back

| Item | Requisito (prioridade) | O que falta no back |
|---|---|---|
| Boletim em PDF no formato da Secretaria | RF-37 (Must) | Endpoint de geração. Enquanto isso, o resultado tem "Gerar relatório (PDF)" pela impressão do navegador |
| Indicadores semestrais | RF-40 (Must) | Período semestral |
| "Comparar com" mês anterior e média histórica do mês | RF-26 (Must) | As duas comparações |
| Exportar Excel | RF-38 (Should) | Endpoint `.xlsx` |
| Inventário em lote | RF-08 (Could) | Endpoint de importação |
| Link de resposta por parceiro e campanha | RF-11 (Must) | Endpoint e regra do link |

### Já entregue

| Requisito | PR |
|---|---|
| RF-01: login, definir senha e trocar senha | #23 |
| RF-03, RF-06 (estabelecimentos e capacidades), RF-09 e RF-22: Cadastros | #25 |
| RF-10, RF-14, RF-15, RF-16 e RF-18 a RF-21: lista de rodadas, acompanhamento, lançamento pelo ADMIN, prévia e publicação | #26 |
| RF-12 e RF-13: resposta do parceiro | #24 |
| RF-23 e RF-39: resultado da campanha com sigilo e CSV | #26 e #23 |
| RF-36: metodologia | #23 |
| Remoção das duplicações entre pesquisas e cadastros | #27 |
| RF-12: bloqueio do parceiro depois do limite de resposta (`aceitaResposta` e `respostasAte`) | `feat/plano-essencial` |
| RF-23: resultado com 422 (não publicada) e 404 (inexistente) | `feat/plano-essencial` |
| RF-24 e RF-39: Relatórios com filtros, CSV e versão para impressão em PDF | `feat/plano-essencial` |
| RF-24: Indicadores mês a mês e por feriado, em gráfico e tabela | `feat/plano-essencial` |
| RNF-01 e RNF-06 (parte): menu recolhível, telas do parceiro em 360 px e tablet, axe-core nos testes | `feat/plano-essencial` |
| RF-18 a RF-21: diárias informadas pela equipe na prévia (incluir, corrigir e remover) | `test/e2e-suite` |
| RNF-06 e FE-10: axe-core em todas as telas (unitário) e no navegador com contraste (`e2e/acessibilidade.spec.ts`), painel e responder pesquisa sem rolagem lateral em 360 px | `test/e2e-suite` |
| FE-09: teste de contrato dos caminhos e métodos de `src/api` contra o `schema.d.ts` | `test/e2e-suite` |
| Favicon, `meta description` e tabelas de Indicadores roláveis por teclado | `test/e2e-suite` |
| T18 (parte): Lighthouse no CI (celular e desktop, 5 páginas, com limites) e comentário do PR com badges de cobertura e Lighthouse | `test/e2e-suite` |
| E2E-01, 04, 05, 08, 09 e 10 automatizados no Playwright; painel passa a consultar parâmetros e RHC pela data do fim do período | `test/e2e-suite` |
| RNF-01: telas do ADMIN sem rolagem lateral em 360 px e tablet, incluindo diálogos de Cadastros, coberto em `e2e/acessibilidade.spec.ts` | #34 |
| T18 (parte): CLS do painel no celular de 0,16 para 0,01 (fallback de fonte com `size-adjust`, preload e altura mínima no carregamento); pacote analisado, sem ganho óbvio (principal em 129 kB gzip, rotas até 19 kB) | #34 |

## Back

| # | Item | Requisito (prioridade) | Situação |
|---|---|---|---|
| 1 | Boletim em PDF no formato dos boletins da Secretaria | RF-37 (Must) | Não existe |
| 2 | Indicadores semestrais de ocupação e fluxo | RF-40 (Must) | `TipoPeriodo` só tem MENSAL e FERIADO |
| 3 | "Comparar com" mês anterior e média histórica do mês | RF-26 (Must) | Só existe o mesmo mês do ano anterior |
| 4 | Link de resposta por parceiro e campanha, para WhatsApp e e-mail | RF-11 (Must) | O link existente é só o de convite e senha do usuário |
| 5 | Exportar Excel (.xlsx) com indicadores e segmentos por categoria | RF-38 (Should) | Não existe |
