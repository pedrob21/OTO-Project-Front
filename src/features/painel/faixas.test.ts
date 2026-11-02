import { describe, expect, it } from 'vitest'
import { corDaFaixa, faixasDaRegua, posicaoNaRegua } from './faixas'
import { referencias } from './fixtures'
import { partesDoPeriodo, textoDoPeriodo } from './periodo'

const FAIXAS = faixasDaRegua(referencias.faixasOcupacao ?? [])

function faixaNaPosicao(taxa: number) {
  const posicao = posicaoNaRegua(taxa)
  return FAIXAS.find((faixa) => posicao > faixa.inicio && posicao <= faixa.fim)?.nome ?? 'Ruim'
}

describe('faixasDaRegua', () => {
  it('monta os intervalos do design', () => {
    expect(FAIXAS.map((faixa) => faixa.intervalo)).toEqual([
      'até 20%',
      '21 a 40%',
      '41 a 60%',
      '61 a 80%',
      '81 a 100%',
    ])
  })

  it('as faixas do OTO têm a mesma largura', () => {
    expect(FAIXAS.map((faixa) => faixa.fim - faixa.inicio)).toEqual([20, 20, 20, 20, 20])
  })

  it('ordena pelo percentual mínimo', () => {
    const faixas = faixasDaRegua([
      { codigo: 'B', nome: 'B', percentualMinimo: 50 },
      { codigo: 'A', nome: 'A', percentualMinimo: 0 },
    ])

    expect(faixas.map((faixa) => faixa.codigo)).toEqual(['A', 'B'])
    expect(faixas[0]?.intervalo).toBe('até 49%')
    expect(faixas[1]?.intervalo).toBe('50 a 100%')
  })

  it('sem faixas, não quebra', () => {
    expect(faixasDaRegua([])).toEqual([])
  })
})

describe('posicaoNaRegua', () => {
  it.each([
    [0, 'Ruim'],
    [20, 'Ruim'],
    [21, 'Regular'],
    [40, 'Regular'],
    [41, 'Boa'],
    [60, 'Boa'],
    [61, 'Ótima'],
    [62.8, 'Ótima'],
    [80, 'Ótima'],
    [81, 'Excelente'],
    [100, 'Excelente'],
  ])('%s%% cai em %s', (taxa, nome) => {
    expect(faixaNaPosicao(taxa)).toBe(nome)
  })

  it('não sai da régua', () => {
    expect(posicaoNaRegua(-5)).toBe(0)
    expect(posicaoNaRegua(120)).toBe(100)
  })
})

describe('corDaFaixa', () => {
  it('faixa desconhecida usa a cor primária', () => {
    expect(corDaFaixa('OTIMA')).toBe('var(--cor-faixa-otima)')
    expect(corDaFaixa('NOVA')).toBe('var(--cor-primaria)')
  })
})

describe('período', () => {
  it('lê ano e mês sem efeito de fuso', () => {
    expect(partesDoPeriodo('2026-08-01')).toEqual({ ano: 2026, mes: 8 })
    expect(partesDoPeriodo(undefined)).toBeNull()
  })

  it('mês vira texto e feriado usa o nome', () => {
    expect(textoDoPeriodo({ tipoPeriodo: 'MENSAL', periodoInicio: '2026-08-01' })).toBe(
      'agosto de 2026',
    )
    expect(
      textoDoPeriodo({ tipoPeriodo: 'FERIADO', nome: 'Carnaval', periodoInicio: '2026-02-14' }),
    ).toBe('Carnaval')
  })
})
