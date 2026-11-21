import type { Esquemas } from '@/types/dominio'
import { NOMES_NO_PLURAL } from './desempenho'

type CampanhaAcompanhada = Esquemas['AcompanhamentoCampanha']

/** Uma rodada pode ter várias campanhas, e o cartão mostra uma: a que tem menos respostas. */
export function campanhaDeReferencia(
  acompanhamento: Esquemas['AcompanhamentoResponse'] | undefined,
): CampanhaAcompanhada | undefined {
  return acompanhamento?.campanhas?.reduce<CampanhaAcompanhada | undefined>(
    (menor, campanha) =>
      !menor || (campanha.qtdRespondentes ?? 0) < (menor.qtdRespondentes ?? 0) ? campanha : menor,
    undefined,
  )
}

function grupoDeFaltantes(codigo: string, qtd: number, tipos: Esquemas['TipoRef'][]) {
  const nome = tipos.find((tipo) => tipo.codigo === codigo)?.nome?.toLowerCase() ?? codigo
  return `${qtd} ${qtd === 1 ? nome : (NOMES_NO_PLURAL[codigo] ?? nome)}`
}

/** "Faltam 31 respostas: 19 pousadas, 8 hotéis, 2 resorts e 2 flats." */
export function textoDasFaltantes(
  campanha: CampanhaAcompanhada,
  tipos: Esquemas['TipoRef'][],
): string {
  if (!campanha.qtdMh) return 'Ainda não há meios de hospedagem cadastrados para responder.'
  const faltam = campanha.qtdMh - (campanha.qtdRespondentes ?? 0)
  if (faltam <= 0) return 'Todos os meios de hospedagem responderam.'

  const porTipo = new Map<string, number>()
  for (const { respondeu, tipoHospedagemCodigo = '' } of campanha.estabelecimentos ?? []) {
    if (!respondeu) porTipo.set(tipoHospedagemCodigo, (porTipo.get(tipoHospedagemCodigo) ?? 0) + 1)
  }

  const inicio = faltam === 1 ? 'Falta 1 resposta' : `Faltam ${faltam} respostas`
  if (porTipo.size === 0) return `${inicio}.`

  const grupos = [...porTipo]
    .sort(([, a], [, b]) => b - a)
    .map(([codigo, qtd]) => grupoDeFaltantes(codigo, qtd, tipos))
  return `${inicio}: ${new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(grupos)}.`
}

export type RodadaRecente = {
  id: number | undefined
  codigo: string | undefined
  titulo: string | undefined
  publicadaEm: string
  campanha: CampanhaAcompanhada | undefined
}

/** A rodada aberta que o cartão mostra. Com mais de uma, a de prazo mais próximo. */
export function rodadaAbertaAtual(
  rodadas: Esquemas['RodadaResponse'][],
): Esquemas['RodadaResponse'] | undefined {
  return rodadas
    .filter((rodada) => rodada.status === 'ABERTA')
    .toSorted((a, b) => (a.prazoResposta ?? '9999').localeCompare(b.prazoResposta ?? '9999'))[0]
}

/** A publicação mais recente entre as campanhas da rodada; sem campanha publicada, undefined. */
export function ultimaPublicacao(rodada: Esquemas['RodadaResponse']): string | undefined {
  return (rodada.campanhas ?? [])
    .flatMap(({ publicadaEm }) => publicadaEm ?? [])
    .sort()
    .at(-1)
}

function ultimasPublicadas(rodadas: Esquemas['RodadaResponse'][], limite: number) {
  return rodadas
    .flatMap((rodada) => {
      const { id, codigo, titulo } = rodada
      const publicadaEm = ultimaPublicacao(rodada)
      return publicadaEm ? [{ id, codigo, titulo, publicadaEm }] : []
    })
    .sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm))
    .slice(0, limite)
}

/** Ids das rodadas recentes, para buscar só o acompanhamento delas. */
export function idsRecentesPublicadas(rodadas: Esquemas['RodadaResponse'][], limite = 3): number[] {
  return ultimasPublicadas(rodadas, limite).flatMap(({ id }) => (id === undefined ? [] : [id]))
}

/** As últimas rodadas com campanha publicada, da mais recente para a mais antiga. */
export function rodadasRecentesPublicadas(
  rodadas: Esquemas['RodadaResponse'][],
  acompanhamentos: Esquemas['AcompanhamentoResponse'][],
  limite = 3,
): RodadaRecente[] {
  return ultimasPublicadas(rodadas, limite).map((rodada) => ({
    ...rodada,
    campanha: campanhaDeReferencia(acompanhamentos.find((item) => item.rodadaId === rodada.id)),
  }))
}
