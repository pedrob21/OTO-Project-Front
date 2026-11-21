import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
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

const PUBLICADAS = [
  {
    campanhaId: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
  },
  {
    campanhaId: 13,
    nome: 'Julho de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-07-01',
  },
]

const tituloDoDestaque = (mes: string) =>
  screen.findByRole(
    'heading',
    { name: `Taxa de ocupação hoteleira em ${mes} de 2026` },
    { timeout: 4000 },
  )

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

function abrir(caminho = '/', usuario: Usuario = VISUALIZADOR) {
  const api = criarApiFalsa(rotas)
  abrirTela(<PainelPage />, { caminho, usuario })
  return api
}

describe('comparação com o ano anterior', () => {
  const AGOSTO_2025 = {
    campanhaId: 7,
    nome: 'Agosto de 2025',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2025-08-01',
  }

  it('usa o resultado publicado do mesmo mês do ano anterior', async () => {
    rotas['GET /api/campanhas/publicadas'] = { corpo: [...PUBLICADAS, AGOSTO_2025] }
    rotas['GET /api/campanhas/7/resultado'] = {
      corpo: { ...resultado, taxaOcupacao: 58.7, fluxoTotal: 400_000, diariaMedia: 700 },
    }
    const api = abrir()

    expect(await screen.findByText(/\+4,1\s*p\.p\./)).toBeInTheDocument()
    expect(screen.getAllByText('vs ago./2025').length).toBeGreaterThan(0)
    const indicadores = api.chamadas
      .filter((chamada) => chamada.caminho === '/api/dashboard/serie-mensal')
      .map((chamada) => new URLSearchParams(chamada.busca).get('indicador'))
    expect(indicadores).not.toContain('FLUXO_TURISTAS')
    expect(indicadores).not.toContain('DIARIA_MEDIA')
  })

  it('sem publicada, usa a série histórica', async () => {
    const mesmaSerie = { corpo: { anos: [{ ano: 2025, meses: [{ mes: 8, valor: 60.8 }] }] } }
    rotas['GET /api/dashboard/serie-mensal'] = mesmaSerie
    const api = abrir()

    expect(await screen.findByText(/\+2,0\s*p\.p\./)).toBeInTheDocument()
    const buscas = api.chamadas.filter((chamada) => chamada.caminho.endsWith('/serie-mensal'))
    const indicadores = buscas.map((c) => new URLSearchParams(c.busca).get('indicador')).toSorted()
    expect(indicadores).toEqual(['DIARIA_MEDIA', 'FLUXO_TURISTAS', 'TAXA_OCUPACAO'])
    expect(new URLSearchParams(buscas[0]?.busca).get('anoInicio')).toBe('2024')
    expect(new URLSearchParams(buscas[0]?.busca).get('anoFim')).toBe('2026')
  })

  it('sem nenhum dos dois, esconde a variação', async () => {
    abrir()

    await tituloDoDestaque('agosto')
    await vi.waitFor(() => expect(screen.queryByText(/^vs /)).not.toBeInTheDocument())
  })
})

const FERIADO = (ano: number, taxaOcupacao: number) => [
  {
    feriadoCodigo: 'CARNAVAL',
    nome: 'Carnaval',
    anos: [{ ano, taxaOcupacao, origem: 'SISTEMA' }],
  },
]

