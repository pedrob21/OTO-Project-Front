import { ESCALA_PERCENTUAL, escalaAutomatica, type EscalaY } from '@/components/charts/escala'
import type { SerieMensal } from '@/components/charts/GraficoLinhasMensal'
import type { OpcaoSelect } from '@/components/ui/Select'
import { formatarDecimal, formatarInteiro, formatarMoeda, formatarPercentual } from '@/lib/formatos'
import type { Esquemas, Indicador, Modalidade } from '@/types/dominio'

type Valor = number | null | undefined

/** A API aceita no máximo 20 anos por consulta. */
export const MAXIMO_DE_ANOS = 20
const PRIMEIRO_ANO = 2010

export type FiltroIndicadores = {
  indicador: Indicador
  modalidade: NonNullable<Modalidade>
  anoInicio: number
  anoFim: number
}

type Definicao = {
  rotulo: string
  /** "a taxa de ocupação", para frases */
  artigo: string
  formatar: (valor: Valor) => string
  /** campo do ponto anual dos feriados */
  campoAnual: 'taxaOcupacao' | 'fluxoTotal' | 'diariaMedia'
}

export const INDICADORES: Record<Indicador, Definicao> = {
  TAXA_OCUPACAO: {
    rotulo: 'Taxa de ocupação',
    artigo: 'a taxa de ocupação',
    formatar: (valor) => formatarPercentual(valor, 1),
    campoAnual: 'taxaOcupacao',
  },
  FLUXO_TURISTAS: {
    rotulo: 'Fluxo de turistas',
    artigo: 'o fluxo de turistas',
    formatar: formatarInteiro,
    campoAnual: 'fluxoTotal',
  },
  DIARIA_MEDIA: {
    rotulo: 'Diária média',
    artigo: 'a diária média',
    formatar: (valor) => formatarMoeda(valor),
    campoAnual: 'diariaMedia',
  },
}

export const OPCOES_DE_INDICADOR = (Object.keys(INDICADORES) as Indicador[]).map((valor) => ({
  valor,
  rotulo: INDICADORES[valor].rotulo,
}))

export const OPCOES_DE_MODALIDADE: OpcaoSelect[] = [
  { valor: 'CONSOLIDADA', rotulo: 'Consolidada (apurado)' },
  { valor: 'EXPECTATIVA', rotulo: 'Expectativa (previsão)' },
]

/** De 2010 até o ano que vem (as expectativas olham para a frente), do mais novo ao mais antigo. */
export function opcoesDeAno(anoAtual: number): OpcaoSelect[] {
  const anos: OpcaoSelect[] = []
  for (let ano = anoAtual + 1; ano >= PRIMEIRO_ANO; ano--) {
    anos.push({ valor: String(ano), rotulo: String(ano) })
  }
  return anos
}

function anoValido(texto: string | null): number | undefined {
  const ano = Number(texto)
  return texto && Number.isInteger(ano) && ano >= 2000 && ano <= 2100 ? ano : undefined
}

/** Sem nada na URL: taxa de ocupação consolidada dos três últimos anos, como no painel. */
export function lerFiltro(busca: URLSearchParams, anoAtual: number): FiltroIndicadores {
  const indicador = busca.get('indicador')
  const anoFim = anoValido(busca.get('ate')) ?? anoAtual
  return {
    indicador:
      indicador === 'FLUXO_TURISTAS' || indicador === 'DIARIA_MEDIA' ? indicador : 'TAXA_OCUPACAO',
    modalidade: busca.get('modalidade') === 'EXPECTATIVA' ? 'EXPECTATIVA' : 'CONSOLIDADA',
    anoInicio: anoValido(busca.get('de')) ?? anoFim - 2,
    anoFim,
  }
}

export function filtroParaBusca(filtro: FiltroIndicadores): Record<string, string> {
  return {
    indicador: filtro.indicador,
    modalidade: filtro.modalidade,
    de: String(filtro.anoInicio),
    ate: String(filtro.anoFim),
  }
}

