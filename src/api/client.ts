import { ErroRequisicao } from './erros'
import { lerToken } from './sessao'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

type Parametros = Record<string, string | number | boolean | null | undefined>

type Opcoes = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  corpo?: unknown
  parametros?: Parametros
  signal?: AbortSignal
  /** false nas rotas públicas: um token velho faria o login responder 401 */
  autenticada?: boolean
}

let aoExpirarSessao: (() => void) | null = null

/** Chamado quando a API recusa o token enviado. */
export function definirAoExpirarSessao(funcao: (() => void) | null): void {
  aoExpirarSessao = funcao
}

function montarUrl(caminho: string, parametros: Parametros = {}): string {
  const busca = new URLSearchParams()
  for (const [nome, valor] of Object.entries(parametros)) {
    if (valor !== null && valor !== undefined) busca.set(nome, String(valor))
  }
  const texto = busca.toString()
  return `${API_URL}${caminho}${texto ? `?${texto}` : ''}`
}

export async function requisicao<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, parametros, signal, autenticada = true } = opcoes
  const token = autenticada ? lerToken() : null

  const cabecalhos: Record<string, string> = {}
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'
  if (token) cabecalhos.Authorization = `Bearer ${token}`

  let resposta: Response
  try {
    resposta = await fetch(montarUrl(caminho, parametros), {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal,
    })
  } catch (erro) {
    if (signal?.aborted) throw erro
    throw ErroRequisicao.semConexao()
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && token) aoExpirarSessao?.()
    throw await ErroRequisicao.daResposta(resposta)
  }

  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}
