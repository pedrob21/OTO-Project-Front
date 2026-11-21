import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { falhaDaApi, type RegraDoCampo } from './falhaDaApi'

type OpcoesMutacao<TDados, TVariaveis> = {
  acao: (variaveis: TVariaveis) => Promise<TDados>
  /** listas que mudam com a ação; a ação só termina depois de buscá-las de novo */
  invalidar: QueryKey[]
  regras?: RegraDoCampo[]
  aoConcluir?: (dados: TDados, variaveis: TVariaveis) => void
}

export function useMutacaoCadastro<TDados, TVariaveis>({
  acao,
  invalidar,
  regras,
  aoConcluir,
}: OpcoesMutacao<TDados, TVariaveis>) {
  const queryClient = useQueryClient()
  const mutacao = useMutation({
    mutationFn: acao,
    onSuccess: async (dados, variaveis) => {
      await Promise.all(invalidar.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      aoConcluir?.(dados, variaveis)
    },
  })

  return { ...mutacao, falha: falhaDaApi(mutacao.error, regras) }
}