/** O mesmo aviso que a API daria, sem precisar perguntar a ela. */
export function erroDoIntervalo(filtro: Pick<FiltroIndicadores, 'anoInicio' | 'anoFim'>) {
  if (filtro.anoInicio > filtro.anoFim) return 'O ano inicial não pode ser maior que o final.'
  if (filtro.anoFim - filtro.anoInicio + 1 > MAXIMO_DE_ANOS) {
    return `Escolha no máximo ${MAXIMO_DE_ANOS} anos.`
  }
  return null
}

/** "2024 a 2026"; um ano só, "2026" */
export function textoDoIntervalo(anoInicio: number, anoFim: number): string {
  return anoInicio === anoFim ? String(anoInicio) : `${anoInicio} a ${anoFim}`
}

/** A escala do gráfico: a taxa vai de 0 a 100%; fluxo e diária, até o maior valor. */
export function escalaDoIndicador(indicador: Indicador, series: SerieMensal[]): EscalaY {
  if (indicador === 'TAXA_OCUPACAO') return ESCALA_PERCENTUAL
  const maior = Math.max(0, ...series.flatMap((serie) => serie.valores.map((valor) => valor ?? 0)))
  if (indicador === 'FLUXO_TURISTAS') {
    return escalaAutomatica(
      maior,
      (valor) => (valor >= 1000 ? `${formatarDecimal(valor / 1000, 1)} mil` : String(valor)),
      54,
    )
  }
  return escalaAutomatica(maior, (valor) => `R$ ${formatarInteiro(valor)}`, 56)
}

export type Celula = { valor: Valor; historico: boolean }

/** Tabela mês a mês com todos os anos do intervalo, do mais antigo ao mais novo. */
export function tabelaMensal(resposta: Esquemas['SerieMensalResponse'] | undefined): {
  anos: number[]
  linhas: { mes: number; celulas: Celula[] }[]
} {
  const anos = [...(resposta?.anos ?? [])].sort((a, b) => (a.ano ?? 0) - (b.ano ?? 0))
  return {
    anos: anos.map((serie) => serie.ano ?? 0),
    linhas: Array.from({ length: 12 }, (_, indice) => ({
      mes: indice + 1,
      celulas: anos.map((serie) => {
        const ponto = serie.meses?.find((item) => item.mes === indice + 1)
        return { valor: ponto?.valor ?? null, historico: ponto?.origem === 'HISTORICO' }
      }),
    })),
  }
}

/** Os feriados que têm algum dado no intervalo, com os anos do mais antigo ao mais novo. */
export function tabelaDeFeriados(
  feriados: Esquemas['FeriadoSerie'][] | undefined,
  indicador: Indicador,
): { anos: number[]; linhas: { codigo: string; nome: string; celulas: Celula[] }[] } {
  const campo = INDICADORES[indicador].campoAnual
  const anos = [...new Set((feriados ?? []).flatMap((f) => (f.anos ?? []).map((p) => p.ano ?? 0)))]
  anos.sort((a, b) => a - b)
  return {
    anos,
    linhas: (feriados ?? []).map((feriado) => ({
      codigo: feriado.feriadoCodigo ?? feriado.nome ?? '',
      nome: feriado.nome ?? feriado.feriadoCodigo ?? '',
      celulas: anos.map((ano) => {
        const ponto = feriado.anos?.find((item) => item.ano === ano)
        const valor = ponto?.[campo] ?? null
        return { valor, historico: valor !== null && ponto?.origem === 'HISTORICO' }
      }),
    })),
  }
}

export function temAlgumValor(linhas: { celulas: Celula[] }[]): boolean {
  return linhas.some((linha) =>
    linha.celulas.some((celula) => celula.valor !== null && celula.valor !== undefined),
  )
}
