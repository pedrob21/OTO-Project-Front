import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type Auth } from '@/features/auth/AuthContext'
import { AppLayout } from './AppLayout'

function abrir(sobrescrever: Partial<Auth> = {}) {
  const auth: Auth = {
    estado: 'autenticado',
    usuario: { nome: 'Admin OTO', email: 'admin@oto.test', perfil: 'ADMIN' },
    sessaoExpirou: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    tentarNovamente: vi.fn(),
    ...sobrescrever,
  }
  const router = createMemoryRouter([
    { element: <AppLayout />, children: [{ path: '/', element: <p>conteúdo</p> }] },
  ])
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
  return auth
}

afterEach(() => vi.restoreAllMocks())

describe('AppLayout', () => {
  it('mostra logos, conteúdo e rodapé', () => {
    abrir()

    expect(screen.getByAltText('OTO')).toBeInTheDocument()
    expect(screen.getByAltText('Prefeitura de Olímpia')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('conteúdo')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Observatório de Turismo de Olímpia')
  })
})

describe('menu principal', () => {
  it('Painel é link e está marcado como página atual', () => {
    abrir()

    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('aria-current', 'page')
  })

  it('páginas que ainda não existem aparecem desativadas', () => {
    abrir()

    for (const nome of ['Pesquisas', 'Indicadores', 'Relatórios', 'Cadastros']) {
      expect(screen.getByRole('button', { name: nome })).toBeDisabled()
    }
  })

  it('filtra pelo perfil', () => {
    abrir({ usuario: { nome: 'Vera', perfil: 'VISUALIZADOR' } })

    expect(screen.queryByRole('button', { name: 'Pesquisas' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Indicadores' })).toBeInTheDocument()
  })
})

describe('menu do usuário', () => {
  const botao = () => screen.getByRole('button', { name: /Admin OTO/ })

  it('mostra as iniciais e abre com clique', async () => {
    abrir()
    expect(botao()).toHaveTextContent('AO')
    expect(botao()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(botao())

    expect(botao()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('admin@oto.test')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toHaveFocus()
  })

  it('Esc fecha e devolve o foco ao botão', async () => {
    abrir()
    await userEvent.click(botao())

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(botao()).toHaveFocus()
  })

  it('seta para baixo abre pelo teclado e Enter sai', async () => {
    const { sair } = abrir()
    botao().focus()

    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Sair' })).toHaveFocus())
    await userEvent.keyboard('{Enter}')

    expect(sair).toHaveBeenCalledOnce()
  })

  it('clicar fora fecha', async () => {
    abrir()
    await userEvent.click(botao())

    await userEvent.click(screen.getByText('conteúdo'))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('Tab fecha', async () => {
    abrir()
    await userEvent.click(botao())

    await userEvent.tab()

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
