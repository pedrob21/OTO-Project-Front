import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { UsuariosPage } from './UsuariosPage'

const ADMIN = { id: 1, nome: 'Admin OTO', email: 'admin@oto.test', perfil: 'ADMIN', ativo: true }
const ANA = {
  id: 7,
  nome: 'Ana Souza',
  email: 'ana@hotel.com',
  perfil: 'PARCEIRO',
  ativo: true,
  primeiroAcessoPendente: false,
  estabelecimentos: [{ id: 12, nomeFantasia: 'Hotel Exemplo' }],
}
const VERA = {
  id: 8,
  nome: 'Vera Lima',
  email: 'vera@oto.test',
  perfil: 'VISUALIZADOR',
  ativo: false,
}

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({
    'GET /api/usuarios': { corpo: [ADMIN, ANA, VERA] },
    'GET /api/estabelecimentos': {
      corpo: [
        { id: 12, nomeFantasia: 'Hotel Exemplo', ativo: true },
        { id: 13, nomeFantasia: 'Pousada Sol', ativo: false },
      ],
    },
    ...rotas,
  })
}

beforeEach(() => preparar())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const linha = (nome: string) => screen.getByRole('row', { name: new RegExp(nome) })

async function abrirNovo() {
  abrirTela(<UsuariosPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Novo usuário' }))
  return screen.getByRole('dialog', { name: 'Novo usuário' })
}

describe('lista de usuários', () => {
  it('mostra nome, e-mail, perfil, estabelecimentos e situação', async () => {
    abrirTela(<UsuariosPage />)

    const tabela = await screen.findByRole('table', { name: 'Usuários cadastrados' })
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Nome', 'E-mail', 'Perfil', 'Estabelecimentos', 'Situação', 'Ações'])
    expect(within(linha('Ana Souza')).getByRole('rowheader')).toHaveTextContent('Ana Souza')
    expect(linha('Ana Souza')).toHaveTextContent('Parceiro')
    expect(linha('Ana Souza')).toHaveTextContent('Hotel Exemplo')
    expect(linha('Ana Souza')).toHaveTextContent('Ativo')
    expect(linha('Vera Lima')).toHaveTextContent('Inativo')
    expect(linha('Admin OTO')).toHaveTextContent('(você)')
  })

  it('sem usuários, mostra o estado vazio', async () => {
    preparar({ 'GET /api/usuarios': { corpo: [] } })
    abrirTela(<UsuariosPage />)

    expect(await screen.findByText('Nenhum usuário cadastrado')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('erro ao carregar avisa e tenta de novo', async () => {
    preparar({
      'GET /api/usuarios': [
        { status: 500, corpo: { detail: 'Falha no banco.' } },
        { corpo: [ANA] },
      ],
    })
    abrirTela(<UsuariosPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os usuários.',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Falha no banco.')

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('row', { name: /Ana Souza/ })).toBeInTheDocument()
  })
})

describe('novo usuário', () => {
  it('cria um visualizador e mostra o convite com a validade', async () => {
    preparar({
      'POST /api/usuarios': {
        status: 201,
        corpo: {
          usuario: { id: 9, nome: 'Rui Alves', perfil: 'VISUALIZADOR', ativo: true },
          convite: { token: 'f3K9', tipo: 'CONVITE', expiraEm: '2026-10-28T14:00:00Z' },
        },
      },
    })
    const dialogo = await abrirNovo()
    expect(within(dialogo).getByLabelText('Nome')).toHaveFocus()

    await userEvent.type(within(dialogo).getByLabelText('Nome'), '  Rui Alves ')
    await userEvent.type(within(dialogo).getByLabelText('E-mail'), 'rui@oto.test')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Perfil'), 'VISUALIZADOR')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))

    const criado = await screen.findByRole('dialog', { name: 'Usuário criado' })
    expect(api.envios()).toEqual([
      expect.objectContaining({
        caminho: '/api/usuarios',
        corpo: {
          nome: 'Rui Alves',
          email: 'rui@oto.test',
          perfil: 'VISUALIZADOR',
          estabelecimentoIds: [],
        },
      }),
    ])
    expect(within(criado).getByLabelText('Link de acesso')).toHaveValue(
      `${window.location.origin}/definir-senha?token=f3K9`,
    )
    expect(criado).toHaveTextContent('Vale até 28/10/2026 às 11:00 e só pode ser usado uma vez.')
    expect(criado).toHaveTextContent(
      'Envie este link para Rui Alves definir a senha do primeiro acesso.',
    )

    const usuario = userEvent.setup()
    await usuario.click(within(criado).getByRole('button', { name: 'Copiar link' }))

    expect(await within(criado).findByText('Link copiado.')).toBeInTheDocument()
    await expect(navigator.clipboard.readText()).resolves.toBe(
      `${window.location.origin}/definir-senha?token=f3K9`,
    )
  })

  it('PARCEIRO precisa de ao menos um estabelecimento', async () => {
    preparar({
      'POST /api/usuarios': {
        status: 201,
        corpo: { usuario: { id: 9, nome: 'Paulo' }, convite: { token: 't', tipo: 'CONVITE' } },
      },
    })
    const dialogo = await abrirNovo()
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'Paulo')
    await userEvent.type(within(dialogo).getByLabelText('E-mail'), 'paulo@hotel.com')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Perfil'), 'PARCEIRO')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))

    expect(
      within(dialogo).getByText('Escolha ao menos um estabelecimento para o parceiro.'),
    ).toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)
    expect(
      within(dialogo).getByRole('checkbox', { name: 'Pousada Sol (inativo)' }),
    ).toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('checkbox', { name: 'Hotel Exemplo' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))

    await screen.findByRole('dialog', { name: 'Usuário criado' })
    expect(api.envios()[0]?.corpo).toMatchObject({ perfil: 'PARCEIRO', estabelecimentoIds: [12] })
  })

  it('campos obrigatórios e e-mail inválido não vão para a API', async () => {
    const dialogo = await abrirNovo()
    await userEvent.type(within(dialogo).getByLabelText('E-mail'), 'ana@')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))

    expect(within(dialogo).getByText('Informe o nome.')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialogo).getByText('Escolha o perfil.')).toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)
  })

  it('e-mail repetido, recusado pela API, aparece no campo', async () => {
    preparar({
      'POST /api/usuarios': {
        status: 422,
        corpo: { status: 422, detail: 'Já existe um usuário com este e-mail.' },
      },
    })
    const dialogo = await abrirNovo()
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'Ana')
    await userEvent.type(within(dialogo).getByLabelText('E-mail'), 'ana@hotel.com')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Perfil'), 'VISUALIZADOR')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))

    expect(
      await within(dialogo).findByText('Já existe um usuário com este e-mail.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialogo).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('erro de validação da API marca o campo e avisa no topo', async () => {
    preparar({
      'POST /api/usuarios': {
        status: 400,
        corpo: {
          detail: 'Corrija os campos indicados.',
          campos: { nome: 'tamanho deve ser entre 0 e 150' },
        },
      },
    })
    const dialogo = await abrirNovo()
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'Ana')
    await userEvent.type(within(dialogo).getByLabelText('E-mail'), 'ana@hotel.com')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Perfil'), 'ADMIN')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar usuário' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Corrija os campos indicados.',
    )
    expect(within(dialogo).getByText('tamanho deve ser entre 0 e 150')).toBeInTheDocument()
  })

  it('Esc fecha sem salvar e devolve o foco ao botão', async () => {
    await abrirNovo()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo usuário' })).toHaveFocus()
    expect(api.envios()).toHaveLength(0)
  })
})

