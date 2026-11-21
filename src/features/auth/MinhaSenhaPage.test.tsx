import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Providers } from '@/app/Providers'
import { rotas } from '@/app/rotas'
import { limparSessao, lerToken, salvarSessao } from '@/api/sessao'

const fetchFalso = vi.fn<typeof fetch>()

const PARCEIRO = { id: 2, nome: 'Rita Parceira', perfil: 'PARCEIRO' }

function abrir() {
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
  const router = createMemoryRouter(rotas, { initialEntries: ['/minha-senha'] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
}

async function preencher(atual: string, nova: string, confirmacao: string) {
  await userEvent.type(await screen.findByLabelText('Senha atual'), atual)
  await userEvent.type(screen.getByLabelText('Nova senha'), nova)
  await userEvent.type(screen.getByLabelText('Confirmar senha'), confirmacao)
  await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }))
}

function chamadasDeSenha() {
  return fetchFalso.mock.calls.filter(([url]) => String(url).endsWith('/api/me/senha'))
}

beforeEach(() => {
  fetchFalso.mockReset()
  fetchFalso.mockImplementation(async (url) =>
    String(url).endsWith('/api/me')
      ? new Response(JSON.stringify(PARCEIRO))
      : new Response(null, { status: 204 }),
  )
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
  limparSessao()
})

describe('MinhaSenhaPage', () => {
  it('abre para qualquer perfil logado, aqui o PARCEIRO', async () => {
    abrir()

    expect(await screen.findByRole('heading', { name: 'Trocar senha' })).toBeInTheDocument()
  })

  it('exige a senha atual', async () => {
    abrir()
    await screen.findByLabelText('Senha atual')

    await userEvent.type(screen.getByLabelText('Nova senha'), '12345678')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }))

    expect(screen.getByText('Informe a senha atual.')).toBeInTheDocument()
    expect(chamadasDeSenha()).toHaveLength(0)
  })

  it('barra senha curta e confirmação diferente antes de chamar a API', async () => {
    abrir()

    await preencher('antiga123', '1234567', '1234567')
    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Nova senha'))
    await userEvent.clear(screen.getByLabelText('Confirmar senha'))
    await userEvent.type(screen.getByLabelText('Nova senha'), '12345678')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), '123456789')
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }))

    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument()
    expect(chamadasDeSenha()).toHaveLength(0)
  })

  it('envia com o token, avisa o sucesso e limpa os campos', async () => {
    abrir()

    await preencher('antiga123', 'nova-senha-1', 'nova-senha-1')

    expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada com sucesso.')
    const [url, init] = chamadasDeSenha()[0] ?? []
    expect(String(url)).toBe('http://localhost:8080/api/me/senha')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({
      senhaAtual: 'antiga123',
      novaSenha: 'nova-senha-1',
    })
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer abc' })
    expect(screen.getByLabelText('Senha atual')).toHaveValue('')
    expect(screen.getByLabelText('Nova senha')).toHaveValue('')
  })

  it('senha atual incorreta mostra o erro da API e mantém a sessão', async () => {
    fetchFalso.mockImplementation(async (url) =>
      String(url).endsWith('/api/me')
        ? new Response(JSON.stringify(PARCEIRO))
        : new Response(JSON.stringify({ detail: 'A senha atual está incorreta.' }), {
            status: 422,
          }),
    )
    abrir()

    await preencher('errada123', 'nova-senha-1', 'nova-senha-1')

    expect(await screen.findByRole('alert')).toHaveTextContent('A senha atual está incorreta.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(lerToken()).toBe('abc')
  })
})
