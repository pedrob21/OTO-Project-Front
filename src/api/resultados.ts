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
