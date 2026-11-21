# Plano de implementação

Três frentes do front, cada uma num worktree próprio. A implementação é feita por agentes Sonnet, e cada worktree tem um agente Opus que só verifica. A lista completa do que falta está em [`pendencias.md`](pendencias.md).

## Organização

| Worktree | Branch | Escopo | PR |
|---|---|---|---|
| WT-A | `feat/inventario` | Inventário do ADMIN (RF-06) | Entra primeiro |
| WT-B | `feat/meu-estabelecimento` | Meu estabelecimento do PARCEIRO (RF-07) | Empilhado sobre o WT-A |
| WT-C | `feat/painel-api` | Botões do cartão de pesquisas (RF-35) e painel com dados reais (T15) | Independente |

Cada worktree sai da `origin/main` com `--no-track`, para que um `git push` sem argumentos nunca vá para a `main`:

```bash
git worktree add --no-track -b feat/inventario ../wt-inventario origin/main
```

### Ciclo de cada etapa

1. O Sonnet implementa a etapa num commit, com os testes dela.
2. O Opus verifica (ver "Papel do verificador") e devolve "aprovado" ou uma lista de correções com arquivo e linha.
3. O Sonnet corrige: no mesmo commit, com `--fixup` e `rebase --autosquash`; ou num commit novo, se a correção for de outra natureza.
4. A etapa seguinte só começa depois do "aprovado".

### Regras para todos os agentes

- **Commits:** Conventional Commits em português, com a descrição em minúsculas, no imperativo e sem ponto final. Sem corpo nos tipos refactor, style, chore e build. Sem `Co-Authored-By` nem "Generated with Claude Code".
- **Push e PR:** os agentes não fazem push nem abrem PR. Isso é feito no fim, depois da revisão.
- **Telas:** sem Figma, seguir as páginas que já existem. Usar `Card`, `Tabela`, `Dialogo`, `Confirmacao`, `CampoTexto`, `Select`, `Badge`, `ErroApi`, `EstadoVazio`, `Carregando`, o cabeçalho de `comum.titulos` e o padrão de `useMutacaoCadastro`.
- **Arquivos:** não editar `schema.d.ts` à mão. Não mexer em arquivos fora do escopo do worktree, a não ser nos pontos de conflito previstos abaixo.

## WT-A: Inventário do ADMIN (`feat/inventario`)

O back está pronto:

- **Catálogo:** `/api/inventario/catalogo/completo`, `/grupos` e `/itens`, com criar, editar, inativar, reativar e excluir. Só ADMIN.
- **Inventário do estabelecimento:** `GET` e `PUT /api/estabelecimentos/{id}/inventario`. O corpo (`InventarioRequest`) é a lista de itens marcados, cada um com complemento opcional.

| Etapa | Commit | Conteúdo | Testes |
|---|---|---|---|
| A1 | `feat(api): adiciona as chamadas do catálogo e do inventário` | `src/api/inventario.ts` com catálogo, grupos, itens e o inventário do estabelecimento | `endpoints.test.ts`: método, URL e corpo |
| A2 | `feat(inventario): adiciona o editor de inventário do estabelecimento` | Componente compartilhado `src/features/inventario/EditorDeInventario.tsx` (detalhes abaixo) | Unitário: marcar, desmarcar, complemento, grupo exclusivo oculto e corpo enviado |
| A3 | `feat(cadastros): adiciona a tela do catálogo do inventário` | `/cadastros/inventario` (detalhes abaixo) | Unitário da página; `rotas.test.tsx` (só ADMIN); `layout.test.tsx` (submenu) |
| A4 | `feat(cadastros): adiciona o inventário de cada estabelecimento` | `/cadastros/estabelecimentos/:id/inventario`, com o `EditorDeInventario` e o link "Inventário de X" na linha do estabelecimento, como em "Capacidades" | Unitário da página; rota em `rotas.test.tsx` |
| A5 | `test(e2e): cobre o catálogo e o inventário do estabelecimento` | `e2e/inventario.spec.ts` com a API simulada: cria grupo e item, marca itens no estabelecimento e confere o corpo do PUT | Playwright |
| A6 | `docs(readme): documenta o inventário` | Funcionalidades e estrutura do README; tirar o inventário de "Ainda sem task definida" | |

O `EditorDeInventario` (A2):

- mostra os itens agrupados por categoria e grupo, com uma checkbox por item;
- tem campo de complemento quando o item tem `permiteComplemento`;
- recebe `ocultarExclusivosDaSecretaria`, para o uso pelo PARCEIRO;
- mostra quando o inventário foi atualizado (`inventarioAtualizadoEm`).

