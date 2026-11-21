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
        children: [
          { path: '/', element: <PainelPage /> },
          {
            path: '/resultados/:campanhaId',
            lazy: async () => ({
              Component: (await import('@/features/resultados/ResultadoCampanhaPage'))
                .ResultadoCampanhaPage,
            }),
          },
          {
            element: <RequirePerfil perfis={['ADMIN']} />,
            children: [
              {
                path: '/pesquisas',
                lazy: async () => ({
                  Component: (await import('@/features/pesquisas/RodadasPage')).RodadasPage,
                }),
              },
              {
                path: '/pesquisas/:id',
                lazy: async () => ({
                  Component: (await import('@/features/pesquisas/AcompanhamentoPage'))
                    .AcompanhamentoPage,
                }),
              },
              {
                path: '/pesquisas/:id/campanhas/:campanhaId/respostas/:estabelecimentoId',
                lazy: async () => ({
                  Component: (await import('@/features/pesquisas/LancarRespostaPage'))
                    .LancarRespostaPage,
                }),
              },
              {
                path: '/pesquisas/:id/campanhas/:campanhaId/previa',
                lazy: async () => ({
                  Component: (await import('@/features/pesquisas/PreviaPage')).PreviaPage,
                }),
              },
              {
                path: '/pesquisas/nova',
                lazy: async () => ({
                  Component: (await import('@/features/pesquisas/NovaPesquisaPage'))
                    .NovaPesquisaPage,
                }),
              },
              {
                path: '/cadastros/usuarios',
                lazy: async () => ({
                  Component: (await import('@/features/cadastros/usuarios/UsuariosPage'))
                    .UsuariosPage,
                }),
              },
              {
                path: '/cadastros/estabelecimentos',
                lazy: async () => ({
                  Component: (
                    await import('@/features/cadastros/estabelecimentos/EstabelecimentosPage')
                  ).EstabelecimentosPage,
                }),
              },
            ],
          },
          {
            element: <RequirePerfil perfis={['PARCEIRO']} />,
            children: [
              {
                path: '/pesquisas/responder',
                lazy: async () => ({
                  Component: (await import('@/features/pesquisas/ResponderPesquisaPage'))
                    .ResponderPesquisaPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
]
