import { describe, expect, it } from 'vitest'
import { opcoesCampanha, opcoesComparacao, opcoesTipo } from './filtros'

describe('opcoesCampanha', () => {
  it('monta o texto do design', () => {
    expect(
      opcoesCampanha([
        {
          campanhaId: 15,
          nome: 'Agosto de 2026',
          modalidade: 'CONSOLIDADA',
          codigoRodada: '015/26',
        },
      ]),
    ).toEqual([{ valor: '15', rotulo: 'Agosto de 2026 • consolidada (015/26)' }])
  })

  it('sem código da rodada, omite os parênteses', () => {
    expect(
      opcoesCampanha([{ campanhaId: 9, nome: 'FEFOL 2026', modalidade: 'EXPECTATIVA' }])[0]?.rotulo,
    ).toBe('FEFOL 2026 • expectativa')
  })
})

describe('opcoesComparacao', () => {
  it('oferece o mesmo mês nos anos anteriores', () => {
    expect(opcoesComparacao({ periodoInicio: '2026-08-01' })).toEqual([
      { valor: '2025', rotulo: 'Agosto de 2025' },
      { valor: '2024', rotulo: 'Agosto de 2024' },
    ])
  })

  it('sem campanha ou período, não oferece nada', () => {
    expect(opcoesComparacao(undefined)).toEqual([])
    expect(opcoesComparacao({})).toEqual([])
  })
})

describe('opcoesTipo', () => {
  it('começa por todos os tipos', () => {
    expect(opcoesTipo([{ codigo: 'HOTEL', nome: 'Hotel' }])).toEqual([
      { valor: 'todos', rotulo: 'Todos os tipos' },
      { valor: 'HOTEL', rotulo: 'Hotel' },
    ])
  })
})
