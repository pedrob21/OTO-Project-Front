import type { Esquemas } from '@/types/dominio'

type Tipo = Esquemas['ResultadoTipoResponse']

export type TotalDesempenho = {
  qtdMh: number
  qtdUh: number
  taxaOcupacao: number | null
  diariaMedia: number | null
  revpar: number | null
  receitaEstimada: number | null
}

function codigosDeReceita(tipos: Esquemas['TipoHospedagemRef'][]): Set<string | undefined> {
  return new Set(tipos.filter((tipo) => tipo.calculaReceita).map((tipo) => tipo.codigo))
}

/** Só os tipos que entram na receita, da maior para a menor. Tipos ocultos ficam no fim. */
export function linhasDeDesempenho(
  porTipo: Tipo[],
  tipos: Esquemas['TipoHospedagemRef'][],
): Tipo[] {
  const codigos = codigosDeReceita(tipos)

  return porTipo
    .filter((tipo) => codigos.has(tipo.tipoHospedagemCodigo))
    .sort((a, b) => (b.receitaEstimada ?? -1) - (a.receitaEstimada ?? -1))
}

/**
 * A API não manda um total só destes tipos. A receita e a diária são as gerais do resultado, que
 * continuam certas com tipos ocultos. A taxa depende de todos os tipos: com um oculto, não existe.
 */
export function totalDoDesempenho(
  linhas: Tipo[],
  resultado: Pick<Esquemas['ResultadoResponse'], 'diariaMedia' | 'receitaHospedagem' | 'campanha'>,
): TotalDesempenho {
  const receitaEstimada = resultado.receitaHospedagem ?? null
  const qtdDiarias = resultado.campanha?.qtdDiarias
  const comTaxa = linhas.filter(
    (tipo) => tipo.taxaOcupacao !== undefined && tipo.taxaOcupacao !== null,
  )
  const uhComTaxa = comTaxa.reduce((soma, tipo) => soma + (tipo.qtdUh ?? 0), 0)
  // tipo sem nenhuma resposta não entra na receita, então também não entra no divisor do RevPAR
  const uhDaReceita = linhas
    .filter((tipo) => tipo.omitido || (tipo.receitaEstimada ?? null) !== null)
    .reduce((soma, tipo) => soma + (tipo.qtdUh ?? 0), 0)

  return {
    qtdMh: linhas.reduce((soma, tipo) => soma + (tipo.qtdMh ?? 0), 0),
    qtdUh: linhas.reduce((soma, tipo) => soma + (tipo.qtdUh ?? 0), 0),
    taxaOcupacao:
      uhComTaxa === 0 || linhas.some((tipo) => tipo.omitido)
        ? null
        : comTaxa.reduce((soma, tipo) => soma + (tipo.taxaOcupacao ?? 0) * (tipo.qtdUh ?? 0), 0) /
          uhComTaxa,
    diariaMedia: resultado.diariaMedia ?? null,
    revpar:
      receitaEstimada === null || !qtdDiarias || uhDaReceita === 0
        ? null
        : receitaEstimada / (uhDaReceita * qtdDiarias),
    receitaEstimada,
  }
}

const NOMES_NO_PLURAL: Record<string, string> = {
  FLAT: 'flats',
  HOTEL_FAZENDA: 'hotéis fazenda',
  HOSTEL: 'hostels',
}

function nomeComQuantidade({ tipoHospedagemCodigo = '', nome = '', qtdMh = 0 }: Tipo): string {
  const plural = qtdMh > 1 ? NOMES_NO_PLURAL[tipoHospedagemCodigo] : undefined
  return `${plural ?? nome.toLowerCase()} (${qtdMh})`
}

/** "Flats (3) e hotel fazenda (1) entram na taxa de ocupação geral, mas não no cálculo da receita." */
export function notaDosForaDaReceita(
  porTipo: Tipo[],
  tipos: Esquemas['TipoHospedagemRef'][],
): string | null {
  const codigos = codigosDeReceita(tipos)
  const fora = porTipo
    .filter((tipo) => !codigos.has(tipo.tipoHospedagemCodigo) && (tipo.qtdMh ?? 0) > 0)
    .sort((a, b) => (b.qtdMh ?? 0) - (a.qtdMh ?? 0))
  if (fora.length === 0) return null

  const nomes = new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(
    fora.map(nomeComQuantidade),
  )
  const verbo = fora.length === 1 && fora[0]?.qtdMh === 1 ? 'entra' : 'entram'

  return `${nomes.charAt(0).toUpperCase()}${nomes.slice(1)} ${verbo} na taxa de ocupação geral, mas não no cálculo da receita.`
}
