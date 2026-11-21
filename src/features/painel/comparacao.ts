import type { Esquemas } from '@/types/dominio'
import { partesDoPeriodo } from './periodo'

type Campanha = Esquemas['CampanhaPublicadaResponse']

/** Valores do mesmo mês no ano comparado, lidos da série histórica (D3). */
export type ValoresDoHistorico = {
  taxaOcupacao?: number | null
  fluxoTotal?: number | null
  diariaMedia?: number | null
}

/**
 * A campanha publicada que serve de comparação: mesma modalidade e tipo de período, no ano
 * comparado, e o mesmo mês (ou o mesmo feriado, nos períodos de feriado).
 */
export function campanhaDoAnoComparado(
  campanhas: Campanha[],
  campanha: Campanha | undefined,
  ano: number,
): Campanha | undefined {
  const atual = partesDoPeriodo(campanha?.periodoInicio)
  if (!campanha || !atual) return undefined

  return campanhas.find((candidata) => {
    const partes = partesDoPeriodo(candidata.periodoInicio)
    if (!partes || partes.ano !== ano) return false
    if (candidata.modalidade !== campanha.modalidade) return false
    if (candidata.tipoPeriodo !== campanha.tipoPeriodo) return false
    return campanha.tipoPeriodo === 'FERIADO'
      ? candidata.feriadoCodigo === campanha.feriadoCodigo
      : partes.mes === atual.mes
  })
}

function diferenca(atual: number | null | undefined, anterior: number | null | undefined) {
  return typeof atual === 'number' && typeof anterior === 'number' ? atual - anterior : undefined
}

function variacaoPercentual(atual: number | null | undefined, anterior: number | null | undefined) {
  if (typeof atual !== 'number' || typeof anterior !== 'number' || anterior <= 0) return undefined
  return ((atual - anterior) / anterior) * 100
}

function temAlgum(valores: (number | null | undefined)[]): boolean {
  return valores.some((valor) => typeof valor === 'number')
}

/**
 * Regra do D3: usa o resultado publicado do ano comparado; sem ele, a série histórica; sem
 * nenhum dos dois, devolve undefined e a variação fica escondida. A receita não tem fonte na API.
 */
export function montarComparativo(
  atual: Esquemas['ResultadoResponse'],
  ano: number,
  publicado: Esquemas['ResultadoResponse'] | undefined,
  historico: ValoresDoHistorico | undefined,
): Esquemas['Comparativo'] | undefined {
  const anterior: (ValoresDoHistorico & { origem: string }) | undefined = publicado
    ? { ...publicado, origem: 'SISTEMA' }
    : historico && temAlgum([historico.taxaOcupacao, historico.fluxoTotal, historico.diariaMedia])
      ? { ...historico, origem: 'HISTORICO' }
      : undefined
  if (!anterior) return undefined

  return {
    ano,
    origem: anterior.origem,
    taxaOcupacao: anterior.taxaOcupacao ?? undefined,
    fluxoTotal: anterior.fluxoTotal ?? undefined,
    diariaMedia: anterior.diariaMedia ?? undefined,
    diferencaTaxaPontos: diferenca(atual.taxaOcupacao, anterior.taxaOcupacao),
    variacaoFluxoPercentual: variacaoPercentual(atual.fluxoTotal, anterior.fluxoTotal),
    variacaoDiariaPercentual: variacaoPercentual(atual.diariaMedia, anterior.diariaMedia),
  }
}

/** O valor do mês no ano da série, ou null quando não há. */
export function valorDaSerie(
  serie: Esquemas['SerieMensalResponse'] | undefined,
  ano: number,
  mes: number,
): number | null {
  return (
    serie?.anos?.find((item) => item.ano === ano)?.meses?.find((ponto) => ponto.mes === mes)
      ?.valor ?? null
  )
}
