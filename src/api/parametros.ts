import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

export function buscarParametrosVigentes(data?: string, signal?: AbortSignal) {
  return requisicao<Esquemas['ParametroResponse']>('/api/parametros-calculo/vigente', {
    parametros: { data },
    signal,
  })
}

/** ADMIN e VISUALIZADOR. Todas as vigências. */
export function listarParametros(signal?: AbortSignal) {
  return requisicao<Esquemas['ParametroResponse'][]>('/api/parametros-calculo', { signal })
}

/** Só ADMIN. Nova vigência. */
export function criarParametros(dados: Esquemas['ParametroRequest']) {
  return requisicao<Esquemas['ParametroResponse']>('/api/parametros-calculo', {
    metodo: 'POST',
    corpo: dados,
  })
}

/** Só ADMIN, e só se nenhum resultado publicado usou a vigência. */
export function alterarParametros(id: number, dados: Esquemas['ParametroRequest']) {
  return requisicao<Esquemas['ParametroResponse']>(`/api/parametros-calculo/${id}`, {
    metodo: 'PUT',
    corpo: dados,
  })
}

/** Só ADMIN, e só se nenhum resultado publicado usou a vigência. */
export function excluirParametros(id: number) {
  return requisicao<void>(`/api/parametros-calculo/${id}`, { metodo: 'DELETE' })
}
