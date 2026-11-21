# Conflitos com as branches em paralelo

A branch `feat/fluxo-pesquisas` foi feita ao mesmo tempo que `feat/senha-csv-metodologia` e
`feat/cadastros`, todas a partir da `main`. Para não depender delas, algumas peças foram
duplicadas aqui, de propósito, em arquivos locais de `src/features/`. Este documento lista o que
fazer em cada uma no merge.

Depois disso entrou na `main` o PR #24, com a tela de resposta do parceiro
(`ResponderPesquisaPage` e `RespostaEstabelecimento`). A branch foi rebaseada sobre ele: a tela do
parceiro é a da `main`, sem mudanças no código; esta branch só acrescenta testes a ela (FE-06,
erro de campo da API e falha ao carregar). A tela de resposta própria desta branch e o
`decimal.ts` foram apagados.

## Arquivos compartilhados que esta branch edita

| Arquivo | O que esta branch muda | Como resolver |
|---|---|---|
| `src/app/rotas.tsx` | Rotas `/pesquisas`, `/pesquisas/:id`, `/pesquisas/:id/campanhas/:campanhaId/respostas/:estabelecimentoId` e `/pesquisas/:id/campanhas/:campanhaId/previa` no grupo do ADMIN, e `/resultados/:campanhaId` para quem está logado. O grupo do PARCEIRO com `/pesquisas/responder` é o da `main` | Manter as rotas das três branches. Cada uma inclui entradas novas; não há rota repetida |
| `src/app/rotas.test.tsx` | Bloco no fim do arquivo, `ROTAS_DAS_PESQUISAS`, que confere cada rota nos três perfis e sem sessão | Manter os blocos das três. Se outra branch criar uma tabela parecida, juntar numa só |
| `src/lib/perfis.ts` e `perfis.test.ts` | Usa o `paginaPorPerfil` que veio da `main` e só troca o destino do ADMIN de `/pesquisas/nova` para `/pesquisas` | Manter essa troca e o item "Cadastros" (com o submenu) da `feat/cadastros` |
| `src/app/layout/layout.test.tsx` (testes do `NavMenu`) | "Pesquisas" vai para `/pesquisas` no ADMIN | Ficar com a versão desta branch nesse teste e manter os da `feat/cadastros` sobre "Cadastros". O `NavMenu.tsx` não mudou aqui |
| `src/api/rodadas.ts`, `src/api/respostas.ts` e `src/api/endpoints.test.ts` | `buscarRodada`, `prorrogarRodada`, `encerrarRodada`, `reabrirRodada` e `listarRespostasDaCampanha`, com os testes. `enviarResposta` e `buscarHistoricoDaResposta` são os da `main` | Só acréscimos: manter as funções e os testes de todas as branches |
| `src/api/resultados.ts` | `buscarPrevia`, `publicarCampanha` e `cancelarPublicacao`, no fim do arquivo | A `feat/senha-csv-metodologia` também acrescenta `baixarResultadoCsv` no fim: manter as quatro funções. O teste delas fica em `endpoints.test.ts` |
| `src/features/painel/pesquisas.ts` | Exporta `ultimaPublicacao(rodada)`, que já existia por dentro de `ultimasPublicadas`, para a lista de rodadas usar a mesma regra de "publicada" do painel | As outras branches não devem mexer aqui. Se mexerem, manter a função exportada |
| `README.md` | "Em desenvolvimento", "Funcionalidades", tabela de perfis, "Estrutura do projeto" e "Próximas tasks" (pendências das pesquisas e link para este documento) | Juntar à mão: as três branches acrescentam itens às mesmas listas. Tirar de "Ainda sem task definida" tudo o que alguma das branches entregou |

Arquivos que as outras branches editam e que esta **não** mudou: `src/api/client.ts`,
`src/api/client.test.ts`, `src/app/layout/NavMenu.tsx` e `src/app/layout/UserMenu.tsx`. Neles vale
a versão das outras branches. Os testes e2e desta branch ficam num arquivo novo,
`e2e/pesquisas.spec.ts`.

## Peças duplicadas

