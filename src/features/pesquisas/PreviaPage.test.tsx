import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { abrirTela, simularApi } from './apiDeTeste'
import { PreviaPage } from './PreviaPage'

const RODADA = {
  id: 5,
  codigo: '005/26',
  status: 'ENCERRADA',
  campanhas: [{ id: 50, nome: 'Consolidada de outubro de 2026', publicada: false }],
}
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
const COM_IMPEDIMENTO = {
  campanhaId: 50,
  qtdMh: 74,
  qtdRespondentes: 41,
  leitosTotal: 13508,
  leitosRespondentes: 9237,
  percentualLeitosRespondentes: 68.38,
  percentualMinimoPublicacao: 70,
  podePublicar: false,
  impedimentos: ['Leitos respondentes: 68,38% (mínimo para publicar: 70%).'],
  avisos: ['Hotel X: sem UH/leitos cadastrados para 2026-10-31; fica fora do cálculo.'],
  resultado: RESULTADO,
}
const LIVRE = {
  ...COM_IMPEDIMENTO,
  leitosRespondentes: 9720,
  percentualLeitosRespondentes: 71.96,
  podePublicar: true,
  impedimentos: [],
  avisos: [],
}

let api: ReturnType<typeof simularApi>

beforeEach(() => {
  api = simularApi({
    'GET /api/campanhas/50/previa': { corpo: COM_IMPEDIMENTO },
    'GET /api/rodadas/5': { corpo: RODADA },
    'GET /api/referencias': {
      corpo: { tiposHospedagem: [{ codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true }] },
    },
    'POST /api/campanhas/50/publicacao': { corpo: RESULTADO },
    'DELETE /api/campanhas/50/publicacao': { status: 204 },
  })
})

afterEach(() => vi.unstubAllGlobals())

function abrir() {
  return abrirTela(
    [
      { path: '/pesquisas/:id', element: <p>acompanhamento</p> },
      { path: '/pesquisas/:id/campanhas/:campanhaId/previa', element: <PreviaPage /> },
    ],
    '/pesquisas/5/campanhas/50/previa',
  )
}

function publicada() {
  api.rotas['GET /api/rodadas/5'] = {
    corpo: {
      ...RODADA,
      campanhas: [{ ...RODADA.campanhas[0], publicada: true, publicadaEm: '2026-11-12T15:00:00Z' }],
    },
  }
}

describe('PreviaPage, indicadores', () => {
  it('mostra os indicadores calculados com as respostas atuais', async () => {
    abrir()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prévia e publicação' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Consolidada de outubro de 2026')).toBeInTheDocument()
    const indicador = (rotulo: string) =>
      within(screen.getByText(rotulo, { selector: 'dt' }).parentElement as HTMLElement)
    expect(indicador('Taxa de ocupação').getByText('64,73%')).toBeInTheDocument()
    expect(indicador('Taxa de ocupação').getByText('Faixa ótima')).toBeInTheDocument()
    expect(indicador('Fluxo total de turistas').getByText('80.394')).toBeInTheDocument()
    expect(indicador('Day use').getByText('12.180')).toBeInTheDocument()
    expect(indicador('Diária média').getByText('R$ 812')).toBeInTheDocument()
    expect(indicador('Receita em hospedagem').getByText('R$ 17,1 mi')).toBeInTheDocument()
    expect(indicador('Leitos respondentes').getByText('68,38%')).toBeInTheDocument()
    expect(
      screen.getByRole('table', { name: 'Desempenho por tipo de hospedagem' }),
    ).toBeInTheDocument()
  })

  it('mostra os avisos para conferir', async () => {
    abrir()

    expect(await screen.findByText(/Hotel X: sem UH\/leitos cadastrados/)).toBeInTheDocument()
  })

  it('sem respostas, não há o que calcular', async () => {
    api.rotas['GET /api/campanhas/50/previa'] = {
      corpo: {
        ...COM_IMPEDIMENTO,
        resultado: undefined,
        impedimentos: ['Nenhum meio de hospedagem respondeu.'],
      },
    }
    abrir()

    expect(await screen.findByText('Ainda não há respostas para calcular')).toBeInTheDocument()
    expect(screen.getByText('Nenhum meio de hospedagem respondeu.')).toBeInTheDocument()
  })

  it('erro ao carregar a prévia', async () => {
    api.rotas['GET /api/campanhas/50/previa'] = {
      status: 404,
      corpo: { detail: 'Campanha 50 não encontrada.' },
    }
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent('Campanha 50 não encontrada.')
  })
})

describe('PreviaPage, publicação (FE-07)', () => {
  it('impedimento desativa Publicar e o motivo fica associado ao botão', async () => {
    abrir()

    const publicar = await screen.findByRole('button', { name: 'Publicar' })
    expect(publicar).toBeDisabled()
    expect(publicar).toHaveAccessibleDescription(
      /Leitos respondentes: 68,38% \(mínimo para publicar: 70%\)\./,
    )
    expect(screen.getByText('Abaixo do mínimo.')).toBeInTheDocument()
  })

  it('sem impedimentos, publica e atualiza a situação', async () => {
    api.rotas['GET /api/campanhas/50/previa'] = { corpo: LIVRE }
    abrir()
    const publicar = await screen.findByRole('button', { name: 'Publicar' })
    expect(publicar).toBeEnabled()
    expect(publicar).not.toHaveAttribute('aria-describedby')
    publicada()

    await userEvent.click(publicar)

    expect(await screen.findByRole('status')).toHaveTextContent('Campanha publicada.')
    expect(await screen.findByRole('button', { name: 'Cancelar publicação' })).toBeInTheDocument()
    expect(screen.getByText(/Publicada em 12\/11\/2026/)).toBeInTheDocument()
    expect(api.escritas()).toEqual([
      expect.objectContaining({ metodo: 'POST', caminho: '/api/campanhas/50/publicacao' }),
    ])
  })

  it('cancelar a publicação pede confirmação; desistir não cancela', async () => {
    publicada()
    abrir()
    const cancelar = await screen.findByRole('button', { name: 'Cancelar publicação' })
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver resultado publicado' })).toHaveAttribute(
      'href',
      '/resultados/50',
    )

    await userEvent.click(cancelar)
    const confirmacao = screen.getByRole('dialog', {
      name: 'Cancelar a publicação de Consolidada de outubro de 2026?',
    })
    const desistir = within(confirmacao).getByRole('button', { name: 'Cancelar' })
    expect(desistir).toHaveFocus()
    await userEvent.click(desistir)

    expect(cancelar).toHaveFocus()
    expect(api.escritas()).toEqual([])
  })

  it('confirmado, cancela a publicação com DELETE', async () => {
    publicada()
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar publicação' }))
    api.rotas['GET /api/rodadas/5'] = { corpo: RODADA }

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Publicação cancelada.')
    expect(await screen.findByRole('button', { name: 'Publicar' })).toBeInTheDocument()
    expect(api.escritas()).toEqual([
      expect.objectContaining({ metodo: 'DELETE', caminho: '/api/campanhas/50/publicacao' }),
    ])
  })

  it('recusa da API aparece', async () => {
    api.rotas['GET /api/campanhas/50/previa'] = { corpo: LIVRE }
    api.rotas['POST /api/campanhas/50/publicacao'] = {
      status: 422,
      corpo: { detail: 'Encerre a pesquisa 005/26 antes de publicar.' },
    }
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Encerre a pesquisa 005/26 antes de publicar.',
    )
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })
})
