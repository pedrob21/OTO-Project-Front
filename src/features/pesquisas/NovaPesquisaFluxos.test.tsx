import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NovaPesquisaPage } from './NovaPesquisaPage'

type Resposta = { status?: number; corpo?: unknown }
type Rotas = Record<string, Resposta | Resposta[]>

let rotas: Rotas
const chamadas: { metodo: string; caminho: string; corpo: unknown }[] = []

function responder(chave: string): Resposta {
  const resposta = rotas[chave]
  if (Array.isArray(resposta)) return resposta.length > 1 ? resposta.shift()! : resposta[0]!
  return resposta ?? { status: 404, corpo: { detail: `sem rota: ${chave}` } }
}

beforeEach(() => {
  chamadas.length = 0
  rotas = {
    'GET /api/referencias': {
      corpo: {
        feriados: [
          { codigo: 'PASCOA', nome: 'Páscoa', ordem: 2 },
          { codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 },
        ],
      },
    },
    'GET /api/rodadas': { corpo: [{ id: 17, codigo: '017/26' }] },
    'POST /api/rodadas': { status: 201, corpo: { id: 9, codigo: '018/26' } },
    'POST /api/rodadas/9/campanhas': { status: 201, corpo: { id: 31 } },
    'POST /api/rodadas/9/abrir': { corpo: { id: 9, status: 'ABERTA' } },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const caminho = new URL(url).pathname
      const metodo = init?.method ?? 'GET'
      chamadas.push({ metodo, caminho, corpo: init?.body ? JSON.parse(String(init.body)) : null })
      const { status = 200, corpo } = responder(`${metodo} ${caminho}`)
      return new Response(JSON.stringify(corpo), { status })
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

function abrir(hoje: string | null = '2026-11-16') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>painel</p> },
      { path: '/pesquisas/nova', element: <NovaPesquisaPage hoje={hoje ?? undefined} /> },
    ],
    { initialEntries: ['/pesquisas/nova'] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const posts = () => chamadas.filter((chamada) => chamada.metodo === 'POST')

async function preencher() {
  await userEvent.type(await screen.findByLabelText('Título'), 'Consolidada de outubro')
  fireEvent.change(screen.getByLabelText('Prazo de resposta'), { target: { value: '2026-11-30' } })
}

async function abrirPesquisa() {
  await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))
}

