import { buscarSerieMensal } from '@/api/dashboard'
import type { Indicador, Modalidade } from '@/types/dominio'

/** Os três anos que terminam no da campanha: o que o gráfico mostra e de onde sai o comparativo. */
export function consultaDaSerie(
  indicador: Indicador,
  modalidade: Modalidade | undefined,
  ano: number | undefined,
) {
  const anoInicio = ano === undefined ? undefined : ano - 2
  return {
    queryKey: ['dashboard', 'serie-mensal', indicador, modalidade, anoInicio, ano],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      buscarSerieMensal({ indicador, modalidade, anoInicio, anoFim: ano }, signal),
    enabled: ano !== undefined,
  }
}
