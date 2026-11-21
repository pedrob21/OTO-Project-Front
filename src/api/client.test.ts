import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definirAoExpirarSessao, requisicao } from './client'
import { ErroRequisicao } from './erros'
import { limparSessao, salvarSessao } from './sessao'

const fetchFalso = vi.fn<typeof fetch>()

function json(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), { status })
}

function entrarComToken() {
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
}

function cabecalhosDaChamada() {
  return fetchFalso.mock.calls[0]?.[1]?.headers as Record<string, string>
}

beforeEach(() => {
  fetchFalso.mockReset()
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
  limparSessao()
  definirAoExpirarSessao(null)
})

describe('requisicao', () => {
  it('envia o token e omite parâmetros vazios', async () => {
    entrarComToken()
    fetchFalso.mockResolvedValue(json(200, { ok: true }))

    const resposta = await requisicao('/api/x', {
      parametros: { ano: 2026, tipo: null, b: undefined },
    })

    expect(resposta).toEqual({ ok: true })
    expect(fetchFalso.mock.calls[0]?.[0]).toBe('http://localhost:8080/api/x?ano=2026')
    expect(cabecalhosDaChamada().Authorization).toBe('Bearer abc')
  })

  it('rota pública não envia token', async () => {
    entrarComToken()
    fetchFalso.mockResolvedValue(json(200, {}))

    await requisicao('/api/auth/login', { metodo: 'POST', corpo: {}, autenticada: false })

    expect(cabecalhosDaChamada().Authorization).toBeUndefined()
    expect(cabecalhosDaChamada()['Content-Type']).toBe('application/json')
  })

  it('204 não tenta ler corpo', async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(requisicao('/api/x', { metodo: 'DELETE' })).resolves.toBeUndefined()
  })

  it('transforma Problem Details em erro com os campos', async () => {
    fetchFalso.mockResolvedValue(
      json(400, { detail: 'Corrija os campos indicados.', campos: { email: 'inválido' } }),
    )

    const erro = await requisicao('/api/x').catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ErroRequisicao)
    expect(erro).toMatchObject({
      status: 400,
      message: 'Corrija os campos indicados.',
      campos: { email: 'inválido' },
    })
  })

  it('aguenta erro com corpo vazio', async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 500 }))

    await expect(requisicao('/api/x')).rejects.toMatchObject({ status: 500 })
  })

  it('falha de rede vira status 0', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(requisicao('/api/x')).rejects.toMatchObject({ status: 0 })
  })

  it('cancelamento não vira erro de conexão', async () => {
    const controle = new AbortController()
    controle.abort()
    fetchFalso.mockRejectedValue(new DOMException('cancelado', 'AbortError'))

    await expect(requisicao('/api/x', { signal: controle.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})

describe('401', () => {
  it('com token enviado, avisa que a sessão expirou', async () => {
    entrarComToken()
    const aoExpirar = vi.fn()
    definirAoExpirarSessao(aoExpirar)
    fetchFalso.mockResolvedValue(new Response(null, { status: 401 }))

    await expect(requisicao('/api/me')).rejects.toMatchObject({ status: 401 })

    expect(aoExpirar).toHaveBeenCalledOnce()
  })

  it('senha errada no login não conta como sessão expirada', async () => {
    const aoExpirar = vi.fn()
    definirAoExpirarSessao(aoExpirar)
    fetchFalso.mockResolvedValue(json(401, { detail: 'E-mail ou senha incorretos.' }))

    await expect(
      requisicao('/api/auth/login', { metodo: 'POST', corpo: {}, autenticada: false }),
    ).rejects.toMatchObject({ message: 'E-mail ou senha incorretos.' })

    expect(aoExpirar).not.toHaveBeenCalled()
  })
})
