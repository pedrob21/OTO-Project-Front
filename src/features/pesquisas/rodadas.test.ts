import { describe, expect, it } from 'vitest'
import { lerStatus, situacaoDaRodada } from './rodadas'

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
