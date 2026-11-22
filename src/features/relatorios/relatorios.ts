import type { OpcaoSelect } from '@/components/ui/Select'
import { partesDoPeriodo } from '@/features/painel/periodo'
import type { Esquemas, Modalidade } from '@/types/dominio'

type Campanha = Esquemas['CampanhaPublicadaResponse']
type TipoPeriodo = NonNullable<Campanha['tipoPeriodo']>

/** Os filtros da lista de relatórios, lidos da URL. Sem valor, o filtro não se aplica. */
export type FiltroRelatorios = {
  modalidade?: Modalidade
  tipoPeriodo?: TipoPeriodo
  ano?: number
}

export const OPCOES_DE_MODALIDADE: OpcaoSelect[] = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'CONSOLIDADA', rotulo: 'Consolidada' },
  { valor: 'EXPECTATIVA', rotulo: 'Expectativa' },
]

export const OPCOES_DE_PERIODO: OpcaoSelect[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'MENSAL', rotulo: 'Mensal' },
  { valor: 'FERIADO', rotulo: 'Feriado ou evento' },
]

/** Valores fora da lista (URL editada à mão) são ignorados, e a lista volta a trazer tudo. */
export function lerFiltro(busca: URLSearchParams): FiltroRelatorios {
  const modalidade = busca.get('modalidade')
  const tipoPeriodo = busca.get('periodo')
  const ano = Number(busca.get('ano'))
  return {
    modalidade:
      modalidade === 'CONSOLIDADA' || modalidade === 'EXPECTATIVA' ? modalidade : undefined,
    tipoPeriodo: tipoPeriodo === 'MENSAL' || tipoPeriodo === 'FERIADO' ? tipoPeriodo : undefined,
    ano: Number.isInteger(ano) && ano >= 2000 && ano <= 2100 ? ano : undefined,
  }
}

/** O filtro de volta para a URL, só com o que foi escolhido. */
export function filtroParaBusca(filtro: FiltroRelatorios): Record<string, string> {
  const busca: Record<string, string> = {}
  if (filtro.modalidade) busca.modalidade = filtro.modalidade
  if (filtro.tipoPeriodo) busca.periodo = filtro.tipoPeriodo
  if (filtro.ano) busca.ano = String(filtro.ano)
  return busca
}

export function temFiltro(filtro: FiltroRelatorios): boolean {
  return Boolean(filtro.modalidade || filtro.tipoPeriodo || filtro.ano)
}

/**
 * Os anos que têm campanha publicada (pelo início do período, como a API filtra), do mais
 * recente para o mais antigo. O ano já escolhido continua na lista mesmo sem campanha.
 */
export function opcoesDeAno(campanhas: Campanha[], escolhido?: number): OpcaoSelect[] {
  const anos = new Set<number>()
  for (const campanha of campanhas) {
    const ano = partesDoPeriodo(campanha.periodoInicio)?.ano
    if (ano) anos.add(ano)
  }
  if (escolhido) anos.add(escolhido)
  return [
    { valor: '', rotulo: 'Todos' },
    ...[...anos].sort((a, b) => b - a).map((ano) => ({ valor: String(ano), rotulo: String(ano) })),
  ]
}

export function rotuloDaModalidade(modalidade: Campanha['modalidade']): string {
  if (modalidade === 'CONSOLIDADA') return 'Consolidada'
  if (modalidade === 'EXPECTATIVA') return 'Expectativa'
  return '—'
}

export function rotuloDoTipoDePeriodo(tipoPeriodo: Campanha['tipoPeriodo']): string {
  if (tipoPeriodo === 'MENSAL') return 'Mensal'
  if (tipoPeriodo === 'FERIADO') return 'Feriado ou evento'
  return '—'
}
