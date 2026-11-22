import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { abrirTela, simularApi } from './apiDeTeste'
import { RESULTADO } from './dadosDeTestePrevia'
import { PreviaPage } from './PreviaPage'

afterEach(() => vi.unstubAllGlobals())

describe('PreviaPage, acessibilidade', () => {
  it('não tem violações com a prévia e o impedimento de publicação', async () => {
    simularApi({
      'GET /api/campanhas/50/previa': {
        corpo: {
          campanhaId: 50,
          qtdMh: 74,
          qtdRespondentes: 41,
          leitosTotal: 13508,
          leitosRespondentes: 9237,
          percentualLeitosRespondentes: 68.38,
          percentualMinimoPublicacao: 70,
          podePublicar: false,
          impedimentos: ['Leitos respondentes: 68,38% (mínimo para publicar: 70%).'],
          avisos: [],
          resultado: RESULTADO,
        },
      },
      'GET /api/rodadas/5': {
        corpo: {
          id: 5,
          codigo: '005/26',
          status: 'ENCERRADA',
          campanhas: [{ id: 50, nome: 'Consolidada de outubro de 2026', publicada: false }],
        },
      },
      'GET /api/referencias': {
        corpo: { tiposHospedagem: [{ codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true }] },
      },
      'GET /api/campanhas/50/diarias': { corpo: [] },
    })
    abrirTela(
      [{ path: '/pesquisas/:id/campanhas/:campanhaId/previa', element: <PreviaPage /> }],
      '/pesquisas/5/campanhas/50/previa',
    )
    await screen.findByRole('heading', { level: 1 })
    await screen.findByText(/mínimo para publicar/)
    await screen.findByRole('table', { name: 'Diárias informadas pela equipe' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
