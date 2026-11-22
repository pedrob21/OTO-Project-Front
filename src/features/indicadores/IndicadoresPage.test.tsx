import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { limparSessao, salvarSessao } from '@/api/sessao'
import { abrirTela, simularApi } from '@/features/pesquisas/apiDeTeste'
import { IndicadoresPage } from './IndicadoresPage'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'

function meses(valores: (number | null)[], origem = 'SISTEMA') {
  return valores.map((valor, indice) => ({
    mes: indice + 1,
    valor,
    origem: valor === null ? null : origem,
  }))
}

const SERIE_TAXA = {
  indicador: 'TAXA_OCUPACAO',
  modalidade: 'CONSOLIDADA',
  anos: [
    { ano: 2024, meses: meses([50, 52, 55, 58, 60, 61, 80, 57, 50, 49, 51, 66], 'HISTORICO') },
    { ano: 2025, meses: meses([55, 58, 60, 64, 66, 63, 80, 58.7, 52, 49.5, 51, 70]) },
    { ano: 2026, meses: meses([60, 62, 65, 70, 72, 68, 85, 62.8, null, null, null, null]) },
  ],
}

const SERIE_FLUXO = {
  indicador: 'FLUXO_TURISTAS',
  modalidade: 'CONSOLIDADA',
  anos: [
    {
      ano: 2026,
      meses: meses([410_000, 420_000, null, null, null, null, null, null, null, null, null, null]),
    },
  ],
}

const FERIADOS = [
  {
    feriadoCodigo: 'CARNAVAL',
    nome: 'Carnaval',
    anos: [
      { ano: 2024, taxaOcupacao: 78, fluxoTotal: 52_000, diariaMedia: 880, origem: 'HISTORICO' },
      { ano: 2025, taxaOcupacao: 80, fluxoTotal: 54_000, diariaMedia: 910, origem: 'SISTEMA' },
      { ano: 2026, taxaOcupacao: 82.5, fluxoTotal: 60_210, diariaMedia: 950, origem: 'SISTEMA' },
    ],
  },
]

let api: ReturnType<typeof simularApi>

beforeEach(() => {
  api = simularApi({
    'GET /api/dashboard/serie-mensal': { corpo: SERIE_TAXA },
    'GET /api/dashboard/feriados': { corpo: FERIADOS },
  })
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  limparSessao()
})

function abrir(caminho = '/indicadores') {
  return abrirTela(
    [{ path: '/indicadores', element: <IndicadoresPage hoje="2026-11-16" /> }],
    caminho,
  )
}

function buscas(caminho: string) {
  return api.chamadas.filter((chamada) => chamada.caminho === caminho).map((c) => c.busca)
}

const grafico = (nome: RegExp) => screen.findByRole('group', { name: nome })

