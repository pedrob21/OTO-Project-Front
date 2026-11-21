import type { RouteObject } from 'react-router'
import { DefinirSenhaPage } from '@/features/auth/DefinirSenhaPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequirePerfil } from '@/features/auth/RequirePerfil'
import { MinhaSenhaPage } from '@/features/auth/MinhaSenhaPage'
import { PainelPage } from '@/features/painel/PainelPage'
import { AppLayout } from './layout/AppLayout'

export const rotas: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/definir-senha', element: <DefinirSenhaPage /> },
  {
    element: <RequirePerfil />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <PainelPage /> },
          { path: '/minha-senha', element: <MinhaSenhaPage /> },
          {
            element: <RequirePerfil perfis={['ADMIN']} />,
            children: [
              {
                path: '/pesquisas/nova',
                lazy: async () => ({
                  Component: (await import('@/features/pesquisas/NovaPesquisaPage'))
                    .NovaPesquisaPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
]
