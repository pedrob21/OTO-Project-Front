import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

export function buscarReferencias(signal?: AbortSignal) {
  return requisicao<Esquemas['Referencias']>('/api/referencias', { signal })
}
