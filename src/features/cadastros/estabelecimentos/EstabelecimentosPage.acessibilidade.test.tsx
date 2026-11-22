import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { EstabelecimentosPage } from './EstabelecimentosPage'

beforeEach(() => {
  criarApiFalsa({
    'GET /api/estabelecimentos': {
      corpo: [
        {
          id: 12,
          nomeFantasia: 'Hotel Exemplo',
          tipoHospedagemCodigo: 'HOTEL',
          situacao: 'REGULAR',
          ativo: true,
          qtdUh: 1240,
          qtdLeitos: 3600,
        },
        {
          id: 13,
          nomeFantasia: 'Pousada Sol',
          tipoHospedagemCodigo: 'POUSADA',
          situacao: 'IRREGULAR',
          ativo: false,
        },
      ],
    },
    'GET /api/referencias': {
      corpo: {
        tiposHospedagem: [
          { codigo: 'HOTEL', nome: 'Hotel' },
          { codigo: 'POUSADA', nome: 'Pousada' },
        ],
      },
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('EstabelecimentosPage, acessibilidade', () => {
  it('não tem violações na lista', async () => {
    abrirTela(<EstabelecimentosPage hoje="2026-11-16" />)
    await screen.findByRole('row', { name: /Hotel Exemplo/ })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('não tem violações com o diálogo de novo estabelecimento aberto', async () => {
    abrirTela(<EstabelecimentosPage hoje="2026-11-16" />)
    await screen.findByRole('row', { name: /Hotel Exemplo/ })
    await userEvent.click(screen.getByRole('button', { name: 'Novo estabelecimento' }))
    await screen.findByRole('dialog', { name: 'Novo estabelecimento' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
