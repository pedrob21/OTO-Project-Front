import { describe, expect, it } from 'vitest'
import { campanhaDoAnoComparado, montarComparativo, valorDaSerie } from './comparacao'

const atual = { taxaOcupacao: 62.8, fluxoTotal: 110, diariaMedia: 200 }

describe('campanhaDoAnoComparado', () => {
  const agosto2025 = {
    campanhaId: 7,
    modalidade: 'CONSOLIDADA' as const,
    tipoPeriodo: 'MENSAL' as const,
    periodoInicio: '2025-08-01',
  }
  const campanha = { ...agosto2025, campanhaId: 15, periodoInicio: '2026-08-01' }

  it('acha o mesmo mês no ano comparado', () => {
    const outras = [
      { ...agosto2025, campanhaId: 5, periodoInicio: '2025-07-01' },
      { ...agosto2025, campanhaId: 6, modalidade: 'EXPECTATIVA' as const },
      { ...agosto2025, campanhaId: 4, periodoInicio: '2024-08-01' },
    ]

    expect(campanhaDoAnoComparado([...outras, agosto2025], campanha, 2025)?.campanhaId).toBe(7)
    expect(campanhaDoAnoComparado(outras, campanha, 2025)).toBeUndefined()
  })

  it('em feriado, exige o mesmo feriado', () => {
    const pascoa = { ...campanha, tipoPeriodo: 'FERIADO' as const, feriadoCodigo: 'PASCOA' }
    const antigas = [
      { ...pascoa, campanhaId: 1, periodoInicio: '2025-04-18', feriadoCodigo: 'CARNAVAL' },
      { ...pascoa, campanhaId: 2, periodoInicio: '2025-04-18' },
    ]

    expect(campanhaDoAnoComparado(antigas, pascoa, 2025)?.campanhaId).toBe(2)
  })

  it('sem campanha ou período, não acha nada', () => {
    expect(campanhaDoAnoComparado([agosto2025], undefined, 2025)).toBeUndefined()
    expect(campanhaDoAnoComparado([agosto2025], {}, 2025)).toBeUndefined()
  })
})

describe('montarComparativo', () => {
  it('com resultado publicado, usa ele', () => {
    const comparativo = montarComparativo(
      atual,
      2025,
      { taxaOcupacao: 58.7, fluxoTotal: 100, diariaMedia: 160 },
      { taxaOcupacao: 1, fluxoTotal: 1, diariaMedia: 1 },
    )

    expect(comparativo).toMatchObject({
      ano: 2025,
      origem: 'SISTEMA',
      taxaOcupacao: 58.7,
      fluxoTotal: 100,
      diariaMedia: 160,
      variacaoFluxoPercentual: 10,
      variacaoDiariaPercentual: 25,
    })
    expect(comparativo?.diferencaTaxaPontos).toBeCloseTo(4.1)
    expect(comparativo).not.toHaveProperty('variacaoReceitaPercentual')
  })

  it('sem publicado, usa a série histórica', () => {
    const comparativo = montarComparativo(atual, 2025, undefined, {
      taxaOcupacao: 60.8,
      fluxoTotal: null,
      diariaMedia: 250,
    })

    expect(comparativo?.origem).toBe('HISTORICO')
    expect(comparativo?.diferencaTaxaPontos).toBeCloseTo(2)
    expect(comparativo?.variacaoFluxoPercentual).toBeUndefined()
    expect(comparativo?.variacaoDiariaPercentual).toBe(-20)
  })

  it('sem nenhum dos dois, não inventa comparação', () => {
    expect(montarComparativo(atual, 2025, undefined, undefined)).toBeUndefined()
    expect(
      montarComparativo(atual, 2025, undefined, {
        taxaOcupacao: null,
        fluxoTotal: null,
        diariaMedia: null,
      }),
    ).toBeUndefined()
  })

  it('não calcula variação sobre base zero ou ausente', () => {
    const comparativo = montarComparativo(
      atual,
      2025,
      { taxaOcupacao: 0, fluxoTotal: 0 },
      undefined,
    )

    expect(comparativo?.diferencaTaxaPontos).toBe(62.8)
    expect(comparativo?.variacaoFluxoPercentual).toBeUndefined()
    expect(comparativo?.variacaoDiariaPercentual).toBeUndefined()
  })
})

describe('valorDaSerie', () => {
  const serie = { anos: [{ ano: 2025, meses: [{ mes: 8, valor: 58.7 }, { mes: 9 }] }] }

  it('lê o mês do ano', () => {
    expect(valorDaSerie(serie, 2025, 8)).toBe(58.7)
  })

  it('devolve null sem ano, mês ou valor', () => {
    expect(valorDaSerie(serie, 2024, 8)).toBeNull()
    expect(valorDaSerie(serie, 2025, 9)).toBeNull()
    expect(valorDaSerie(serie, 2025, 1)).toBeNull()
    expect(valorDaSerie(undefined, 2025, 8)).toBeNull()
  })
})
