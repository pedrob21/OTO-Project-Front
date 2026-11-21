import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarFeriados, buscarResumo, buscarSerieMensal } from './dashboard'
import { ErroRequisicao } from './erros'
import { buscarParametrosVigentes } from './parametros'
import { buscarHistoricoDaResposta, enviarResposta, listarRespostasDaCampanha } from './respostas'
import {
  buscarPrevia,
  buscarResultado,
  cancelarPublicacao,
  listarPublicadas,
  publicarCampanha,
} from './resultados'
import { buscarRhcVigente } from './rhc'
import {
  abrirRodada,
  buscarAcompanhamento,
  buscarRodada,
  criarRodada,
  encerrarRodada,
  incluirCampanha,
  listarRodadas,
  prorrogarRodada,
  reabrirRodada,
} from './rodadas'

const fetchFalso = vi.fn<typeof fetch>()

function chamada(indice = 0) {
  const [url, init] = fetchFalso.mock.calls[indice] ?? []
  return {
    url: String(url),
    metodo: init?.method,
    corpo: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    signal: init?.signal,
  }
}

beforeEach(() => {
  fetchFalso.mockReset()
  fetchFalso.mockImplementation(async () => new Response(JSON.stringify({ ok: true })))
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dashboard', () => {
  it('resumo filtra pela modalidade e repassa o cancelamento', async () => {
    const controle = new AbortController()

    await expect(buscarResumo('CONSOLIDADA', controle.signal)).resolves.toEqual({ ok: true })

    expect(chamada()).toMatchObject({
      url: 'http://localhost:8080/api/dashboard/resumo?modalidade=CONSOLIDADA',
      metodo: 'GET',
      signal: controle.signal,
    })
  })

  it('resumo sem modalidade não manda o parâmetro', async () => {
    await buscarResumo()

    expect(chamada().url).toBe('http://localhost:8080/api/dashboard/resumo')
  })

  it('série mensal manda o período e o indicador', async () => {
    await buscarSerieMensal({ indicador: 'TAXA_OCUPACAO', anoInicio: 2024, anoFim: 2026 })

    const url = new URL(chamada().url)
    expect(url.pathname).toBe('/api/dashboard/serie-mensal')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      indicador: 'TAXA_OCUPACAO',
      anoInicio: '2024',
      anoFim: '2026',
    })
  })

  it('feriados filtra pelo feriado', async () => {
    await buscarFeriados({ feriado: 'CARNAVAL', modalidade: 'EXPECTATIVA' })

    const url = new URL(chamada().url)
    expect(url.pathname).toBe('/api/dashboard/feriados')
    expect(url.searchParams.get('feriado')).toBe('CARNAVAL')
    expect(url.searchParams.get('modalidade')).toBe('EXPECTATIVA')
  })
})

describe('parâmetros e RHC', () => {
  it('parâmetros vigentes numa data', async () => {
    await buscarParametrosVigentes('2026-08-01')

    expect(chamada().url).toBe(
      'http://localhost:8080/api/parametros-calculo/vigente?data=2026-08-01',
    )
  })

  it('parâmetros vigentes hoje, sem data', async () => {
    await buscarParametrosVigentes()

    expect(chamada().url).toBe('http://localhost:8080/api/parametros-calculo/vigente')
  })

  it('RHC vigente', async () => {
    await buscarRhcVigente('2026-01-01')

    expect(chamada().url).toBe('http://localhost:8080/api/rhc/vigente?data=2026-01-01')
  })

  it('PARCEIRO recebe 403 no RHC', async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Acesso negado.' }), { status: 403 }),
    )

    const erro = await buscarRhcVigente().catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ErroRequisicao)
    expect(erro).toMatchObject({ status: 403, message: 'Acesso negado.' })
  })
})