describe('NovaPesquisaPage, outros fluxos', () => {
  it('o código sugerido pode ser trocado', async () => {
    abrir()
    const codigo = await screen.findByDisplayValue('018/26')
    expect(screen.getByText('Próximo número do ano.')).toBeInTheDocument()

    await userEvent.clear(codigo)
    await userEvent.type(codigo, 'ESP/26')
    await preencher()
    await abrirPesquisa()

    expect(screen.queryByText('Próximo número do ano.')).not.toBeInTheDocument()
    expect(await screen.findByText('Pesquisa ESP/26 aberta para respostas')).toBeInTheDocument()
    expect(posts()[0]?.corpo).toEqual({ codigo: 'ESP/26', titulo: 'Consolidada de outubro' })
  })

  it('sucesso sem o prazo na resposta usa o digitado; ir para o painel', async () => {
    const router = abrir()
    await preencher()

    await abrirPesquisa()

    expect(
      await screen.findByText(
        'Os meios de hospedagem podem responder até 30/11/2026 (faltam 14 dias).',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('31 diárias')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ir para o painel' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('criar outra pesquisa volta ao formulário vazio', async () => {
    abrir()
    await preencher()
    await abrirPesquisa()
    await screen.findByText(/aberta para respostas/)

    await userEvent.click(screen.getByRole('button', { name: 'Criar outra pesquisa' }))

    expect(screen.getByRole('heading', { name: 'Nova pesquisa' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('')
    expect(screen.getByLabelText('Prazo de resposta')).toHaveValue('')
    expect(screen.queryByRole('heading', { name: /Revise/ })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Dados da pesquisa' })).toBeEnabled()
  })

  it('falha ao abrir aparece no prazo, e o reenvio só abre', async () => {
    rotas['POST /api/rodadas/9/abrir'] = [
      { status: 422, corpo: { detail: 'O prazo deve ser depois da abertura.' } },
      { corpo: { id: 9, codigo: '018/26', status: 'ABERTA', prazoResposta: '2026-12-01' } },
    ]
    abrir()
    await preencher()

    await abrirPesquisa()

    expect(await screen.findByText('O prazo deve ser depois da abertura.')).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível criar a pesquisa.')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        /A pesquisa 018\/26 já foi criada, com 1 de 1 campanha\. Corrija e envie de novo/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('A pesquisa 018/26 já foi criada e não muda mais nesta tela.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Incluída')).toBeInTheDocument()

    await abrirPesquisa()

    expect(await screen.findByText('Pesquisa 018/26 aberta para respostas')).toBeInTheDocument()
    expect(posts().map((chamada) => chamada.caminho)).toEqual([
      '/api/rodadas',
      '/api/rodadas/9/campanhas',
      '/api/rodadas/9/abrir',
      '/api/rodadas/9/abrir',
    ])
  })

  it('falha na primeira campanha avisa sem contar campanhas incluídas', async () => {
    rotas['POST /api/rodadas/9/campanhas'] = { status: 500, corpo: {} }
    abrir()
    await preencher()

    await abrirPesquisa()

    expect(
      await screen.findByText('Não foi possível incluir uma das campanhas.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/A pesquisa 018\/26 já foi criada\s*\. Corrija e envie de novo/),
    ).toBeInTheDocument()
  })

  it('erro de rede ao criar a pesquisa não marca campo', async () => {
    abrir()
    await preencher()
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await abrirPesquisa()

    expect(await screen.findByText('Não foi possível criar a pesquisa.')).toBeInTheDocument()
    expect(
      screen.getByText('Não foi possível conectar ao servidor. Verifique sua conexão.'),
    ).toBeInTheDocument()
  })

  it('erros de campanha no resumo dizem a posição e o campo', async () => {
    abrir()
    await preencher()
    await userEvent.clear(screen.getByLabelText('Diárias'))

    await abrirPesquisa()

    expect(
      screen.getByRole('link', { name: 'Campanha 1, diárias: Informe as diárias.' }),
    ).toHaveAttribute('href', '#campo-1-diarias')
  })

  it('campos da pesquisa mostram erro ao sair deles', async () => {
    abrir()
    const titulo = await screen.findByLabelText('Título')

    fireEvent.blur(titulo)
    fireEvent.blur(titulo)

    expect(screen.getByText('Informe o título da pesquisa.')).toBeInTheDocument()
  })

  it('a prévia acompanha o formulário', async () => {
    abrir()
    expect(await screen.findByText('Título da pesquisa')).toBeInTheDocument()
    expect(screen.getByText('Sem prazo de resposta')).toBeInTheDocument()

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campanha' }))
    await userEvent.type(screen.getAllByLabelText('Diárias')[1]!, '1')

    expect(screen.getByText('Consolidada de outubro', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Prazo de resposta: 30/11/2026 · faltam 14 dias')).toBeInTheDocument()
    const previa = screen.getByRole('complementary', { name: 'Prévia e envio' })
    expect(within(previa).getByText('Campanha 2')).toBeInTheDocument()
    expect(within(previa).getByText('1 diária')).toBeInTheDocument()
  })

  it('os feriados aparecem na ordem cadastrada', async () => {
    abrir()
    await screen.findByDisplayValue('018/26')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campanha' }))

    const opcoes = await screen.findAllByRole('option', { name: /Carnaval|Páscoa/ })
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(['Carnaval', 'Páscoa'])
  })

  it('sem a lista de feriados, avisa e permite tentar de novo', async () => {
    rotas['GET /api/referencias'] = [
      { status: 500, corpo: {} },
      { corpo: { feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval' }] } },
    ]
    abrir()

    expect(
      await screen.findByText(/Não foi possível carregar a lista de feriados/),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    await screen.findByRole('button', { name: 'Adicionar campanha' })
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campanha' }))
    expect(await screen.findByRole('option', { name: 'Carnaval' })).toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar a lista/)).not.toBeInTheDocument()
  })

  it('sem a data fixa, usa a data local de hoje', async () => {
    // a página lê a data só na primeira renderização
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2027, 0, 10, 12))
    abrir(null)
    vi.useRealTimers()

    expect(await screen.findByDisplayValue('001/27')).toBeInTheDocument()
    expect(screen.getByLabelText('Mês')).toHaveValue('12')
    expect(screen.getByLabelText('Ano')).toHaveValue('2026')
  })
})
