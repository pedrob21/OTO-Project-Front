import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { limparSessao, salvarSessao } from '@/api/sessao'
import { abrirTela, simularApi } from '@/features/pesquisas/apiDeTeste'
import { RelatoriosPage } from './RelatoriosPage'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'

const AGOSTO = {
  campanhaId: 15,
  nome: 'Agosto de 2026',
  modalidade: 'CONSOLIDADA',
  tipoPeriodo: 'MENSAL',
  periodoInicio: '2026-08-01',
  periodoFim: '2026-08-31',
  publicadaEm: '2026-09-18T12:00:00Z',
  taxaOcupacao: 62.8,
  faixa: { codigo: 'OTIMA', nome: 'Ótima' },
  fluxoTotal: 496660,
}
const CARNAVAL = {
  campanhaId: 9,
  nome: 'Carnaval 2026',
  modalidade: 'EXPECTATIVA',
  tipoPeriodo: 'FERIADO',
  periodoInicio: '2026-02-14',
  periodoFim: '2026-02-17',
  publicadaEm: '2026-02-10T12:00:00Z',
  taxaOcupacao: 71.5,
  faixa: { codigo: 'OTIMA', nome: 'Ótima' },
  fluxoTotal: 60210,
}
const JULHO_2025 = {
  ...AGOSTO,
  campanhaId: 3,
  nome: 'Julho de 2025',
  periodoInicio: '2025-07-01',
  periodoFim: '2025-07-31',
  publicadaEm: '2025-08-12T12:00:00Z',
  faixa: { codigo: 'BOA', nome: 'Boa' },
}

let api: ReturnType<typeof simularApi>
const clique = vi.fn()

