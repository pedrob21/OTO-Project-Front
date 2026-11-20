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
      corpo: { feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 }] },
    },
    'GET /api/rodadas': { corpo: [{ id: 17, codigo: '017/26' }] },
    'POST /api/rodadas': { status: 201, corpo: { id: 9, codigo: '018/26' } },
    'POST /api/rodadas/9/campanhas': { status: 201, corpo: { id: 31 } },
    'POST /api/rodadas/9/abrir': {
      corpo: { id: 9, codigo: '018/26', status: 'ABERTA', prazoResposta: '2026-11-30' },
    },
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

function abrir() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>painel</p> },
      { path: '/pesquisas/nova', element: <NovaPesquisaPage hoje="2026-11-16" /> },
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

describe('NovaPesquisaPage', () => {
  it('chega preenchida com as sugestões', async () => {
    abrir()

    expect(await screen.findByDisplayValue('018/26')).toBeInTheDocument()
    expect(screen.getByLabelText('Mês')).toHaveValue('10')
    expect(screen.getByLabelText('Ano')).toHaveValue('2026')
    expect(screen.getByLabelText('Diárias')).toHaveValue(31)
    expect(screen.getByLabelText('Nome da campanha')).toHaveValue('Consolidada de outubro de 2026')
    expect(screen.getByText('Rodada 018/26')).toBeInTheDocument()
  })

  it('sem os campos obrigatórios, lista os erros e não envia', async () => {
    abrir()
    await screen.findByDisplayValue('018/26')

    await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))

    const resumo = screen.getByRole('heading', {
      name: 'Revise 2 campos antes de abrir a pesquisa',
    })
    expect(resumo.parentElement).toHaveFocus()
    expect(screen.getByRole('link', { name: /Título: Informe o título/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Prazo de resposta')).toHaveAttribute('aria-invalid', 'true')
    expect(posts()).toHaveLength(0)
  })

  it('o link do resumo leva ao campo', async () => {
    abrir()
    await screen.findByDisplayValue('018/26')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))

    await userEvent.click(screen.getByRole('link', { name: /Título/ }))

    expect(screen.getByLabelText('Título')).toHaveFocus()
  })

  it('cria a pesquisa, inclui a campanha e abre', async () => {
    const router = abrir()
    await screen.findByDisplayValue('018/26')
    await preencher()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))

    expect(
      await screen.findByRole('heading', { name: 'Pesquisa 018/26 aberta para respostas' }),
    ).toBeInTheDocument()
    expect(posts()).toEqual([
      {
        metodo: 'POST',
        caminho: '/api/rodadas',
        corpo: { codigo: '018/26', titulo: 'Consolidada de outubro' },
      },
      {
        metodo: 'POST',
        caminho: '/api/rodadas/9/campanhas',
        corpo: {
          nome: 'Consolidada de outubro de 2026',
          modalidade: 'CONSOLIDADA',
          tipoPeriodo: 'MENSAL',
          periodoInicio: '2026-10-01',
          periodoFim: '2026-10-31',
          qtdDiarias: 31,
        },
      },
      { metodo: 'POST', caminho: '/api/rodadas/9/abrir', corpo: { prazoResposta: '2026-11-30' } },
    ])

    await userEvent.click(screen.getByRole('button', { name: 'Ir para o painel' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('se uma campanha falha, mostra o motivo e continua de onde parou', async () => {
    rotas['POST /api/rodadas/9/campanhas'] = [
      { status: 422, corpo: { detail: 'Já existe uma campanha CONSOLIDADA para este período.' } },
      { status: 201, corpo: { id: 31 } },
    ]
    abrir()
    await screen.findByDisplayValue('018/26')
    await preencher()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))

    const campanha = screen.getByRole('listitem', { name: 'Campanha 1' })
    expect(
      await within(campanha).findByText('Já existe uma campanha CONSOLIDADA para este período.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/envio continua de onde parou/)).toHaveTextContent(
      'A pesquisa 018/26 já foi criada. Corrija e envie de novo',
    )
    expect(screen.getByLabelText('Código')).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))

    await screen.findByRole('heading', { name: /aberta para respostas/ })
    expect(posts().filter((chamada) => chamada.caminho === '/api/rodadas')).toHaveLength(1)
  })

  it('a recusa da API ao criar a pesquisa aparece no envio', async () => {
    rotas['POST /api/rodadas'] = {
      status: 422,
      corpo: { detail: 'Já existe uma pesquisa com o código 018/26.' },
    }
    abrir()
    await screen.findByDisplayValue('018/26')
    await preencher()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))

    const alerta = await screen.findByText('Já existe uma pesquisa com o código 018/26.')
    expect(alerta.closest('[role="alert"]')).toHaveTextContent('Não foi possível criar a pesquisa.')
    expect(screen.getByLabelText('Código')).toBeEnabled()
  })

  it('adiciona uma campanha de feriado, com foco nela, e acusa período repetido', async () => {
    abrir()
    await screen.findByDisplayValue('018/26')

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campanha' }))

    const segunda = screen.getByRole('heading', { name: 'Campanha 2' })
    expect(segunda).toHaveFocus()
    const item = screen.getByRole('listitem', { name: 'Campanha 2' })
    expect(within(item).getByLabelText('Qual feriado')).toBeInTheDocument()

    await userEvent.click(within(item).getByRole('radio', { name: 'Consolidada' }))
    await userEvent.click(within(item).getByRole('radio', { name: 'Mensal' }))

    expect(
      within(item).getByText('Já há uma campanha desta modalidade para este período.'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remover a campanha 2' }))
    expect(screen.queryByRole('heading', { name: 'Campanha 2' })).not.toBeInTheDocument()
  })

  it('mês e ano são selects, que funcionam em qualquer navegador', async () => {
    abrir()
    await screen.findByDisplayValue('018/26')

    await userEvent.selectOptions(screen.getByLabelText('Mês'), '02')
    await userEvent.selectOptions(screen.getByLabelText('Ano'), '2024')

    expect(screen.getByLabelText('Mês')).toHaveDisplayValue('Fevereiro')
    expect(screen.getByLabelText('Diárias')).toHaveValue(29)
    expect(screen.getByLabelText('Nome da campanha')).toHaveValue(
      'Consolidada de fevereiro de 2024',
    )
  })

  it('diárias acima do período mostram o limite ao sair do campo', async () => {
    abrir()
    await screen.findByDisplayValue('018/26')
    const diarias = screen.getByLabelText('Diárias')

    await userEvent.clear(diarias)
    await userEvent.type(diarias, '40')
    await userEvent.tab()

    expect(screen.getByText('Use até 31: o período tem 31 dias.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Usar 31' }))
    expect(diarias).toHaveValue(31)
  })
})
