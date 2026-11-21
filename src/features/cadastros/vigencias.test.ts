import { describe, expect, it } from 'vitest'
import { ordenarPorVigencia, situacaoDaVigencia, vigenteEm } from './vigencias'

const lista = [
  { id: 1, vigenteDesde: '2025-01-01' },
  { id: 3, vigenteDesde: '2027-01-01' },
  { id: 2, vigenteDesde: '2026-03-01' },
]

describe('vigências', () => {
  it('ordena da mais recente para a mais antiga', () => {
    expect(ordenarPorVigencia(lista).map((item) => item.id)).toEqual([3, 2, 1])
  })

  it('a vigente é a mais recente que já começou', () => {
    expect(vigenteEm(lista, '2026-11-16')?.id).toBe(2)
    expect(vigenteEm(lista, '2026-03-01')?.id).toBe(2)
    expect(vigenteEm(lista, '2024-12-31')).toBeUndefined()
  })

  it('situação de cada vigência', () => {
    const [antiga, futura, atual] = lista
    expect(situacaoDaVigencia(atual!, lista, '2026-11-16')).toBe('vigente')
    expect(situacaoDaVigencia(futura!, lista, '2026-11-16')).toBe('futura')
    expect(situacaoDaVigencia(antiga!, lista, '2026-11-16')).toBe('anterior')
  })
})