beforeEach(() => {
  api = simularApi({ 'GET /api/campanhas/publicadas': { corpo: [AGOSTO, CARNAVAL, JULHO_2025] } })
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

function abrir(caminho = '/relatorios') {
  return abrirTela(
    [
      { path: '/relatorios', element: <RelatoriosPage /> },
      { path: '/resultados/:campanhaId', element: <p>tela do resultado</p> },
    ],
    caminho,
  )
}

const tabela = () => screen.findByRole('table', { name: 'Campanhas publicadas' })

function buscaDasPublicadas() {
  return api.chamadas
    .filter((chamada) => chamada.caminho === '/api/campanhas/publicadas')
    .map((chamada) => chamada.busca)
}

describe('RelatoriosPage', () => {
  it('lista as campanhas publicadas com período, publicação, taxa, faixa e fluxo', async () => {
    abrir()

    const linha = within(
      within(await tabela())
        .getByRole('rowheader', { name: /Agosto de 2026/ })
        .closest('tr') as HTMLElement,
    )
    expect(linha.getByText('Consolidada · Mensal')).toBeInTheDocument()
    expect(linha.getByText('01/08/2026 a 31/08/2026')).toBeInTheDocument()
    expect(linha.getByText('18/09/2026')).toBeInTheDocument()
    expect(linha.getByText('62,80%')).toBeInTheDocument()
    expect(linha.getByText('Faixa ótima')).toBeInTheDocument()
    expect(linha.getByText('496.660')).toBeInTheDocument()
    expect(screen.getByText('3 campanhas publicadas')).toBeInTheDocument()
    // sem filtro, uma consulta só serve a lista e os anos
    expect(buscaDasPublicadas()).toEqual([''])
  })

  it('não tem violações de acessibilidade', async () => {
    abrir()
    await tabela()

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('Ver relatório leva ao resultado da campanha', async () => {
    const router = abrir()
    await tabela()

    await userEvent.click(screen.getByRole('link', { name: 'Ver relatório de Carnaval 2026' }))

    expect(await screen.findByText('tela do resultado')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/resultados/9')
  })

  it('Baixar CSV traz o arquivo da campanha da linha', async () => {
    const fetchDaApi = vi.mocked(fetch)
    abrir()
    await tabela()
    fetchDaApi.mockResolvedValueOnce(
      new Response('Campanha;Carnaval', {
        headers: { 'Content-Disposition': 'attachment; filename="resultado-campanha-9.csv"' },
      }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar CSV de Carnaval 2026' }))

    await waitFor(() => expect(clique).toHaveBeenCalledWith('resultado-campanha-9.csv'))
    const [url] = fetchDaApi.mock.calls.at(-1) ?? []
    expect(url).toBe('http://localhost:8080/api/campanhas/9/resultado.csv')
  })

  it('os anos do filtro vêm das campanhas publicadas', async () => {
    abrir()
    await tabela()

    const ano = screen.getByLabelText('Ano')
    expect(
      within(ano)
        .getAllByRole('option')
        .map((opcao) => opcao.textContent),
    ).toEqual(['Todos', '2026', '2025'])
  })

  it('filtrar pede a lista à API com os filtros e guarda na URL', async () => {
    const router = abrir()
    await tabela()
    api.rotas['GET /api/campanhas/publicadas'] = { corpo: [CARNAVAL] }

    await userEvent.selectOptions(screen.getByLabelText('Modalidade'), 'EXPECTATIVA')

    await waitFor(() =>
      expect(screen.queryByRole('rowheader', { name: /Agosto de 2026/ })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('rowheader', { name: /Carnaval 2026/ })).toBeInTheDocument()
    expect(screen.getByText('1 campanha publicada com os filtros escolhidos')).toBeInTheDocument()
    expect(buscaDasPublicadas().at(-1)).toBe('?modalidade=EXPECTATIVA')
    expect(router.state.location.search).toBe('?modalidade=EXPECTATIVA')

    await userEvent.selectOptions(screen.getByLabelText('Ano'), '2026')
    await waitFor(() =>
      expect(buscaDasPublicadas().at(-1)).toBe('?modalidade=EXPECTATIVA&ano=2026'),
    )
  })

  it('abre já filtrado pela URL e limpa os filtros', async () => {
    api.rotas['GET /api/campanhas/publicadas'] = [
      { corpo: [AGOSTO, CARNAVAL, JULHO_2025] },
      { corpo: [JULHO_2025] },
    ]
    const router = abrir('/relatorios?ano=2025&periodo=MENSAL')

    expect(await screen.findByRole('rowheader', { name: /Julho de 2025/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Período')).toHaveValue('MENSAL')
    expect(screen.getByLabelText('Ano')).toHaveValue('2025')

    api.rotas['GET /api/campanhas/publicadas'] = { corpo: [AGOSTO, CARNAVAL, JULHO_2025] }
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(await screen.findByRole('rowheader', { name: /Agosto de 2026/ })).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument()
  })

  it('filtro sem resultado sugere mudar os filtros', async () => {
    api.rotas['GET /api/campanhas/publicadas'] = [{ corpo: [AGOSTO] }, { corpo: [] }]
    abrir('/relatorios?periodo=FERIADO')

    expect(
      await screen.findByText('Nenhuma campanha publicada com esses filtros'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Mude ou limpe os filtros/)).toBeInTheDocument()
  })

  it('sem nenhuma publicação, explica quando os relatórios aparecem', async () => {
    api.rotas['GET /api/campanhas/publicadas'] = { corpo: [] }
    abrir()

    expect(await screen.findByText('Nenhuma campanha publicada ainda')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument()
  })

  it('erro da API aparece com a opção de tentar de novo', async () => {
    api.rotas['GET /api/campanhas/publicadas'] = { status: 500, corpo: { detail: 'Fora do ar.' } }
    abrir()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar os relatórios.')
    expect(alerta).toHaveTextContent('Fora do ar.')

    api.rotas['GET /api/campanhas/publicadas'] = { corpo: [AGOSTO] }
    await userEvent.click(within(alerta).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('rowheader', { name: /Agosto de 2026/ })).toBeInTheDocument()
  })
})
