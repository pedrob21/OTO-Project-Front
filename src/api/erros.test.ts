import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErroRequisicao } from './erros'
import { lerToken, limparSessao, salvarSessao } from './sessao'

describe('ErroRequisicao.daResposta', () => {
  it('usa o title quando não há detail', async () => {
    const resposta = new Response(JSON.stringify({ title: 'Not Found' }), { status: 404 })

    const erro = await ErroRequisicao.daResposta(resposta)

    expect(erro).toMatchObject({ status: 404, message: 'Not Found', campos: {} })
    expect(erro.name).toBe('ErroRequisicao')
  })

  it('corpo que não é JSON cai na mensagem padrão', async () => {
    const resposta = new Response('<html>erro</html>', { status: 502 })

    const erro = await ErroRequisicao.daResposta(resposta)

    expect(erro.status).toBe(502)
    expect(erro.message).toBe('O servidor não conseguiu atender ao pedido. Tente novamente.')
  })

  it('sem conexão tem status 0', () => {
    expect(ErroRequisicao.semConexao()).toMatchObject({
      status: 0,
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    })
  })
})

describe('sessão com o armazenamento bloqueado', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    limparSessao()
    sessionStorage.clear()
  })

  it('segue em memória quando não dá para gravar nem apagar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })

    salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
    expect(lerToken()).toBe('abc')

    expect(() => limparSessao()).not.toThrow()
    expect(lerToken()).toBeNull()
  })

  it('lê a sessão gravada por outro carregamento da página', () => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'salvo', expiraEm: new Date(Date.now() + 60_000).toISOString() }),
    )

    expect(lerToken()).toBe('salvo')
  })

  it('sem nada gravado não há token', () => {
    expect(lerToken()).toBeNull()
  })
})
