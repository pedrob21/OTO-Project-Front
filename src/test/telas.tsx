import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { AuthContext, type Auth } from '@/features/auth/AuthContext'
import type { Usuario } from '@/types/dominio'

export const ADMIN_LOGADO: Usuario = {
  id: 1,
  nome: 'Admin OTO',
  email: 'admin@oto.test',
  perfil: 'ADMIN',
  ativo: true,
}

type OpcoesTela = {
  /** padrão da rota, como "/cadastros/estabelecimentos/:id/capacidades" */
  rota?: string
  caminho?: string
  usuario?: Usuario
}

/** Mostra uma tela com rotas, cache e o usuário logado, sem passar pelo login. */
export function abrirTela(tela: ReactNode, opcoes: OpcoesTela = {}) {
  const { rota = '/', caminho = rota, usuario = ADMIN_LOGADO } = opcoes
  const auth: Auth = {
    estado: 'autenticado',
    usuario,
    sessaoExpirou: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    tentarNovamente: vi.fn(),
  }
  const router = createMemoryRouter(
    [
      { path: rota, element: tela },
      { path: '*', element: <p>outra página</p> },
    ],
    { initialEntries: [caminho] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return router
}
