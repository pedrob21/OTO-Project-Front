import { formatarData } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { NOMES_NO_PLURAL } from './desempenho'

type CampanhaAcompanhada = Esquemas['AcompanhamentoCampanha']

function diaUtc(data: string): number | null {
  const partes = data.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return partes ? Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : null
}

/** Compara só os dias, em UTC, para o horário de verão e o fuso não mudarem a conta. */
export function diasAte(prazo: string, hoje: string): number | null {
  const fim = diaUtc(prazo)
  const inicio = diaUtc(hoje)
  return fim === null || inicio === null ? null : Math.round((fim - inicio) / 86_400_000)
}

export function textoDosDias(prazo: string | undefined, hoje: string): string | null {
  const dias = prazo ? diasAte(prazo, hoje) : null
  if (dias === null) return null
  if (dias < 0) return 'prazo encerrado'
  if (dias === 0) return 'termina hoje'
  return dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`
}

/** "Prazo de resposta: 09/10/2026 · faltam 4 dias" */
export function textoDoPrazo(prazo: string | undefined, hoje: string): string {
  const dias = textoDosDias(prazo, hoje)
  return dias ? `Prazo de resposta: ${formatarData(prazo)} · ${dias}` : 'Sem prazo de resposta'
}

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
  const faltam = (campanha.qtdMh ?? 0) - (campanha.qtdRespondentes ?? 0)
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

/** As últimas rodadas com campanha publicada, da mais recente para a mais antiga. */
export function rodadasRecentesPublicadas(
  rodadas: Esquemas['RodadaResponse'][],
  acompanhamentos: Esquemas['AcompanhamentoResponse'][],
  limite = 3,
): RodadaRecente[] {
  return rodadas
    .flatMap(({ id, codigo, titulo, campanhas = [] }) => {
      const datas = campanhas.flatMap(({ publicadaEm }) => publicadaEm ?? [])
      const publicadaEm = datas.sort().at(-1)
      if (!publicadaEm) return []
      const acompanhamento = acompanhamentos.find((item) => item.rodadaId === id)
      return [{ id, codigo, titulo, publicadaEm, campanha: campanhaDeReferencia(acompanhamento) }]
    })
    .sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm))
    .slice(0, limite)
}
