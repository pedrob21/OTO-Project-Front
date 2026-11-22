import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { abrirTela, simularApi } from './apiDeTeste'
import { LancarRespostaPage } from './LancarRespostaPage'

afterEach(() => vi.unstubAllGlobals())

describe('LancarRespostaPage, acessibilidade', () => {
  it('não tem violações no formulário de resposta', async () => {
    simularApi({
      'GET /api/rodadas/5': {
        corpo: {
          id: 5,
          codigo: '005/26',
          status: 'ENCERRADA',
          campanhas: [{ id: 50, publicada: false }],
        },
      },
      'GET /api/rodadas/5/acompanhamento': {
        corpo: {
          rodadaId: 5,
          campanhas: [
            {
              campanhaId: 50,
              nome: 'Consolidada de outubro de 2026',
              estabelecimentos: [
                { estabelecimentoId: 7, nomeFantasia: 'Hotel Thermas', respondeu: false },
              ],
            },
          ],
        },
      },
      'GET /api/campanhas/50/respostas': { corpo: [] },
    })
    abrirTela(
      [
        {
          path: '/pesquisas/:id/campanhas/:campanhaId/respostas/:estabelecimentoId',
          element: <LancarRespostaPage />,
        },
      ],
      '/pesquisas/5/campanhas/50/respostas/7',
    )
    await screen.findByRole('heading', { name: 'Hotel Thermas' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
