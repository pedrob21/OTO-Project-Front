import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

export function buscarReferencias(signal?: AbortSignal) {
  return requisicao<Esquemas['Referencias']>('/api/referencias', { signal })
}

type Recursos = {
  'tipos-hospedagem': { pedido: Esquemas['TipoRequest']; resposta: Esquemas['TipoRef'] }
  feriados: { pedido: Esquemas['FeriadoRequest']; resposta: Esquemas['FeriadoRef'] }
  faixas: { pedido: Esquemas['FaixaRequest']; resposta: Esquemas['FaixaRef'] }
}

export type RecursoReferencia = keyof Recursos
export type PedidoReferencia<R extends RecursoReferencia> = Recursos[R]['pedido']

/** Só ADMIN. Sem código, a API gera um a partir do nome. */
export function criarReferencia<R extends RecursoReferencia>(
  recurso: R,
  dados: Recursos[R]['pedido'],
) {
  return requisicao<Recursos[R]['resposta']>(`/api/referencias/${recurso}`, {
    metodo: 'POST',
    corpo: dados,
  })
}

/** Só ADMIN. O código não muda: mande o mesmo ou nenhum. */
export function alterarReferencia<R extends RecursoReferencia>(
  recurso: R,
  codigo: string,
  dados: Recursos[R]['pedido'],
) {
  return requisicao<Recursos[R]['resposta']>(
    `/api/referencias/${recurso}/${encodeURIComponent(codigo)}`,
    { metodo: 'PUT', corpo: dados },
  )
}

/** Só ADMIN, e só o que nunca foi usado: senão, 422. */
export function excluirReferencia(recurso: RecursoReferencia, codigo: string) {
  return requisicao<void>(`/api/referencias/${recurso}/${encodeURIComponent(codigo)}`, {
    metodo: 'DELETE',
  })
}
