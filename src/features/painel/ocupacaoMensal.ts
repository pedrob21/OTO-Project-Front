import type { SerieMensal } from '@/components/charts/GraficoLinhasMensal'
import type { Esquemas } from '@/types/dominio'

const CORES = [
  'var(--cor-serie-atual)',
  'var(--cor-serie-anterior)',
  'var(--cor-serie-antiga)',
] as const

/** Os três anos mais recentes, do mais novo para o mais antigo, com os 12 meses preenchidos. */
export function seriesDeOcupacao(resposta: Esquemas['SerieMensalResponse']): SerieMensal[] {
  return [...(resposta.anos ?? [])]
    .sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0))
    .slice(0, CORES.length)
    .map(({ ano, meses = [] }, indice) => ({
      nome: String(ano),
      cor: CORES[indice] ?? 'var(--cor-serie-antiga)',
      valores: Array.from(
        { length: 12 },
        (_, mes) => meses.find((ponto) => ponto.mes === mes + 1)?.valor ?? null,
      ),
    }))
}

/** "2024 a 2026" */
export function textoDosAnos(series: SerieMensal[]): string {
  const maisNovo = series[0]?.nome
  const maisAntigo = series[series.length - 1]?.nome
  return maisNovo === maisAntigo ? (maisNovo ?? '') : `${maisAntigo} a ${maisNovo}`
}
