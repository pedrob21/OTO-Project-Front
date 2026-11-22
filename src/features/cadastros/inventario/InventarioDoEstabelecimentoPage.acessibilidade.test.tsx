import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { InventarioDoEstabelecimentoPage } from './InventarioDoEstabelecimentoPage'

afterEach(() => vi.unstubAllGlobals())

describe('InventarioDoEstabelecimentoPage, acessibilidade', () => {
  it('não tem violações com o inventário carregado', async () => {
    criarApiFalsa({
      'GET /api/estabelecimentos/12': {
        corpo: { id: 12, dados: { nomeFantasia: 'Hotel Exemplo' } },
      },
      'GET /api/inventario/catalogo': {
        corpo: [
          {
            id: 1,
            categoria: 'SERVICOS_EQUIPAMENTOS',
            nome: 'Lazer',
            exclusivoSecretaria: false,
            itens: [{ id: 10, nome: 'Piscina', permiteComplemento: false }],
          },
          {
            id: 2,
            categoria: 'SUSTENTABILIDADE',
            nome: 'Selos da Secretaria',
            exclusivoSecretaria: true,
            itens: [{ id: 30, nome: 'Selo verde', permiteComplemento: false }],
          },
        ],
      },
      'GET /api/estabelecimentos/12/inventario': {
        corpo: { estabelecimentoId: 12, itens: [{ itemId: 30 }] },
      },
    })
    abrirTela(<InventarioDoEstabelecimentoPage />, {
      rota: '/cadastros/estabelecimentos/:id/inventario',
      caminho: '/cadastros/estabelecimentos/12/inventario',
    })
    await screen.findByRole('checkbox', { name: 'Selo verde' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
