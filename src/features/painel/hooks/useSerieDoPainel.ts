import { useQuery } from '@tanstack/react-query'
import type { Esquemas } from '@/types/dominio'
import { partesDoPeriodo } from '../periodo'
import { consultaDaSerie } from './useSerieMensal'

function soAnosComValor(serie: Esquemas['SerieMensalResponse']): Esquemas['SerieMensalResponse'] {
  return {
    ...serie,
    anos: (serie.anos ?? []).filter((ano) => ano.meses?.some((ponto) => ponto.valor != null)),
  }
}

/** A taxa de ocupação consolidada mês a mês, até o ano da campanha selecionada. */
export function useSerieDoPainel(campanha: Esquemas['CampanhaPublicadaResponse'] | undefined) {
  const ano = partesDoPeriodo(campanha?.periodoInicio)?.ano
  return useQuery({
    ...consultaDaSerie('TAXA_OCUPACAO', 'CONSOLIDADA', ano),
    select: soAnosComValor,
  })
}
