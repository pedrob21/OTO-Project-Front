# Conflitos com as branches em paralelo

A branch `feat/fluxo-pesquisas` foi feita ao mesmo tempo que `feat/senha-csv-metodologia` e
`feat/cadastros`, todas a partir da `main`. Para não depender delas, algumas peças foram
duplicadas aqui, de propósito, em arquivos locais de `src/features/`. Este documento lista o que
fazer em cada uma no merge.

## Arquivos que as três branches editam

| Arquivo | O que esta branch muda | Como resolver |
|---|---|---|
| `src/app/rotas.tsx` | Rotas `/pesquisas` e `/pesquisas/:id` dentro do grupo `RequirePerfil perfis={['ADMIN']}` | Manter as rotas das três branches. Cada uma inclui entradas novas; não há rota repetida |
| `src/app/rotas.test.tsx` | Bloco no fim do arquivo, `ROTAS_DAS_PESQUISAS`, que confere cada rota nos três perfis e sem sessão | Manter os blocos das três. Se outra branch criar uma tabela parecida, juntar numa só |
| `src/lib/perfis.ts` e `perfis.test.ts` | Item "Pesquisas" aponta para `/pesquisas` | Manter a linha desta branch no item "Pesquisas" e a da `feat/cadastros` no item "Cadastros" |
| `src/app/layout/layout.test.tsx` | O link "Pesquisas" do ADMIN agora vai para `/pesquisas` | Ficar com a versão desta branch nesse teste |
| `src/api/rodadas.ts` e `src/api/endpoints.test.ts` | `buscarRodada`, `prorrogarRodada`, `encerrarRodada` e `reabrirRodada`, com os testes | Só acréscimos: manter as funções e os testes de todas as branches |
| `README.md` | "Funcionalidades" e "Próximas tasks" | Juntar as listas à mão |

## Peças duplicadas

| Nesta branch | Na outra branch | No merge |
|---|---|---|
| `src/features/pesquisas/comum.module.css` (`.tabela`, `.botaoLink`, `.confirmacao`) | `Tabela` e `Dialogo` em `src/components/ui` (`feat/cadastros`) | Trocar as tabelas e a confirmação daqui pelos componentes de `ui` quando cobrirem o caso, e apagar as classes que sobrarem |
| Confirmação de encerramento em `src/features/pesquisas/components/AcoesDaRodada.tsx` (bloco na própria página, sem `window.confirm`) | `Dialogo` em `src/components/ui` (`feat/cadastros`) | Pode continuar como está, ou passar a usar o `Dialogo`. Se trocar, manter o foco no diálogo ao abrir e de volta no botão "Encerrar pesquisa" ao fechar |
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
