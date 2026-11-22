import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { CATALOGO } from './dadosDeTeste'
import { InventarioPage } from './InventarioPage'

beforeEach(() => {
  criarApiFalsa({
    'GET /api/inventario/catalogo/completo': {
      corpo: CATALOGO.filter((grupo) => grupo.id !== 2),
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
