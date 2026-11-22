import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { NovaPesquisaPage } from './NovaPesquisaPage'

afterEach(() => vi.unstubAllGlobals())

describe('NovaPesquisaPage, acessibilidade', () => {
  it('não tem violações no formulário preenchido com as sugestões', async () => {
    const corpos: Record<string, unknown> = {
      '/api/referencias': { feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 }] },
      '/api/rodadas': [{ id: 17, codigo: '017/26' }],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(JSON.stringify(corpos[new URL(url).pathname]))),
    )
    const router = createMemoryRouter(
      [{ path: '/pesquisas/nova', element: <NovaPesquisaPage hoje="2026-11-16" /> }],
      { initialEntries: ['/pesquisas/nova'] },
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await screen.findByDisplayValue('018/26')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
