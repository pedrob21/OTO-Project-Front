import { describe, expect, it } from 'vitest'
import {
  filtroParaBusca,
  lerFiltro,
  opcoesDeAno,
  rotuloDaModalidade,
  rotuloDoTipoDePeriodo,
  temFiltro,
} from './relatorios'

describe('lerFiltro', () => {
  it('lê modalidade, período e ano da URL', () => {
    expect(
      lerFiltro(new URLSearchParams('modalidade=EXPECTATIVA&periodo=FERIADO&ano=2026')),
    ).toEqual({ modalidade: 'EXPECTATIVA', tipoPeriodo: 'FERIADO', ano: 2026 })
  })

  it('ignora valores fora da lista', () => {
    expect(lerFiltro(new URLSearchParams('modalidade=TUDO&periodo=anual&ano=abc'))).toEqual({
      modalidade: undefined,
      tipoPeriodo: undefined,
      ano: undefined,
    })
    expect(lerFiltro(new URLSearchParams('ano=20261')).ano).toBeUndefined()
  })
})

describe('filtroParaBusca', () => {
  it('leva só o que foi escolhido para a URL', () => {
    expect(filtroParaBusca({ modalidade: 'CONSOLIDADA', ano: 2025 })).toEqual({
      modalidade: 'CONSOLIDADA',
      ano: '2025',
    })
    expect(filtroParaBusca({})).toEqual({})
  })

  it('ida e volta pela URL dá o mesmo filtro', () => {
    const filtro = { modalidade: 'CONSOLIDADA', tipoPeriodo: 'MENSAL', ano: 2026 } as const
    expect(lerFiltro(new URLSearchParams(filtroParaBusca(filtro)))).toEqual(filtro)
  })
})

describe('temFiltro', () => {
  it('sem nada escolhido, não há filtro', () => {
    expect(temFiltro({})).toBe(false)
    expect(temFiltro({ ano: 2026 })).toBe(true)
  })
})

describe('opcoesDeAno', () => {
  it('lista os anos com campanha, do mais recente ao mais antigo, sem repetir', () => {
    const opcoes = opcoesDeAno([
      { periodoInicio: '2025-08-01' },
      { periodoInicio: '2026-08-01' },
      { periodoInicio: '2026-05-01' },
      { periodoInicio: undefined },
    ])
    expect(opcoes.map((opcao) => opcao.valor)).toEqual(['', '2026', '2025'])
  })

  it('mantém o ano escolhido mesmo sem campanha', () => {
    expect(opcoesDeAno([], 2024).map((opcao) => opcao.rotulo)).toEqual(['Todos', '2024'])
  })

  it('o ano é o do início do período, como na API', () => {
    expect(opcoesDeAno([{ periodoInicio: '2025-12-30', periodoFim: '2026-01-02' }])[1]?.valor).toBe(
      '2025',
    )
  })
})

describe('rótulos', () => {
  it('modalidade e tipo de período em texto', () => {
    expect(rotuloDaModalidade('CONSOLIDADA')).toBe('Consolidada')
    expect(rotuloDaModalidade('EXPECTATIVA')).toBe('Expectativa')
    expect(rotuloDaModalidade(undefined)).toBe('—')
    expect(rotuloDoTipoDePeriodo('MENSAL')).toBe('Mensal')
    expect(rotuloDoTipoDePeriodo('FERIADO')).toBe('Feriado ou evento')
  })
})
