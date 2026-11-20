import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Perfil } from '@/types/dominio'
import { PesquisasDoPainel } from './PesquisasDoPainel'

type Resposta = { status?: number; corpo?: unknown }
let rotas: Record<string, Resposta>
const pedidos: string[] = []

const ABERTA = {
  id: 2,
  codigo: '002/26',
  titulo: 'Consolidada de setembro e expectativa da Páscoa',
  status: 'ABERTA',
  prazoResposta: '2099-11-30',
  campanhas: [{ id: 21 }, { id: 22 }],
}
const PUBLICADA = {
  id: 1,
  codigo: '001/26',
  titulo: 'Consolidada de agosto de 2026',
  status: 'ENCERRADA',
  campanhas: [{ id: 11, publicada: true, publicadaEm: '2026-09-18T12:00:00Z' }],
}

beforeEach(() => {
  pedidos.length = 0
  rotas = {
    '/api/referencias': {
      corpo: { tiposHospedagem: [{ codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true }] },
    },
    '/api/rodadas': { corpo: [ABERTA, PUBLICADA] },
    '/api/rodadas/2/acompanhamento': {
      corpo: {
        rodadaId: 2,
        campanhas: [
          {
            qtdMh: 3,
            qtdRespondentes: 1,
            percentualLeitosRespondentes: 40,
            estabelecimentos: [
              { tipoHospedagemCodigo: 'POUSADA', respondeu: false },
              { tipoHospedagemCodigo: 'POUSADA', respondeu: false },
              { tipoHospedagemCodigo: 'POUSADA', respondeu: true },
            ],
          },
          { qtdMh: 3, qtdRespondentes: 2 },
        ],
      },
    },
    '/api/rodadas/1/acompanhamento': {
      corpo: { rodadaId: 1, campanhas: [{ qtdMh: 3, qtdRespondentes: 3 }] },
    },
    '/api/respostas/pendencias': {
      corpo: [
        {
          campanhaId: 21,
          campanhaNome: 'Consolidada de setembro de 2026',
          rodadaCodigo: '002/26',
          prazoResposta: '2099-11-30',
          estabelecimentoId: 7,
          nomeFantasia: 'Pousada do Sol',
          respondida: false,
        },
      ],
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const caminho = new URL(url).pathname
      pedidos.push(caminho)
      const { status = 200, corpo } = rotas[caminho] ?? { status: 404, corpo: {} }
      return new Response(JSON.stringify(corpo), { status })
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

function abrir(perfil: Perfil) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <PesquisasDoPainel perfil={perfil} /> },
      { path: '/pesquisas/nova', element: <p>nova pesquisa</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('PesquisasDoPainel', () => {
  it('ADMIN vê a rodada aberta e as recentes vindas da API', async () => {
    abrir('ADMIN')

    expect(await screen.findByText('Rodada 002/26')).toBeInTheDocument()
    expect(screen.getByText('Prazo de resposta: 30/11/2099', { exact: false })).toBeInTheDocument()
    expect(await screen.findByText('Faltam 2 respostas: 2 pousadas.')).toBeInTheDocument()
    expect(screen.getByText('1 de 3')).toBeInTheDocument()

    const [recente] = screen.getAllByRole('listitem')
    expect(within(recente as HTMLElement).getByText('001/26')).toBeInTheDocument()
    expect(await within(recente as HTMLElement).findByText('3 de 3')).toBeInTheDocument()
  })

  it('mostra o carregamento enquanto a API responde', () => {
    abrir('ADMIN')

    expect(screen.getByRole('status')).toHaveTextContent('Carregando as pesquisas')
  })

  it('sem rodada aberta, oferece criar uma pesquisa', async () => {
    rotas['/api/rodadas'] = { corpo: [PUBLICADA] }
    const router = abrir('ADMIN')

    expect(await screen.findByText('Nenhuma rodada aberta agora')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Criar pesquisa' }))

    expect(router.state.location.pathname).toBe('/pesquisas/nova')
  })

  it('erro ao listar as rodadas mostra o motivo e deixa tentar de novo', async () => {
    rotas['/api/rodadas'] = { status: 500, corpo: { detail: 'Falha no servidor.' } }
    abrir('ADMIN')

    expect(await screen.findByText('Não foi possível carregar as pesquisas.')).toBeInTheDocument()
    expect(screen.getByText('Falha no servidor.')).toBeInTheDocument()

    rotas['/api/rodadas'] = { corpo: [ABERTA] }
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Rodada 002/26')).toBeInTheDocument()
  })

  it('se o acompanhamento falha, a rodada aparece com um aviso', async () => {
    rotas['/api/rodadas/2/acompanhamento'] = { status: 500, corpo: {} }
    abrir('ADMIN')

    expect(
      await screen.findByText('Não foi possível carregar as respostas desta rodada.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Rodada 002/26')).toBeInTheDocument()
  })

  it('PARCEIRO vê só as próprias pesquisas, sem chamar as rotas do ADMIN', async () => {
    abrir('PARCEIRO')

    expect(await screen.findByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText(/Pousada do Sol/)).toBeInTheDocument()
    expect(pedidos).toEqual(['/api/respostas/pendencias'])
  })

  it('VISUALIZADOR não vê o cartão nem chama a API', () => {
    const { container } = render(<PesquisasDoPainel perfil="VISUALIZADOR" />)

    expect(container).toBeEmptyDOMElement()
    expect(pedidos).toEqual([])
  })
})
