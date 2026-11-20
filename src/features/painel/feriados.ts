import type { Esquemas } from '@/types/dominio'

export type LinhaFeriado = {
  codigo: string
  nome: string
  expectativa: number | null
  realizado: number | null
  /** realizado menos expectativa, em pontos; null se faltar um dos dois */
  diferenca: number | null
}

// Nomes cadastrados longos demais para a coluna do gráfico.
const NOMES_CURTOS: Record<string, string> = {
  FEFOL: 'FEFOL',
}

function taxaDoAno(feriado: Esquemas['FeriadoSerie'] | undefined, ano: number): number | null {
  return feriado?.anos?.find((ponto) => ponto.ano === ano)?.taxaOcupacao ?? null
}

/** Junta as duas modalidades por feriado. Feriado sem nenhum valor no ano fica de fora. */
export function linhasDeFeriados(
  expectativa: Esquemas['FeriadoSerie'][],
  realizado: Esquemas['FeriadoSerie'][],
  ano: number,
): LinhaFeriado[] {
  const codigos = new Set(
    [...realizado, ...expectativa].map(({ feriadoCodigo }) => feriadoCodigo ?? ''),
  )

  return [...codigos]
    .map((codigo) => {
      const naExpectativa = expectativa.find((feriado) => feriado.feriadoCodigo === codigo)
      const noRealizado = realizado.find((feriado) => feriado.feriadoCodigo === codigo)
      const taxaEsperada = taxaDoAno(naExpectativa, ano)
      const taxaRealizada = taxaDoAno(noRealizado, ano)

      return {
        codigo,
        nome: NOMES_CURTOS[codigo] ?? noRealizado?.nome ?? naExpectativa?.nome ?? codigo,
        expectativa: taxaEsperada,
        realizado: taxaRealizada,
        diferenca:
          taxaEsperada !== null && taxaRealizada !== null ? taxaRealizada - taxaEsperada : null,
      }
    })
    .filter((linha) => linha.expectativa !== null || linha.realizado !== null)
}

export type Dominio = { inicio: number; fim: number; marcas: number[] }

/** De 50% a 100%, como no design; desce de 10 em 10 se houver taxa abaixo de 50%. */
export function dominioDeFeriados(linhas: LinhaFeriado[]): Dominio {
  const menor = Math.min(
    50,
    ...linhas.flatMap(({ expectativa, realizado }) =>
      [expectativa, realizado].filter((valor) => valor !== null),
    ),
  )
  const inicio = Math.max(Math.floor(menor / 10) * 10, 0)
  const marcas = Array.from({ length: (100 - inicio) / 10 + 1 }, (_, i) => inicio + i * 10)

  return { inicio, fim: 100, marcas }
}

/** Posição do valor no gráfico, em %. */
export function posicaoNoDominio(valor: number, { inicio, fim }: Dominio): number {
  return ((Math.min(valor, fim) - inicio) / (fim - inicio)) * 100
}
