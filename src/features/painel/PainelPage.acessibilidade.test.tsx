import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import type { Usuario } from '@/types/dominio'
import { referencias, resultado } from './dadosDeTeste'
import { PainelPage } from './PainelPage'

const VISUALIZADOR: Usuario = {
  id: 3,
  nome: 'Ana Lima',
  email: 'ana@oto.test',
  perfil: 'VISUALIZADOR',
  ativo: true,
}

afterEach(() => vi.unstubAllGlobals())

describe('PainelPage, acessibilidade', () => {
  it('não tem violações com o destaque e os indicadores carregados', async () => {
    criarApiFalsa({
      'GET /api/campanhas/publicadas': {
        corpo: [
          {
            campanhaId: 15,
            nome: 'Agosto de 2026',
            modalidade: 'CONSOLIDADA',
            tipoPeriodo: 'MENSAL',
            periodoInicio: '2026-08-01',
          },
        ],
      },
      'GET /api/referencias': { corpo: referencias },
      'GET /api/campanhas/15/resultado': { corpo: resultado },
    })
    abrirTela(<PainelPage />, { usuario: VISUALIZADOR })
    await screen.findByRole(
      'heading',
      { name: 'Taxa de ocupação hoteleira em agosto de 2026' },
      { timeout: 4000 },
    )

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
