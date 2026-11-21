import { describe, expect, it } from 'vitest'
import { formatarDiaria, validarResposta } from './resposta'

describe('validarResposta', () => {
  it('aceita vírgula ou ponto e manda números para a API', () => {
    expect(validarResposta({ taxaOcupacao: '80,5', diariaMedia: '410.90' })).toEqual({
      erros: {},
      dados: { taxaOcupacao: 80.5, diariaMedia: 410.9 },
    })
  })

  it('diária é opcional', () => {
    expect(validarResposta({ taxaOcupacao: '0', diariaMedia: '' }).dados).toEqual({
      taxaOcupacao: 0,
      diariaMedia: undefined,
    })
  })

  it('exige a taxa', () => {
    expect(validarResposta({ taxaOcupacao: '', diariaMedia: '' }).erros).toEqual({
      taxaOcupacao: 'Informe a taxa de ocupação.',
    })
  })

  it.each(['100,01', '150'])('recusa taxa %s, fora de 0 a 100', (taxa) => {
    const { erros, dados } = validarResposta({ taxaOcupacao: taxa, diariaMedia: '' })

    expect(erros.taxaOcupacao).toBe('A taxa vai de 0 a 100%.')
    expect(dados).toBeUndefined()
  })

  it('recusa mais de duas casas decimais', () => {
    expect(validarResposta({ taxaOcupacao: '80,555', diariaMedia: '1,234' }).erros).toEqual({
      taxaOcupacao: 'Use no máximo duas casas decimais.',
      diariaMedia: 'Use no máximo duas casas decimais.',
    })
  })

  it('diária precisa ser maior que zero e caber na API', () => {
    expect(validarResposta({ taxaOcupacao: '50', diariaMedia: '0' }).erros.diariaMedia).toBe(
      'A diária precisa ser maior que zero.',
    )
    expect(
      validarResposta({ taxaOcupacao: '50', diariaMedia: '100000000' }).erros.diariaMedia,
    ).toBe('A diária média passa do limite aceito.')
  })
})

describe('formatarDiaria', () => {
  it('mostra os centavos', () => {
    expect(formatarDiaria(410.5)).toBe('R$\u00a0410,50')
    expect(formatarDiaria(undefined)).toBe('—')
  })
})
