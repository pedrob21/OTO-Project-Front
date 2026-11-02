import type { RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequirePerfil } from '@/features/auth/RequirePerfil'
import { PainelPage } from '@/features/painel/PainelPage'
import { AppLayout } from './layout/AppLayout'

export const rotas: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequirePerfil />,
    children: [
      {
        element: <AppLayout />,
        children: [{ path: '/', element: <PainelPage /> }],
      },
    ],
  },
]
