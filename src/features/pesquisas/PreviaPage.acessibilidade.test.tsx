import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { abrirTela, simularApi } from './apiDeTeste'
import { PreviaPage } from './PreviaPage'

const RESULTADO = {
  campanha: { id: 50, nome: 'Consolidada de outubro de 2026', qtdDiarias: 31 },
  taxaOcupacao: 64.73,
  faixa: { codigo: 'OTIMA', nome: 'Ótima' },
  qtdMh: 74,
  qtdMhRespondentes: 41,
  percentualMhRespondentes: 55.41,
  leitosTotal: 13508,
  leitosRespondentes: 9237,
  percentualLeitosRespondentes: 68.38,
  fluxoMh: 58931.79,
  fluxoRhc: 9282.65,
  fluxoDayUse: 12179.71,
  fluxoTotal: 80394.15,
  fluxoMedioDiario: 2593.36,
  diariaMedia: 812.4,
  receitaHospedagem: 17137719.18,
  receitaSemHospedagem: 97276924.77,
  porTipo: [
    {
      tipoHospedagemCodigo: 'HOTEL',
      nome: 'Hotel',
      qtdMh: 20,
      qtdUh: 980,
      taxaOcupacao: 40.35,
      diariaMedia: 657.13,
      revpar: 265.12,
      receitaEstimada: 776805.3,
      omitido: false,
    },
  ],
}

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
