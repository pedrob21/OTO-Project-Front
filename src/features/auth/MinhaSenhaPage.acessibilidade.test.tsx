import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '@/app/Providers'
import { rotas } from '@/app/rotas'
import { limparSessao, salvarSessao } from '@/api/sessao'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'

beforeEach(() => {
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ id: 2, nome: 'Rita Parceira', perfil: 'PARCEIRO' })),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  limparSessao()
})

describe('MinhaSenhaPage, acessibilidade', () => {
  it('não tem violações dentro do layout', async () => {
    const router = createMemoryRouter(rotas, { initialEntries: ['/minha-senha'] })
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    )
    await screen.findByLabelText('Senha atual')

    expect(await violacoesDeAcessibilidade(document.body, { verificarRegioes: true })).toEqual([])
  })
})
