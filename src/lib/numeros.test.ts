import { describe, expect, it } from 'vitest'
import { lerDecimal, textoDoNumero } from './numeros'

describe('lerDecimal', () => {
  it.each([
    ['80,5', 80.5],
    ['80.5', 80.5],
    [' 15,15 ', 15.15],
    ['250', 250],
    ['-20,7', -20.7],
    ['0', 0],
  ])('"%s" → %s', (texto, esperado) => {
    expect(lerDecimal(texto)).toBe(esperado)
  })

  it('recusa mais casas decimais que o permitido', () => {
    expect(lerDecimal('80,555')).toBeNull()
    expect(lerDecimal('12,5', 0)).toBeNull()
    expect(lerDecimal('-20,123456', 6)).toBe(-20.123456)
  })

  it.each(['', 'abc', '1.000,50', '12,', ',5', '1e3', '10 %'])('recusa "%s"', (texto) => {
    expect(lerDecimal(texto)).toBeNull()
  })
  it('recusa espaços no meio, sinal de mais e separadores mal posicionados', () => {
    for (const texto of ['   ', '80 reais', '8 0', ',', '+80,5', '1,234.50', '1.23,5', '80,5,5']) {
      expect(lerDecimal(texto)).toBeNull()
    }
  })

  it('recusa "1.234", ambíguo entre milhar e decimal, por ter três casas', () => {
    expect(lerDecimal('1.234')).toBeNull()
  })
})

describe('textoDoNumero', () => {
  it('usa vírgula e deixa vazio o que não veio', () => {
    expect(textoDoNumero(80.5)).toBe('80,5')
    expect(textoDoNumero(40)).toBe('40')
    expect(textoDoNumero(null)).toBe('')
    expect(textoDoNumero(undefined)).toBe('')
  })
})
