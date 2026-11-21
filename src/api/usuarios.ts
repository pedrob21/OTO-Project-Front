import type { Esquemas, Usuario } from '@/types/dominio'
import { requisicao } from './client'

/** Só ADMIN, como todo o recurso. */
export function listarUsuarios(signal?: AbortSignal) {
  return requisicao<Usuario[]>('/api/usuarios', { signal })
}

export function buscarUsuario(id: number, signal?: AbortSignal) {
  return requisicao<Usuario>(`/api/usuarios/${id}`, { signal })
}

/** Devolve o convite de primeiro acesso, que o ADMIN envia ao usuário. */
export function criarUsuario(dados: Esquemas['UsuarioRequest']) {
  return requisicao<Esquemas['UsuarioCriadoResponse']>('/api/usuarios', {
    metodo: 'POST',
    corpo: dados,
  })
}

/** O e-mail não muda depois de criado. */
export function alterarUsuario(id: number, dados: Esquemas['UsuarioAlteracaoRequest']) {
  return requisicao<Usuario>(`/api/usuarios/${id}`, { metodo: 'PUT', corpo: dados })
}

export function inativarUsuario(id: number) {
  return requisicao<void>(`/api/usuarios/${id}/inativar`, { metodo: 'POST' })
}

export function reativarUsuario(id: number) {
  return requisicao<void>(`/api/usuarios/${id}/reativar`, { metodo: 'POST' })
}

/** Convite, se o usuário ainda não definiu a senha; senão, redefinição. Só para usuário ativo. */
export function gerarLinkDeSenha(id: number) {
  return requisicao<Esquemas['LinkAcesso']>(`/api/usuarios/${id}/link-de-senha`, {
    metodo: 'POST',
  })
}
