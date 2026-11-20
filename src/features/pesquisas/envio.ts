import { abrirRodada, criarRodada, incluirCampanha } from '@/api/rodadas'
import type { Esquemas } from '@/types/dominio'
import { type CampanhaRascunho, type Feriado, paraDadosCampanha } from './campanhas'

/** O que já foi gravado na API: uma nova tentativa continua daqui, sem duplicar nada. */
export type Salvo = {
  rodada?: { id: number; codigo: string }
  /** chave da campanha no formulário → id na API */
  campanhas: Record<number, number>
}

export type Etapa =
  | { tipo: 'pesquisa' }
  | { tipo: 'campanha'; chave: number; posicao: number; total: number }
  | { tipo: 'abrir' }

export class ErroDeEnvio extends Error {
  readonly etapa: Etapa
  readonly causa: unknown

  constructor(etapa: Etapa, causa: unknown) {
    super(causa instanceof Error ? causa.message : 'Não foi possível concluir o envio.')
    this.name = 'ErroDeEnvio'
    this.etapa = etapa
    this.causa = causa
  }
}

export type Api = {
  criarRodada: typeof criarRodada
  incluirCampanha: typeof incluirCampanha
  abrirRodada: typeof abrirRodada
}

type Envio = {
  codigo: string
  titulo: string
  prazo: string
  campanhas: CampanhaRascunho[]
  feriados: Feriado[]
  salvo: Salvo
  aoAvancar: (etapa: Etapa) => void
  aoSalvar: (salvo: Salvo) => void
  api?: Api
}

async function etapa<T>(atual: Etapa, aoAvancar: (etapa: Etapa) => void, fazer: () => Promise<T>) {
  aoAvancar(atual)
  try {
    return await fazer()
  } catch (erro) {
    throw new ErroDeEnvio(atual, erro)
  }
}

/** Cria a pesquisa, inclui as campanhas e abre para respostas, nessa ordem, como a API exige. */
export async function enviarPesquisa({
  codigo,
  titulo,
  prazo,
  campanhas,
  feriados,
  salvo: inicial,
  aoAvancar,
  aoSalvar,
  api = { criarRodada, incluirCampanha, abrirRodada },
}: Envio): Promise<Esquemas['RodadaResponse']> {
  let salvo = inicial

  if (!salvo.rodada) {
    const rodada = await etapa({ tipo: 'pesquisa' }, aoAvancar, () =>
      api.criarRodada({ codigo: codigo.trim(), titulo: titulo.trim() }),
    )
    salvo = { ...salvo, rodada: { id: rodada.id ?? 0, codigo: rodada.codigo ?? codigo.trim() } }
    aoSalvar(salvo)
  }
  const rodadaId = salvo.rodada?.id ?? 0

  for (const [indice, campanha] of campanhas.entries()) {
    if (salvo.campanhas[campanha.chave] !== undefined) continue
    const atual: Etapa = {
      tipo: 'campanha',
      chave: campanha.chave,
      posicao: indice + 1,
      total: campanhas.length,
    }
    const criada = await etapa(atual, aoAvancar, () =>
      api.incluirCampanha(rodadaId, paraDadosCampanha(campanha, feriados)),
    )
    salvo = { ...salvo, campanhas: { ...salvo.campanhas, [campanha.chave]: criada.id ?? 0 } }
    aoSalvar(salvo)
  }

  return etapa({ tipo: 'abrir' }, aoAvancar, () =>
    api.abrirRodada(rodadaId, { prazoResposta: prazo }),
  )
}

export function textoDaEtapa(atual: Etapa): string {
  if (atual.tipo === 'pesquisa') return 'Criando a pesquisa…'
  if (atual.tipo === 'abrir') return 'Abrindo para respostas…'
  return atual.total > 1
    ? `Incluindo a campanha ${atual.posicao} de ${atual.total}…`
    : 'Incluindo a campanha…'
}
