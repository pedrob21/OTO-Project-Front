import { describe, expect, it } from 'vitest'
import { erroDoPrazo, lerStatus, situacaoDaRodada, taxaPorEstabelecimentos } from './rodadas'

describe('situacaoDaRodada', () => {
  it.each([
    ['RASCUNHO', 'rascunho', 'Rascunho'],
    ['ABERTA', 'aberta', 'Aberta'],
    ['ENCERRADA', 'encerrada', 'Encerrada'],
  ] as const)('%s sem publicação', (status, variante, rotulo) => {
    expect(situacaoDaRodada({ status, campanhas: [{ id: 1 }] })).toEqual({ variante, rotulo })
  })

  it('encerrada com todas as campanhas publicadas', () => {
    expect(
      situacaoDaRodada({
        status: 'ENCERRADA',
        campanhas: [{ publicadaEm: '2026-09-18T12:00:00Z' }, { publicadaEm: '2026-09-19' }],
      }),
    ).toEqual({ variante: 'publicada', rotulo: 'Publicada', detalhe: undefined })
  })

  it('publicação parcial diz quantas campanhas', () => {
    expect(
      situacaoDaRodada({
        status: 'ENCERRADA',
        campanhas: [{ publicadaEm: '2026-09-18T12:00:00Z' }, {}],
      }),
    ).toMatchObject({ variante: 'publicada', detalhe: '1 de 2 campanhas' })
  })

  it('sem status nem campanhas vale rascunho', () => {
    expect(situacaoDaRodada({})).toEqual({ variante: 'rascunho', rotulo: 'Rascunho' })
  })
})

describe('lerStatus', () => {
  it('aceita só os status da API', () => {
    expect(lerStatus('ABERTA')).toBe('ABERTA')
    expect(lerStatus('aberta')).toBeUndefined()
    expect(lerStatus(null)).toBeUndefined()
  })
})

describe('erroDoPrazo', () => {
  it('exige o prazo', () => {
    expect(erroDoPrazo('', '2026-11-16')).toBe('Informe o prazo de resposta.')
  })

  it('não aceita prazo antes da abertura, como a API', () => {
    expect(erroDoPrazo('2026-11-15', '2026-11-16')).toBe(
      'O prazo não pode ser anterior à abertura (16/11/2026).',
    )
    expect(erroDoPrazo('2026-11-16', '2026-11-16')).toBeUndefined()
    expect(erroDoPrazo('2026-11-01', undefined)).toBeUndefined()
  })
})

describe('taxaPorEstabelecimentos', () => {
  it('respondentes sobre o total', () => {
    expect(taxaPorEstabelecimentos({ qtdMh: 4, qtdRespondentes: 1 })).toBe(25)
  })

  it('sem estabelecimentos não vira zero', () => {
    expect(taxaPorEstabelecimentos({ qtdMh: 0, qtdRespondentes: 0 })).toBeNull()
  })
})
