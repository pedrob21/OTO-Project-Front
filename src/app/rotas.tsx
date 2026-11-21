import type { RouteObject } from 'react-router'
import { DefinirSenhaPage } from '@/features/auth/DefinirSenhaPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequirePerfil } from '@/features/auth/RequirePerfil'
import { MinhaSenhaPage } from '@/features/auth/MinhaSenhaPage'
import { MetodologiaPage } from '@/features/metodologia/MetodologiaPage'
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
          { path: '/metodologia', element: <MetodologiaPage /> },
          { path: '/minha-senha', element: <MinhaSenhaPage /> },
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
              {
                path: '/cadastros/estabelecimentos/:id/capacidades',
                lazy: async () => ({
                  Component: (await import('@/features/cadastros/capacidades/CapacidadesPage'))
                    .CapacidadesPage,
                }),
              },
              {
                path: '/cadastros/parametros',
                lazy: async () => ({
                  Component: (await import('@/features/cadastros/parametros/ParametrosPage'))
                    .ParametrosPage,
                }),
              },
              {
                path: '/cadastros/rhc',
                lazy: async () => ({
                  Component: (await import('@/features/cadastros/rhc/RhcPage')).RhcPage,
                }),
              },
              {
                path: '/cadastros/referencias',
                lazy: async () => ({
                  Component: (await import('@/features/cadastros/referencias/ReferenciasPage'))
                    .ReferenciasPage,
                }),
              },
              {
                path: '/cadastros/inventario',
                lazy: async () => ({
                  Component: (await import('@/features/cadastros/inventario/InventarioPage'))
                    .InventarioPage,
                }),
              },
              {
                path: '/cadastros/historico',
                lazy: async () => ({
                  Component: (await import('@/features/cadastros/historico/HistoricoPage'))
                    .HistoricoPage,
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
