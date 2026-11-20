import { render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { limparSessao, salvarSessao } from '@/api/sessao'
import { useAuth } from '@/features/auth/AuthContext'
import { App } from './App'
import { Providers } from './Providers'
import { rotas } from './rotas'

type Resposta = { status?: number; corpo?: unknown }
let respostas: Record<string, Resposta>

const fetchFalso = vi.fn(async (url: string) => {
  const caminho = new URL(url).pathname
  const { status = 200, corpo } = respostas[caminho] ?? { status: 404, corpo: {} }
  return new Response(JSON.stringify(corpo), { status })
})

function comSessao() {
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
}

function abrir(caminho: string, estado?: unknown) {
  const router = createMemoryRouter(rotas, {
    initialEntries: [{ pathname: caminho, state: estado }],
  })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

beforeEach(() => {
  respostas = {
    '/api/referencias': { corpo: { feriados: [], tiposHospedagem: [] } },
    '/api/rodadas': { corpo: [] },
    '/api/respostas/pendencias': { corpo: [] },
  }
  fetchFalso.mockClear()
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
  limparSessao()
})

describe('App', () => {
  it('sem sessão, abre no login', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument()
  })
})

describe('useAuth', () => {
  it('fora do AuthProvider avisa o erro de uso', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth precisa estar dentro de AuthProvider',
    )

    vi.mocked(console.error).mockRestore()
  })
})

describe('login', () => {
  it('quem já entrou e abre o login vai para o painel', async () => {
    comSessao()
    respostas['/api/me'] = { corpo: { id: 1, nome: 'Ana Lima', perfil: 'VISUALIZADOR' } }

    const router = abrir('/login')

    expect(
      await screen.findByRole('heading', { name: 'Painel de indicadores do turismo' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('resposta de login sem token é tratada como erro', async () => {
    respostas['/api/auth/login'] = { corpo: { usuario: { id: 1 } } }
    abrir('/login')

    await userEvent.type(await screen.findByLabelText('E-mail'), 'a@oto.test')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Resposta de login sem token.')).toBeInTheDocument()
  })
})

describe('painel por perfil', () => {
  it('o VISUALIZADOR não vê o cartão de pesquisas', async () => {
    comSessao()
    respostas['/api/me'] = { corpo: { id: 1, nome: 'Ana Lima', perfil: 'VISUALIZADOR' } }

    abrir('/')

    await screen.findByRole('heading', { name: 'Painel de indicadores do turismo' })
    expect(screen.getByRole('heading', { name: /Taxa de ocupação hoteleira/ })).toBeInTheDocument()
    expect(screen.queryByText(/Pesquisas com os parceiros/)).not.toBeInTheDocument()
    expect(fetchFalso.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/api/me'])
  })

  it('o PARCEIRO vê o cartão com as pesquisas dele', async () => {
    comSessao()
    respostas['/api/me'] = { corpo: { id: 2, nome: 'Pousada Sol', perfil: 'PARCEIRO' } }

    abrir('/')

    await screen.findByRole('heading', { name: 'Painel de indicadores do turismo' })
    await vi.waitFor(() =>
      expect(fetchFalso.mock.calls.map(([url]) => new URL(url).pathname)).toContain(
        '/api/respostas/pendencias',
      ),
    )
  })
})

describe('nova pesquisa', () => {
  it('o ADMIN abre a página, carregada sob demanda', async () => {
    comSessao()
    respostas['/api/me'] = { corpo: { id: 1, nome: 'Admin OTO', perfil: 'ADMIN' } }

    abrir('/pesquisas/nova')

    expect(await screen.findByRole('heading', { name: 'Nova pesquisa' })).toBeInTheDocument()
    const aside = screen.getByRole('complementary', { name: 'Prévia e envio' })
    expect(within(aside).getByRole('button', { name: 'Abrir pesquisa' })).toBeInTheDocument()
  })
})
