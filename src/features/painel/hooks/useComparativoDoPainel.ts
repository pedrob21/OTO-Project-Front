import { useQueries } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { buscarSerieMensal } from '@/api/dashboard'
import type { Esquemas, Indicador } from '@/types/dominio'
import { campanhaDoAnoComparado, montarComparativo, valorDaSerie } from '../comparacao'
import { opcoesComparacao } from '../filtros'
import { partesDoPeriodo } from '../periodo'
import { useCampanhasPublicadas } from './useCampanhasPublicadas'
import { useResultadoDoPainel } from './useResultadoDoPainel'
import { valorDoFiltro } from './usePainelFiltros'

const INDICADORES: Indicador[] = ['TAXA_OCUPACAO', 'FLUXO_TURISTAS', 'DIARIA_MEDIA']

/**
 * A comparação com o ano escolhido em "Comparar com". Sem dado, ou se a busca falhar, devolve
 * undefined: a variação fica escondida e o resto do painel segue.
 */
export function useComparativoDoPainel(
  campanha: Esquemas['CampanhaPublicadaResponse'] | undefined,
  atual: Esquemas['ResultadoResponse'] | undefined,
) {
  const publicadas = useCampanhasPublicadas().data ?? []
  const [busca] = useSearchParams()
  const ano = Number(valorDoFiltro(busca, 'comparar', opcoesComparacao(campanha)))
  const mes = partesDoPeriodo(campanha?.periodoInicio)?.mes

  const doAnoComparado = campanhaDoAnoComparado(publicadas, campanha, ano)
  const publicado = useResultadoDoPainel(doAnoComparado?.campanhaId)

  const temHistorico = campanha?.tipoPeriodo === 'MENSAL' && !!ano && mes !== undefined
  const buscarHistorico = temHistorico && !doAnoComparado
  const series = useQueries({
    queries: INDICADORES.map((indicador) => ({
      queryKey: ['dashboard', 'serie-mensal', indicador, campanha?.modalidade, ano],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        buscarSerieMensal(
          { indicador, modalidade: campanha?.modalidade, anoInicio: ano, anoFim: ano },
          signal,
        ),
      enabled: buscarHistorico,
    })),
  })

  if (!atual || !ano) return undefined
  if (doAnoComparado) return montarComparativo(atual, ano, publicado.data, undefined)
  if (!buscarHistorico || mes === undefined) return undefined

  const [taxa, fluxo, diaria] = series.map((serie) => valorDaSerie(serie.data, ano, mes))
  return montarComparativo(atual, ano, undefined, {
    taxaOcupacao: taxa,
    fluxoTotal: fluxo,
    diariaMedia: diaria,
  })
}
