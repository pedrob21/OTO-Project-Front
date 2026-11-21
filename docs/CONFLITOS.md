# Conflitos com as branches em paralelo

A branch `feat/fluxo-pesquisas` foi feita ao mesmo tempo que `feat/senha-csv-metodologia` e
`feat/cadastros`, todas a partir da `main`. Para não depender delas, algumas peças foram
duplicadas aqui, de propósito, em arquivos locais de `src/features/`. Este documento lista o que
fazer em cada uma no merge.

## Arquivos que as três branches editam

| Arquivo | O que esta branch muda | Como resolver |
|---|---|---|
| `src/app/rotas.tsx` | Rotas `/pesquisas`, `/pesquisas/:id`, `/pesquisas/:id/campanhas/:campanhaId/respostas/:estabelecimentoId` e `/pesquisas/:id/campanhas/:campanhaId/previa` no grupo do ADMIN, um grupo novo `RequirePerfil perfis={['PARCEIRO']}` com `/pesquisas/responder`, e `/resultados/:campanhaId` para quem está logado | Manter as rotas das três branches. Cada uma inclui entradas novas; não há rota repetida. Se outra branch também criar um grupo só do PARCEIRO, juntar os dois |
| `src/app/rotas.test.tsx` | Bloco no fim do arquivo, `ROTAS_DAS_PESQUISAS`, que confere cada rota nos três perfis e sem sessão | Manter os blocos das três. Se outra branch criar uma tabela parecida, juntar numa só |
| `src/lib/perfis.ts` e `perfis.test.ts` | Campo novo `paraPorPerfil` em `ItemMenu` (destino próprio de um perfil) e item "Pesquisas" com `para: '/pesquisas'` e `paraPorPerfil: { PARCEIRO: '/pesquisas/responder' }`, sem `perfisDaPagina`. `itensDoPerfil` passou a resolver `paraPorPerfil` | Manter o item "Pesquisas" e o `paraPorPerfil` desta branch, e o item "Cadastros" (com o submenu) da `feat/cadastros`. Se a `feat/cadastros` mudou o `map` de `itensDoPerfil`, juntar as duas mudanças: o submenu dela e a troca de destino por perfil daqui |
| `src/app/layout/layout.test.tsx` (testes do `NavMenu`) | "Pesquisas" vai para `/pesquisas` no ADMIN e para `/pesquisas/responder` no PARCEIRO, que deixou de ver o item desativado | Ficar com a versão desta branch nesses dois testes e manter os da `feat/cadastros` sobre "Cadastros". O `NavMenu.tsx` não mudou aqui |
| `src/api/rodadas.ts`, `src/api/respostas.ts` e `src/api/endpoints.test.ts` | `buscarRodada`, `prorrogarRodada`, `encerrarRodada`, `reabrirRodada`, `enviarResposta`, `listarRespostasDaCampanha` e `buscarHistoricoDaResposta`, com os testes | Só acréscimos: manter as funções e os testes de todas as branches |
| `src/api/resultados.ts` | `buscarPrevia`, `publicarCampanha` e `cancelarPublicacao`, no fim do arquivo | A `feat/senha-csv-metodologia` também acrescenta `baixarResultadoCsv` no fim: manter as quatro funções. O teste delas fica em `endpoints.test.ts` |
| `README.md` | "Funcionalidades" e "Próximas tasks" | Juntar as listas à mão |

## Peças duplicadas

| Nesta branch | Na outra branch | No merge |
|---|---|---|
| `src/features/pesquisas/comum.module.css` (`.tabela`, `.botaoLink`, `.confirmacao`) | `Tabela` e `Dialogo` em `src/components/ui` (`feat/cadastros`) | Trocar as tabelas e a confirmação daqui pelos componentes de `ui` quando cobrirem o caso, e apagar as classes que sobrarem |
| `Confirmacao` em `src/features/pesquisas/components/Confirmacao.tsx`: bloco na própria página, sem `window.confirm`, usado para encerrar a pesquisa e cancelar a publicação | `Dialogo` em `src/components/ui` (`feat/cadastros`) | Pode continuar como está, ou passar a usar o `Dialogo` e apagar `Confirmacao.tsx`. Se trocar, manter o foco no diálogo ao abrir e de volta no botão que o abriu ("Encerrar pesquisa", "Cancelar publicação") ao fechar |
| `lerNumeroDecimal` e `decimalParaTexto` em `src/features/pesquisas/decimal.ts` (+ `decimal.test.ts`). Lê "80,5" e "80.5" como 80.5, recusa mais de duas casas e devolve `{ tipo: 'vazio' \| 'numero' \| 'invalido' }` | `lerDecimal` em `src/lib` (`feat/senha-csv-metodologia`) e, talvez, um leitor de decimal na `feat/cadastros` | Ficar com o `lerDecimal` de `src/lib`. Trocar as chamadas em `src/features/pesquisas/resposta.ts` (adaptar o retorno: o daqui separa campo vazio de inválido, e a diária é opcional), levar os casos de `decimal.test.ts` que faltarem para o teste dele e apagar `decimal.ts`. Manter `decimalParaTexto` se o `src/lib` não tiver equivalente |
| `baixarCsvDoResultado` e `nomeDoArquivo` em `src/features/resultados/baixarCsv.ts` (+ teste): `fetch` próprio com o token de `lerToken()`, nome do arquivo pelo `Content-Disposition` e download por `URL.createObjectURL`. O botão "Baixar CSV" fica dentro de `ResultadoCampanhaPage.tsx` | Suporte a blob em `src/api/client.ts`, `baixarResultadoCsv` em `src/api/resultados.ts` e um componente de botão "Baixar CSV" (`feat/senha-csv-metodologia`) | Ficar com a versão da `feat/senha-csv-metodologia`: trocar `baixarCsvDoResultado` por `baixarResultadoCsv` (e o botão local pelo componente dela) em `ResultadoCampanhaPage.tsx`, levar os casos de `baixarCsv.test.ts` que faltarem e apagar `baixarCsv.ts`. A cópia daqui repete a leitura de `VITE_API_URL` e não avisa a sessão expirada num 401, porque `client.ts` não exporta isso; a versão do `client.ts` resolve os dois |
| `formatarDiaria` em `src/features/pesquisas/resposta.ts` ("R$ 410,50", com centavos) | Nenhuma | Se `formatos.ts` ganhar moeda com centavos, usar ela |
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
