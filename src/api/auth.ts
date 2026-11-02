import type { Esquemas, Usuario } from '@/types/dominio'
import { requisicao } from './client'

export function entrar(credenciais: Esquemas['LoginRequest']) {
  return requisicao<Esquemas['LoginResponse']>('/api/auth/login', {
    metodo: 'POST',
    corpo: credenciais,
    autenticada: false,
  })
}

export function buscarUsuarioLogado(signal?: AbortSignal) {
  return requisicao<Usuario>('/api/me', { signal })
}
