import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { PainelFiltros } from './PainelFiltros'

const PUBLICADAS = [
  {
    campanhaId: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    periodoInicio: '2026-08-01',
    publicadaEm: '2026-09-18T12:00:00Z',
  },
  {
    campanhaId: 13,
    nome: 'Julho de 2026',
    modalidade: 'CONSOLIDADA',
    periodoInicio: '2026-07-01',
    publicadaEm: '2026-08-12T12:00:00Z',
  },
]
const REFERENCIAS = {
  tiposHospedagem: [
    { codigo: 'HOTEL', nome: 'Hotel' },
    { codigo: 'POUSADA', nome: 'Pousada' },
  ],
}

let rotas: RotasFalsas

beforeEach(() => {
  rotas = {
    'GET /api/campanhas/publicadas': { corpo: PUBLICADAS },
    'GET /api/referencias': { corpo: REFERENCIAS },
  }
})

afterEach(() => vi.unstubAllGlobals())

function abrir(caminho = '/') {
  const api = criarApiFalsa(rotas)
  const router = abrirTela(<PainelFiltros />, { caminho })
  return { api, router }
}

describe('PainelFiltros', () => {
  it('carrega campanhas e tipos da API e usa a campanha mais recente como padrão', async () => {
    const { api } = abrir()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando os filtros')
    expect(await screen.findByLabelText('Campanha')).toHaveDisplayValue(
      'Agosto de 2026 • consolidada',
    )
    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Agosto de 2025')
    expect(screen.getByLabelText('Tipo de hospedagem')).toHaveDisplayValue('Todos os tipos')
    expect(screen.getByRole('option', { name: 'Pousada' })).toBeInTheDocument()
    expect(api.chamadas.map((chamada) => chamada.caminho).toSorted()).toEqual([
      '/api/campanhas/publicadas',
      '/api/referencias',
    ])
  })

  it('o texto da campanha não traz o código da rodada', async () => {
    abrir()

    await screen.findByLabelText('Campanha')

    for (const opcao of screen.getAllByRole('option', { name: /de 2026 •/ })) {
      expect(opcao.textContent).not.toMatch(/\(\d+\/\d+\)/)
    }
  })

  it('trocar um filtro muda a URL e mantém os outros parâmetros', async () => {
    const { router } = abrir('/?tipo=HOTEL')

    await userEvent.selectOptions(await screen.findByLabelText('Comparar com'), '2024')

    const busca = new URLSearchParams(router.state.location.search)
    expect(busca.get('comparar')).toBe('2024')
    expect(busca.get('tipo')).toBe('HOTEL')
    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Agosto de 2024')
  })

  it('abrir o link de novo mantém a seleção', async () => {
    abrir('/?campanha=13&comparar=2024&tipo=POUSADA')

    expect(await screen.findByLabelText('Campanha')).toHaveDisplayValue(
      'Julho de 2026 • consolidada',
    )
    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Julho de 2024')
    expect(screen.getByLabelText('Tipo de hospedagem')).toHaveDisplayValue('Pousada')
  })

  it('a comparação acompanha o mês da campanha', async () => {
    abrir()

    await userEvent.selectOptions(await screen.findByLabelText('Campanha'), '13')

    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Julho de 2025')
  })

  it('valor inválido na URL cai na primeira opção', async () => {
    abrir('/?campanha=999&tipo=NAO_EXISTE')

    expect(await screen.findByLabelText('Campanha')).toHaveDisplayValue(
      'Agosto de 2026 • consolidada',
    )
    expect(screen.getByLabelText('Tipo de hospedagem')).toHaveDisplayValue('Todos os tipos')
  })

  it('com a API fora, avisa e permite tentar de novo', async () => {
    rotas['GET /api/campanhas/publicadas'] = [
      { status: 500, corpo: { detail: 'banco fora' } },
      { corpo: PUBLICADAS },
    ]
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os filtros.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByLabelText('Campanha')).toBeInTheDocument()
  })
})
