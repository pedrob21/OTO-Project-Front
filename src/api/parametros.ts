import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

export function buscarParametrosVigentes(data?: string, signal?: AbortSignal) {
  return requisicao<Esquemas['ParametroResponse']>('/api/parametros-calculo/vigente', {
    parametros: { data },
    signal,
  })
}
