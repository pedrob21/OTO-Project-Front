import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

/** Só ADMIN e VISUALIZADOR: o PARCEIRO recebe 403. */
export function buscarRhcVigente(data?: string, signal?: AbortSignal) {
  return requisicao<Esquemas['RhcResponse']>('/api/rhc/vigente', { parametros: { data }, signal })
}

/** ADMIN e VISUALIZADOR. Totais por vigência. */
export function listarRhc(signal?: AbortSignal) {
  return requisicao<Esquemas['RhcResponse'][]>('/api/rhc', { signal })
}

/** Só ADMIN. Nova vigência. */
export function registrarRhc(dados: Esquemas['RhcRequest']) {
  return requisicao<Esquemas['RhcResponse']>('/api/rhc', { metodo: 'POST', corpo: dados })
}

/** Só ADMIN. Corrige um lançamento digitado errado. */
export function corrigirRhc(id: number, dados: Esquemas['RhcRequest']) {
  return requisicao<Esquemas['RhcResponse']>(`/api/rhc/${id}`, { metodo: 'PUT', corpo: dados })
}

export function excluirRhc(id: number) {
  return requisicao<void>(`/api/rhc/${id}`, { metodo: 'DELETE' })
}
