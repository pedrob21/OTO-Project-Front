# Plano: fechar as lacunas do Plano de Testes no front

Base: `Plano de Testes - OTO.pdf` (seções 6, 7 e 8), `plan/pendencias.md` e a `main` em `4fddb9f` (#32), já mesclada na branch `test/e2e-suite`.

O plano descreve o app como React Native (Jest, RNTL, MSW, Maestro). O front real é React web com Vitest, Testing Library e Playwright. O critério é o objetivo de cada caso, não a ferramenta.

## Situação medida

- Vitest: 857 testes passando. Cobertura medida com `@vitest/coverage-v8` (instalado nesta rodada): 98,3% de linhas, 92,1% de branches, 96,9% de funções. A cobertura ainda não está configurada no `vite.config.ts` nem no CI.
- Playwright: 96 testes passando antes do merge, mais os specs de relatórios e indicadores vindos da `main`.
- Arquivos com menos de 92% de linhas: `FormularioResposta.tsx` (73%), `CapacidadeDoEstabelecimento.tsx` (83%), `MetodologiaPage.tsx` (87,5%), `HistoricoFormulario.tsx` (90%), `MeuEstabelecimentoCard.tsx` (90,6%), `MeuEstabelecimentoPage.tsx` (90,9%), `EstabelecimentoFormulario.tsx` (90,9%), `RelatoriosPage.tsx` (91,3%). `main.tsx` fica fora da medição.

## Lacunas a fechar

| ID     | Lacuna                                                                                                      | Tamanho  | Agente |
| ------ | ----------------------------------------------------------------------------------------------------------- | -------- | ------ |
| COB    | Configurar cobertura (script, limites, CI, `.gitignore`) e subir os arquivos fracos                         | simples  | Sonnet |
| FE-10a | axe-core nas telas que ainda não o usam (cadastros, pesquisas, login, painel, metodologia, minha senha)     | simples  | Sonnet |
| FE-09  | Teste de contrato: todo caminho usado em `src/api/*.ts` existe em `schema.d.ts`                             | simples  | Sonnet |
| DIA    | Tela faltando: diárias informadas pela equipe na prévia (`/api/campanhas/{id}/diarias`, RF-18 a RF-21, F08) | complexa | Opus   |
| E2E-05 | Correção depois de publicar: novo valor no painel e no CSV                                                  | complexa | Opus   |
| E2E-10 | Parâmetros e RHC: vale a vigência do fim do período                                                         | complexa | Opus   |
| FE-10b | axe-core no navegador (`@axe-core/playwright`), com contraste, e correção dos tokens se falhar              | complexa | Opus   |
| E2E-01 | Primeiro acesso do parceiro: define a senha, entra e vê só o seu estabelecimento                            | simples  | Sonnet |
| E2E-04 | Perfis e sigilo: acesso negado a estabelecimento alheio, tipo com poucos respondentes sem números           | simples  | Sonnet |
| E2E-08 | Sessão expirada no meio do uso volta ao login; botão voltar não reabre telas                                | simples  | Sonnet |
| E2E-09 | Item novo do catálogo aparece no inventário do estabelecimento                                              | simples  | Sonnet |

Fora do escopo, por decisão do usuário ou por depender do back: E2E-11 (senha esquecida), boletim em PDF, indicadores semestrais, comparações extras do painel, exportação Excel, inventário em lote, link de resposta por parceiro.

## Ondas

Os agentes rodam no mesmo diretório. Para não colidirem, cada um é dono de arquivos próprios e o Playwright usa porta e pasta de build próprias (`E2E_PORT`, ver `playwright.config.ts`).

**Onda 1 (sem Playwright):** COB, FE-10a, FE-09 e a parte de código e unitários de DIA.

- COB é dona de `vite.config.ts`, `package.json` (só scripts), `.github/workflows/ci.yml`, `.gitignore` e dos testes novos dos arquivos fracos.
- FE-10a escreve só arquivos novos `*.acessibilidade.test.tsx`.
- FE-09 escreve só `src/api/contrato.test.ts`.
- DIA é dona de `PreviaPage.tsx`, componentes novos da prévia, `src/api/respostas.ts` ou `resultados.ts` (o que já tratar a prévia) e dos testes da prévia.

**Onda 2 (Playwright em paralelo, portas 4174 a 4176):**

- Opus A: e2e de DIA, E2E-05 e E2E-10, em `e2e/previa-diarias.spec.ts`, `e2e/correcao-publicacao.spec.ts` e `e2e/vigencia-periodo.spec.ts` (porta 4174).
- Sonnet B: E2E-01, E2E-04, E2E-08 e E2E-09, em `e2e/jornadas-parceiro.spec.ts`, `e2e/sessao.spec.ts` e `e2e/catalogo-no-inventario.spec.ts` (porta 4175).
- Opus C: FE-10b em `e2e/acessibilidade.spec.ts`, dono de `package.json` (dependência) e dos tokens CSS (porta 4176).

**Fechamento:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` com cobertura e `npm run test:e2e`, tudo verde. Atualizar `plan/pendencias.md`.

## Regras comuns

- Sem commit. O usuário decide.
- Texto de interface e testes em português, como o resto do código. Sem comentários, a menos que a lógica seja não óbvia. Casar com o estilo do arquivo. Não refatorar fora do escopo.
- Nos e2e, seguir o padrão dos specs existentes: API simulada com `page.route`, sessão injetada no `sessionStorage` e data fixa com `page.clock.setFixedTime` quando a tela depende do dia.
- Um teste só vale se falharia com o comportamento errado. Nada de asserção vazia.
- Rodar só os arquivos próprios durante o trabalho e a suíte inteira no fim.

## Critério de aceite

Os 21 itens aplicáveis do plano (FE-01 a FE-10 e E2E-01 a E2E-11, menos E2E-11) com cobertura completa, cobertura de linhas do vitest com limite configurado no CI e suíte inteira verde.

## Resultado (22/11/2026)

Todas as lacunas da tabela foram fechadas, exceto E2E-11 (fora do escopo).

- Vitest: 95 arquivos, 1032 testes. Cobertura: 99,26% de linhas, 93,02% de branches, 98,74% de funções, 98,87% de statements. Limites no `vite.config.ts` (linhas 98, funções 97, statements 98, branches 92), aplicados no CI por `npm run test:coverage`.
- Playwright: 188 testes nos projetos chromium, celular e tablet, todos passando.
- DIA: bloco "Diárias informadas pela equipe" na prévia. A API só tem GET e PUT, então remover é um PUT sem o item.
- FE-10b: o axe no navegador achou 2 violações reais (nome acessível dos botões de grupo do inventário e tabela com rolagem sem acesso por teclado) e 2 estouros de largura em 360 px (painel e responder pesquisa). Todos corrigidos. Contraste: nenhuma violação.
- E2E-10: o painel consultava a vigência pelo início do período. Corrigido para o fim, como o back (`BaseCalculo`) e o plano exigem.
- Cache: a prévia agora invalida a lista de campanhas publicadas ao publicar e ao cancelar a publicação.
- `e2e/navegacao.ts`: `semRolagemHorizontal` passou a comparar com a largura do viewport. Antes, nos projetos de celular, `innerWidth` crescia junto com o conteúdo e o teste nunca falhava.

- `IndicadoresPage.tsx`: as tabelas de rolagem lateral também ganharam acesso por teclado.
- Quality Gate do SonarCloud: duplicação em código novo caiu de 5,4% para 0,9% com fixtures e helpers compartilhados, o bug do `sort` sem comparação foi corrigido e as vulnerabilidades do job do Lighthouse (log sem sanitizar e `npm ci` sem `--ignore-scripts`) foram resolvidas.
- Lighthouse no CI (`lighthouserc.cjs`, `lighthouse/servidor.mjs`): 5 páginas em celular e desktop. Acessibilidade e boas práticas abaixo de 0,95 reprovam o job, o restante só avisa. Com a `meta description`, o SEO subiu de 91 para 100.
- O job `resumo` comenta no PR, e atualiza a cada push, badges e tabelas de cobertura e Lighthouse (`scripts/resumo-pr.mjs`).