| Nesta branch | Na outra branch | No merge |
|---|---|---|
| `src/features/pesquisas/comum.module.css` (`.tabela`, `.botaoLink`, `.confirmacao`) | `Tabela` e `Dialogo` em `src/components/ui` (`feat/cadastros`) | Trocar as tabelas e a confirmação daqui pelos componentes de `ui` quando cobrirem o caso, e apagar as classes que sobrarem |
| `Confirmacao` em `src/features/pesquisas/components/Confirmacao.tsx`: bloco na própria página, sem `window.confirm`, usado para encerrar a pesquisa e cancelar a publicação | `Dialogo` em `src/components/ui` (`feat/cadastros`) | Pode continuar como está, ou passar a usar o `Dialogo` e apagar `Confirmacao.tsx`. Se trocar, manter o foco no diálogo ao abrir e de volta no botão que o abriu ("Encerrar pesquisa", "Cancelar publicação") ao fechar |
| `validarResposta` em `src/features/pesquisas/resposta.ts`, usada no lançamento pelo ADMIN. Já usa `errosDaResposta`, `lerNumero` e `paraRespostaRequest` da tela do parceiro (`src/features/pesquisas/respostas.ts`, da `main`) e só acrescenta o limite de 8 dígitos da diária | `lerDecimal` em `src/lib/numeros.ts`, nas branches `feat/senha-csv-metodologia` e `feat/cadastros` | Quando o `lerDecimal` entrar, decidir um leitor só para o projeto e trocar o `lerNumero` da `main` por ele. Esta branch não cria leitor próprio |
| `baixarCsvDoResultado` e `nomeDoArquivo` em `src/features/resultados/baixarCsv.ts` (+ teste): `fetch` próprio com o token de `lerToken()`, nome do arquivo pelo `Content-Disposition` e download por `URL.createObjectURL`. O botão "Baixar CSV" fica dentro de `ResultadoCampanhaPage.tsx` | Suporte a blob em `src/api/client.ts`, `baixarResultadoCsv` em `src/api/resultados.ts` e um componente de botão "Baixar CSV" (`feat/senha-csv-metodologia`) | Ficar com a versão da `feat/senha-csv-metodologia`: trocar `baixarCsvDoResultado` por `baixarResultadoCsv` (e o botão local pelo componente dela) em `ResultadoCampanhaPage.tsx`, levar os casos de `baixarCsv.test.ts` que faltarem e apagar `baixarCsv.ts`. A cópia daqui repete a leitura de `VITE_API_URL` e não avisa a sessão expirada num 401, porque `client.ts` não exporta isso; a versão do `client.ts` resolve os dois |
| `formatarDiaria` em `src/features/pesquisas/resposta.ts` ("R$ 410,50", com centavos) | `textoDaDiaria` em `src/features/pesquisas/respostas.ts` (`main`, "sem diária" quando vazio) e `formatarMoeda(valor, 2)` em `formatos.ts` (`feat/cadastros`) | Usar o `formatarMoeda(valor, 2)` quando a `feat/cadastros` entrar e apagar `formatarDiaria` |
| `src/features/pesquisas/components/SituacaoRodada.tsx` (selo neutro de rascunho e encerrada) | Nenhuma | Se o `Badge` ganhar uma variante neutra, usar ela e apagar o CSS local |

## Dependência do backend

A branch `feature/testes-cucumber` do backend (ainda fora da `main` dele) inclui em
`PendenciaResponse` os campos `respostasAte` e `aceitaResposta`: depois do prazo, o parceiro tem
uma tolerância configurável (30 dias) e, passado esse limite, só o ADMIN envia a resposta.

Esta branch segue o esquema atual, sem esses campos. O formulário do parceiro fica ativo enquanto
a rodada está aberta e, depois do prazo, mostra o erro da API sem apagar o que foi digitado.

Depois do merge no backend:

1. Rodar `npm run api:tipos` com a API no ar.
2. Usar `aceitaResposta` para desativar o formulário do parceiro e mostrar
   "Respostas até dd/mm/aaaa" com `respostasAte`.
3. Não calcular a tolerância no front: ela vem pronta da API.

A branch `fix/prazos-e-resultado` do backend (feita sobre a `feature/testes-cucumber`) muda
`GET /api/campanhas/{id}/resultado` e `resultado.csv`: campanha que existe mas não foi publicada
passa a responder 422, e 404 fica só para campanha inexistente. A `ResultadoCampanhaPage` desta
branch trata 404 como "ainda não publicada" (`naoPublicada`). Quando essa branch entrar no
backend, tratar 422 como "ainda não publicada" e 404 como "campanha não encontrada".
