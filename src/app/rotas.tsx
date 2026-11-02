import type { RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequirePerfil } from '@/features/auth/RequirePerfil'
import { PainelPage } from '@/features/painel/PainelPage'

export const rotas: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequirePerfil />,
    children: [{ path: '/', element: <PainelPage /> }],
  },
]
