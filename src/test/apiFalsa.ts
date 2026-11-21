import { vi } from 'vitest'

export type RespostaFalsa = { status?: number; corpo?: unknown }
/** "MÉTODO /caminho" → resposta; com uma lista, cada chamada leva a próxima e a última se repete */
export type RotasFalsas = Record<string, RespostaFalsa | RespostaFalsa[]>
export type Chamada = { metodo: string; caminho: string; busca: string; corpo: unknown }

/** Troca o fetch por uma API em memória e guarda as chamadas. */
export function criarApiFalsa(iniciais: RotasFalsas) {
  const rotas: RotasFalsas = { ...iniciais }
  const chamadas: Chamada[] = []

  function responder(chave: string): RespostaFalsa {
    const resposta = rotas[chave]
    if (Array.isArray(resposta)) return resposta.length > 1 ? resposta.shift()! : resposta[0]!
    return resposta ?? { status: 404, corpo: { detail: `sem rota: ${chave}` } }
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const { pathname, search } = new URL(url)
      const metodo = init?.method ?? 'GET'
      const corpo =
        init?.body instanceof FormData
          ? init.body
          : init?.body
            ? JSON.parse(String(init.body))
            : null
      chamadas.push({ metodo, caminho: pathname, busca: search, corpo })
      const { status = 200, corpo: resposta } = responder(`${metodo} ${pathname}`)
      return new Response(status === 204 ? null : JSON.stringify(resposta ?? null), { status })
    }),
  )

  return {
    rotas,
    chamadas,
    /** chamadas que mudam dados */
    envios: () => chamadas.filter((chamada) => chamada.metodo !== 'GET'),
  }
}
