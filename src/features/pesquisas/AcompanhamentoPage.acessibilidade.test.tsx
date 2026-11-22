import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { AcompanhamentoPage } from './AcompanhamentoPage'
import { abrirTela, simularApi } from './apiDeTeste'
import { ACOMPANHAMENTO, RODADA } from './dadosDeTesteAcompanhamento'

afterEach(() => vi.unstubAllGlobals())

describe('AcompanhamentoPage, acessibilidade', () => {
  it('não tem violações com respondentes e pendentes', async () => {
    simularApi({
      'GET /api/rodadas/5': { corpo: RODADA },
      'GET /api/rodadas/5/acompanhamento': { corpo: ACOMPANHAMENTO },
      'GET /api/referencias': {
        corpo: {
          tiposHospedagem: [
            { codigo: 'HOTEL', nome: 'Hotel' },
            { codigo: 'POUSADA', nome: 'Pousada' },
          ],
        },
      },
    })
    abrirTela(
      [{ path: '/pesquisas/:id', element: <AcompanhamentoPage hoje="2026-11-16" /> }],
      '/pesquisas/5',
    )
    await screen.findByRole('rowheader', { name: 'Hotel Thermas' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
