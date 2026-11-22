import { screen, within } from '@testing-library/react'
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

  it('mostra as versões enviadas só quando o histórico é aberto', async () => {
    api.rotas['GET /api/respostas/301/historico'] = {
      corpo: [
        { versao: 2, taxaOcupacao: 60, diariaMedia: 300.5, enviadoEm: '2026-11-03T10:00:00Z' },
        { versao: 1, taxaOcupacao: 55, enviadoEm: '2026-11-01T09:00:00Z' },
      ],
    }
    abrir(8)
    await screen.findByText('Última resposta enviada: versão 1')
    expect(api.leituras('/api/respostas/301/historico')).toBe(0)

    await userEvent.click(screen.getByText('Ver todas as versões enviadas'))

    const tabela = await screen.findByRole('table', { name: 'Versões enviadas' })
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toHaveTextContent('2')
    expect(linhas[0]).toHaveTextContent('60,00%')
    expect(linhas[0]).toHaveTextContent('300,50')
    expect(linhas[0]).toHaveTextContent('03/11/2026')
    expect(linhas[1]).toHaveTextContent('55,00%')
    expect(api.leituras('/api/respostas/301/historico')).toBe(1)
  })

  it('avisa quando as versões não carregam', async () => {
    api.rotas['GET /api/respostas/301/historico'] = { status: 500, corpo: { detail: 'Falhou.' } }
    abrir(8)
    await screen.findByText('Última resposta enviada: versão 1')

    await userEvent.click(screen.getByText('Ver todas as versões enviadas'))

    expect(await screen.findByText('Não foi possível carregar as versões.')).toBeInTheDocument()
  })

  it('depois de enviar, mostra a última resposta com as versões da resposta nova', async () => {
    api.rotas['PUT /api/campanhas/50/respostas/7'] = {
      corpo: {
        id: 303,
        taxaOcupacao: 64,
        diariaMedia: 410,
        versao: 1,
        enviadoEm: '2026-11-20T13:00:00Z',
      },
    }
    api.rotas['GET /api/respostas/303/historico'] = { corpo: [] }
    abrir()
    await screen.findByRole('heading', { name: 'Hotel Thermas' })

    await userEvent.type(screen.getByLabelText('Taxa de ocupação (%)'), '64')
    await userEvent.type(screen.getByLabelText('Diária média (R$, opcional)'), '410')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }))

    expect(await screen.findByText('Última resposta enviada: versão 1')).toBeInTheDocument()
    expect(screen.getByText(/em 20\/11\/2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar correção' })).toBeInTheDocument()
    expect(api.escritas()[0]?.corpo).toEqual({ taxaOcupacao: 64, diariaMedia: 410 })
    await userEvent.click(screen.getByText('Ver todas as versões enviadas'))
    expect(await screen.findByText('Nenhuma versão enviada')).toBeInTheDocument()
  })

  it('não envia com a taxa vazia e mostra o erro no campo', async () => {
    abrir()
    await screen.findByRole('heading', { name: 'Hotel Thermas' })

    await userEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }))

    expect(screen.getByLabelText('Taxa de ocupação (%)')).toHaveAttribute('aria-invalid', 'true')
    expect(api.escritas()).toHaveLength(0)
  })

  it('a recusa da API aparece, com o erro de campo, e o digitado continua', async () => {
    api.rotas['PUT /api/campanhas/50/respostas/7'] = {
      status: 400,
      corpo: { detail: 'Dados inválidos.', campos: { diariaMedia: 'valor acima do permitido' } },
    }
    abrir()
    await screen.findByRole('heading', { name: 'Hotel Thermas' })

    await userEvent.type(screen.getByLabelText('Taxa de ocupação (%)'), '64')
    await userEvent.type(screen.getByLabelText('Diária média (R$, opcional)'), '99999')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível enviar a resposta.',
    )
    expect(screen.getByText(/valor acima do permitido/)).toBeInTheDocument()
    expect(screen.getByLabelText('Taxa de ocupação (%)')).toHaveValue('64')
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
