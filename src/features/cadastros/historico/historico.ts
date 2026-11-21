import {
  capitalizar,
  formatarDecimal,
  formatarMes,
  formatarMoeda,
  formatarPercentual,
} from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { erroDoCampo, valorDoCampo, type DefCampo } from '../campos'
import type { ErrosDoFormulario } from '../falhaDaApi'

type Historico = Esquemas['HistoricoResponse']
type Indicador = Esquemas['HistoricoRequest']['indicador']
type Modalidade = Esquemas['HistoricoRequest']['modalidade']

export const INDICADORES: { valor: Indicador; rotulo: string }[] = [
  { valor: 'TAXA_OCUPACAO', rotulo: 'Taxa de ocupação' },
  { valor: 'FLUXO_TURISTAS', rotulo: 'Fluxo de turistas' },
  { valor: 'DIARIA_MEDIA', rotulo: 'Diária média' },
]

export const MODALIDADES: { valor: Modalidade; rotulo: string }[] = [
  { valor: 'CONSOLIDADA', rotulo: 'Consolidada' },
  { valor: 'EXPECTATIVA', rotulo: 'Expectativa' },
]

export const MESES = Array.from({ length: 12 }, (_, indice) => ({
  valor: String(indice + 1),
  rotulo: capitalizar(formatarMes(indice + 1)),
}))

export type FormHistorico = {
  indicador: Indicador
  modalidade: Modalidade
  ano: string
  periodo: 'MES' | 'FERIADO'
  mes: string
  feriadoCodigo: string
  tipoHospedagemCodigo: string
  valor: string
  observacao: string
  fonte: string
}

// Limites iguais aos da API (HistoricoRequest e as regras da gravação).
export const CAMPO_ANO: DefCampo = {
  nome: 'ano',
  rotulo: 'Ano',
  tipo: 'inteiro',
  obrigatorio: true,
  minimo: 2000,
  maximo: 2100,
}
export const CAMPO_OBSERVACAO: DefCampo = {
  nome: 'observacao',
  rotulo: 'Observação',
  maximo: 300,
  largo: true,
}
export const CAMPO_FONTE: DefCampo = {
  nome: 'fonte',
  rotulo: 'Fonte',
  obrigatorio: true,
  maximo: 200,
  largo: true,
  ajuda: 'De onde veio o valor, como a planilha Indicadores do Turismo 2017-2025.',
}

/** A taxa de ocupação vai até 100%; os outros valores, até 12 dígitos inteiros. */
export function campoDoValor(indicador: Indicador): DefCampo {
  const rotulos: Record<Indicador, string> = {
    TAXA_OCUPACAO: 'Valor (%)',
    FLUXO_TURISTAS: 'Valor (pernoites)',
    DIARIA_MEDIA: 'Valor (R$)',
  }
  return {
    nome: 'valor',
    rotulo: rotulos[indicador],
    tipo: 'decimal',
    obrigatorio: true,
    minimo: 0,
    maximo: indicador === 'TAXA_OCUPACAO' ? 100 : 999_999_999_999.99,
  }
}

export function rotuloDoIndicador(indicador: Indicador | undefined): string {
  return INDICADORES.find((item) => item.valor === indicador)?.rotulo ?? '—'
}

export function rotuloDaModalidade(modalidade: Modalidade | undefined): string {
  return MODALIDADES.find((item) => item.valor === modalidade)?.rotulo ?? '—'
}

export function formatarValor(item: Historico): string {
  if (item.indicador === 'TAXA_OCUPACAO') return formatarPercentual(item.valor, 2)
  if (item.indicador === 'DIARIA_MEDIA') return formatarMoeda(item.valor, 2)
  return formatarDecimal(item.valor)
}

/** "Julho de 2024" ou "Carnaval 2024". */
export function textoDoPeriodo(item: Historico, feriados: Esquemas['FeriadoRef'][]): string {
  if (item.mes) return `${capitalizar(formatarMes(item.mes))} de ${item.ano}`
  const feriado = feriados.find(({ codigo }) => codigo === item.feriadoCodigo)
  return `${feriado?.nome ?? item.feriadoCodigo} ${item.ano}`
}

export function formDoHistorico(item?: Historico): FormHistorico {
  return {
    indicador: item?.indicador ?? 'TAXA_OCUPACAO',
    modalidade: item?.modalidade ?? 'CONSOLIDADA',
    ano: item?.ano ? String(item.ano) : '',
    periodo: item?.feriadoCodigo ? 'FERIADO' : 'MES',
    mes: item?.mes ? String(item.mes) : '',
    feriadoCodigo: item?.feriadoCodigo ?? '',
    tipoHospedagemCodigo: item?.tipoHospedagemCodigo ?? '',
    valor: item?.valor === undefined ? '' : String(item.valor).replace('.', ','),
    observacao: item?.observacao ?? '',
    fonte: item?.fonte ?? '',
  }
}

export function errosDoHistorico(form: FormHistorico): ErrosDoFormulario {
  const erros: ErrosDoFormulario = {}
  const campos: [DefCampo, string][] = [
    [CAMPO_ANO, form.ano],
    [campoDoValor(form.indicador), form.valor],
    [CAMPO_OBSERVACAO, form.observacao],
    [CAMPO_FONTE, form.fonte],
  ]
  for (const [campo, valor] of campos) {
    const erro = erroDoCampo(campo, valor)
    if (erro) erros[campo.nome] = erro
  }
  if (form.periodo === 'MES' && !form.mes) erros.mes = 'Escolha o mês.'
  if (form.periodo === 'FERIADO' && !form.feriadoCodigo) erros.feriadoCodigo = 'Escolha o feriado.'
  return erros
}

/** Mês ou feriado, nunca os dois; sem tipo, o valor é o geral da cidade. */
export function pedidoDoHistorico(form: FormHistorico): Esquemas['HistoricoRequest'] {
  return {
    indicador: form.indicador,
    modalidade: form.modalidade,
    ano: Number(form.ano),
    mes: form.periodo === 'MES' ? Number(form.mes) : undefined,
    feriadoCodigo: form.periodo === 'FERIADO' ? form.feriadoCodigo : undefined,
    tipoHospedagemCodigo: form.tipoHospedagemCodigo || undefined,
    valor: valorDoCampo(campoDoValor(form.indicador), form.valor) as number,
    observacao: form.observacao.trim() || undefined,
    fonte: form.fonte.trim(),
  }
}
