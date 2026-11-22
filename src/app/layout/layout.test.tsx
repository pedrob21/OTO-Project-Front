import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type Auth } from '@/features/auth/AuthContext'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
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
    {
      element: <AppLayout />,
      children: [
        { path: '/', element: <p>conteúdo</p> },
        { path: '/cadastros/usuarios', element: <p>tela de usuários</p> },
      ],
    },
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

  it('Pesquisas é link para o ADMIN', () => {
    abrir()

    expect(screen.getByRole('link', { name: 'Pesquisas' })).toHaveAttribute('href', '/pesquisas')
  })

  it('Pesquisas leva o PARCEIRO à tela de responder', () => {
    abrir({ usuario: { nome: 'Paula', perfil: 'PARCEIRO' } })

    expect(screen.getByRole('link', { name: 'Pesquisas' })).toHaveAttribute(
      'href',
      '/pesquisas/responder',
    )
  })

  it('Meu estabelecimento é link só para o PARCEIRO', () => {
    abrir({ usuario: { nome: 'Paula', perfil: 'PARCEIRO' } })

    expect(screen.getByRole('link', { name: 'Meu estabelecimento' })).toHaveAttribute(
      'href',
      '/meu-estabelecimento',
    )
  })

  it.each(['ADMIN', 'VISUALIZADOR'] as const)('%s não vê Meu estabelecimento', (perfil) => {
    abrir({ usuario: { nome: 'Vera', perfil } })

    expect(screen.queryByText('Meu estabelecimento')).not.toBeInTheDocument()
  })

  it('Relatórios é link para todos os perfis', () => {
    abrir({ usuario: { nome: 'Vera', perfil: 'VISUALIZADOR' } })

    expect(screen.getByRole('link', { name: 'Relatórios' })).toHaveAttribute('href', '/relatorios')
  })

  it('Indicadores é link para todos os perfis', () => {
    abrir({ usuario: { nome: 'Paula', perfil: 'PARCEIRO' } })

    expect(screen.getByRole('link', { name: 'Indicadores' })).toHaveAttribute(
      'href',
      '/indicadores',
    )
  })

  it('nenhum item do menu fica desativado', () => {
    abrir()

    for (const botao of screen.queryAllByRole('button')) expect(botao).toBeEnabled()
  })

  it('filtra pelo perfil', () => {
    abrir({ usuario: { nome: 'Vera', perfil: 'VISUALIZADOR' } })

    expect(screen.queryByRole('link', { name: 'Pesquisas' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indicadores' })).toBeInTheDocument()
  })
})

describe('menu recolhido (celular e tablet)', () => {
  const botaoMenu = () => screen.getByRole('button', { name: 'Menu' })

  it('o botão abre e fecha o painel com a navegação', async () => {
    abrir()
    const painel = document.getElementById(botaoMenu().getAttribute('aria-controls')!)!
    expect(botaoMenu()).toHaveAttribute('aria-expanded', 'false')
    expect(painel).toContainElement(screen.getByRole('navigation', { name: 'Principal' }))
    expect(painel).toHaveAttribute('data-aberto', 'false')

    await userEvent.click(botaoMenu())

    expect(botaoMenu()).toHaveAttribute('aria-expanded', 'true')
    expect(painel).toHaveAttribute('data-aberto', 'true')

    await userEvent.click(botaoMenu())
    expect(botaoMenu()).toHaveAttribute('aria-expanded', 'false')
  })

  it('Esc fecha e devolve o foco ao botão', async () => {
    abrir()
    await userEvent.click(botaoMenu())
    screen.getByRole('link', { name: 'Painel' }).focus()

    await userEvent.keyboard('{Escape}')

    expect(botaoMenu()).toHaveAttribute('aria-expanded', 'false')
    expect(botaoMenu()).toHaveFocus()
  })

  it('fecha ao trocar de página', async () => {
    abrir()
    await userEvent.click(botaoMenu())
    await userEvent.click(screen.getByRole('button', { name: 'Cadastros' }))

    await userEvent.click(screen.getByRole('link', { name: 'Usuários' }))

    expect(await screen.findByText('tela de usuários')).toBeInTheDocument()
    expect(botaoMenu()).toHaveAttribute('aria-expanded', 'false')
  })

  it('o cabeçalho, com o menu aberto, não tem violações de acessibilidade', async () => {
    abrir({ usuario: { nome: 'Paula', perfil: 'PARCEIRO' } })
    await userEvent.click(botaoMenu())

    expect(await violacoesDeAcessibilidade(document.body, { verificarRegioes: true })).toEqual([])
  })
})

describe('submenu Cadastros', () => {
  const botao = () => screen.getByRole('button', { name: 'Cadastros' })

  it('o ADMIN abre e navega para uma tela', async () => {
    abrir()
    expect(botao()).toBeEnabled()
    expect(botao()).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(botao())

    expect(botao()).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('link', { name: 'Usuários' }))

    expect(await screen.findByText('tela de usuários')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
    expect(botao()).toHaveAttribute('aria-expanded', 'false')
  })

  it('lista Inventário com o destino do catálogo', async () => {
    abrir()

    await userEvent.click(botao())

    expect(screen.getByRole('link', { name: 'Inventário' })).toHaveAttribute(
      'href',
      '/cadastros/inventario',
    )
  })

  it('abre pelo teclado e Esc fecha, devolvendo o foco', async () => {
    abrir()
    botao().focus()

    await userEvent.keyboard('{Enter}')
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Usuários' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
    expect(botao()).toHaveFocus()
  })

  it('clicar fora fecha', async () => {
    abrir()
    await userEvent.click(botao())

    await userEvent.click(screen.getByText('conteúdo'))

    expect(botao()).toHaveAttribute('aria-expanded', 'false')
  })

  it.each(['PARCEIRO', 'VISUALIZADOR'] as const)('%s não vê Cadastros', (perfil) => {
    abrir({ usuario: { nome: 'Paula', perfil } })

    expect(screen.queryByRole('button', { name: 'Cadastros' })).not.toBeInTheDocument()
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
    expect(screen.getByRole('menuitem', { name: 'Trocar senha' })).toHaveFocus()
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
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Trocar senha' })).toHaveFocus(),
    )
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    expect(sair).toHaveBeenCalledOnce()
  })

  it('oferece o link para trocar a senha', async () => {
    abrir()
    await userEvent.click(botao())

    expect(screen.getByRole('menuitem', { name: 'Trocar senha' })).toHaveAttribute(
      'href',
      '/minha-senha',
    )
  })

  it('setas percorrem os itens em ciclo', async () => {
    abrir()
    await userEvent.click(botao())

    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Trocar senha' })).toHaveFocus()
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
