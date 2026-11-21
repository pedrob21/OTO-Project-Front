# Duplicações e pendências do fluxo de pesquisas

As branches `feat/fluxo-pesquisas`, `feat/cadastros` e `feat/senha-csv-metodologia` foram feitas em
paralelo, e a de pesquisas duplicou de propósito algumas peças das outras duas. As três já estão
na `main` e os conflitos de merge foram resolvidos. O download do CSV já foi unificado: a página
de resultado usa `BaixarCsvButton` e `baixarResultadoCsv`, e a cópia local foi apagada. O que
segue ainda está duplicado ou depende do backend.

## Peças duplicadas

| Em pesquisas | Equivalente | O que fazer |
|---|---|---|
| `src/features/pesquisas/comum.module.css` (`.tabela`, `.botaoLink`, `.confirmacao`) | `Tabela` e `Dialogo` em `src/components/ui` | Trocar as tabelas e a confirmação daqui pelos componentes de `ui` quando cobrirem o caso, e apagar as classes que sobrarem |
| `Confirmacao` em `src/features/pesquisas/components/Confirmacao.tsx`: bloco na própria página, sem `window.confirm`, usado para encerrar a pesquisa e cancelar a publicação | `Dialogo` em `src/components/ui` | Pode continuar como está, ou passar a usar o `Dialogo` e apagar `Confirmacao.tsx`. Se trocar, manter o foco no diálogo ao abrir e de volta no botão que o abriu ("Encerrar pesquisa", "Cancelar publicação") ao fechar |
| `validarResposta` em `src/features/pesquisas/resposta.ts`, usada no lançamento pelo ADMIN. Já usa `errosDaResposta`, `lerNumero` e `paraRespostaRequest` da tela do parceiro (`src/features/pesquisas/respostas.ts`) e só acrescenta o limite de 8 dígitos da diária | `lerDecimal` em `src/lib/numeros.ts`, usado em Cadastros | Decidir um leitor só para o projeto e trocar o `lerNumero` por ele |
| `formatarDiaria` em `src/features/pesquisas/resposta.ts` ("R$ 410,50", com centavos) | `textoDaDiaria` em `src/features/pesquisas/respostas.ts` ("sem diária" quando vazio) e `formatarMoeda(valor, 2)` em `formatos.ts` | Usar o `formatarMoeda(valor, 2)` e apagar `formatarDiaria` |
| `src/features/pesquisas/components/SituacaoRodada.tsx` (selo neutro de rascunho e encerrada) | Nenhuma | Se o `Badge` ganhar uma variante neutra, usar ela e apagar o CSS local |

## Dependência do backend

A branch `feature/testes-cucumber` do backend (ainda fora da `main` dele) inclui em
`PendenciaResponse` os campos `respostasAte` e `aceitaResposta`: depois do prazo, o parceiro tem
uma tolerância configurável (30 dias) e, passado esse limite, só o ADMIN envia a resposta.

O front segue o esquema atual, sem esses campos. O formulário do parceiro fica ativo enquanto
a rodada está aberta e, depois do prazo, mostra o erro da API sem apagar o que foi digitado.

Depois do merge no backend:

1. Rodar `npm run api:tipos` com a API no ar.
2. Usar `aceitaResposta` para desativar o formulário do parceiro e mostrar
   "Respostas até dd/mm/aaaa" com `respostasAte`.
3. Não calcular a tolerância no front: ela vem pronta da API.

A branch `fix/prazos-e-resultado` do backend (feita sobre a `feature/testes-cucumber`) muda
`GET /api/campanhas/{id}/resultado` e `resultado.csv`: campanha que existe mas não foi publicada
passa a responder 422, e 404 fica só para campanha inexistente. A `ResultadoCampanhaPage`
trata 404 como "ainda não publicada" (`naoPublicada`). Quando essa branch entrar no
backend, tratar 422 como "ainda não publicada" e 404 como "campanha não encontrada".
