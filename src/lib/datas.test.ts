import { describe, expect, it } from 'vitest'
import { diasDoPeriodo, hojeLocal, mesAnterior, periodoDoMes } from './datas'

describe('datas', () => {
  it('período do mês, inclusive fevereiro de ano bissexto', () => {
    expect(periodoDoMes('2026-02')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' })
    expect(periodoDoMes('2028-02')).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' })
    expect(periodoDoMes('2026-12')).toEqual({ inicio: '2026-12-01', fim: '2026-12-31' })
    expect(periodoDoMes('2026-13')).toBeNull()
    expect(periodoDoMes('')).toBeNull()
  })

  it('conta os dias do período com o primeiro e o último', () => {
    expect(diasDoPeriodo('2026-02-13', '2026-02-17')).toBe(5)
    expect(diasDoPeriodo('2026-03-01', '2026-03-31')).toBe(31)
    expect(diasDoPeriodo('2026-03-02', '2026-03-01')).toBe(0)
  })

  it('mês anterior vira o ano em janeiro', () => {
    expect(mesAnterior('2026-11-16')).toBe('2026-10')
    expect(mesAnterior('2027-01-10')).toBe('2026-12')
  })

  it('hoje no fuso local', () => {
    expect(hojeLocal(new Date(2026, 10, 16, 23, 30))).toBe('2026-11-16')
  })
})