describe('série mensal e feriados da API', () => {
  beforeEach(() => {
    rotas['GET /api/dashboard/serie-mensal'] = {
      corpo: {
        indicador: 'TAXA_OCUPACAO',
        anos: [
          {
            ano: 2026,
            meses: [
              { mes: 7, valor: 51.3 },
              { mes: 8, valor: 62.8 },
            ],
          },
          { ano: 2025, meses: [{ mes: 8, valor: 58.7 }] },
          { ano: 2024, meses: [{ mes: 8 }] },
        ],
      },
    }
    rotas['GET /api/dashboard/feriados'] = [
      { corpo: FERIADO(2026, 80) },
      { corpo: FERIADO(2026, 87) },
    ]
  })

  it('o gráfico mensal usa a série da API, sem os anos sem valor', async () => {
    const api = abrir()

    const legenda = await screen.findByText('2025')
    expect(legenda).toBeInTheDocument()
    expect(screen.queryByText('2024')).not.toBeInTheDocument()
    expect(
      screen.getByText(/Consolidado mensal dos meios de hospedagem regulares, 2025 a 2026/),
    ).toBeInTheDocument()

    const busca = api.chamadas.find((c) => c.caminho === '/api/dashboard/serie-mensal')
    const parametros = new URLSearchParams(busca?.busca)
    expect(parametros.get('modalidade')).toBe('CONSOLIDADA')
    expect(parametros.get('indicador')).toBe('TAXA_OCUPACAO')
  })

  it('a série da taxa é buscada uma vez e dividida com a comparação', async () => {
    const api = abrir()

    await screen.findByText('2025')
    await tituloDoDestaque('agosto')
    const taxas = api.chamadas.filter(
      (c) =>
        c.caminho === '/api/dashboard/serie-mensal' &&
        new URLSearchParams(c.busca).get('indicador') === 'TAXA_OCUPACAO',
    )
    expect(taxas).toHaveLength(1)
  })

  it('o expectativa x realizado busca as duas modalidades do ano da campanha', async () => {
    const api = abrir()

    await tituloDoDestaque('agosto')
    await vi.waitFor(() =>
      expect(api.chamadas.filter((c) => c.caminho === '/api/dashboard/feriados')).toHaveLength(2),
    )
    const feriados = api.chamadas.filter((c) => c.caminho === '/api/dashboard/feriados')
    expect(feriados.map((c) => new URLSearchParams(c.busca).get('modalidade')).toSorted()).toEqual([
      'CONSOLIDADA',
      'EXPECTATIVA',
    ])
    expect(new URLSearchParams(feriados[0]?.busca).get('anoInicio')).toBe('2026')
    expect(await screen.findByText('Carnaval')).toBeInTheDocument()
  })

  it('sem dados, os dois cartões mostram o estado vazio', async () => {
    rotas['GET /api/dashboard/serie-mensal'] = { corpo: { anos: [] } }
    rotas['GET /api/dashboard/feriados'] = { corpo: [] }
    abrir()

    expect(await screen.findByText('Ainda não há taxas mensais publicadas')).toBeInTheDocument()
    expect(
      await screen.findByText('Ainda não há feriados publicados neste ano'),
    ).toBeInTheDocument()
  })

  it('erro na série derruba só o cartão mensal', async () => {
    rotas['GET /api/dashboard/serie-mensal'] = { status: 500, corpo: { detail: 'série fora' } }
    abrir()

    expect(
      await screen.findByText('Não foi possível carregar a taxa de ocupação mensal.'),
    ).toBeInTheDocument()
    await tituloDoDestaque('agosto')
    expect(screen.getByRole('heading', { name: 'Expectativa × realizado' })).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar os feriados.')).not.toBeInTheDocument()
  })

  it('erro nos feriados derruba só o cartão de expectativa', async () => {
    rotas['GET /api/dashboard/feriados'] = { status: 500, corpo: { detail: 'feriados fora' } }
    abrir()

    expect(await screen.findByText('Não foi possível carregar os feriados.')).toBeInTheDocument()
    await tituloDoDestaque('agosto')
    expect(await screen.findByText('2025')).toBeInTheDocument()
  })
})

