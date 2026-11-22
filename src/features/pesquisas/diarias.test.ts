import { describe, expect, it } from 'vitest'
import {
  GERAL,
  fonteAtual,
  linhasDeDiarias,
  pedidoDeDiarias,
  ultimaAlteracao,
  validarDiaria,
} from './diarias'

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel' },
  { codigo: 'POUSADA', nome: 'Pousada' },
]
const INFORMADAS = [
  { tipoHospedagemCodigo: null as unknown as undefined, diariaMedia: 800, fonte: '' },
  {
    tipoHospedagemCodigo: 'HOTEL',
    diariaMedia: 700,
    fonte: 'Planilha',
    registradoEm: '2026-11-12T17:30:00Z',
  },
  { tipoHospedagemCodigo: 'CAMPING', diariaMedia: 90, registradoEm: '2026-11-10T10:00:00Z' },
]

describe('linhasDeDiarias', () => {
  it('a geral primeiro, depois os tipos e os informados fora das referências', () => {
    const linhas = linhasDeDiarias(TIPOS, INFORMADAS, {
      diariaMedia: 800,
      porTipo: [
        { tipoHospedagemCodigo: 'HOTEL', diariaMedia: 700 },
        { tipoHospedagemCodigo: 'POUSADA', diariaMedia: null as unknown as undefined },
      ],
    })

    expect(linhas).toEqual([
      { codigo: GERAL, nome: 'Geral', rotulo: 'diária geral', informada: 800, naPrevia: 800 },
      { codigo: 'HOTEL', nome: 'Hotel', rotulo: 'diária de Hotel', informada: 700, naPrevia: 700 },
      {
        codigo: 'POUSADA',
        nome: 'Pousada',
        rotulo: 'diária de Pousada',
        informada: null,
        naPrevia: null,
      },
      {
        codigo: 'CAMPING',
        nome: 'CAMPING',
        rotulo: 'diária de CAMPING',
        informada: 90,
        naPrevia: null,
      },
    ])
  })

  it('sem resultado e sem informadas, todas as linhas ficam vazias', () => {
    const linhas = linhasDeDiarias([{ codigo: 'HOTEL' }], [], undefined)

    expect(linhas.map((linha) => [linha.nome, linha.informada, linha.naPrevia])).toEqual([
      ['Geral', null, null],
      ['HOTEL', null, null],
    ])
  })
})

describe('validarDiaria', () => {
  it.each([
    ['', 'Informe a diária média.'],
    ['  ', 'Informe a diária média.'],
    ['abc', 'Use só números, como 410,00.'],
    ['0', 'A diária precisa ser maior que zero.'],
    ['410,555', 'Use no máximo duas casas decimais.'],
    ['100000000', 'A diária média passa do limite aceito.'],
  ])('"%s" → %s', (texto, erro) => {
    expect(validarDiaria(texto)).toBe(erro)
  })

  it.each(['410', '410,5', '410.55', '1.234,56'])('"%s" vale', (texto) => {
    expect(validarDiaria(texto)).toBeUndefined()
  })
})

describe('pedidoDeDiarias', () => {
  it('inclui um tipo e mantém os demais', () => {
    expect(pedidoDeDiarias(INFORMADAS, 'POUSADA', 410.5, ' Planilha ')).toEqual({
      diarias: [
        { diariaMedia: 800 },
        { tipoHospedagemCodigo: 'HOTEL', diariaMedia: 700 },
        { tipoHospedagemCodigo: 'CAMPING', diariaMedia: 90 },
        { tipoHospedagemCodigo: 'POUSADA', diariaMedia: 410.5 },
      ],
      fonte: 'Planilha',
    })
  })

  it('corrige a geral sem mandar o código do tipo', () => {
    expect(pedidoDeDiarias(INFORMADAS, GERAL, 820, '').diarias).toEqual([
      { tipoHospedagemCodigo: 'HOTEL', diariaMedia: 700 },
      { tipoHospedagemCodigo: 'CAMPING', diariaMedia: 90 },
      { diariaMedia: 820 },
    ])
  })

  it('remove com valor nulo; sem fonte, ela não vai', () => {
    expect(pedidoDeDiarias(INFORMADAS, 'HOTEL', null, '')).toEqual({
      diarias: [{ diariaMedia: 800 }, { tipoHospedagemCodigo: 'CAMPING', diariaMedia: 90 }],
      fonte: undefined,
    })
  })
})

describe('fonte e data', () => {
  it('a primeira fonte preenchida e o registro mais recente', () => {
    expect(fonteAtual(INFORMADAS)).toBe('Planilha')
    expect(fonteAtual([])).toBe('')
    expect(ultimaAlteracao(INFORMADAS)).toBe('2026-11-12T17:30:00Z')
    expect(ultimaAlteracao([])).toBeUndefined()
  })
})
