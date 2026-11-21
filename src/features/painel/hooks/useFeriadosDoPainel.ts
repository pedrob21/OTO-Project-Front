import { useQuery } from '@tanstack/react-query'
import { buscarFeriados } from '@/api/dashboard'
import type { Modalidade } from '@/types/dominio'

/** Os feriados do ano da campanha, na previsão (EXPECTATIVA) ou no apurado (CONSOLIDADA). */
export function useFeriadosDoPainel(modalidade: Modalidade, ano: number | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'feriados', modalidade, ano],
    queryFn: ({ signal }) => buscarFeriados({ modalidade, anoInicio: ano, anoFim: ano }, signal),
    enabled: ano !== undefined,
  })
}
