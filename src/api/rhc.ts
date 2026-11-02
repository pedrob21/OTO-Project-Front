import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

/** Só ADMIN e VISUALIZADOR: o PARCEIRO recebe 403. */
export function buscarRhcVigente(data?: string, signal?: AbortSignal) {
  return requisicao<Esquemas['RhcResponse']>('/api/rhc/vigente', { parametros: { data }, signal })
}
