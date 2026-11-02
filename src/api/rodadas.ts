import type { Esquemas, StatusRodada } from '@/types/dominio'
import { requisicao } from './client'

/** Só ADMIN. */
export function listarRodadas(status?: StatusRodada, signal?: AbortSignal) {
  return requisicao<Esquemas['RodadaResponse'][]>('/api/rodadas', {
    parametros: { status },
    signal,
  })
}

/** Só ADMIN. */
export function buscarAcompanhamento(rodadaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['AcompanhamentoResponse']>(`/api/rodadas/${rodadaId}/acompanhamento`, {
    signal,
  })
}
