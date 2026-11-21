import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { limparSessao, salvarSessao } from '@/api/sessao'
import { AuthContext, type Auth } from '@/features/auth/AuthContext'
import { abrirTela, simularApi } from '@/features/pesquisas/apiDeTeste'
import type { Perfil } from '@/types/dominio'
import { ResultadoCampanhaPage } from './ResultadoCampanhaPage'

const RESULTADO = {
  campanha: {
    id: 50,
    rodadaId: 5,
    nome: 'Consolidada de outubro de 2026',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-10-01',
    periodoFim: '2026-10-31',
    qtdDiarias: 31,
    publicada: true,
    publicadaEm: '2026-11-12T15:00:00Z',
  },
  publicado: true,
  taxaOcupacao: 64.73,
  faixa: { codigo: 'OTIMA', nome: 'Ótima' },
  fluxoTotal: 80394.15,
  diariaMedia: 812.4,
  receitaHospedagem: 17137719.18,
  porTipo: [
    {
      tipoHospedagemCodigo: 'HOTEL',
      nome: 'Hotel',
      qtdMh: 20,
      qtdMhRespondentes: 9,
      qtdUh: 980,
      taxaOcupacao: 40.35,
      diariaMedia: 657.13,
      revpar: 265.12,
      receitaEstimada: 776805.3,
      omitido: false,
    },
    {
      tipoHospedagemCodigo: 'RESORT',
      nome: 'Resort',
      qtdMh: 2,
      qtdMhRespondentes: 1,
      qtdUh: 600,
      taxaOcupacao: null,
      diariaMedia: null,
      revpar: null,
      receitaEstimada: null,
      omitido: true,
    },
  ],
}

let api: ReturnType<typeof simularApi>
const clique = vi.fn()

beforeEach(() => {
  api = simularApi({
    'GET /api/campanhas/50/resultado': { corpo: RESULTADO },
    'GET /api/referencias': {
      corpo: {
        tiposHospedagem: [
          { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
          { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
        ],
      },
    },
  })
  URL.createObjectURL = vi.fn(() => 'blob:csv')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clique(this.download)
  })
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clique.mockReset()
  limparSessao()
})

function abrir(perfil: Perfil = 'VISUALIZADOR') {
  const auth: Auth = {
    estado: 'autenticado',
    usuario: { nome: 'Vera', perfil },
    sessaoExpirou: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    tentarNovamente: vi.fn(),
  }
  return abrirTela(
    [
      {
        path: '/resultados/:campanhaId',
        element: (
          <AuthContext.Provider value={auth}>
            <ResultadoCampanhaPage />
          </AuthContext.Provider>
        ),
      },
    ],
    '/resultados/50',
  )
}

describe('ResultadoCampanhaPage (FE-08)', () => {
  it('mostra a campanha publicada e os indicadores', async () => {
    abrir()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Consolidada de outubro de 2026' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/01\/10\/2026 a 31\/10\/2026 · publicado em 12\/11\/2026/),
    ).toBeInTheDocument()
    expect(screen.getByText('64,73%')).toBeInTheDocument()
    expect(screen.getByText('Faixa ótima')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Voltar ao acompanhamento' })).not.toBeInTheDocument()
  })

  it('tipo oculto por sigilo mostra o aviso, e nunca "0"', async () => {
    abrir()

    const tabela = await screen.findByRole('table', { name: 'Desempenho por tipo de hospedagem' })
    const resort = within(
      within(tabela)
        .getByRole('rowheader', { name: /Resort/ })
        .closest('tr') as HTMLElement,
    )
    expect(resort.getByText(/Valores ocultos para preservar o sigilo/)).toBeInTheDocument()
    expect(resort.queryByText(/^0/)).not.toBeInTheDocument()
    expect(resort.queryByText(/0,0%|R\$\s0$/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/A taxa do total não aparece porque há tipo oculto por sigilo\./),
    ).toBeInTheDocument()
  })

  it('o ADMIN volta ao acompanhamento da rodada', async () => {
    abrir('ADMIN')

    expect(await screen.findByRole('link', { name: 'Voltar ao acompanhamento' })).toHaveAttribute(
      'href',
      '/pesquisas/5',
    )
  })

  it('campanha sem publicação mostra o estado vazio', async () => {
    api.rotas['GET /api/campanhas/50/resultado'] = {
      status: 404,
      corpo: { detail: 'A campanha 50 ainda não tem resultado publicado.' },
    }
    abrir()

    expect(
      await screen.findByText('Esta campanha ainda não tem resultado publicado'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Baixar CSV' })).not.toBeInTheDocument()
  })

  it('erro da API aparece com a opção de tentar de novo', async () => {
    api.rotas['GET /api/campanhas/50/resultado'] = {
      status: 500,
      corpo: { detail: 'Falha no servidor.' },
    }
    abrir()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar o resultado.')
    expect(alerta).toHaveTextContent('Falha no servidor.')
    expect(within(alerta).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('Baixar CSV pede o arquivo com o token da sessão', async () => {
    const fetchDaApi = vi.mocked(fetch)
    abrir()
    const baixar = await screen.findByRole('button', { name: 'Baixar CSV' })
    fetchDaApi.mockResolvedValueOnce(
      new Response('Campanha;Outubro', {
        headers: { 'Content-Disposition': 'attachment; filename="resultado-campanha-50.csv"' },
      }),
    )

    await userEvent.click(baixar)

    await waitFor(() => expect(clique).toHaveBeenCalledWith('resultado-campanha-50.csv'))
    const [url, init] = fetchDaApi.mock.calls.at(-1) ?? []
    expect(url).toBe('http://localhost:8080/api/campanhas/50/resultado.csv')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer abc' })
  })

  it('erro no download aparece sem sair da página', async () => {
    const fetchDaApi = vi.mocked(fetch)
    abrir()
    const baixar = await screen.findByRole('button', { name: 'Baixar CSV' })
    fetchDaApi.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Acesso negado.' }), { status: 403 }),
    )

    await userEvent.click(baixar)

    expect(await screen.findByRole('alert')).toHaveTextContent('Acesso negado.')
    expect(clique).not.toHaveBeenCalled()
  })
})
