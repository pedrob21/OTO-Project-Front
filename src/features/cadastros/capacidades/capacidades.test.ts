import { describe, expect, it } from 'vitest'
import { capacidadeVigente, errosDaCapacidade, ordenarCapacidades } from './capacidades'

const capacidades = [
  { id: 1, vigenteDesde: '2025-01-01' },
  { id: 3, vigenteDesde: '2027-01-01' },
  { id: 2, vigenteDesde: '2026-03-01' },
]

describe('capacidades', () => {
  it('ordena da mais recente para a mais antiga', () => {
    expect(ordenarCapacidades(capacidades).map((item) => item.id)).toEqual([3, 2, 1])
  })

  it('a vigente é a mais recente que já começou', () => {
    expect(capacidadeVigente(capacidades, '2026-11-16')?.id).toBe(2)
    expect(capacidadeVigente(capacidades, '2026-03-01')?.id).toBe(2)
    expect(capacidadeVigente(capacidades, '2024-12-31')).toBeUndefined()
  })

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
