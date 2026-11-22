import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { ParametrosPage } from './ParametrosPage'

const VIGENTE = {
  id: 1,
  vigenteDesde: '2026-01-01',
  percentualDayUse: 15.15,
  diasPermanenciaMedia: 4,
  diasEmParques: 2,
  gastoMedioDiario: 250,
  gastoMedioIngresso: 105,
  percentualMinimoLeitosPublicacao: 70,
  fonte: 'Pesquisa de Demanda Turística 2025',
}

beforeEach(() => {
  criarApiFalsa({
    'GET /api/parametros-calculo': {
      corpo: [VIGENTE, { ...VIGENTE, id: 2, vigenteDesde: '2027-01-01', percentualDayUse: 16 }],
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('ParametrosPage, acessibilidade', () => {
  it('não tem violações na lista', async () => {
    abrirTela(<ParametrosPage hoje="2026-11-16" />)
    await screen.findByRole('table', { name: 'Vigências dos parâmetros' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('não tem violações com o diálogo de nova vigência aberto', async () => {
    abrirTela(<ParametrosPage hoje="2026-11-16" />)
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Nova vigência' }))
    await screen.findByRole('dialog', { name: 'Nova vigência: Parâmetros' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
