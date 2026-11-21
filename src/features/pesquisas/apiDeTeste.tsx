import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'

// Só para os testes das telas de pesquisas: simula a API por "MÉTODO /caminho".

export type Resposta = { status?: number; corpo?: unknown }
type Rotas = Record<string, Resposta | Resposta[]>

export type Chamada = { metodo: string; caminho: string; busca: string; corpo: unknown }

export function simularApi(rotasIniciais: Rotas) {
  const rotas: Rotas = { ...rotasIniciais }
  const chamadas: Chamada[] = []

  function responder(chave: string): Resposta {
    const resposta = rotas[chave]
    if (Array.isArray(resposta)) return resposta.length > 1 ? resposta.shift()! : resposta[0]!
    return resposta ?? { status: 404, corpo: { detail: `sem rota: ${chave}` } }
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const { pathname, search } = new URL(url)
      const metodo = init?.method ?? 'GET'
      chamadas.push({
        metodo,
        caminho: pathname,
        busca: search,
        corpo: init?.body ? JSON.parse(String(init.body)) : null,
      })
      const { status = 200, corpo } = responder(`${metodo} ${pathname}`)
      return status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(corpo), { status })
    }),
  )

  return {
    rotas,
    chamadas,
    /** chamadas que mudam dados */
    escritas: () => chamadas.filter((chamada) => chamada.metodo !== 'GET'),
    leituras: (caminho: string) =>
      chamadas.filter((chamada) => chamada.metodo === 'GET' && chamada.caminho === caminho).length,
  }
}

export function abrirTela(rotas: RouteObject[], caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
