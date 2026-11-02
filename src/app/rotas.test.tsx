import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lerToken, limparSessao, salvarSessao } from '@/api/sessao'
import { RequirePerfil } from '@/features/auth/RequirePerfil'
import { Providers } from './Providers'
import { rotas } from './rotas'

const fetchFalso = vi.fn<typeof fetch>()

const ADMIN = { id: 1, nome: 'Admin OTO', perfil: 'ADMIN' }

function json(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status })
}

function comSessao() {
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
}

function abrir(caminho: string, rotasDoTeste = rotas) {
  const router = createMemoryRouter(rotasDoTeste, { initialEntries: [caminho] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

async function preencherEEntrar(email = 'admin@oto.test', senha = 'segredo') {
  await userEvent.type(screen.getByLabelText('E-mail'), email)
  await userEvent.type(screen.getByLabelText('Senha'), senha)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  fetchFalso.mockReset()
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
  limparSessao()
})

describe('rota protegida', () => {
  it('sem sessão, vai para o login', async () => {
    const router = abrir('/')

    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('com sessão válida, busca o usuário e mostra a página', async () => {
    comSessao()
    fetchFalso.mockResolvedValue(json(200, ADMIN))

    abrir('/')

    expect(await screen.findByText('Entrou como Admin OTO')).toBeInTheDocument()
  })

  it('token recusado pela API volta ao login, avisa e apaga a sessão', async () => {
    comSessao()
    fetchFalso.mockResolvedValue(new Response(null, { status: 401 }))

    const router = abrir('/')

    expect(await screen.findByText(/Sua sessão expirou/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(lerToken()).toBeNull()
  })

  it('erro ao buscar o usuário não expulsa e permite tentar de novo', async () => {
    comSessao()
    fetchFalso.mockResolvedValue(new Response(null, { status: 403 }))

    abrir('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar')
    expect(lerToken()).toBe('abc')

    fetchFalso.mockResolvedValue(json(200, ADMIN))
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Entrou como Admin OTO')).toBeInTheDocument()
  })

  it('perfil sem acesso vê o aviso, não a página', async () => {
    comSessao()
    fetchFalso.mockResolvedValue(json(200, { ...ADMIN, perfil: 'PARCEIRO' }))

    abrir('/restrita', [
      {
        element: <RequirePerfil perfis={['ADMIN']} />,
        children: [{ path: '/restrita', element: <p>conteúdo restrito</p> }],
      },
    ])

    expect(await screen.findByText('Sem permissão para esta página')).toBeInTheDocument()
    expect(screen.queryByText('conteúdo restrito')).not.toBeInTheDocument()
  })
})

describe('login', () => {
  it('entra, guarda o token e volta para a página pedida', async () => {
    fetchFalso.mockResolvedValue(
      json(200, {
        token: 'novo',
        expiraEm: new Date(Date.now() + 60_000).toISOString(),
        usuario: ADMIN,
      }),
    )
    const router = abrir('/')
    await screen.findByLabelText('E-mail')

    await preencherEEntrar()

    expect(await screen.findByText('Entrou como Admin OTO')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(lerToken()).toBe('novo')
    // os dados do usuário vêm do login: não precisa chamar /api/me
    expect(fetchFalso).toHaveBeenCalledOnce()
  })

  it('senha errada mostra a mensagem da API e continua no login', async () => {
    fetchFalso.mockResolvedValue(json(401, { detail: 'E-mail ou senha incorretos.' }))
    const router = abrir('/login')

    await preencherEEntrar()

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
    expect(router.state.location.pathname).toBe('/login')
    expect(lerToken()).toBeNull()
  })

  it('erro de validação aparece no campo', async () => {
    fetchFalso.mockResolvedValue(
      json(400, { detail: 'Corrija os campos indicados.', campos: { email: 'e-mail inválido' } }),
    )
    abrir('/login')

    await preencherEEntrar('x')

    expect(await screen.findByText('e-mail inválido')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Corrija os campos indicados.')).not.toBeInTheDocument()
  })

  it('sem conexão, diz o que houve', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'))
    abrir('/login')

    await preencherEEntrar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar')
  })

  it('sair apaga a sessão e volta ao login', async () => {
    comSessao()
    fetchFalso.mockResolvedValue(json(200, ADMIN))
    const router = abrir('/')

    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(lerToken()).toBeNull()
    expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument()
  })
})
