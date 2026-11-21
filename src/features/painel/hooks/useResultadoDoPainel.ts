import { useQuery } from '@tanstack/react-query'
import { buscarResultado } from '@/api/resultados'

/** Mesma chave da tela de resultado da campanha: as duas telas dividem o cache. */
export function useResultadoDoPainel(campanhaId: number | undefined) {
  return useQuery({
    queryKey: ['campanhas', campanhaId, 'resultado'],
    queryFn: ({ signal }) => buscarResultado(campanhaId as number, signal),
    enabled: campanhaId !== undefined,
  })
}
