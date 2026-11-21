import { describe, expect, it } from 'vitest'
import { errosDosCampos, pedidoDosCampos } from '../campos'
import { CAMPOS_PARAMETROS, errosDosParametros } from './parametros'

const FORM = {
  vigenteDesde: '2027-01-01',
  percentualDayUse: '15,15',
  diasPermanenciaMedia: '4',
  diasEmParques: '2',
  gastoMedioDiario: '250',
  gastoMedioIngresso: '105.5',
  percentualMinimoLeitosPublicacao: '70',
  fonte: 'Pesquisa de Demanda Turística 2026',
}

describe('parâmetros de cálculo', () => {
  it('aceita vírgula ou ponto e manda números', () => {
    expect(errosDosCampos(CAMPOS_PARAMETROS, FORM)).toEqual({})
    expect(pedidoDosCampos(CAMPOS_PARAMETROS, FORM)).toEqual({
      vigenteDesde: '2027-01-01',
      percentualDayUse: 15.15,
      diasPermanenciaMedia: 4,
      diasEmParques: 2,
      gastoMedioDiario: 250,
      gastoMedioIngresso: 105.5,
      percentualMinimoLeitosPublicacao: 70,
      fonte: 'Pesquisa de Demanda Turística 2026',
    })
  })

  it('limites da API: day use abaixo de 100%, até duas casas e até 60 dias', () => {
    expect(
      errosDosCampos(CAMPOS_PARAMETROS, {
        ...FORM,
        percentualDayUse: '100',
        gastoMedioDiario: '250,555',
        diasPermanenciaMedia: '61',
        percentualMinimoLeitosPublicacao: '100',
      }),
    ).toEqual({
      percentualDayUse: 'Use um valor até 99,99.',
      gastoMedioDiario: 'Use um número com até 2 casas decimais.',
      diasPermanenciaMedia: 'Use um valor até 60.',
    })
  })

  it('dias em parques não passam a permanência média', () => {
    expect(errosDosParametros({ ...FORM, diasEmParques: '4' })).toEqual({})
    expect(errosDosParametros({ ...FORM, diasEmParques: '5' })).toEqual({
      diasEmParques: 'Os dias em parques não podem passar a permanência média.',
    })
  })
})