describe('edição', () => {
  it('altera nome e estabelecimentos, sem mandar o e-mail', async () => {
    preparar({ 'PUT /api/usuarios/7': { corpo: { ...ANA, nome: 'Ana S. Souza' } } })
    abrirTela(<UsuariosPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Ana Souza' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar Ana Souza' })
    expect(within(dialogo).getByLabelText('E-mail')).toBeDisabled()
    expect(within(dialogo).getByRole('checkbox', { name: 'Hotel Exemplo' })).toBeChecked()

    await userEvent.clear(within(dialogo).getByLabelText('Nome'))
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'Ana S. Souza')
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: 'Pousada Sol (inativo)' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.envios()).toEqual([
      expect.objectContaining({
        metodo: 'PUT',
        caminho: '/api/usuarios/7',
        corpo: { nome: 'Ana S. Souza', perfil: 'PARCEIRO', estabelecimentoIds: [12, 13] },
      }),
    ])
    expect(screen.getByRole('status')).toHaveTextContent('Usuário Ana S. Souza alterado.')
  })

  it('o próprio ADMIN não muda o perfil nem se inativa', async () => {
    abrirTela(<UsuariosPage />)
    await screen.findByRole('table')

    expect(
      within(linha('Admin OTO')).queryByRole('button', { name: /Inativar/ }),
    ).not.toBeInTheDocument()
    expect(
      within(linha('Ana Souza')).getByRole('button', { name: 'Inativar Ana Souza' }),
    ).toBeEnabled()

    await userEvent.click(screen.getByRole('button', { name: 'Editar Admin OTO' }))

    const dialogo = screen.getByRole('dialog', { name: 'Editar Admin OTO' })
    expect(within(dialogo).getByLabelText('Perfil')).toBeDisabled()
    expect(within(dialogo).getByLabelText('Perfil')).toHaveAccessibleDescription(
      'Você não pode tirar o seu próprio perfil de administrador.',
    )
  })

  it('se a API recusar a mudança do próprio perfil, mostra o motivo', async () => {
    preparar({
      'PUT /api/usuarios/1': {
        status: 422,
        corpo: { detail: 'Você não pode tirar o seu próprio perfil de administrador.' },
      },
    })
    abrirTela(<UsuariosPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Admin OTO' }))
    const dialogo = screen.getByRole('dialog')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(within(dialogo).getByLabelText('Perfil')).toHaveAttribute('aria-invalid', 'true'),
    )
    expect(within(dialogo).getByLabelText('Perfil')).toHaveAccessibleDescription(
      'Você não pode tirar o seu próprio perfil de administrador.',
    )
  })
})

