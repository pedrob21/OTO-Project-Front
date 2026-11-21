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

    expect(
      await screen.findByRole('heading', { name: 'Painel de indicadores do turismo' }),
    ).toBeInTheDocument()
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

    expect(
      await screen.findByRole('heading', { name: 'Painel de indicadores do turismo' }),
    ).toBeInTheDocument()
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

    expect(
      await screen.findByRole('heading', { name: 'Painel de indicadores do turismo' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(lerToken()).toBe('novo')
    // os dados do usuário vêm do login: não precisa chamar /api/me
    const caminhos = fetchFalso.mock.calls.map(([url]) => new URL(String(url)).pathname)
    expect(caminhos[0]).toBe('/api/auth/login')
    expect(caminhos).not.toContain('/api/me')
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

    await userEvent.click(await screen.findByRole('button', { name: /Admin OTO/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(lerToken()).toBeNull()
    expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument()
  })
})

const USUARIOS = {
  ADMIN,
  PARCEIRO: { id: 2, nome: 'Pousada Sol', perfil: 'PARCEIRO' },
  VISUALIZADOR: { id: 3, nome: 'Vera', perfil: 'VISUALIZADOR' },
} as const

type Perfil = keyof typeof USUARIOS

/** FE-05: cada rota das pesquisas, nos três perfis e sem sessão. */
const ROTAS_DAS_PESQUISAS: { caminho: string; titulo: string | RegExp; perfis: Perfil[] }[] = [
  { caminho: '/pesquisas', titulo: 'Pesquisas', perfis: ['ADMIN'] },
  { caminho: '/pesquisas/2', titulo: 'Consolidada de setembro', perfis: ['ADMIN'] },
  {
    caminho: '/pesquisas/2/campanhas/21/respostas/7',
    titulo: 'Lançar resposta',
    perfis: ['ADMIN'],
  },
  { caminho: '/pesquisas/responder', titulo: 'Responder pesquisa', perfis: ['PARCEIRO'] },
  {
    caminho: '/pesquisas/2/campanhas/21/previa',
    titulo: 'Prévia e publicação',
    perfis: ['ADMIN'],
  },
  {
    caminho: '/resultados/21',
    titulo: 'Consolidada de setembro de 2026',
    perfis: ['ADMIN', 'PARCEIRO', 'VISUALIZADOR'],
  },
]

/** O que a API devolve para as telas que precisam de dados para mostrar o título. */
const CORPOS: Record<string, unknown> = {
  '/api/rodadas/2': {
    id: 2,
    codigo: '002/26',
    titulo: 'Consolidada de setembro',
    status: 'ABERTA',
  },
  '/api/rodadas/2/acompanhamento': { rodadaId: 2, campanhas: [] },
  '/api/campanhas/21/resultado': { campanha: { id: 21, nome: 'Consolidada de setembro de 2026' } },
}

function apiDoPerfil(perfil: Perfil) {
  fetchFalso.mockImplementation(async (url) => {
    const caminho = new URL(String(url)).pathname
    if (caminho === '/api/me') return json(200, USUARIOS[perfil])
    return json(200, CORPOS[caminho] ?? [])
  })
}

describe.each(ROTAS_DAS_PESQUISAS)('rota $caminho', ({ caminho, titulo, perfis }) => {
  it.each(['ADMIN', 'PARCEIRO', 'VISUALIZADOR'] as const)('perfil %s', async (perfil) => {
    comSessao()
    apiDoPerfil(perfil)

    abrir(caminho)

    if (perfis.includes(perfil)) {
      expect(
        await screen.findByRole('heading', { level: 1, name: titulo }, { timeout: 3000 }),
      ).toBeInTheDocument()
    } else {
      expect(await screen.findByText('Sem permissão para esta página')).toBeInTheDocument()
      const caminhos = fetchFalso.mock.calls.map(([url]) => new URL(String(url)).pathname)
      expect(caminhos).toEqual(['/api/me'])
    }
  })

  it('sem sessão, vai para o login', async () => {
    const router = abrir(caminho)

    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})

// FE-05: as telas de Cadastros são só do ADMIN.
const ROTAS_CADASTRO = [
  { caminho: '/cadastros/usuarios', titulo: 'Usuários' },
  { caminho: '/cadastros/estabelecimentos', titulo: 'Estabelecimentos' },
  { caminho: '/cadastros/estabelecimentos/12/capacidades', titulo: 'Capacidade de hospedagem' },
  { caminho: '/cadastros/parametros', titulo: 'Parâmetros de cálculo' },
  { caminho: '/cadastros/rhc', titulo: 'Hospedagem caseira (RHC)' },
  { caminho: '/cadastros/referencias', titulo: 'Referências' },
  { caminho: '/cadastros/historico', titulo: 'Série histórica' },
]

describe.each(ROTAS_CADASTRO)('$caminho', ({ caminho, titulo }) => {
  function responderComo(perfil: string) {
    fetchFalso.mockImplementation(async (url) => {
      const { pathname } = new URL(String(url))
      return pathname === '/api/me' ? json(200, { ...ADMIN, perfil }) : json(200, [])
    })
  }

  it('ADMIN vê a tela', async () => {
    comSessao()
    responderComo('ADMIN')

    abrir(caminho)

    expect(
      await screen.findByRole('heading', { level: 1, name: titulo }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it.each(['PARCEIRO', 'VISUALIZADOR'])('%s vê o aviso de sem permissão', async (perfil) => {
    comSessao()
    responderComo(perfil)

    abrir(caminho)

    expect(await screen.findByText('Sem permissão para esta página')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: titulo })).not.toBeInTheDocument()
    const caminhos = fetchFalso.mock.calls.map(([url]) => new URL(String(url)).pathname)
    expect(caminhos).toEqual(['/api/me'])
  })

  it('sem sessão, vai para o login', async () => {
    const router = abrir(caminho)

    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})

describe('acesso por perfil', () => {
  const PERFIS = ['ADMIN', 'PARCEIRO', 'VISUALIZADOR'] as const

  const AUTENTICADAS = [
    { caminho: '/', titulo: 'Painel de indicadores do turismo', perfis: PERFIS },
    { caminho: '/minha-senha', titulo: 'Trocar senha', perfis: PERFIS },
    {
      caminho: '/metodologia',
      titulo: 'Como calculamos a taxa de ocupação e o fluxo de turistas',
      perfis: PERFIS,
    },
    { caminho: '/pesquisas/nova', titulo: 'Nova pesquisa', perfis: ['ADMIN'] },
  ]

  function responder(perfil: string) {
    fetchFalso.mockImplementation(async (url) => {
      const { pathname } = new URL(String(url))
      if (pathname === '/api/me') return json(200, { ...ADMIN, perfil })
      return json(200, pathname === '/api/parametros-calculo/vigente' ? {} : [])
    })
  }

  describe.each(AUTENTICADAS)('$caminho', ({ caminho, titulo, perfis }) => {
    it.each(PERFIS)('%s', async (perfil) => {
      comSessao()
      responder(perfil)

      abrir(caminho)

      if (perfis.some((permitido) => permitido === perfil)) {
        expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
      } else {
        expect(await screen.findByText('Sem permissão para esta página')).toBeInTheDocument()
      }
    })

    it('sem sessão, vai para o login', async () => {
      const router = abrir(caminho)

      expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/login')
    })
  })

  it('o painel leva à página de metodologia pelo link', async () => {
    comSessao()
    responder('VISUALIZADOR')
    const router = abrir('/')

    await userEvent.click(
      await screen.findByRole('link', {
        name: 'Como calculamos a taxa de ocupação e o fluxo de turistas',
      }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/metodologia'))
  })

  it('o menu do usuário leva à troca de senha', async () => {
    comSessao()
    responder('PARCEIRO')
    const router = abrir('/')

    await userEvent.click(await screen.findByRole('button', { name: /Admin OTO/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Trocar senha' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/minha-senha'))
  })

  describe('/definir-senha', () => {
    it('abre sem sessão e sem chamar a API', async () => {
      const router = abrir('/definir-senha?token=abc')

      expect(await screen.findByRole('heading', { name: 'Definir senha' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/definir-senha')
      expect(fetchFalso).not.toHaveBeenCalled()
    })

    it.each(PERFIS)('%s com sessão também abre', async (perfil) => {
      comSessao()
      responder(perfil)

      abrir('/definir-senha?token=abc')

      expect(await screen.findByRole('heading', { name: 'Definir senha' })).toBeInTheDocument()
    })
  })
})
