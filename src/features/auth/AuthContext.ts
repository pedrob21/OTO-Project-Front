import { createContext, useContext } from 'react'
import type { Usuario } from '@/types/dominio'

export type Auth = {
  /** `erro`: há sessão, mas não foi possível buscar o usuário (API fora do ar, por exemplo) */
  estado: 'carregando' | 'anonimo' | 'autenticado' | 'erro'
  usuario: Usuario | null
  sessaoExpirou: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
  tentarNovamente: () => void
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return auth
}
