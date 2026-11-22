import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { HistoricoPage } from './HistoricoPage'

beforeEach(() => {
  criarApiFalsa({
    'GET /api/historico': {
      corpo: [
        {
          id: 1,
          indicador: 'TAXA_OCUPACAO',
          modalidade: 'CONSOLIDADA',
          ano: 2024,
          mes: 7,
          valor: 68.4,
          fonte: 'Indicadores do Turismo 2017-2025',
        },
        {
          id: 2,
          indicador: 'FLUXO_TURISTAS',
          modalidade: 'CONSOLIDADA',
          ano: 2024,
          feriadoCodigo: 'CARNAVAL',
          valor: 98512,
          fonte: 'Indicadores do Turismo 2017-2025',
        },
      ],
    },
    'GET /api/referencias': {
      corpo: {
        feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval' }],
        tiposHospedagem: [{ codigo: 'HOTEL', nome: 'Hotel' }],
      },
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('HistoricoPage, acessibilidade', () => {
  it('não tem violações com a série e o formulário de importação', async () => {
    abrirTela(<HistoricoPage />)
    await screen.findByRole('table', { name: 'Valores da série histórica' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
