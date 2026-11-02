import { formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'

export type FaixaDaRegua = {
  codigo: string
  nome: string
  /** posição na régua de 0 a 100 */
  inicio: number
  fim: number
  /** "até 20%", "21 a 40%", "81 a 100%" */
  intervalo: string
}

/**
 * Faixas em ordem, com a posição na régua. Cada faixa começa em `percentualMinimo - 1`:
 * "21 a 40%" vai de 20 a 40, e as faixas do OTO ficam com a mesma largura, como no design.
 */
export function faixasDaRegua(faixas: Esquemas['FaixaRef'][]): FaixaDaRegua[] {
  const ordenadas = [...faixas].sort(
    (a, b) => (a.percentualMinimo ?? 0) - (b.percentualMinimo ?? 0),
  )

  return ordenadas.map(({ codigo = '', nome = '', percentualMinimo = 0 }, indice) => {
    const proximo = ordenadas[indice + 1]?.percentualMinimo
    const ate = proximo === undefined ? 100 : proximo - 1

    return {
      codigo,
      nome,
      inicio: Math.max(percentualMinimo - 1, 0),
      fim: ate,
      intervalo: percentualMinimo === 0 ? `até ${ate}%` : `${percentualMinimo} a ${ate}%`,
    }
  })
}

const CORES: Record<string, string> = {
  RUIM: 'var(--cor-faixa-ruim)',
  REGULAR: 'var(--cor-faixa-regular)',
  BOA: 'var(--cor-faixa-boa)',
  OTIMA: 'var(--cor-faixa-otima)',
  EXCELENTE: 'var(--cor-faixa-excelente)',
}

/** Faixas novas, cadastradas pela equipe, usam a cor primária. */
export function corDaFaixa(codigo: string): string {
  return CORES[codigo] ?? 'var(--cor-primaria)'
}

/** Posição do marcador na régua, em %. */
export function posicaoNaRegua(taxa: number): number {
  return Math.min(Math.max(taxa, 0), 100)
}

const NOMES_NO_PLURAL: Record<string, string> = {
  RESORT: 'Os resorts',
  HOTEL: 'Os hotéis',
  POUSADA: 'As pousadas',
  HOTEL_FAZENDA: 'Os hotéis fazenda',
  FLAT: 'Os flats',
  HOSTEL: 'Os hostels',
}

/** "Os resorts concentram 78% das UH da cidade e por isso pesam mais na taxa geral." */
export function notaDeConcentracao(porTipo: Esquemas['ResultadoTipoResponse'][]): string | null {
  const total = porTipo.reduce((soma, tipo) => soma + (tipo.qtdUh ?? 0), 0)
  if (total === 0) return null

  const maior = porTipo.reduce((atual, tipo) =>
    (tipo.qtdUh ?? 0) > (atual.qtdUh ?? 0) ? tipo : atual,
  )
  const parte = formatarPercentual(((maior.qtdUh ?? 0) / total) * 100, 0)
  const plural = NOMES_NO_PLURAL[maior.tipoHospedagemCodigo ?? '']

  return plural
    ? `${plural} concentram ${parte} das UH da cidade e por isso pesam mais na taxa geral.`
    : `O tipo ${maior.nome?.toLowerCase()} concentra ${parte} das UH da cidade e por isso pesa mais na taxa geral.`
}
