import { describe, expect, it } from 'vitest'
import {
  formatarCompacto,
  formatarData,
  formatarInteiro,
  formatarMes,
  formatarMesAno,
  formatarMesCurto,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPercentual,
  formatarVariacaoPercentual,
  formatarVariacaoPontos,
} from './formatos'

const nbsp = ' '

describe('números', () => {
  it('inteiro com separador de milhar', () => {
    expect(formatarInteiro(4643)).toBe('4.643')
    expect(formatarInteiro(586)).toBe('586')
  })

  it('percentual com uma casa por padrão', () => {
    expect(formatarPercentual(62.8)).toBe('62,8%')
    expect(formatarPercentual(82, 0)).toBe('82%')
    expect(formatarPercentual(0)).toBe('0,0%')
  })

  it('compacto em mil e milhão', () => {
    expect(formatarCompacto(496_700)).toBe(`496,7${nbsp}mil`)
    expect(formatarCompacto(16_000)).toBe(`16,0${nbsp}mil`)
    expect(formatarCompacto(89_000_000)).toBe(`89,0${nbsp}mi`)
    expect(formatarCompacto(950)).toBe('950')
  })

  it('compacto não mostra 1.000,0 mil', () => {
    expect(formatarCompacto(999_960)).toBe(`1,0${nbsp}mi`)
    expect(formatarCompacto(999_940)).toBe(`999,9${nbsp}mil`)
  })

  it('moeda', () => {
    expect(formatarMoeda(765)).toBe(`R$${nbsp}765`)
    expect(formatarMoeda(1234)).toBe(`R$${nbsp}1.234`)
    expect(formatarMoedaCompacta(89_000_000)).toBe(`R$${nbsp}89,0${nbsp}mi`)
    expect(formatarMoedaCompacta(5_100_000)).toBe(`R$${nbsp}5,1${nbsp}mi`)
  })
})

describe('variações', () => {
  it('pontos percentuais com sinal', () => {
    expect(formatarVariacaoPontos(4.1)).toBe(`+4,1${nbsp}p.p.`)
    expect(formatarVariacaoPontos(-5, 0)).toBe(`−5${nbsp}p.p.`)
  })

  it('percentual com sinal', () => {
    expect(formatarVariacaoPercentual(6.1)).toBe('+6,1%')
    expect(formatarVariacaoPercentual(-2.5)).toBe('−2,5%')
  })

  it('zero, mesmo depois de arredondar, não tem sinal', () => {
    expect(formatarVariacaoPontos(0)).toBe(`0,0${nbsp}p.p.`)
    expect(formatarVariacaoPercentual(-0.04)).toBe('0,0%')
    expect(formatarVariacaoPercentual(0.04)).toBe('0,0%')
  })
})

describe('datas', () => {
  it('meses', () => {
    expect(formatarMes(8)).toBe('agosto')
    expect(formatarMesCurto(3)).toBe('Mar')
    expect(formatarMesAno(8, 2025)).toBe('ago./2025')
  })

  it('mês inválido', () => {
    expect(formatarMes(13)).toBe('—')
    expect(formatarMesCurto(0)).toBe('—')
    expect(formatarMesAno(13, 2025)).toBe('—')
  })

  it('data ISO sem efeito de fuso', () => {
    expect(formatarData('2026-09-18')).toBe('18/09/2026')
    expect(formatarData('2026-03-01T00:30:00Z')).toBe('01/03/2026')
    expect(formatarData('ontem')).toBe('—')
  })
})

describe('valor ausente', () => {
  it.each([null, undefined, Number.NaN])('%s vira travessão', (valor) => {
    expect(formatarInteiro(valor)).toBe('—')
    expect(formatarPercentual(valor)).toBe('—')
    expect(formatarCompacto(valor)).toBe('—')
    expect(formatarMoeda(valor)).toBe('—')
    expect(formatarMoedaCompacta(valor)).toBe('—')
    expect(formatarVariacaoPontos(valor)).toBe('—')
    expect(formatarVariacaoPercentual(valor)).toBe('—')
  })

  it('data ausente', () => {
    expect(formatarData(null)).toBe('—')
    expect(formatarData(undefined)).toBe('—')
  })
})
