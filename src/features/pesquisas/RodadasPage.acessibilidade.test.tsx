import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { abrirTela, simularApi } from './apiDeTeste'
import { RodadasPage } from './RodadasPage'

afterEach(() => vi.unstubAllGlobals())

describe('RodadasPage, acessibilidade', () => {
  it('não tem violações com rodadas em vários estados', async () => {
    simularApi({
      'GET /api/rodadas': {
        corpo: [
          { id: 3, codigo: '003/26', titulo: 'Outubro', status: 'RASCUNHO', campanhas: [] },
          {
            id: 2,
            codigo: '002/26',
            titulo: 'Consolidada de setembro',
            status: 'ABERTA',
            prazoResposta: '2026-11-20',
            campanhas: [
              {
                id: 21,
                nome: 'Consolidada de setembro de 2026',
                periodoInicio: '2026-09-01',
                periodoFim: '2026-09-30',
              },
            ],
          },
          {
            id: 1,
            codigo: '001/26',
            titulo: 'Consolidada de agosto',
            status: 'ENCERRADA',
            prazoResposta: '2026-09-10',
            campanhas: [
              {
                id: 11,
                nome: 'Consolidada de agosto de 2026',
                publicada: true,
                publicadaEm: '2026-09-18',
              },
            ],
          },
        ],
      },
    })
    abrirTela([{ path: '/pesquisas', element: <RodadasPage hoje="2026-11-16" /> }], '/pesquisas')
    await screen.findByRole('table', { name: 'Pesquisas' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
