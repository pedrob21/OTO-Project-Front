import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { UsuariosPage } from './UsuariosPage'

beforeEach(() => {
  criarApiFalsa({
    'GET /api/usuarios': {
      corpo: [
        { id: 1, nome: 'Admin OTO', email: 'admin@oto.test', perfil: 'ADMIN', ativo: true },
        {
          id: 7,
          nome: 'Ana Souza',
          email: 'ana@hotel.com',
          perfil: 'PARCEIRO',
          ativo: true,
          primeiroAcessoPendente: false,
          estabelecimentos: [{ id: 12, nomeFantasia: 'Hotel Exemplo' }],
        },
        { id: 8, nome: 'Vera Lima', email: 'vera@oto.test', perfil: 'VISUALIZADOR', ativo: false },
      ],
    },
    'GET /api/estabelecimentos': {
      corpo: [{ id: 12, nomeFantasia: 'Hotel Exemplo', ativo: true }],
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('UsuariosPage, acessibilidade', () => {
  it('não tem violações na lista', async () => {
    abrirTela(<UsuariosPage />)
    await screen.findByRole('table', { name: 'Usuários cadastrados' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('não tem violações com o diálogo de novo usuário aberto', async () => {
    abrirTela(<UsuariosPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    await screen.findByRole('dialog', { name: 'Novo usuário' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
