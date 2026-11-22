import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { ReferenciasPage } from './ReferenciasPage'

beforeEach(() => {
  criarApiFalsa({
    'GET /api/referencias': {
      corpo: {
        tiposHospedagem: [
          { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true, ordem: 2 },
          { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true, ordem: 1 },
        ],
        feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 }],
        faixasOcupacao: [
          { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41 },
          { codigo: 'RUIM', nome: 'Ruim', percentualMinimo: 0 },
        ],
      },
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('ReferenciasPage, acessibilidade', () => {
  it('não tem violações na aba inicial nem nas outras abas', async () => {
    abrirTela(<ReferenciasPage />)
    await screen.findByRole('tab', { name: 'Tipos de hospedagem' })
    expect(await violacoesDeAcessibilidade()).toEqual([])

    for (const aba of ['Feriados e eventos', 'Faixas de ocupação']) {
      await userEvent.click(screen.getByRole('tab', { name: aba }))
      await screen.findByRole('tabpanel', { name: aba })
      expect(await violacoesDeAcessibilidade()).toEqual([])
    }
  })
})