describe('situação e link de senha', () => {
  it('inativa e reativa', async () => {
    preparar({
      'POST /api/usuarios/7/inativar': { status: 204 },
      'POST /api/usuarios/8/reativar': { status: 204 },
    })
    abrirTela(<UsuariosPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Inativar Ana Souza' }))
    expect(await screen.findByText('Usuário Ana Souza inativado.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reativar Vera Lima' }))
    expect(await screen.findByText('Usuário Vera Lima reativado.')).toBeInTheDocument()

    expect(api.envios().map((chamada) => chamada.caminho)).toEqual([
      '/api/usuarios/7/inativar',
      '/api/usuarios/8/reativar',
    ])
    expect(api.chamadas.filter((chamada) => chamada.caminho === '/api/usuarios')).toHaveLength(3)
  })

  it('erro ao inativar mostra o motivo da API', async () => {
    preparar({
      'POST /api/usuarios/7/inativar': {
        status: 422,
        corpo: { detail: 'Você não pode inativar o seu próprio usuário.' },
      },
    })
    abrirTela(<UsuariosPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Inativar Ana Souza' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível inativar Ana Souza.')
    expect(alerta).toHaveTextContent('Você não pode inativar o seu próprio usuário.')
  })

  it('gera o link de senha e mostra como o do convite', async () => {
    preparar({
      'POST /api/usuarios/7/link-de-senha': {
        corpo: { token: 'novo token', tipo: 'REDEFINICAO_SENHA', expiraEm: '2026-11-22T15:30:00Z' },
      },
    })
    abrirTela(<UsuariosPage />)
    expect(
      within(await screen.findByRole('row', { name: /Vera Lima/ })).queryByRole('button', {
        name: /Gerar link/,
      }),
    ).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar link de senha para Ana Souza' }),
    )

    const dialogo = await screen.findByRole('dialog', { name: 'Link de senha de Ana Souza' })
    expect(within(dialogo).getByLabelText('Link de acesso')).toHaveValue(
      `${window.location.origin}/definir-senha?token=novo%20token`,
    )
    expect(dialogo).toHaveTextContent('definir uma nova senha')
    expect(dialogo).toHaveTextContent('Vale até 22/11/2026 às 12:30')

    const usuario = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('negado'))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Copiar link' }))
    expect(await within(dialogo).findByText(/Não foi possível copiar/)).toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Concluir' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
