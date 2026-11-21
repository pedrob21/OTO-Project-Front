import { afterEach, describe, expect, it, vi } from 'vitest'
import { nomeDoArquivo, salvarArquivo } from './download'

describe('nomeDoArquivo', () => {
  it('lê o nome entre aspas', () => {
    expect(nomeDoArquivo('attachment; filename="resultado-campanha-42.csv"', 'padrao.csv')).toBe(
      'resultado-campanha-42.csv',
    )
  })

  it('lê o nome sem aspas', () => {
    expect(nomeDoArquivo('attachment; filename=resultado.csv', 'padrao.csv')).toBe('resultado.csv')
  })

  it('prefere filename* e decodifica UTF-8', () => {
    expect(
      nomeDoArquivo(
        'attachment; filename="resultado-campanha.csv"; filename*=UTF-8\'\'ocupa%C3%A7%C3%A3o.csv',
        'padrao.csv',
      ),
    ).toBe('ocupação.csv')
  })

  it('usa o nome simples quando filename* está malformado', () => {
    expect(
      nomeDoArquivo('attachment; filename="a.csv"; filename*=UTF-8\'\'%E0%A4%A', 'p.csv'),
    ).toBe('a.csv')
  })

  it('sem cabeçalho ou sem nome, usa o padrão', () => {
    expect(nomeDoArquivo(null, 'padrao.csv')).toBe('padrao.csv')
    expect(nomeDoArquivo('attachment', 'padrao.csv')).toBe('padrao.csv')
  })
})

describe('salvarArquivo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('clica num link com o nome e libera a URL', () => {
    URL.createObjectURL = vi.fn(() => 'blob:falso')
    URL.revokeObjectURL = vi.fn()
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('resultado.csv')
      expect(this.href).toBe('blob:falso')
    })

    salvarArquivo(new Blob(['a']), 'resultado.csv')

    expect(clique).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:falso')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
