import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { MetodologiaPage } from './MetodologiaPage'

afterEach(() => vi.unstubAllGlobals())

describe('MetodologiaPage, acessibilidade', () => {
  it('não tem violações com os parâmetros carregados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
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
      ),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MetodologiaPage />
      </QueryClientProvider>,
    )
    await screen.findByText('15,15%')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
