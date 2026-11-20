import { describe, expect, it } from 'vitest'
import { notaDeConcentracao } from './faixas'
import { dominioDeFeriados, linhasDeFeriados, posicaoNoDominio } from './feriados'
import { seriesDeOcupacao, textoDosAnos } from './ocupacaoMensal'
import {
  partesDoPeriodo,
  referenciaDaComparacao,
  textoDoPeriodo,
  textoDoPeriodoCurto,
} from './periodo'

describe('feriados', () => {
  const expectativa = [
    { feriadoCodigo: 'CARNAVAL', nome: 'Carnaval', anos: [{ ano: 2026, taxaOcupacao: 82 }] },
    {
      feriadoCodigo: 'FEFOL',
      nome: 'Festival do Folclore de Olímpia',
      anos: [{ ano: 2026, taxaOcupacao: 78 }],
    },
    { feriadoCodigo: 'PASCOA', nome: 'Páscoa', anos: [{ ano: 2025, taxaOcupacao: 70 }] },
  ]
  const realizado = [
    { feriadoCodigo: 'CARNAVAL', nome: 'Carnaval', anos: [{ ano: 2026, taxaOcupacao: 86.5 }] },
    { feriadoCodigo: 'TIRADENTES', nome: 'Tiradentes', anos: [{ ano: 2026, taxaOcupacao: 40 }] },
  ]

  it('junta as modalidades e calcula a diferença', () => {
    const linhas = linhasDeFeriados(expectativa, realizado, 2026)

    expect(linhas).toEqual([
      { codigo: 'CARNAVAL', nome: 'Carnaval', expectativa: 82, realizado: 86.5, diferenca: 4.5 },
      {
        codigo: 'TIRADENTES',
        nome: 'Tiradentes',
        expectativa: null,
        realizado: 40,
        diferenca: null,
      },
      { codigo: 'FEFOL', nome: 'FEFOL', expectativa: 78, realizado: null, diferenca: null },
    ])
  })

  it('feriado sem valor no ano ou sem código fica de fora; sem nome usa o código', () => {
    const linhas = linhasDeFeriados(
      [{ feriadoCodigo: 'X' }, { anos: [{ ano: 2026, taxaOcupacao: 55 }] }],
      [{ feriadoCodigo: 'NOVO', anos: [{ ano: 2026, taxaOcupacao: 60 }] }],
      2026,
    )

    expect(linhas).toEqual([
      { codigo: 'NOVO', nome: 'NOVO', expectativa: null, realizado: 60, diferenca: null },
    ])
  })

  it('domínio de 50 a 100, descendo de 10 em 10 com taxa menor', () => {
    expect(dominioDeFeriados([])).toEqual({
      inicio: 50,
      fim: 100,
      marcas: [50, 60, 70, 80, 90, 100],
    })

    const linhas = linhasDeFeriados(expectativa, realizado, 2026)
    expect(dominioDeFeriados(linhas).inicio).toBe(40)
    expect(
      dominioDeFeriados([
        { codigo: 'A', nome: 'A', expectativa: -3, realizado: null, diferenca: null },
      ]).inicio,
    ).toBe(0)
  })

  it('posição no domínio, sem passar do fim', () => {
    const dominio = { inicio: 50, fim: 100, marcas: [] }

    expect(posicaoNoDominio(75, dominio)).toBe(50)
    expect(posicaoNoDominio(120, dominio)).toBe(100)
  })
})

