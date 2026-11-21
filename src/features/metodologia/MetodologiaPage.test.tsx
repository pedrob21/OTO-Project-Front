import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MetodologiaPage } from './MetodologiaPage'

const fetchFalso = vi.fn<typeof fetch>()

function abrir() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MetodologiaPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchFalso.mockReset()
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => vi.unstubAllGlobals())

describe('MetodologiaPage', () => {
  it('tem um título principal e uma seção por regra', () => {
    fetchFalso.mockResolvedValue(new Response(JSON.stringify({})))
    abrir()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Como calculamos a taxa de ocupação e o fluxo de turistas',
      }),
    ).toBeInTheDocument()
    const secoes = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(secoes).toEqual([
      'Taxa de ocupação',
      'Leito útil',
      'Fluxo de turistas',
      'Meios de hospedagem que não responderam',
      'Day use',
      'Taxa de resposta e publicação',
      'Sigilo dos dados',
      'Receita sem hospedagem',
      'Faixas de ocupação',
      'Valores em vigor',
    ])
  })

  it('lista as cinco faixas de ocupação', () => {
    fetchFalso.mockResolvedValue(new Response(JSON.stringify({})))
    abrir()

    const itens = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(itens).toEqual([
      'Ruim: até 20%',
      'Regular: de 21 a 40%',
      'Boa: de 41 a 60%',
      'Ótima: de 61 a 80%',
      'Excelente: de 81 a 100%',
    ])
  })

  it('mostra os parâmetros em vigor vindos da API', async () => {
    fetchFalso.mockResolvedValue(
      new Response(
        JSON.stringify({
          vigenteDesde: '2024-01-01',
          percentualDayUse: 15.15,
          diasEmParques: 2,
          diasPermanenciaMedia: 4,
          gastoMedioIngresso: 105,
          gastoMedioDiario: 250,
          percentualMinimoLeitosPublicacao: 70,
          fonte: 'Pesquisa de Demanda Turística 2024',
        }),
      ),
    )
    abrir()

    expect(await screen.findByText('15,15%')).toBeInTheDocument()
    expect(screen.getByText('R$ 105')).toBeInTheDocument()
    expect(screen.getByText('R$ 250')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText(/Em vigor desde 01\/01\/2024/)).toBeInTheDocument()
  })

  it('falha nos parâmetros não esconde o texto da metodologia', async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 500 }))
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os parâmetros em vigor.',
    )
    expect(screen.getByRole('heading', { name: 'Leito útil' })).toBeInTheDocument()
  })
})
