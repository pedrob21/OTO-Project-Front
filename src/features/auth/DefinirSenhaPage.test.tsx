import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '@/app/Providers'
import { rotas } from '@/app/rotas'
import { limparSessao } from '@/api/sessao'

const fetchFalso = vi.fn<typeof fetch>()

function abrir(caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

async function preencher(nova: string, confirmacao: string) {
  await userEvent.type(screen.getByLabelText('Nova senha'), nova)
  await userEvent.type(screen.getByLabelText('Confirmar senha'), confirmacao)
  await userEvent.click(screen.getByRole('button', { name: 'Definir senha' }))
}

beforeEach(() => {
  fetchFalso.mockReset()
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
  limparSessao()
})

describe('DefinirSenhaPage', () => {
  it('mostra os campos e o botão', async () => {
    abrir('/definir-senha?token=abc')

    expect(await screen.findByRole('heading', { name: 'Definir senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Definir senha' })).toBeEnabled()
  })

  it('FE-03: senha curta é barrada antes de chamar a API', async () => {
    abrir('/definir-senha?token=abc')
    await screen.findByLabelText('Nova senha')

    await preencher('1234567', '1234567')

    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('confirmação diferente é barrada antes de chamar a API', async () => {
    abrir('/definir-senha?token=abc')
    await screen.findByLabelText('Nova senha')

    await preencher('12345678', '12345679')

    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('envia o token e a nova senha, sem Authorization, e vai ao login com aviso', async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 204 }))
    const router = abrir('/definir-senha?token=abc')
    await screen.findByLabelText('Nova senha')

    await preencher('12345678', '12345678')

    expect(await screen.findByRole('heading', { name: 'Entrar no painel' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('status')).toHaveTextContent('Senha definida.')
    const [url, init] = fetchFalso.mock.calls[0] ?? []
    expect(String(url)).toBe('http://localhost:8080/api/auth/definir-senha')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ token: 'abc', novaSenha: '12345678' })
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('link usado ou expirado mostra o detalhe da API e continua na página', async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Link expirado ou já utilizado.' }), { status: 422 }),
    )
    const router = abrir('/definir-senha?token=velho')
    await screen.findByLabelText('Nova senha')

    await preencher('12345678', '12345678')

    expect(await screen.findByRole('alert')).toHaveTextContent('Link expirado ou já utilizado.')
    expect(router.state.location.pathname).toBe('/definir-senha')
  })

  it('erro de validação da API aparece no campo', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: 'Corrija os campos indicados.',
          campos: { novaSenha: 'deve ter entre 8 e 72 caracteres' },
        }),
        { status: 400 },
      ),
    )
    abrir('/definir-senha?token=abc')
    await screen.findByLabelText('Nova senha')

    await preencher('12345678', '12345678')

    expect(await screen.findByText('deve ter entre 8 e 72 caracteres')).toBeInTheDocument()
    expect(screen.queryByText('Corrija os campos indicados.')).not.toBeInTheDocument()
  })

  it('sem token no endereço, mostra o erro e não oferece o formulário', async () => {
    abrir('/definir-senha')

    expect(await screen.findByRole('alert')).toHaveTextContent('Link inválido.')
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute('href', '/login')
    expect(fetchFalso).not.toHaveBeenCalled()
  })
})
