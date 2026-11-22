import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { RhcPage } from './RhcPage'

const ATUAL = {
  id: 1,
  vigenteDesde: '2026-01-01',
  qtdRegistros: 310,
  qtdUh: 420,
  qtdLeitos: 1300,
  maxLeitosPorUh: 5,
  leitosUteis: 1260,
}

beforeEach(() => {
  criarApiFalsa({
    'GET /api/rhc': {
      corpo: [{ ...ATUAL, id: 2, vigenteDesde: '2025-01-01', leitosUteis: 1150.5 }, ATUAL],
    },
    'GET /api/rhc/vigente': { corpo: ATUAL },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('RhcPage, acessibilidade', () => {
  it('não tem violações na lista', async () => {
    abrirTela(<RhcPage hoje="2026-11-16" />)
    await screen.findByRole('table', { name: 'Totais do RHC' })

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('não tem violações com o diálogo de nova vigência aberto', async () => {
    abrirTela(<RhcPage hoje="2026-11-16" />)
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Nova vigência' }))
    await screen.findByRole('dialog')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