A tela do catálogo (A3) segue o padrão de "Referências":

- uma aba por categoria: Serviços e equipamentos, Acessibilidade e Sustentabilidade;
- cada grupo é um `Card` com a `Tabela` dos itens;
- grupo e item são editados em `Dialogo`, e a exclusão usa `Confirmacao`;
- a tela entra como item novo no submenu Cadastros.

O WT-B depende do A1 e do A2. Assim que o Opus aprovar o A2, o WT-B é avisado.

## WT-B: Meu estabelecimento do PARCEIRO (`feat/meu-estabelecimento`)

O back está pronto. Para o PARCEIRO:

- `GET /api/estabelecimentos` devolve só os estabelecimentos dele;
- `GET` e `PUT /{id}`, `POST /{id}/capacidades` e `GET` e `PUT /{id}/inventario` aceitam o perfil;
- o back esconde os grupos de inventário exclusivos da Secretaria;
- corrigir e excluir capacidade continuam só ADMIN.

| Etapa | Commit | Conteúdo | Testes |
|---|---|---|---|
| B1 | `feat(estabelecimento): adiciona a página meu estabelecimento do parceiro` | `/meu-estabelecimento`, só PARCEIRO (detalhes abaixo) | Unitário; `rotas.test.tsx` (só PARCEIRO) |
| B2 | `feat(estabelecimento): permite ao parceiro informar nova capacidade` | No mesmo card, capacidade vigente e histórico numa `Tabela` só de leitura, mais o botão "Informar nova capacidade" com o formulário de vigência de Capacidades. Sem corrigir nem excluir | Unitário: o POST e a ausência dos botões de corrigir e excluir |
| B3 | `feat(estabelecimento): permite ao parceiro preencher o inventário` | Começa depois do A2 aprovado, com rebase sobre a `feat/inventario`. Reusa o `EditorDeInventario` com `ocultarExclusivosDaSecretaria` | Unitário |
| B4 | `feat(layout): adiciona meu estabelecimento ao menu do parceiro` | Item no menu do usuário ou na navegação, só para PARCEIRO | `layout.test.tsx` e `perfis.test.ts` |
| B5 | `test(e2e): cobre a atualização do estabelecimento pelo parceiro` | `e2e/meu-estabelecimento.spec.ts`: edita dados, informa capacidade e marca o inventário | Playwright |
| B6 | `docs(readme): documenta meu estabelecimento` | README | |

A página do B1 tem um `Card` por estabelecimento, como em "Responder pesquisa". Os dados cadastrais e os da Secretaria aparecem em leitura. O botão "Editar dados" abre um `Dialogo` com o formulário de Cadastros > Estabelecimentos, limitado aos campos que o `AtualizacaoRequest` aceita.

O PR do WT-B é empilhado sobre o do WT-A (base `feat/inventario`). Quando o WT-A entrar, a base passa a ser a `main`.

## WT-C: botões do cartão de pesquisas e painel com dados reais (`feat/painel-api`)

### Decisões assumidas (sem Figma)

| # | Decisão |
|---|---|
| D2 | O filtro "Tipo de hospedagem" afeta só o que a API separa por tipo (`porTipo` do resultado). Os outros cartões mostram uma nota "todos os tipos" |
| D3 | A comparação usa o resultado publicado do mesmo mês no ano anterior. Sem ele, usa a série histórica (`/api/dashboard/serie-mensal`). Sem nenhum dos dois, a variação fica escondida, sem inventar zero. A variação da receita, sem fonte na API, fica escondida |
| D5 | "Exportar" vira um botão direto "Baixar CSV" da campanha selecionada |
| D7 | O PARCEIRO continua vendo o cartão de pendências que já existe |
| D8 | O código da rodada sai do texto do seletor de campanha |

### Etapas

