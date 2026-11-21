import { useQuery } from '@tanstack/react-query'
import { listarPublicadas } from '@/api/resultados'

export const CHAVE_PUBLICADAS = ['campanhas', 'publicadas']

export function useCampanhasPublicadas() {
  return useQuery({
    queryKey: CHAVE_PUBLICADAS,
    queryFn: ({ signal }) => listarPublicadas({}, signal),
  })
}