describe('IndicadoresPage', () => {
  it('abre com a taxa consolidada dos três últimos anos, em gráfico', async () => {
    abrir()

    expect(screen.getByRole('heading', { level: 1, name: 'Indicadores' })).toBeInTheDocument()
    expect(await grafico(/Taxa de ocupação mensal, 2024 a 2026/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Taxa de ocupação' })).toBeChecked()
    expect(screen.getByLabelText('Modalidade')).toHaveValue('CONSOLIDADA')
    expect(screen.getByLabelText('De')).toHaveValue('2024')
    expect(screen.getByLabelText('Até')).toHaveValue('2026')
    expect(buscas('/api/dashboard/serie-mensal')).toEqual([
      '?indicador=TAXA_OCUPACAO&modalidade=CONSOLIDADA&anoInicio=2024&anoFim=2026',
    ])
    expect(buscas('/api/dashboard/feriados')).toEqual([
      '?modalidade=CONSOLIDADA&anoInicio=2024&anoFim=2026',
    ])
  })

  it('não tem violações de acessibilidade, no gráfico e na tabela', async () => {
    abrir()
    await grafico(/Taxa de ocupação mensal/)
    await screen.findByRole('rowheader', { name: 'Carnaval' })
    expect(await violacoesDeAcessibilidade()).toEqual([])

    await userEvent.click(screen.getByRole('radio', { name: 'Tabela' }))
    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('a tabela mensal marca os valores da série histórica', async () => {
    abrir()
    await grafico(/Taxa de ocupação mensal/)

    await userEvent.click(screen.getByRole('radio', { name: 'Tabela' }))

    const tabela = screen.getByRole('table', { name: 'Taxa de ocupação por mês, 2024 a 2026' })
    const janeiro = within(
      within(tabela).getByRole('rowheader', { name: 'Janeiro' }).closest('tr')!,
    )
    const celulas = janeiro.getAllByRole('cell')
    expect(celulas[0]).toHaveTextContent('50,0%H (série histórica)')
    expect(celulas[2]).toHaveTextContent(/^60,0%$/)
    const setembro = within(
      within(tabela).getByRole('rowheader', { name: 'Setembro' }).closest('tr')!,
    )
    expect(setembro.getAllByRole('cell')[2]).toHaveTextContent('—')
  })

  it('os feriados aparecem ano a ano no indicador escolhido', async () => {
    abrir()

    const tabela = await screen.findByRole('table', {
      name: 'Taxa de ocupação por feriado e ano, 2024 a 2026',
    })
    const carnaval = within(
      within(tabela).getByRole('rowheader', { name: 'Carnaval' }).closest('tr')!,
    )
    expect(carnaval.getAllByRole('cell').map((celula) => celula.textContent)).toEqual([
      '78,0%H (série histórica)',
      '80,0%',
      '82,5%',
    ])
  })

  it('trocar o indicador muda a série, a escala e os feriados', async () => {
    const router = abrir()
    await grafico(/Taxa de ocupação mensal/)
    api.rotas['GET /api/dashboard/serie-mensal'] = { corpo: SERIE_FLUXO }

    await userEvent.click(screen.getByRole('radio', { name: 'Fluxo de turistas' }))

    const novo = await grafico(/Fluxo de turistas mensal, 2026/)
    expect(novo).toHaveTextContent('500 mil')
    expect(router.state.location.search).toContain('indicador=FLUXO_TURISTAS')
    expect(buscas('/api/dashboard/serie-mensal').at(-1)).toContain('indicador=FLUXO_TURISTAS')
    expect(
      await screen.findByRole('table', {
        name: 'Fluxo de turistas por feriado e ano, 2024 a 2026',
      }),
    ).toHaveTextContent('60.210')
    // os feriados trazem os três indicadores de uma vez: não precisa pedir de novo
    expect(buscas('/api/dashboard/feriados')).toHaveLength(1)
  })

  it('com mais de três anos, o gráfico avisa que compara só os mais recentes', async () => {
    api.rotas['GET /api/dashboard/serie-mensal'] = {
      corpo: {
        ...SERIE_TAXA,
        anos: [
          {
            ano: 2023,
            meses: meses([40, null, null, null, null, null, null, null, null, null, null, null]),
          },
          ...SERIE_TAXA.anos,
        ],
      },
    }
    abrir('/indicadores?de=2023&ate=2026')

    expect(await grafico(/2024 a 2026/)).toBeInTheDocument()
    expect(
      screen.getByText(/O gráfico compara os três anos mais recentes do intervalo \(2024 a 2026\)/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Tabela' }))
    expect(screen.getByRole('columnheader', { name: '2023' })).toBeInTheDocument()
  })

  it('intervalo inválido avisa e não consulta a API', async () => {
    abrir()
    await grafico(/Taxa de ocupação mensal/)
    const antes = api.chamadas.length

    await userEvent.selectOptions(screen.getByLabelText('De'), '2027')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O ano inicial não pode ser maior que o final.',
    )
    expect(screen.getByLabelText('De')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('group', { name: /mensal/ })).not.toBeInTheDocument()
    expect(api.chamadas).toHaveLength(antes)
  })

  it('a modalidade vai para a consulta e para a URL', async () => {
    const router = abrir()
    await grafico(/Taxa de ocupação mensal/)
    api.rotas['GET /api/dashboard/serie-mensal'] = {
      corpo: { anos: [{ ano: 2026, meses: meses(Array(12).fill(null)) }] },
    }

    await userEvent.selectOptions(screen.getByLabelText('Modalidade'), 'EXPECTATIVA')

    expect(await screen.findByText('Sem valores mensais de 2024 a 2026')).toBeInTheDocument()
    expect(router.state.location.search).toContain('modalidade=EXPECTATIVA')
    await waitFor(() =>
      expect(buscas('/api/dashboard/feriados').at(-1)).toBe(
        '?modalidade=EXPECTATIVA&anoInicio=2024&anoFim=2026',
      ),
    )
  })

  it('sem feriados com dado, explica quando aparecem', async () => {
    api.rotas['GET /api/dashboard/feriados'] = { corpo: [] }
    abrir()

    expect(
      await screen.findByText('Sem feriados com taxa de ocupação em 2024 a 2026'),
    ).toBeInTheDocument()
  })

  it('erro na série aparece com a opção de tentar de novo, sem derrubar os feriados', async () => {
    api.rotas['GET /api/dashboard/serie-mensal'] = { status: 500, corpo: { detail: 'Fora do ar.' } }
    abrir()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar a série mensal.')
    expect(await screen.findByRole('rowheader', { name: 'Carnaval' })).toBeInTheDocument()

    api.rotas['GET /api/dashboard/serie-mensal'] = { corpo: SERIE_TAXA }
    await userEvent.click(within(alerta).getByRole('button', { name: 'Tentar novamente' }))
    expect(await grafico(/Taxa de ocupação mensal/)).toBeInTheDocument()
  })

  it('explica a marca H e leva à metodologia', async () => {
    abrir()
    await grafico(/Taxa de ocupação mensal/)

    expect(
      screen.getByText(/valor da série histórica importada pela equipe do OTO/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Como os indicadores são calculados' }),
    ).toHaveAttribute('href', '/metodologia')
  })
})