| Etapa | Commit | Conteúdo | Testes |
|---|---|---|---|
| C1 | `feat(painel): liga os botões do cartão de pesquisas às telas` | Os três botões viram links com `comum.botaoLink` e perdem o aviso "em construção" (destinos abaixo) | `PesquisasParceirosCard.test.tsx` |
| C2 | `feat(painel): carrega as campanhas publicadas e as referências nos filtros` | `PainelFiltros` lê `/api/campanhas/publicadas` e `/api/referencias` com `useQuery`. A campanha padrão é a mais recente. Com o banco vazio, `EstadoVazio` no lugar do painel | `PainelFiltros.test.tsx` e `filtros.test.ts` |
| C3 | `feat(painel): mostra o resultado da campanha selecionada` | Hook `useResultadoDoPainel(campanhaId)` com `/api/campanhas/{id}/resultado`. Destaque, resumo, faixas, fluxo e desempenho por tipo passam a usar esse resultado, cada cartão com o próprio carregando e o próprio erro | Testes dos cartões com dados da API; página com erro num bloco só |
| C4 | `feat(painel): calcula a comparação com o ano anterior` | `Comparativo` montado pela regra do D3. O seletor "Comparar com" continua só com anos anteriores; o RF-26 completo depende do back | Unitário da regra: com publicada, com histórico e sem dado |
| C5 | `feat(painel): carrega a série mensal e os feriados` | `OcupacaoMensalCard` lê `/api/dashboard/serie-mensal`; `ExpectativaRealizadoCard` lê `/api/dashboard/feriados` nas modalidades EXPECTATIVA e CONSOLIDADA | Testes dos cartões |
| C6 | `feat(painel): usa o rhc e os parâmetros vigentes no fluxo de turistas` | `/api/rhc/vigente` e `/api/parametros-calculo/vigente` | `FluxoTuristasCard.test.tsx` |
| C7 | `feat(painel): aplica o filtro por tipo de hospedagem` | Conforme o D2 | Testes do filtro, incluindo tipo oculto por sigilo |
| C8 | `feat(painel): troca o exportar por baixar csv da campanha` | `BaixarCsvButton` da campanha selecionada (D5) | `PainelFiltros.test.tsx` |
| C9 | `refactor(painel): remove os dados fixos` | Apagar de `fixtures.ts` o que não é mais usado; o que só os testes usam vai para um arquivo de dados de teste | Suíte inteira |
| C10 | `test(e2e): cobre o painel com a api simulada` | `e2e/painel.spec.ts`: troca de campanha, filtro por tipo, CSV, banco vazio e erro num bloco | Playwright |
| C11 | `docs(readme): atualiza o painel e fecha as decisões d2, d3, d5, d7 e d8` | Tirar a T15 e a T16 de "Próximas tasks" e registrar as decisões | |

Destinos dos botões no C1:

- "Acompanhamento completo" leva a `/pesquisas/:id`;
- "Ver pendências" leva ao acompanhamento da rodada aberta;
- "Lançar resposta" também leva ao acompanhamento, onde o ADMIN escolhe o estabelecimento.

## Papel do verificador Opus

Depois de cada etapa, o Opus do worktree:

1. **Roda o mesmo que a CI:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Nas etapas de e2e, roda também `npx playwright test`.
2. **Confere o escopo:** o commit faz só o que a etapa pede e não mexe em arquivos de outro worktree fora dos conflitos previstos.
3. **Confere o padrão:** componentes de `ui`, cabeçalho e estrutura das páginas existentes, nenhuma função duplicada do que já existe em `lib/` ou `api/`, testes de acesso por perfil e mensagens em pt-BR.
4. **Confere o contrato com o back:** cada chamada bate com o `schema.d.ts` e com as permissões do controller. Exemplo: o PARCEIRO não vê os botões de corrigir e excluir capacidade.

O Opus não implementa. Ele devolve "aprovado" ou as correções com arquivo e linha.

No fim do worktree, o Opus ainda:

- revisa o branch inteiro contra a `origin/main`;
- roda `git rebase --exec "npx tsc -b" origin/main`, para garantir que cada commit compila sozinho.

## Conflitos previstos entre os worktrees

| Arquivo | WT-A | WT-B | WT-C | Como resolver |
|---|---|---|---|---|
| `src/app/rotas.tsx` e `rotas.test.tsx` | Rotas de inventário | `/meu-estabelecimento` | Não mexe | Só acréscimos; o WT-B resolve no rebase do B3 |
| `src/lib/perfis.ts` e `layout.test.tsx` | Item no submenu Cadastros | Item do PARCEIRO | Não mexe | Mesma coisa |
| `src/api/endpoints.test.ts` | Casos do inventário | Não mexe | Talvez casos do dashboard | Só acréscimos |
| `README.md` | Inventário | Meu estabelecimento | Painel e decisões | Quem entrar por último junta à mão |
| `src/features/painel/*` | Não mexe | Não mexe | Tudo | Sem conflito |

## Ordem de merge

1. **WT-C:** independente; pode entrar a qualquer momento.
2. **WT-A**.
3. **WT-B:** rebase sobre a `main` depois do WT-A, com a base do PR trocada para `main`.

No fim de cada worktree, o parecer final do Opus é conferido e a verificação roda de novo antes do push e do PR.
