import { describe, expect, it } from 'vitest'
import type { Esquemas } from '@/types/dominio'
import { linhasDeDesempenho, notaDosForaDaReceita, totalDoDesempenho } from './desempenho'

type Tipo = Esquemas['ResultadoTipoResponse']

const TIPOS: Esquemas['TipoRef'][] = [
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
  { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true },
  { codigo: 'FLAT', nome: 'Flat', calculaReceita: false },
  { codigo: 'HOTEL_FAZENDA', nome: 'Hotel fazenda', calculaReceita: false },
  { codigo: 'CHALE', nome: 'Chalé', calculaReceita: false },
]

const RESORT: Tipo = {
  tipoHospedagemCodigo: 'RESORT',
  nome: 'Resort',
  qtdMh: 2,
  qtdUh: 600,
  taxaOcupacao: 80,
  receitaEstimada: 900_000,
}
const HOTEL: Tipo = {
  tipoHospedagemCodigo: 'HOTEL',
  nome: 'Hotel',
  qtdMh: 10,
  qtdUh: 300,
  taxaOcupacao: 50,
  receitaEstimada: 200_000,
}
const POUSADA: Tipo = {
  tipoHospedagemCodigo: 'POUSADA',
  nome: 'Pousada',
  qtdMh: 20,
  qtdUh: 100,
  taxaOcupacao: 40,
  receitaEstimada: 50_000,
}
const FLAT: Tipo = { tipoHospedagemCodigo: 'FLAT', nome: 'Flat', qtdMh: 3, qtdUh: 90 }

describe('linhasDeDesempenho', () => {
  it('só os tipos da receita, da maior receita para a menor, ocultos no fim', () => {
    const oculto: Tipo = { tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel', omitido: true }

    const linhas = linhasDeDesempenho([POUSADA, FLAT, oculto, RESORT], TIPOS)

    expect(linhas.map((linha) => linha.tipoHospedagemCodigo)).toEqual([
      'RESORT',
      'POUSADA',
      'HOTEL',
    ])
  })

  it('sem tipos cadastrados, nenhuma linha', () => {
    expect(linhasDeDesempenho([RESORT, HOTEL], [])).toEqual([])
  })
})

describe('totalDoDesempenho', () => {
  const resultado = {
    diariaMedia: 450,
    receitaHospedagem: 1_150_000,
    campanha: { qtdDiarias: 30 },
  }

  it('taxa ponderada pelas UH, RevPAR pela receita geral', () => {
    const total = totalDoDesempenho([RESORT, HOTEL, POUSADA], resultado)

    expect(total).toEqual({
      qtdMh: 32,
      qtdUh: 1000,
      taxaOcupacao: (80 * 600 + 50 * 300 + 40 * 100) / 1000,
      diariaMedia: 450,
      revpar: 1_150_000 / (1000 * 30),
      receitaEstimada: 1_150_000,
    })
  })

  it('com um tipo oculto, a taxa não existe, mas o RevPAR conta as UH dele', () => {
    const oculto: Tipo = { tipoHospedagemCodigo: 'HOTEL', qtdMh: 1, qtdUh: 300, omitido: true }

    const total = totalDoDesempenho([RESORT, oculto], resultado)

    expect(total.taxaOcupacao).toBeNull()
    expect(total.revpar).toBe(1_150_000 / (900 * 30))
  })

  it('tipo sem resposta fica fora do divisor do RevPAR e da taxa', () => {
    const semResposta: Tipo = {
      tipoHospedagemCodigo: 'POUSADA',
      qtdMh: 5,
      qtdUh: 400,
    }

    const total = totalDoDesempenho([RESORT, semResposta], resultado)

    expect(total.qtdUh).toBe(1000)
    expect(total.taxaOcupacao).toBe(80)
    expect(total.revpar).toBe(1_150_000 / (600 * 30))
  })

  it('sem receita, sem diárias ou sem UH, não há RevPAR nem taxa', () => {
    expect(totalDoDesempenho([RESORT], { campanha: { qtdDiarias: 30 } })).toMatchObject({
      revpar: null,
      receitaEstimada: null,
      diariaMedia: null,
    })
    expect(totalDoDesempenho([RESORT], { receitaHospedagem: 10 }).revpar).toBeNull()
    expect(totalDoDesempenho([], resultado)).toMatchObject({
      qtdMh: 0,
      qtdUh: 0,
      taxaOcupacao: null,
      revpar: null,
    })
  })

  it('tipos sem quantidades contam como zero', () => {
    const total = totalDoDesempenho(
      [{ tipoHospedagemCodigo: 'HOTEL', taxaOcupacao: 50, receitaEstimada: 10 }],
      resultado,
    )

    expect(total).toMatchObject({ qtdMh: 0, qtdUh: 0, taxaOcupacao: null, revpar: null })
  })
})

describe('notaDosForaDaReceita', () => {
  it('lista os tipos fora da receita, do maior para o menor', () => {
    const nota = notaDosForaDaReceita(
      [RESORT, { tipoHospedagemCodigo: 'HOTEL_FAZENDA', nome: 'Hotel fazenda', qtdMh: 1 }, FLAT],
      TIPOS,
    )

    expect(nota).toBe(
      'Flats (3) e hotel fazenda (1) entram na taxa de ocupação geral, mas não no cálculo da receita.',
    )
  })

  it('um só estabelecimento fica no singular', () => {
    const nota = notaDosForaDaReceita(
      [{ tipoHospedagemCodigo: 'FLAT', nome: 'Flat', qtdMh: 1 }],
      TIPOS,
    )

    expect(nota).toBe('Flat (1) entra na taxa de ocupação geral, mas não no cálculo da receita.')
  })

  it('tipo sem plural conhecido usa o nome', () => {
    const nota = notaDosForaDaReceita(
      [{ tipoHospedagemCodigo: 'CHALE', nome: 'Chalé', qtdMh: 4 }],
      TIPOS,
    )

    expect(nota).toBe('Chalé (4) entram na taxa de ocupação geral, mas não no cálculo da receita.')
  })

  it('tipos sem estabelecimento ou só da receita não geram nota', () => {
    expect(notaDosForaDaReceita([RESORT, HOTEL], TIPOS)).toBeNull()
    expect(notaDosForaDaReceita([{ tipoHospedagemCodigo: 'FLAT', qtdMh: 0 }], TIPOS)).toBeNull()
    expect(notaDosForaDaReceita([{ tipoHospedagemCodigo: 'FLAT' }], TIPOS)).toBeNull()
  })
})
