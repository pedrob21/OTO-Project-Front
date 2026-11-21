import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroRequisicao } from '@/api/erros'
import { limparSessao, salvarSessao } from '@/api/sessao'
import { baixarCsvDoResultado, nomeDoArquivo } from './baixarCsv'

const fetchFalso = vi.fn<typeof fetch>()
const clique = vi.fn()

beforeEach(() => {
  fetchFalso.mockReset()
  clique.mockReset()
  vi.stubGlobal('fetch', fetchFalso)
  URL.createObjectURL = vi.fn(() => 'blob:csv')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clique(this.download, this.href)
  })
  salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  limparSessao()
})

describe('nomeDoArquivo', () => {
  it.each([
    ['attachment; filename="resultado-campanha-50.csv"', 'resultado-campanha-50.csv'],
    ['attachment; filename=resultado.csv', 'resultado.csv'],
    ["attachment; filename*=UTF-8''resultado%20mar%C3%A7o.csv", 'resultado março.csv'],
    [null, 'padrao.csv'],
  ])('%s → %s', (disposicao, nome) => {
    expect(nomeDoArquivo(disposicao, 'padrao.csv')).toBe(nome)
  })
})

describe('baixarCsvDoResultado', () => {
  it('pede o CSV com o token e baixa com o nome do Content-Disposition', async () => {
    fetchFalso.mockResolvedValue(
      new Response('Campanha;Outubro', {
        headers: { 'Content-Disposition': 'attachment; filename="resultado-campanha-50.csv"' },
      }),
    )

    await expect(baixarCsvDoResultado(50)).resolves.toBe('resultado-campanha-50.csv')

    const [url, init] = fetchFalso.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:8080/api/campanhas/50/resultado.csv')
    expect(init?.headers).toEqual({ Authorization: 'Bearer abc' })
    expect(clique).toHaveBeenCalledWith('resultado-campanha-50.csv', 'blob:csv')
  })

  it('sem o cabeçalho, usa um nome padrão', async () => {
    fetchFalso.mockResolvedValue(new Response('x'))

    await expect(baixarCsvDoResultado(7)).resolves.toBe('resultado-campanha-7.csv')
  })

  it('erro da API vira ErroRequisicao, sem baixar nada', async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'A campanha 7 ainda não tem resultado publicado.' }), {
        status: 404,
      }),
    )

    const erro = await baixarCsvDoResultado(7).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ErroRequisicao)
    expect(erro).toMatchObject({
      status: 404,
      message: 'A campanha 7 ainda não tem resultado publicado.',
    })
    expect(clique).not.toHaveBeenCalled()
  })

  it('sem conexão', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(baixarCsvDoResultado(7)).rejects.toMatchObject({ status: 0 })
  })
})
