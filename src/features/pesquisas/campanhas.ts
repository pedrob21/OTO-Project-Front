import { diasDoPeriodo, mesAnterior, periodoDoMes } from '@/lib/datas'
import { capitalizar, formatarMes } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'

export type Modalidade = Esquemas['DadosCampanha']['modalidade']
export type TipoPeriodo = Esquemas['DadosCampanha']['tipoPeriodo']
export type Feriado = { codigo: string; nome: string }

/** O que a pessoa preenche. `null` em diárias e nome: vale o valor sugerido. */
export type CampanhaRascunho = {
  chave: number
  modalidade: Modalidade
  tipoPeriodo: TipoPeriodo
  /** "2026-02", para campanha mensal */
  mes: string
  feriadoCodigo: string
  inicio: string
  fim: string
  diarias: string | null
  nome: string | null
}

export const MODALIDADES: { valor: Modalidade; rotulo: string }[] = [
  { valor: 'CONSOLIDADA', rotulo: 'Consolidada' },
  { valor: 'EXPECTATIVA', rotulo: 'Expectativa' },
]

export const TIPOS_DE_PERIODO: { valor: TipoPeriodo; rotulo: string }[] = [
  { valor: 'MENSAL', rotulo: 'Mensal' },
  { valor: 'FERIADO', rotulo: 'Feriado' },
]

/** Janeiro a dezembro, com o valor de dois dígitos usado em "AAAA-MM". */
export const OPCOES_DE_MES = Array.from({ length: 12 }, (_, indice) => ({
  valor: String(indice + 1).padStart(2, '0'),
  rotulo: capitalizar(formatarMes(indice + 1)),
}))

/** Três anos para trás (consolidadas) e um para a frente (expectativas), mais o já escolhido. */
export function opcoesDeAno(anoAtual: number, anoEscolhido?: number) {
  const anos = new Set<number>()
  for (let ano = anoAtual - 3; ano <= anoAtual + 1; ano++) anos.add(ano)
  if (anoEscolhido) anos.add(anoEscolhido)
  return [...anos].sort((a, b) => a - b).map((ano) => ({ valor: String(ano), rotulo: String(ano) }))
}

/**
 * A primeira campanha é a consolidada do mês anterior, a coleta mais comum. As seguintes começam
 * como expectativa de feriado, para não nascerem repetindo a primeira.
 */
export function novaCampanha(chave: number, hoje: string, primeira = true): CampanhaRascunho {
  return {
    chave,
    modalidade: primeira ? 'CONSOLIDADA' : 'EXPECTATIVA',
    tipoPeriodo: primeira ? 'MENSAL' : 'FERIADO',
    mes: mesAnterior(hoje),
    feriadoCodigo: '',
    inicio: '',
    fim: '',
    diarias: null,
    nome: null,
  }
}

export function periodoDaCampanha(campanha: CampanhaRascunho) {
  if (campanha.tipoPeriodo === 'MENSAL') return periodoDoMes(campanha.mes)
  return campanha.inicio && campanha.fim ? { inicio: campanha.inicio, fim: campanha.fim } : null
}

/** Dias do período; `null` se ele estiver incompleto ou invertido. */
export function diasDaCampanha(campanha: CampanhaRascunho): number | null {
  const periodo = periodoDaCampanha(campanha)
  const dias = periodo ? diasDoPeriodo(periodo.inicio, periodo.fim) : null
  return dias !== null && dias > 0 ? dias : null
}

/** "Consolidada de fevereiro de 2026" ou "Expectativa Carnaval 2026" */
export function nomeSugerido(campanha: CampanhaRascunho, feriados: Feriado[]): string {
  const modalidade = campanha.modalidade === 'CONSOLIDADA' ? 'Consolidada' : 'Expectativa'

  if (campanha.tipoPeriodo === 'MENSAL') {
    const partes = campanha.mes.match(/^(\d{4})-(\d{2})$/)
    return partes ? `${modalidade} de ${formatarMes(Number(partes[2]))} de ${partes[1]}` : ''
  }

  const feriado = feriados.find((item) => item.codigo === campanha.feriadoCodigo)?.nome
  if (!feriado) return ''
  const ano = campanha.inicio.match(/^\d{4}/)?.[0]
  return [modalidade, feriado, ano].filter(Boolean).join(' ')
}

export function diariasDaCampanha(campanha: CampanhaRascunho): string {
  return campanha.diarias ?? String(diasDaCampanha(campanha) ?? '')
}

export function nomeDaCampanha(campanha: CampanhaRascunho, feriados: Feriado[]): string {
  return campanha.nome ?? nomeSugerido(campanha, feriados)
}

/** Corpo de `POST /api/rodadas/{id}/campanhas`. Chame só com a campanha validada. */
export function paraDadosCampanha(
  campanha: CampanhaRascunho,
  feriados: Feriado[],
): Esquemas['DadosCampanha'] {
  const periodo = periodoDaCampanha(campanha)
  return {
    nome: nomeDaCampanha(campanha, feriados).trim(),
    modalidade: campanha.modalidade,
    tipoPeriodo: campanha.tipoPeriodo,
    feriadoCodigo: campanha.tipoPeriodo === 'FERIADO' ? campanha.feriadoCodigo : undefined,
    periodoInicio: periodo?.inicio ?? '',
    periodoFim: periodo?.fim ?? '',
    qtdDiarias: Number(diariasDaCampanha(campanha)),
  }
}
