import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import type { Usuario } from '@/types/dominio'
import { referencias, resultado } from './fixtures'
import { PainelPage } from './PainelPage'

const VISUALIZADOR: Usuario = {
  id: 3,
  nome: 'Ana Lima',
  email: 'ana@oto.test',
  perfil: 'VISUALIZADOR',
  ativo: true,
}

const PUBLICADAS = [
  {
    campanhaId: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    periodoInicio: '2026-08-01',
  },
  { campanhaId: 13, nome: 'Julho de 2026', modalidade: 'CONSOLIDADA', periodoInicio: '2026-07-01' },
]

const tituloDoDestaque = (mes: string) =>
  screen.findByRole('heading', { name: `Taxa de ocupação hoteleira em ${mes} de 2026` })

const RESULTADO_DE_JULHO = {
  ...resultado,
  campanha: { ...resultado.campanha, id: 13, nome: 'Julho de 2026', periodoInicio: '2026-07-01' },
  taxaOcupacao: 51.3,
}

let rotas: RotasFalsas

beforeEach(() => {
  rotas = {
    'GET /api/campanhas/publicadas': { corpo: PUBLICADAS },
    'GET /api/referencias': { corpo: referencias },
    'GET /api/campanhas/15/resultado': { corpo: resultado },
    'GET /api/campanhas/13/resultado': { corpo: RESULTADO_DE_JULHO },
  }
})

afterEach(() => vi.unstubAllGlobals())

function abrir(caminho = '/') {
  const api = criarApiFalsa(rotas)
  abrirTela(<PainelPage />, { caminho, usuario: VISUALIZADOR })
  return api
}

describe('PainelPage com dados da API', () => {
  it('mostra o resultado da campanha mais recente', async () => {
    const api = abrir()

    await tituloDoDestaque('agosto')
    expect(screen.getByText('Faixa ótima')).toBeInTheDocument()
    expect(screen.getByText(/dos 58 meios de hospedagem que responderam/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fluxo estimado de turistas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Faixas de ocupação' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    const resultados = api.chamadas.filter((chamada) => chamada.caminho.endsWith('/resultado'))
    expect(resultados.map((chamada) => chamada.caminho)).toEqual(['/api/campanhas/15/resultado'])
  })

  it('a campanha da URL define o resultado mostrado', async () => {
    abrir('/?campanha=13')

    await tituloDoDestaque('julho')
    expect(screen.queryByRole('heading', { name: /agosto de 2026/ })).not.toBeInTheDocument()
  })

  it('trocar a campanha busca o resultado da outra', async () => {
    const api = abrir()

    await userEvent.selectOptions(await screen.findByLabelText('Campanha'), '13')

    await tituloDoDestaque('julho')
    expect(api.chamadas.map((chamada) => chamada.caminho)).toContain('/api/campanhas/13/resultado')
  })

  it('mostra o carregamento em cada bloco enquanto o resultado não chega', async () => {
    abrir()

    expect(screen.getAllByRole('status').length).toBeGreaterThan(1)
    await tituloDoDestaque('agosto')
    expect(screen.queryByText('Carregando dados')).not.toBeInTheDocument()
  })

  it('tipo oculto por sigilo não derruba o desempenho por tipo', async () => {
    rotas['GET /api/campanhas/15/resultado'] = {
      corpo: {
        ...resultado,
        porTipo: (resultado.porTipo ?? []).map((tipo) =>
          tipo.tipoHospedagemCodigo === 'HOTEL'
            ? { tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel', omitido: true }
            : tipo,
        ),
      },
    }
    abrir()

    expect(await screen.findByText('Resort')).toBeInTheDocument()
    expect(screen.getByText('Pousada')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('erro no resultado aparece nos blocos dele e não derruba os outros', async () => {
    rotas['GET /api/campanhas/15/resultado'] = [
      { status: 500, corpo: { detail: 'resultado fora' } },
      { corpo: resultado },
    ]
    abrir()

    const alertas = await screen.findAllByRole('alert')
    expect(alertas.length).toBeGreaterThanOrEqual(4)
    expect(screen.getByText('Não foi possível carregar a taxa de ocupação.')).toBeInTheDocument()
    expect(screen.getByText('Taxa de ocupação mensal')).toBeInTheDocument()
    expect(screen.getByLabelText('Campanha')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'Tentar novamente' })[0]!)

    await tituloDoDestaque('agosto')
  })
})