describe('resultados', () => {
  it('campanhas publicadas sem filtro', async () => {
    await listarPublicadas()

    expect(chamada().url).toBe('http://localhost:8080/api/campanhas/publicadas')
  })

  it('campanhas publicadas com filtro', async () => {
    await listarPublicadas({ modalidade: 'CONSOLIDADA', tipoPeriodo: 'MENSAL', ano: 2026 })

    const url = new URL(chamada().url)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      modalidade: 'CONSOLIDADA',
      tipoPeriodo: 'MENSAL',
      ano: '2026',
    })
  })

  it('resultado de uma campanha', async () => {
    await buscarResultado(42)

    expect(chamada().url).toBe('http://localhost:8080/api/campanhas/42/resultado')
  })

  it('prévia, publicação e cancelamento', async () => {
    await buscarPrevia(42)
    await publicarCampanha(42)
    fetchFalso.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(cancelarPublicacao(42)).resolves.toBeUndefined()

    expect(chamada(0)).toMatchObject({
      url: 'http://localhost:8080/api/campanhas/42/previa',
      metodo: 'GET',
    })
    expect(chamada(1)).toMatchObject({
      url: 'http://localhost:8080/api/campanhas/42/publicacao',
      metodo: 'POST',
    })
    expect(chamada(2)).toMatchObject({
      url: 'http://localhost:8080/api/campanhas/42/publicacao',
      metodo: 'DELETE',
    })
  })
})

describe('respostas', () => {
  it('envia a resposta com PUT', async () => {
    await enviarResposta(20, 12, { taxaOcupacao: 72.5, diariaMedia: 410 })

    expect(chamada()).toMatchObject({
      url: 'http://localhost:8080/api/campanhas/20/respostas/12',
      metodo: 'PUT',
      corpo: { taxaOcupacao: 72.5, diariaMedia: 410 },
    })
  })

  it('respostas da campanha e histórico de uma resposta', async () => {
    await listarRespostasDaCampanha(20)
    await buscarHistoricoDaResposta(301)

    expect(chamada(0).url).toBe('http://localhost:8080/api/campanhas/20/respostas')
    expect(chamada(1).url).toBe('http://localhost:8080/api/respostas/301/historico')
  })
})

describe('rodadas', () => {
  it('lista por status', async () => {
    await listarRodadas('ABERTA')

    expect(chamada().url).toBe('http://localhost:8080/api/rodadas?status=ABERTA')
  })

  it('detalhe de uma rodada', async () => {
    await buscarRodada(7)

    expect(chamada().url).toBe('http://localhost:8080/api/rodadas/7')
  })

  it('prorroga, encerra e reabre com POST', async () => {
    await prorrogarRodada(7, { prazoResposta: '2026-12-05' })
    await encerrarRodada(7)
    await reabrirRodada(7, { prazoResposta: '2026-12-20' })

    expect(chamada(0)).toMatchObject({
      url: 'http://localhost:8080/api/rodadas/7/prorrogar',
      metodo: 'POST',
      corpo: { prazoResposta: '2026-12-05' },
    })
    expect(chamada(1)).toMatchObject({
      url: 'http://localhost:8080/api/rodadas/7/encerrar',
      metodo: 'POST',
      corpo: undefined,
    })
    expect(chamada(2)).toMatchObject({
      url: 'http://localhost:8080/api/rodadas/7/reabrir',
      metodo: 'POST',
      corpo: { prazoResposta: '2026-12-20' },
    })
  })

  it('acompanhamento de uma rodada', async () => {
    await buscarAcompanhamento(7)

    expect(chamada().url).toBe('http://localhost:8080/api/rodadas/7/acompanhamento')
  })

  it('cria, inclui campanha e abre com POST e corpo JSON', async () => {
    await criarRodada({ codigo: '018/26', titulo: 'Outubro' })
    await incluirCampanha(9, {
      nome: 'Consolidada de outubro de 2026',
      modalidade: 'CONSOLIDADA',
      tipoPeriodo: 'MENSAL',
      periodoInicio: '2026-10-01',
      periodoFim: '2026-10-31',
      qtdDiarias: 31,
    })
    await abrirRodada(9, { prazoResposta: '2026-11-30' })

    expect(chamada(0)).toMatchObject({
      url: 'http://localhost:8080/api/rodadas',
      metodo: 'POST',
      corpo: { codigo: '018/26', titulo: 'Outubro' },
    })
    expect(chamada(1)).toMatchObject({
      url: 'http://localhost:8080/api/rodadas/9/campanhas',
      metodo: 'POST',
      corpo: { modalidade: 'CONSOLIDADA', qtdDiarias: 31 },
    })
    expect(chamada(2)).toMatchObject({
      url: 'http://localhost:8080/api/rodadas/9/abrir',
      metodo: 'POST',
      corpo: { prazoResposta: '2026-11-30' },
    })
  })
})
