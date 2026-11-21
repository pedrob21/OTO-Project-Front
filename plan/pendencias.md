# O que falta no front e no back

Levantamento feito a partir do Documento de Requisitos e do Plano de Testes, comparando com a `main` dos dois repositórios em 21/11/2026 (front depois do #27, back em `02587e9`). Não há telas no Figma: tudo segue a estrutura das páginas que já existem.

## Front

### Pode ser feito já, por ordem de prioridade

| # | Item | Requisito (prioridade) | Base nas páginas existentes |
|---|---|---|---|
| 1 | Ligar os botões "Acompanhamento completo", "Ver pendências" e "Lançar resposta" do cartão de pesquisas do painel | RF-35 (Should) | Links para o acompanhamento e o lançamento, que já existem |
| 2 | Painel com dados reais (T15): seletor de campanha, filtro por tipo, destaque, resumo, ocupação mensal, faixas, fluxo, expectativa x realizado e desempenho por tipo | RF-25, RF-27 a RF-34 (Must e Should) | Os componentes já existem; trocar `fixtures.ts` pelas chamadas, como no cartão de pesquisas |
| 3 | Inventário do ADMIN: catálogo de grupos e itens e o inventário de cada estabelecimento | RF-06 (Must) | Catálogo como "Referências" (abas, tabela e diálogo); inventário do estabelecimento como "Capacidades" |
| 4 | Área Relatórios: campanhas publicadas com link para o resultado e "Baixar CSV" | RF-24 (Must) e RF-39 (Should) | Lista igual à de rodadas, com o `BaixarCsvButton` |
| 5 | Área Indicadores: série por indicador e tipo, em gráfico e tabela | RF-24 (Must) | `OcupacaoMensalCard` e filtros do painel |
| 6 | Meu estabelecimento do PARCEIRO: dados, nova capacidade e inventário | RF-07 (Should) | Formulários de Cadastros, um card por estabelecimento como em "Responder pesquisa" |
| 7 | Diárias informadas pela equipe na prévia (`/api/campanhas/{id}/diarias`) | RF-18 a RF-21 | Um bloco a mais na `PreviaPage` |
| 8 | Responsividade em 360 px e tablet, incluindo tabelas e diálogos | RNF-01 | Ajustes de CSS |
| 9 | Acessibilidade: `vitest-axe` nas páginas e correções AA | RNF-06 e FE-10 | Um teste por página |
| 10 | E2E-08 (sessão expirada e botão voltar) e checagem do `schema.d.ts` na CI | E2E-08 e FE-09 | Padrão dos specs atuais |
| 11 | Otimização: código dividido por rota, favicon e Lighthouse | T18 | |

Telas inteiras que ainda não existem: Inventário (ADMIN), Meu estabelecimento (PARCEIRO), Indicadores e Relatórios.

Decisões em aberto do README que o front pode fechar sozinho, sem Figma:

- **D2:** o filtro por tipo afeta só o que a API separa por tipo.
- **D3:** sem fonte na API, o bloco ou a variação fica escondido.
- **D5:** "Exportar" vira um botão direto de CSV.
- **D7:** o PARCEIRO continua com o cartão de pendências.
- **D8:** o código da rodada sai do texto dos filtros.

### Depende do back

| Item | Requisito (prioridade) | O que falta no back |
|---|---|---|
| Boletim em PDF | RF-37 (Must) | Endpoint de geração |
| Indicadores semestrais | RF-40 (Must) | Período semestral |
| "Comparar com" mês anterior e média histórica do mês | RF-26 (Must) | As duas comparações |
| Prazo do parceiro com `aceitaResposta` e `respostasAte` | RF-12 (Must) | Merge do PR #3 do back, depois `npm run api:tipos` |
| Resultado com 422 para campanha não publicada e 404 para inexistente | RF-23 | Merge do PR #4 do back |
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

## Back

| # | Item | Requisito (prioridade) | Situação |
|---|---|---|---|
| 1 | Boletim em PDF no formato dos boletins da Secretaria | RF-37 (Must) | Não existe |
| 2 | Indicadores semestrais de ocupação e fluxo | RF-40 (Must) | `TipoPeriodo` só tem MENSAL e FERIADO |
| 3 | "Comparar com" mês anterior e média histórica do mês | RF-26 (Must) | Só existe o mesmo mês do ano anterior |
| 4 | Link de resposta por parceiro e campanha, para WhatsApp e e-mail | RF-11 (Must) | O link existente é só o de convite e senha do usuário |
| 5 | Merge do PR #3: Cucumber com REST Assured e Testcontainers (F01 a F13) e `aceitaResposta`/`respostasAte` na pendência | Plano de Testes e RF-12 | PR aberto |
| 6 | Merge do PR #4: prazos das rodadas validados e 422 para campanha não publicada | RF-14 e RF-21 | PR aberto, empilhado sobre o #3 |
| 7 | Testes de integração TI-01 (subida com validação das entidades) e TI-02 (consultas de vigência no banco real) | Plano de Testes | Entram com o Testcontainers do PR #3 |
| 8 | Exportar Excel (.xlsx) com indicadores e segmentos por categoria | RF-38 (Should) | Não existe |
| 9 | Importar inventário em lote a partir de planilha | RF-08 (Could) | Só existe a importação do histórico |
| 10 | Módulo de pesquisas genérico com perfil Pesquisador de Campo | RF-17 (Could) | Não existe; fora do escopo atual |

A confirmar com o cliente: não existe "esqueci minha senha" para o próprio usuário. Só o ADMIN gera o link de redefinição, e a E2E-11 assume esse fluxo.

## Divergências do Plano de Testes com o código

O Plano de Testes e o RNF-02 falam em React Native com Jest, RNTL, MSW e Maestro. O front é React web com Vite, Vitest, Testing Library, `fetch` simulado e Playwright, e a sessão fica no `sessionStorage` em vez do armazenamento seguro do aparelho (FE-04). O documento precisa ser atualizado para a stack atual.
