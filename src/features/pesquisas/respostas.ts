import { textoDoPrazo, diasAte } from '@/lib/datas'
import { formatarData, formatarDecimal } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'

type Pendencia = Esquemas['PendenciaResponse']

/**
 * Lê um número digitado em português: "72,5", "72.5" e "1.234,56".
 * Com vírgula, os pontos são separadores de milhar. Devolve `null` se não for número.
 */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '')
  if (!limpo) return null
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  return /^\d+(\.\d+)?$/.test(normalizado) ? Number(normalizado) : null
}

function casasDecimais(texto: string): number {
  const decimal = texto.trim().split(/[,.]/).at(-1) ?? ''
  return /[,.]/.test(texto) ? decimal.length : 0
}

export type ErrosDaResposta = { taxa?: string; diaria?: string }

/** As mesmas regras da API: taxa de 0 a 100 com até duas casas; diária opcional e maior que zero. */
export function errosDaResposta(taxa: string, diaria: string): ErrosDaResposta {
  const erros: ErrosDaResposta = {}
  const valorTaxa = lerNumero(taxa)
  if (!taxa.trim()) erros.taxa = 'Informe a taxa de ocupação.'
  else if (valorTaxa === null) erros.taxa = 'Use só números, como 72,5.'
  else if (valorTaxa > 100) erros.taxa = 'A taxa vai de 0 a 100%.'
  else if (casasDecimais(taxa) > 2) erros.taxa = 'Use no máximo duas casas decimais.'

  if (diaria.trim()) {
    const valorDiaria = lerNumero(diaria)
    if (valorDiaria === null) erros.diaria = 'Use só números, como 410,00.'
    else if (valorDiaria <= 0) erros.diaria = 'A diária precisa ser maior que zero.'
    else if (casasDecimais(diaria) > 2) erros.diaria = 'Use no máximo duas casas decimais.'
  }
  return erros
}

/** Corpo do PUT. Chame só com os valores validados. */
export function paraRespostaRequest(taxa: string, diaria: string): Esquemas['RespostaRequest'] {
  return {
    taxaOcupacao: lerNumero(taxa) ?? 0,
    diariaMedia: lerNumero(diaria) ?? undefined,
  }
}

/** A API manda `null` onde não há valor; o tipo gerado só prevê `undefined`. Os dois valem como ausente. */
export function ausente(valor: number | null | undefined): valor is null | undefined {
  return valor === null || valor === undefined
}

/** Valor da API para o campo de texto: 72.5 → "72,5"; sem valor → "". */
export function paraCampo(valor: number | null | undefined): string {
  return ausente(valor) ? '' : formatarDecimal(valor)
}

/** A faixa do painel em que a taxa cai: a de maior mínimo que não passa da taxa. */
export function faixaDaTaxa(
  faixas: Esquemas['FaixaRef'][],
  taxa: number | null,
): Esquemas['FaixaRef'] | undefined {
  if (taxa === null || taxa < 0 || taxa > 100) return undefined
  return faixas
    .filter((faixa) => (faixa.percentualMinimo ?? 0) <= taxa)
    .toSorted((a, b) => (b.percentualMinimo ?? 0) - (a.percentualMinimo ?? 0))[0]
}

export type CampanhaParaResponder = {
  campanhaId: number
  nome: string
  rodadaCodigo: string | undefined
  periodo: string
  prazo: string
  prazoVencido: boolean
  estabelecimentos: Pendencia[]
}

/** Uma campanha por cartão, com os estabelecimentos do parceiro; prazo mais próximo primeiro. */
export function campanhasParaResponder(
  pendencias: Pendencia[],
  hoje: string,
): CampanhaParaResponder[] {
  const porCampanha = new Map<number, Pendencia[]>()
  for (const pendencia of pendencias) {
    const id = pendencia.campanhaId ?? 0
    porCampanha.set(id, [...(porCampanha.get(id) ?? []), pendencia])
  }

  return [...porCampanha.entries()]
    .map(([campanhaId, itens]) => {
      const [primeira] = itens
      return {
        campanhaId,
        nome: primeira?.campanhaNome ?? 'Campanha',
        rodadaCodigo: primeira?.rodadaCodigo,
        periodo: `${formatarData(primeira?.periodoInicio)} a ${formatarData(primeira?.periodoFim)}`,
        prazo: textoDoPrazo(primeira?.prazoResposta, hoje),
        prazoVencido: (diasAte(primeira?.prazoResposta ?? '', hoje) ?? 0) < 0,
        prazoOrdenacao: primeira?.prazoResposta ?? '9999',
        estabelecimentos: itens.toSorted((a, b) =>
          (a.nomeFantasia ?? '').localeCompare(b.nomeFantasia ?? '', 'pt-BR'),
        ),
      }
    })
    .sort((a, b) => a.prazoOrdenacao.localeCompare(b.prazoOrdenacao))
    .map(({ prazoOrdenacao: _ordem, ...campanha }) => campanha)
}

/** "Faltam 2 de 3 respostas." */
export function resumoDasPendencias(pendencias: Pendencia[]): string {
  const faltam = pendencias.filter((pendencia) => !pendencia.respondida).length
  if (pendencias.length === 0) return ''
  if (faltam === 0) {
    return 'Todas as respostas foram enviadas. Você ainda pode corrigir enquanto a pesquisa estiver aberta.'
  }
  const total = pendencias.length
  return faltam === 1
    ? `Falta 1 de ${total} ${total === 1 ? 'resposta' : 'respostas'}.`
    : `Faltam ${faltam} de ${total} respostas.`
}

/** Quem enviou uma versão: o próprio parceiro ou a equipe do OTO, que lança respostas por ele. */
export function autorDaVersao(
  enviadoPor: number | undefined,
  usuarioId: number | undefined,
): string {
  return enviadoPor !== undefined && enviadoPor === usuarioId ? 'por você' : 'pela equipe do OTO'
}

/** 410.5 → "R$ 410,50". Diária com centavos, sem arredondar como nos cartões do painel. */
export function textoDaDiaria(valor: number | null | undefined): string {
  if (ausente(valor)) return 'sem diária'
  return `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)}`
}
