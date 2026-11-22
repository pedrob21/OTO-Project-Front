import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { InventarioPage } from './InventarioPage'

beforeEach(() => {
  criarApiFalsa({
    'GET /api/inventario/catalogo/completo': {
      corpo: [
        {
          id: 1,
          categoria: 'SERVICOS_EQUIPAMENTOS',
          codigo: 'LAZER',
          nome: 'Lazer',
          exclusivoSecretaria: false,
          ordem: 1,
          ativo: true,
          itens: [
            {
              id: 10,
              codigo: 'PISCINA',
              nome: 'Piscina',
              permiteComplemento: true,
              ordem: 1,
              ativo: true,
            },
            {
              id: 11,
              codigo: 'SAUNA',
              nome: 'Sauna',
              permiteComplemento: false,
              ordem: 2,
              ativo: false,
            },
          ],
        },
        {
          id: 3,
          categoria: 'ACESSIBILIDADE',
          codigo: 'ESTRUTURA',
          nome: 'Estrutura',
          exclusivoSecretaria: false,
          ordem: 1,
          ativo: true,
          itens: [
            {
              id: 20,
              codigo: 'RAMPA',
              nome: 'Rampa',
              permiteComplemento: false,
              ordem: 1,
              ativo: true,
            },
          ],
        },
      ],
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('InventarioPage, acessibilidade', () => {
  it('não tem violações com o catálogo carregado', async () => {
    abrirTela(<InventarioPage />)
    await screen.findByRole('tab', { name: 'Serviços e equipamentos' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
