import { useQuery } from '@tanstack/react-query'
import { ErroRequisicao } from '@/api/erros'
import { buscarParametrosVigentes } from '@/api/parametros'
import { buscarRhcVigente } from '@/api/rhc'
import type { Perfil } from '@/types/dominio'

/** Sem vigência cadastrada na data, a API responde 404: o cartão segue sem esse detalhe. */
async function naoExistirEhNulo<T>(busca: Promise<T>): Promise<T | null> {
  try {
    return await busca
  } catch (erro) {
    if (erro instanceof ErroRequisicao && erro.status === 404) return null
    throw erro
  }
}

/** Os parâmetros de cálculo vigentes no fim do período da campanha. */
export function useParametrosDoPainel(data: string | undefined) {
  return useQuery({
    queryKey: ['parametros-calculo', 'vigente', data],
    queryFn: ({ signal }) => naoExistirEhNulo(buscarParametrosVigentes(data, signal)),
    enabled: data !== undefined,
  })
}

export function podeVerRhc(perfil: Perfil | undefined): boolean {
  return perfil === 'ADMIN' || perfil === 'VISUALIZADOR'
}

/** O RHC vigente no fim do período da campanha. O PARCEIRO não tem acesso (D7). */
export function useRhcDoPainel(data: string | undefined, perfil: Perfil | undefined) {
  return useQuery({
    queryKey: ['rhc', 'vigente', data],
    queryFn: ({ signal }) => naoExistirEhNulo(buscarRhcVigente(data, signal)),
    enabled: data !== undefined && podeVerRhc(perfil),
  })
}
