import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { CapacidadesPage } from './CapacidadesPage'

const BASE = {
  id: 1,
  vigenteDesde: '2025-01-01',
  qtdUh: 40,
  qtdUhPcd: 2,
  qtdLeitos: 120,
  maxLeitosPorUh: 4,
  leitosUteis: 100,
}

beforeEach(() => {
  criarApiFalsa({
    'GET /api/estabelecimentos/12': { corpo: { id: 12, dados: { nomeFantasia: 'Hotel Exemplo' } } },
    'GET /api/estabelecimentos/12/capacidades': {
      corpo: [
        BASE,
        { ...BASE, id: 3, vigenteDesde: '2027-01-01' },
        { ...BASE, id: 2, vigenteDesde: '2026-03-01', leitosUteis: 102.5 },
      ],
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

function abrir() {
  abrirTela(<CapacidadesPage hoje="2026-11-16" />, {
    rota: '/cadastros/estabelecimentos/:id/capacidades',
    caminho: '/cadastros/estabelecimentos/12/capacidades',
  })
}

describe('CapacidadesPage, acessibilidade', () => {
  it('não tem violações na lista', async () => {
    abrir()
    await screen.findByRole('table', { name: 'Capacidades de Hotel Exemplo' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('não tem violações com o diálogo de nova vigência aberto', async () => {
    abrir()
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Nova vigência' }))
    await screen.findByRole('dialog', { name: 'Nova vigência de capacidade' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
