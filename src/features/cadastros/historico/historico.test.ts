import { describe, expect, it } from 'vitest'
import {
  errosDoHistorico,
  formatarValor,
  formDoHistorico,
  pedidoDoHistorico,
  textoDoPeriodo,
} from './historico'

const FORM = {
  ...formDoHistorico(),
  ano: '2024',
  mes: '7',
  valor: '68,4',
  fonte: ' Indicadores do Turismo ',
}

describe('série histórica', () => {
  it('período do mês ou do feriado', () => {
    const feriados = [{ codigo: 'CARNAVAL', nome: 'Carnaval' }]
    expect(textoDoPeriodo({ ano: 2024, mes: 7 }, feriados)).toBe('Julho de 2024')
    expect(textoDoPeriodo({ ano: 2024, feriadoCodigo: 'CARNAVAL' }, feriados)).toBe('Carnaval 2024')
    expect(textoDoPeriodo({ ano: 2024, feriadoCodigo: 'PASCOA' }, feriados)).toBe('PASCOA 2024')
  })

  it('valor no formato do indicador', () => {
    expect(formatarValor({ indicador: 'TAXA_OCUPACAO', valor: 63.45 })).toBe('63,45%')
    expect(formatarValor({ indicador: 'FLUXO_TURISTAS', valor: 98512 })).toBe('98.512')
    expect(formatarValor({ indicador: 'DIARIA_MEDIA', valor: 412.9 })).toMatch(/412,90$/)
  })

  it('manda só o mês ou só o feriado, e sem tipo é o geral', () => {
    expect(pedidoDoHistorico(FORM)).toEqual({
      indicador: 'TAXA_OCUPACAO',
      modalidade: 'CONSOLIDADA',
      ano: 2024,
      mes: 7,
      feriadoCodigo: undefined,
      tipoHospedagemCodigo: undefined,
      valor: 68.4,
      observacao: undefined,
      fonte: 'Indicadores do Turismo',
    })
    expect(
      pedidoDoHistorico({ ...FORM, periodo: 'FERIADO', feriadoCodigo: 'CARNAVAL' }),
    ).toMatchObject({ mes: undefined, feriadoCodigo: 'CARNAVAL' })
  })

  it('regras da API', () => {
    expect(errosDoHistorico(FORM)).toEqual({})
    expect(errosDoHistorico({ ...FORM, valor: '100,01' }).valor).toBe('Use um valor até 100.')
    expect(
      errosDoHistorico({ ...FORM, indicador: 'FLUXO_TURISTAS', valor: '100000' }).valor,
    ).toBeUndefined()
    expect(errosDoHistorico({ ...FORM, periodo: 'FERIADO' }).feriadoCodigo).toBe(
      'Escolha o feriado.',
    )
    expect(errosDoHistorico({ ...FORM, ano: '2101' }).ano).toBe('Use um valor até 2100.')
  })

  it('edição parte do valor gravado', () => {
    expect(
      formDoHistorico({
        indicador: 'DIARIA_MEDIA',
        modalidade: 'EXPECTATIVA',
        ano: 2024,
        feriadoCodigo: 'CARNAVAL',
        tipoHospedagemCodigo: 'HOTEL',
        valor: 412.9,
        fonte: 'Booking',
      }),
    ).toMatchObject({
      periodo: 'FERIADO',
      mes: '',
      feriadoCodigo: 'CARNAVAL',
      valor: '412,9',
      ano: '2024',
    })
  })
})
