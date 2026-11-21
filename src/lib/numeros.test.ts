import { describe, expect, it } from 'vitest'
import { lerDecimal } from './numeros'

describe('lerDecimal', () => {
  it('lê vírgula e ponto como separador decimal', () => {
    expect(lerDecimal('80,5')).toBe(80.5)
    expect(lerDecimal('80.5')).toBe(80.5)
  })

  it('lê inteiros e duas casas decimais', () => {
    expect(lerDecimal('80')).toBe(80)
    expect(lerDecimal('0,05')).toBe(0.05)
    expect(lerDecimal('105.00')).toBe(105)
  })

  it('ignora espaços nas pontas', () => {
    expect(lerDecimal('  80,5 ')).toBe(80.5)
  })

  it('recusa mais de duas casas decimais', () => {
    expect(lerDecimal('80,555')).toBeNull()
    expect(lerDecimal('80.123')).toBeNull()
  })

  it('recusa vazio e texto', () => {
    expect(lerDecimal('')).toBeNull()
    expect(lerDecimal('   ')).toBeNull()
    expect(lerDecimal('abc')).toBeNull()
    expect(lerDecimal('80 reais')).toBeNull()
    expect(lerDecimal('8 0')).toBeNull()
    expect(lerDecimal(',')).toBeNull()
    expect(lerDecimal('80,')).toBeNull()
    expect(lerDecimal(',5')).toBeNull()
  })

  it('recusa sinal e notação científica', () => {
    expect(lerDecimal('-80,5')).toBeNull()
    expect(lerDecimal('+80,5')).toBeNull()
    expect(lerDecimal('1e3')).toBeNull()
  })

  it('aceita o ponto de milhar quando há vírgula decimal', () => {
    expect(lerDecimal('1.234,5')).toBe(1234.5)
    expect(lerDecimal('1.234.567,89')).toBe(1234567.89)
  })

  it('recusa "1.234", ambíguo entre milhar e decimal, por ter três casas', () => {
    expect(lerDecimal('1.234')).toBeNull()
    expect(lerDecimal('1.234.567')).toBeNull()
  })

  it('recusa separadores misturados ou mal posicionados', () => {
    expect(lerDecimal('1,234.50')).toBeNull()
    expect(lerDecimal('12.34.567,8')).toBeNull()
    expect(lerDecimal('1.23,5')).toBeNull()
    expect(lerDecimal('80,5,5')).toBeNull()
  })
})
