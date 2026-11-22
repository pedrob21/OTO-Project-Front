import { describe, expect, it } from 'vitest'
import { ESCALA_PERCENTUAL, escalaAutomatica } from './escala'

const texto = (valor: number) => String(valor)

describe('escalaAutomatica', () => {
  it.each([
    [496_660, 500_000, [0, 125_000, 250_000, 375_000, 500_000]],
    [812.4, 1_000, [0, 250, 500, 750, 1_000]],
    [70, 80, [0, 20, 40, 60, 80]],
    [3, 3, [0, 0.75, 1.5, 2.25, 3]],
    [1_900_000, 2_000_000, [0, 500_000, 1_000_000, 1_500_000, 2_000_000]],
    [33_000, 40_000, [0, 10_000, 20_000, 30_000, 40_000]],
  ])('maior valor %d → até %d', (maior, maximo, marcas) => {
    const escala = escalaAutomatica(maior, texto)
    expect(escala.maximo).toBe(maximo)
    expect(escala.marcas).toEqual(marcas)
    expect(escala.maximo).toBeGreaterThanOrEqual(maior)
  })

  it('sem valor positivo, ainda desenha uma grade', () => {
    expect(escalaAutomatica(0, texto).marcas).toEqual([0, 1, 2, 3, 4])
  })

  it('guarda o formato e a largura das marcas', () => {
    const escala = escalaAutomatica(100, (valor) => `R$ ${valor}`, 56)
    expect(escala.formatarMarca(25)).toBe('R$ 25')
    expect(escala.larguraMarcas).toBe(56)
  })
})

describe('ESCALA_PERCENTUAL', () => {
  it('vai de 0% a 100%', () => {
    expect(ESCALA_PERCENTUAL.marcas.map(ESCALA_PERCENTUAL.formatarMarca)).toEqual([
      '0%',
      '25%',
      '50%',
      '75%',
      '100%',
    ])
  })
})
