import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { InventarioDoEstabelecimentoPage } from './InventarioDoEstabelecimentoPage'

const CATALOGO = [
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
]

afterEach(() => vi.unstubAllGlobals())

describe('InventarioDoEstabelecimentoPage', () => {
  it('mostra o nome do estabelecimento e o inventário completo, com os grupos da Secretaria', async () => {
    const api = criarApiFalsa({
      'GET /api/estabelecimentos/12': {
        corpo: { id: 12, dados: { nomeFantasia: 'Hotel Exemplo' } },
      },
      'GET /api/inventario/catalogo': { corpo: CATALOGO },
      'GET /api/estabelecimentos/12/inventario': {
        corpo: { estabelecimentoId: 12, itens: [{ itemId: 30 }] },
      },
      'PUT /api/estabelecimentos/12/inventario': { corpo: { estabelecimentoId: 12, itens: [] } },
    })
    abrirTela(<InventarioDoEstabelecimentoPage />, {
      rota: '/cadastros/estabelecimentos/:id/inventario',
      caminho: '/cadastros/estabelecimentos/12/inventario',
    })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Inventário do estabelecimento' }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/de Hotel Exemplo/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Estabelecimentos' })).toHaveAttribute(
      'href',
      '/cadastros/estabelecimentos',
    )
    expect(await screen.findByRole('checkbox', { name: 'Selo verde' })).toBeChecked()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Piscina' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar inventário' }))

    expect(await screen.findByText('Inventário salvo.')).toBeInTheDocument()
    expect(api.envios()[0]?.corpo).toEqual({ itens: [{ itemId: 10 }, { itemId: 30 }] })
  })
})
