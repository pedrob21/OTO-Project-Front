import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

/** Só os grupos e itens ativos, para qualquer perfil. Os grupos exclusivos da Secretaria vêm marcados em `exclusivoSecretaria`; quem não é ADMIN deve escondê-los. */
export function buscarCatalogo(signal?: AbortSignal) {
  return requisicao<Esquemas['CatalogoGrupo'][]>('/api/inventario/catalogo', { signal })
}

/** Só ADMIN. Inclui os inativos e os grupos exclusivos da Secretaria. */
export function buscarCatalogoCompleto(signal?: AbortSignal) {
  return requisicao<Esquemas['CatalogoGrupo'][]>('/api/inventario/catalogo/completo', { signal })
}

/** Só ADMIN. Sem código, a API gera um a partir do nome. */
export function criarGrupo(dados: Esquemas['GrupoRequest']) {
  return requisicao<Esquemas['CatalogoGrupo']>('/api/inventario/grupos', {
    metodo: 'POST',
    corpo: dados,
  })
}

export function alterarGrupo(id: number, dados: Esquemas['GrupoRequest']) {
  return requisicao<Esquemas['CatalogoGrupo']>(`/api/inventario/grupos/${id}`, {
    metodo: 'PUT',
    corpo: dados,
  })
}

export function inativarGrupo(id: number) {
  return requisicao<void>(`/api/inventario/grupos/${id}/inativar`, { metodo: 'POST' })
}

export function reativarGrupo(id: number) {
  return requisicao<void>(`/api/inventario/grupos/${id}/reativar`, { metodo: 'POST' })
}

/** Só o que nunca foi marcado num inventário: senão, 422. */
export function excluirGrupo(id: number) {
  return requisicao<void>(`/api/inventario/grupos/${id}`, { metodo: 'DELETE' })
}

export function criarItem(grupoId: number, dados: Esquemas['ItemRequest']) {
  return requisicao<Esquemas['CatalogoItem']>(`/api/inventario/grupos/${grupoId}/itens`, {
    metodo: 'POST',
    corpo: dados,
  })
}

export function alterarItem(id: number, dados: Esquemas['ItemRequest']) {
  return requisicao<Esquemas['CatalogoItem']>(`/api/inventario/itens/${id}`, {
    metodo: 'PUT',
    corpo: dados,
  })
}

export function inativarItem(id: number) {
  return requisicao<void>(`/api/inventario/itens/${id}/inativar`, { metodo: 'POST' })
}

export function reativarItem(id: number) {
  return requisicao<void>(`/api/inventario/itens/${id}/reativar`, { metodo: 'POST' })
}

/** Só o que nunca foi marcado num inventário: senão, 422. */
export function excluirItem(id: number) {
  return requisicao<void>(`/api/inventario/itens/${id}`, { metodo: 'DELETE' })
}

export function buscarInventario(estabelecimentoId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['InventarioResponse']>(
    `/api/estabelecimentos/${estabelecimentoId}/inventario`,
    { signal },
  )
}

/** ADMIN ou PARCEIRO. O corpo substitui a lista inteira de itens marcados. */
export function salvarInventario(estabelecimentoId: number, dados: Esquemas['InventarioRequest']) {
  return requisicao<Esquemas['InventarioResponse']>(
    `/api/estabelecimentos/${estabelecimentoId}/inventario`,
    { metodo: 'PUT', corpo: dados },
  )
}
