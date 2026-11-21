import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { abrirTela, simularApi } from './apiDeTeste'
import { LancarRespostaPage } from './LancarRespostaPage'

const RODADA = {
  id: 5,
  codigo: '005/26',
  status: 'ENCERRADA',
  campanhas: [{ id: 50, publicada: false }],
}
const ACOMPANHAMENTO = {
  rodadaId: 5,
  campanhas: [
    {
      campanhaId: 50,
      nome: 'Consolidada de outubro de 2026',
      estabelecimentos: [
        { estabelecimentoId: 7, nomeFantasia: 'Hotel Thermas', respondeu: false },
        { estabelecimentoId: 8, nomeFantasia: 'Pousada do Sol', respondeu: true },
      ],
    },
  ],
}

let api: ReturnType<typeof simularApi>

beforeEach(() => {
  api = simularApi({
    'GET /api/rodadas/5': { corpo: RODADA },
    'GET /api/rodadas/5/acompanhamento': { corpo: ACOMPANHAMENTO },
    'GET /api/campanhas/50/respostas': {
      corpo: [
        {
          id: 301,
          estabelecimentoId: 8,
          taxaOcupacao: 60,
          diariaMedia: 300.5,
          versao: 1,
          enviadoEm: '2026-11-03T10:00:00Z',
        },
      ],
    },
    'PUT /api/campanhas/50/respostas/7': { corpo: { id: 303, taxaOcupacao: 64, versao: 1 } },
  })
})

afterEach(() => vi.unstubAllGlobals())

function abrir(estabelecimentoId = 7) {
  return abrirTela(
    [
      { path: '/pesquisas/:id', element: <p>acompanhamento</p> },
      {
        path: '/pesquisas/:id/campanhas/:campanhaId/respostas/:estabelecimentoId',
        element: <LancarRespostaPage />,
      },
    ],
    `/pesquisas/5/campanhas/50/respostas/${estabelecimentoId}`,
  )
}

describe('LancarRespostaPage (ADMIN, RF-15)', () => {
  it('lança a resposta de um pendente, depois do encerramento, e atualiza o acompanhamento', async () => {
    abrir()

    expect(await screen.findByRole('heading', { name: 'Hotel Thermas' })).toBeInTheDocument()
    expect(screen.getByText('Rodada 005/26')).toBeInTheDocument()
    const leiturasAntes = api.leituras('/api/rodadas/5/acompanhamento')

    await userEvent.type(screen.getByLabelText('Taxa de ocupação (%)'), '64')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }))

    expect(await screen.findByText('Resposta enviada: versão 1 registrada.')).toBeInTheDocument()
    expect(api.escritas()).toEqual([
      expect.objectContaining({
        metodo: 'PUT',
        caminho: '/api/campanhas/50/respostas/7',
        corpo: { taxaOcupacao: 64 },
      }),
    ])
    await vi.waitFor(() =>
      expect(api.leituras('/api/rodadas/5/acompanhamento')).toBeGreaterThan(leiturasAntes),
    )
  })

  it('edita uma resposta existente, com os valores e a versão', async () => {
    abrir(8)

    expect(await screen.findByText('Última resposta enviada: versão 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Taxa de ocupação (%)')).toHaveValue('60')
    expect(screen.getByLabelText('Diária média (R$, opcional)')).toHaveValue('300,5')
    expect(screen.getByRole('button', { name: 'Enviar correção' })).toBeEnabled()
  })

  it('campanha publicada não aceita resposta, e diz por quê', async () => {
    api.rotas['GET /api/rodadas/5'] = {
      corpo: { ...RODADA, campanhas: [{ id: 50, publicada: true }] },
    }
    abrir()

    const enviar = await screen.findByRole('button', { name: 'Enviar resposta' })
    expect(enviar).toBeDisabled()
    expect(enviar).toHaveAccessibleDescription(
      'A campanha já foi publicada. Cancele a publicação para mudar as respostas.',
    )
    expect(screen.getByLabelText('Taxa de ocupação (%)')).toBeDisabled()
  })

  it('estabelecimento fora da campanha', async () => {
    abrir(99)

    expect(
      await screen.findByText('Este estabelecimento não participa desta campanha'),
    ).toBeInTheDocument()
  })

  it('erro ao carregar', async () => {
    api.rotas['GET /api/campanhas/50/respostas'] = { status: 500, corpo: { detail: 'Falhou.' } }
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou.')
  })

  it('volta ao acompanhamento', async () => {
    const router = abrir()

    await userEvent.click(await screen.findByRole('link', { name: 'Voltar ao acompanhamento' }))

    expect(router.state.location.pathname).toBe('/pesquisas/5')
  })
})
