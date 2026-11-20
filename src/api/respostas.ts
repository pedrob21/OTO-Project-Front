import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

/** Só PARCEIRO. */
export function listarPendencias(signal?: AbortSignal) {
  return requisicao<Esquemas['PendenciaResponse'][]>('/api/respostas/pendencias', { signal })
}
