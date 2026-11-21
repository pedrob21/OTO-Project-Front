import type { Esquemas, Modalidade } from '@/types/dominio'
import { requisicao } from './client'

type FiltroPublicadas = {
  modalidade?: Modalidade
  tipoPeriodo?: 'MENSAL' | 'FERIADO'
  ano?: number
}

export function listarPublicadas(filtro: FiltroPublicadas = {}, signal?: AbortSignal) {
  return requisicao<Esquemas['CampanhaPublicadaResponse'][]>('/api/campanhas/publicadas', {
    parametros: filtro,
    signal,
  })
}

export function buscarResultado(campanhaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['ResultadoResponse']>(`/api/campanhas/${campanhaId}/resultado`, {
    signal,
  })
}

/** Só ADMIN. Simula o resultado com as respostas atuais e diz o que impede a publicação. */
export function buscarPrevia(campanhaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['PreviaResponse']>(`/api/campanhas/${campanhaId}/previa`, { signal })
}

/** Só ADMIN. Exige a pesquisa encerrada e o mínimo de leitos respondentes. */
export function publicarCampanha(campanhaId: number) {
  return requisicao<Esquemas['ResultadoResponse']>(`/api/campanhas/${campanhaId}/publicacao`, {
    metodo: 'POST',
  })
}

/** Só ADMIN. Desfaz uma publicação feita por engano (204). */
export function cancelarPublicacao(campanhaId: number) {
  return requisicao<void>(`/api/campanhas/${campanhaId}/publicacao`, { metodo: 'DELETE' })
}