describe('ocupação mensal', () => {
  it('três anos mais recentes, com os 12 meses preenchidos', () => {
    const series = seriesDeOcupacao({
      anos: [
        { ano: 2023, meses: [{ mes: 1, valor: 40 }] },
        { ano: 2026, meses: [{ mes: 2, valor: 70 }] },
        { ano: 2025 },
        { ano: 2024, meses: [{ mes: 12, valor: 55 }] },
      ],
    })

    expect(series.map((serie) => serie.nome)).toEqual(['2026', '2025', '2024'])
    expect(series.map((serie) => serie.cor)).toEqual([
      'var(--cor-serie-atual)',
      'var(--cor-serie-anterior)',
      'var(--cor-serie-antiga)',
    ])
    expect(series[0]?.valores).toHaveLength(12)
    expect(series[0]?.valores[1]).toBe(70)
    expect(series[0]?.valores[0]).toBeNull()
    expect(series[1]?.valores.every((valor) => valor === null)).toBe(true)
    expect(series[2]?.valores[11]).toBe(55)
  })

  it('resposta vazia e ano ausente não quebram', () => {
    expect(seriesDeOcupacao({})).toEqual([])
    expect(seriesDeOcupacao({ anos: [{}, { ano: 2026 }] }).map((serie) => serie.nome)).toEqual([
      '2026',
      'undefined',
    ])
  })

  it('texto dos anos', () => {
    const serie = (nome: string) => ({ nome, cor: '', valores: [] })

    expect(textoDosAnos([serie('2026'), serie('2025'), serie('2024')])).toBe('2024 a 2026')
    expect(textoDosAnos([serie('2026')])).toBe('2026')
    expect(textoDosAnos([])).toBe('')
  })
})

describe('período', () => {
  it('texto do período sem data cai no nome', () => {
    expect(textoDoPeriodo({ tipoPeriodo: 'MENSAL', nome: 'Avulsa' })).toBe('Avulsa')
    expect(textoDoPeriodo({ tipoPeriodo: 'FERIADO' })).toBe('')
    expect(textoDoPeriodo(undefined)).toBe('')
  })

  it('texto curto', () => {
    expect(textoDoPeriodoCurto({ tipoPeriodo: 'MENSAL', periodoInicio: '2026-08-01' })).toBe(
      'em agosto',
    )
    expect(textoDoPeriodoCurto({ tipoPeriodo: 'FERIADO', periodoInicio: '2026-02-14' })).toBe(
      'no período',
    )
    expect(textoDoPeriodoCurto({ tipoPeriodo: 'MENSAL' })).toBe('no período')
    expect(textoDoPeriodoCurto(undefined)).toBe('no período')
  })

  it('referência da comparação', () => {
    const agosto = { periodoInicio: '2026-08-01' }

    expect(referenciaDaComparacao(agosto, { ano: 2025 })).toBe('ago./2025')
    expect(referenciaDaComparacao(agosto, undefined)).toBeUndefined()
    expect(referenciaDaComparacao(agosto, {})).toBeUndefined()
    expect(referenciaDaComparacao(undefined, { ano: 2025 })).toBeUndefined()
  })

  it('texto fora do padrão não é período', () => {
    expect(partesDoPeriodo('08/2026')).toBeNull()
    expect(partesDoPeriodo(null)).toBeNull()
  })
})

describe('notaDeConcentracao', () => {
  it('o tipo com mais UH, no plural conhecido', () => {
    expect(
      notaDeConcentracao([
        { tipoHospedagemCodigo: 'HOTEL', qtdUh: 200 },
        { tipoHospedagemCodigo: 'RESORT', qtdUh: 780 },
        { tipoHospedagemCodigo: 'POUSADA', qtdUh: 20 },
      ]),
    ).toBe('Os resorts concentram 78% das UH da cidade e por isso pesam mais na taxa geral.')
  })

  it('tipo sem plural conhecido usa o nome no singular', () => {
    expect(
      notaDeConcentracao([
        { tipoHospedagemCodigo: 'CHALE', nome: 'Chalé', qtdUh: 3 },
        { tipoHospedagemCodigo: 'HOTEL' },
      ]),
    ).toBe('O tipo chalé concentra 100% das UH da cidade e por isso pesa mais na taxa geral.')
  })

  it('sem UH não há nota', () => {
    expect(notaDeConcentracao([{ tipoHospedagemCodigo: 'HOTEL' }])).toBeNull()
  })
})