describe('RHC e parâmetros vigentes no fluxo de turistas', () => {
  const PARCEIRO: Usuario = { ...VISUALIZADOR, id: 4, perfil: 'PARCEIRO' }

  beforeEach(() => {
    rotas['GET /api/rhc/vigente'] = { corpo: { qtdRegistros: 478, qtdLeitos: 5116 } }
    rotas['GET /api/parametros-calculo/vigente'] = {
      corpo: { percentualDayUse: 15.15, fonte: 'Pesquisa de Demanda Turística 2024' },
    }
  })

  it('usa os vigentes na data de início do período da campanha', async () => {
    const api = abrir()

    expect(await screen.findByText('478 registros e 5.116 leitos')).toBeInTheDocument()
    expect(
      screen.getByText(/Day use estimado em 15,15% do total, conforme a Pesquisa de Demanda/),
    ).toBeInTheDocument()
    for (const caminho of ['/api/rhc/vigente', '/api/parametros-calculo/vigente']) {
      const busca = api.chamadas.find((chamada) => chamada.caminho === caminho)?.busca
      expect(new URLSearchParams(busca).get('data')).toBe('2026-08-01')
    }
  })

  it('o PARCEIRO não pede o RHC e vê o fluxo sem o detalhe', async () => {
    const api = abrir('/', PARCEIRO)

    expect(await screen.findByText(/Day use estimado em 15,15%/)).toBeInTheDocument()
    expect(screen.queryByText(/registros e/)).not.toBeInTheDocument()
    expect(api.chamadas.map((chamada) => chamada.caminho)).not.toContain('/api/rhc/vigente')
  })

  it('sem vigência cadastrada, o cartão segue sem o detalhe', async () => {
    rotas['GET /api/rhc/vigente'] = { status: 404, corpo: { detail: 'sem vigência' } }
    rotas['GET /api/parametros-calculo/vigente'] = {
      status: 404,
      corpo: { detail: 'sem vigência' },
    }
    abrir()

    await tituloDoDestaque('agosto')
    expect(await screen.findByText('Hospedagem caseira (RHC)')).toBeInTheDocument()
    expect(screen.queryByText(/registros e/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Day use estimado/)).not.toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar o fluxo de turistas.')).toBeNull()
  })

  it('erro no RHC aparece só no bloco do fluxo', async () => {
    rotas['GET /api/rhc/vigente'] = { status: 500, corpo: { detail: 'rhc fora' } }
    abrir()

    expect(
      await screen.findByText('Não foi possível carregar o fluxo de turistas.'),
    ).toBeInTheDocument()
    await tituloDoDestaque('agosto')
    expect(screen.getByRole('heading', { name: 'Faixas de ocupação' })).toBeInTheDocument()
  })
})

describe('filtro por tipo de hospedagem', () => {
  const NOTA = 'Todos os tipos de hospedagem: este indicador não é separado por tipo.'

  it('sem tipo escolhido, não mostra a nota nem filtra a tabela', async () => {
    abrir()

    await tituloDoDestaque('agosto')
    expect(screen.queryByText(NOTA)).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Resort/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /^Total/ })).toBeInTheDocument()
  })

  it('com um tipo, só o desempenho por tipo é filtrado e os demais avisam', async () => {
    abrir('/?tipo=POUSADA')

    await tituloDoDestaque('agosto')
    expect(screen.getByRole('row', { name: /Pousada/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Resort/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /^Total/ })).not.toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getAllByText(NOTA).length).toBeGreaterThanOrEqual(4))
  })

  it('tipo oculto por sigilo mostra o aviso e não inventa valor', async () => {
    rotas['GET /api/campanhas/15/resultado'] = {
      corpo: {
        ...resultado,
        porTipo: (resultado.porTipo ?? []).map((tipo) =>
          tipo.tipoHospedagemCodigo === 'HOTEL'
            ? { tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel', qtdMh: 2, omitido: true }
            : tipo,
        ),
      },
    }
    abrir('/?tipo=HOTEL')

    expect(await screen.findByText(/Valores ocultos para preservar o sigilo/)).toBeInTheDocument()
  })

  it('tipo da URL que não existe nas referências volta para todos', async () => {
    abrir('/?tipo=NAO_EXISTE')

    await tituloDoDestaque('agosto')
    expect(screen.queryByText(NOTA)).not.toBeInTheDocument()
  })
})

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

    await tituloDoDestaque('agosto')
    expect(screen.getAllByText('Resort').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pousada').length).toBeGreaterThan(0)
    expect(
      screen.queryByText('Não foi possível carregar o desempenho por tipo.'),
    ).not.toBeInTheDocument()
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
