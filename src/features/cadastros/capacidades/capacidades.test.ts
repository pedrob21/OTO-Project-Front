import { describe, expect, it } from 'vitest'
import { errosDaCapacidade } from './capacidades'

describe('capacidades', () => {
  it('UH PCD não passa o total de UH', () => {
    expect(errosDaCapacidade({ qtdUh: '10', qtdUhPcd: '10' })).toEqual({})
    expect(errosDaCapacidade({ qtdUh: '10', qtdUhPcd: '11' })).toEqual({
      qtdUhPcd: 'As UH PCD não podem passar o total de UH.',
    })
    expect(
      errosDaCapacidade({ 'capacidade.qtdUh': '1', 'capacidade.qtdUhPcd': '2' }, 'capacidade.'),
    ).toHaveProperty('capacidade.qtdUhPcd')
  })
})
