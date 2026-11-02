import { afterEach, describe, expect, it } from 'vitest'
import { lerToken, limparSessao, salvarSessao } from './sessao'

afterEach(() => {
  limparSessao()
  sessionStorage.clear()
})

describe('sessão', () => {
  it('devolve o token enquanto vale', () => {
    salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })

    expect(lerToken()).toBe('abc')
  })

  it('descarta sessão vencida', () => {
    salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() - 1).toISOString() })

    expect(lerToken()).toBeNull()
    expect(sessionStorage.getItem('oto.sessao')).toBeNull()
  })

  it('descarta data de expiração inválida', () => {
    salvarSessao({ token: 'abc', expiraEm: 'amanhã' })

    expect(lerToken()).toBeNull()
  })

  it('ignora conteúdo corrompido no armazenamento', () => {
    sessionStorage.setItem('oto.sessao', '{quebrado')
    expect(lerToken()).toBeNull()

    sessionStorage.setItem('oto.sessao', JSON.stringify({ token: 1 }))
    expect(lerToken()).toBeNull()
  })

  it('sair apaga o token', () => {
    salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })

    limparSessao()

    expect(lerToken()).toBeNull()
  })
})
