import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarFeriados, buscarResumo, buscarSerieMensal } from './dashboard'
import { ErroRequisicao } from './erros'
import {
  alterarHistorico,
  excluirHistorico,
  gravarHistorico,
  importarHistorico,
  listarHistorico,
} from './historico'
import {
  alterarEstabelecimento,
  buscarEstabelecimento,
  corrigirCapacidade,
  criarEstabelecimento,
  excluirCapacidade,
  inativarEstabelecimento,
  listarCapacidades,
  listarEstabelecimentos,
  reativarEstabelecimento,
  registrarCapacidade,
} from './estabelecimentos'
import {
  alterarParametros,
  buscarParametrosVigentes,
  criarParametros,
  excluirParametros,
  listarParametros,
} from './parametros'
import {
  alterarGrupo,
  alterarItem,
  buscarCatalogo,
  buscarCatalogoCompleto,
  buscarInventario,
  criarGrupo,
  criarItem,
  excluirGrupo,
  excluirItem,
  inativarGrupo,
  inativarItem,
  reativarGrupo,
  reativarItem,
  salvarInventario,
} from './inventario'
import * as download from '@/lib/download'
import { alterarReferencia, criarReferencia, excluirReferencia } from './referencias'
import { buscarHistoricoDaResposta, enviarResposta, listarRespostasDaCampanha } from './respostas'
import {
  baixarResultadoCsv,
  buscarPrevia,
  buscarResultado,
  cancelarPublicacao,
  listarPublicadas,
  publicarCampanha,
} from './resultados'
import { buscarRhcVigente, corrigirRhc, excluirRhc, listarRhc, registrarRhc } from './rhc'
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
import { limparSessao, salvarSessao } from './sessao'
import {
  alterarUsuario,
  buscarUsuario,
  criarUsuario,
  gerarLinkDeSenha,
  inativarUsuario,
  listarUsuarios,
  reativarUsuario,
} from './usuarios'

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

  it('parâmetros: lista, cria, corrige e exclui', async () => {
    const parametros = {
      vigenteDesde: '2027-01-01',
      percentualDayUse: 15.15,
      diasPermanenciaMedia: 4,
      diasEmParques: 2,
      gastoMedioDiario: 250,
      gastoMedioIngresso: 105,
      percentualMinimoLeitosPublicacao: 70,
      fonte: 'Pesquisa de Demanda Turística 2026',
    }
    await listarParametros()
    await criarParametros(parametros)
    await alterarParametros(3, parametros)
    await excluirParametros(3)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['GET', 'http://localhost:8080/api/parametros-calculo'],
      ['POST', 'http://localhost:8080/api/parametros-calculo'],
      ['PUT', 'http://localhost:8080/api/parametros-calculo/3'],
      ['DELETE', 'http://localhost:8080/api/parametros-calculo/3'],
    ])
    expect(chamada(1).corpo).toEqual(parametros)
  })

  it('RHC vigente', async () => {
    await buscarRhcVigente('2026-01-01')

    expect(chamada().url).toBe('http://localhost:8080/api/rhc/vigente?data=2026-01-01')
  })

  it('RHC: lista, registra, corrige e exclui', async () => {
    const rhc = {
      vigenteDesde: '2026-01-01',
      qtdRegistros: 310,
      qtdUh: 420,
      qtdLeitos: 1300,
      maxLeitosPorUh: 5,
    }
    await listarRhc()
    await registrarRhc(rhc)
    await corrigirRhc(4, rhc)
    await excluirRhc(4)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['GET', 'http://localhost:8080/api/rhc'],
      ['POST', 'http://localhost:8080/api/rhc'],
      ['PUT', 'http://localhost:8080/api/rhc/4'],
      ['DELETE', 'http://localhost:8080/api/rhc/4'],
    ])
    expect(chamada(2).corpo).toEqual(rhc)
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

describe('referências', () => {
  it('cria, altera e exclui pelo código de cada recurso', async () => {
    await criarReferencia('tipos-hospedagem', { nome: 'Chalé', calculaReceita: false })
    await alterarReferencia('feriados', 'FESTA_JUNINA', {
      codigo: 'FESTA_JUNINA',
      nome: 'Festa Junina',
    })
    await excluirReferencia('faixas', 'MEDIA')

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['POST', 'http://localhost:8080/api/referencias/tipos-hospedagem'],
      ['PUT', 'http://localhost:8080/api/referencias/feriados/FESTA_JUNINA'],
      ['DELETE', 'http://localhost:8080/api/referencias/faixas/MEDIA'],
    ])
    expect(chamada(0).corpo).toEqual({ nome: 'Chalé', calculaReceita: false })
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

describe('usuários', () => {
  it('lista e busca', async () => {
    await listarUsuarios()
    await buscarUsuario(7)

    expect(chamada(0)).toMatchObject({ url: 'http://localhost:8080/api/usuarios', metodo: 'GET' })
    expect(chamada(1).url).toBe('http://localhost:8080/api/usuarios/7')
  })

  it('cria com POST e altera com PUT', async () => {
    await criarUsuario({
      nome: 'Ana',
      email: 'ana@hotel.com',
      perfil: 'PARCEIRO',
      estabelecimentoIds: [12],
    })
    await alterarUsuario(7, { nome: 'Ana Souza', perfil: 'VISUALIZADOR', estabelecimentoIds: [] })

    expect(chamada(0)).toMatchObject({
      url: 'http://localhost:8080/api/usuarios',
      metodo: 'POST',
      corpo: { email: 'ana@hotel.com', estabelecimentoIds: [12] },
    })
    expect(chamada(1)).toMatchObject({
      url: 'http://localhost:8080/api/usuarios/7',
      metodo: 'PUT',
      corpo: { nome: 'Ana Souza', perfil: 'VISUALIZADOR' },
    })
  })

  it('inativa, reativa e gera link sem corpo', async () => {
    await inativarUsuario(7)
    await reativarUsuario(7)
    await gerarLinkDeSenha(7)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['POST', 'http://localhost:8080/api/usuarios/7/inativar'],
      ['POST', 'http://localhost:8080/api/usuarios/7/reativar'],
      ['POST', 'http://localhost:8080/api/usuarios/7/link-de-senha'],
    ])
    expect(chamada(0).corpo).toBeUndefined()
  })
})

describe('capacidades', () => {
  it('lista, inclui, corrige e exclui', async () => {
    const capacidade = {
      vigenteDesde: '2026-07-01',
      qtdUh: 42,
      qtdUhPcd: 2,
      qtdLeitos: 126,
      maxLeitosPorUh: 4,
    }
    await listarCapacidades(12)
    await registrarCapacidade(12, capacidade)
    await corrigirCapacidade(12, 5, capacidade)
    await excluirCapacidade(12, 5)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['GET', 'http://localhost:8080/api/estabelecimentos/12/capacidades'],
      ['POST', 'http://localhost:8080/api/estabelecimentos/12/capacidades'],
      ['PUT', 'http://localhost:8080/api/estabelecimentos/12/capacidades/5'],
      ['DELETE', 'http://localhost:8080/api/estabelecimentos/12/capacidades/5'],
    ])
    expect(chamada(1).corpo).toEqual(capacidade)
  })
})

describe('estabelecimentos', () => {
  it('lista com os filtros', async () => {
    await listarEstabelecimentos({ tipo: 'HOTEL', ativo: true })
    await listarEstabelecimentos()

    expect(chamada(0).url).toBe('http://localhost:8080/api/estabelecimentos?tipo=HOTEL&ativo=true')
    expect(chamada(1).url).toBe('http://localhost:8080/api/estabelecimentos')
  })

  it('busca, cria, altera, inativa e reativa', async () => {
    const dados = { nomeFantasia: 'Hotel Exemplo' }
    const secretaria = { tipoHospedagemCodigo: 'HOTEL', situacao: 'REGULAR' as const }
    await buscarEstabelecimento(12)
    await criarEstabelecimento({
      dados,
      secretaria,
      capacidade: {
        vigenteDesde: '2026-01-01',
        qtdUh: 40,
        qtdUhPcd: 2,
        qtdLeitos: 120,
        maxLeitosPorUh: 4,
      },
    })
    await alterarEstabelecimento(12, { dados, secretaria })
    await inativarEstabelecimento(12)
    await reativarEstabelecimento(12)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['GET', 'http://localhost:8080/api/estabelecimentos/12'],
      ['POST', 'http://localhost:8080/api/estabelecimentos'],
      ['PUT', 'http://localhost:8080/api/estabelecimentos/12'],
      ['POST', 'http://localhost:8080/api/estabelecimentos/12/inativar'],
      ['POST', 'http://localhost:8080/api/estabelecimentos/12/reativar'],
    ])
    expect(chamada(1).corpo).toMatchObject({ capacidade: { qtdUh: 40 }, secretaria })
  })
})

describe('inventário', () => {
  it('catálogo: lê, cria, altera, inativa, reativa e exclui grupos', async () => {
    const dados = { categoria: 'ACESSIBILIDADE' as const, nome: 'Rampas', ordem: 2 }
    await buscarCatalogo()
    await buscarCatalogoCompleto()
    await criarGrupo(dados)
    await alterarGrupo(4, dados)
    await inativarGrupo(4)
    await reativarGrupo(4)
    await excluirGrupo(4)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['GET', 'http://localhost:8080/api/inventario/catalogo'],
      ['GET', 'http://localhost:8080/api/inventario/catalogo/completo'],
      ['POST', 'http://localhost:8080/api/inventario/grupos'],
      ['PUT', 'http://localhost:8080/api/inventario/grupos/4'],
      ['POST', 'http://localhost:8080/api/inventario/grupos/4/inativar'],
      ['POST', 'http://localhost:8080/api/inventario/grupos/4/reativar'],
      ['DELETE', 'http://localhost:8080/api/inventario/grupos/4'],
    ])
    expect(chamada(2).corpo).toEqual(dados)
    expect(chamada(3).corpo).toEqual(dados)
  })

  it('catálogo: cria no grupo, altera, inativa, reativa e exclui itens', async () => {
    const dados = { nome: 'Piscina', permiteComplemento: true }
    await criarItem(4, dados)
    await alterarItem(9, dados)
    await inativarItem(9)
    await reativarItem(9)
    await excluirItem(9)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['POST', 'http://localhost:8080/api/inventario/grupos/4/itens'],
      ['PUT', 'http://localhost:8080/api/inventario/itens/9'],
      ['POST', 'http://localhost:8080/api/inventario/itens/9/inativar'],
      ['POST', 'http://localhost:8080/api/inventario/itens/9/reativar'],
      ['DELETE', 'http://localhost:8080/api/inventario/itens/9'],
    ])
    expect(chamada(0).corpo).toEqual(dados)
    expect(chamada(1).corpo).toEqual(dados)
  })

  it('lê e salva o inventário do estabelecimento', async () => {
    const dados = { itens: [{ itemId: 9, complemento: '2 piscinas' }, { itemId: 11 }] }
    await buscarInventario(12)
    await salvarInventario(12, dados)

    expect(chamada(0)).toMatchObject({
      metodo: 'GET',
      url: 'http://localhost:8080/api/estabelecimentos/12/inventario',
    })
    expect(chamada(1)).toMatchObject({
      metodo: 'PUT',
      url: 'http://localhost:8080/api/estabelecimentos/12/inventario',
      corpo: dados,
    })
  })
})

describe('série histórica', () => {
  const valor = {
    indicador: 'TAXA_OCUPACAO' as const,
    modalidade: 'CONSOLIDADA' as const,
    ano: 2024,
    mes: 7,
    valor: 68.4,
    fonte: 'Indicadores do Turismo 2017-2025',
  }

  it('lista com os filtros, grava, corrige e exclui', async () => {
    await listarHistorico({ indicador: 'FLUXO_TURISTAS', ano: 2024, tipo: 'HOTEL' })
    await gravarHistorico(valor)
    await alterarHistorico(8, valor)
    await excluirHistorico(8)

    expect(
      fetchFalso.mock.calls.map((_, indice) => [chamada(indice).metodo, chamada(indice).url]),
    ).toEqual([
      ['GET', 'http://localhost:8080/api/historico?indicador=FLUXO_TURISTAS&ano=2024&tipo=HOTEL'],
      ['POST', 'http://localhost:8080/api/historico'],
      ['PUT', 'http://localhost:8080/api/historico/8'],
      ['DELETE', 'http://localhost:8080/api/historico/8'],
    ])
    expect(chamada(1).corpo).toEqual(valor)
  })

  it('importa em multipart, com o arquivo e a fonte', async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ linhasLidas: 3, inseridos: 2, atualizados: 1, erros: [] })),
    )
    const arquivo = new File(['indicador;modalidade'], 'serie.csv', { type: 'text/csv' })

    await expect(importarHistorico(arquivo, 'Planilha 2017-2025')).resolves.toMatchObject({
      inseridos: 2,
    })

    const [url, init] = fetchFalso.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:8080/api/historico/importacao')
    expect(init?.method).toBe('POST')
    const corpo = init?.body as FormData
    expect(corpo.get('fonte')).toBe('Planilha 2017-2025')
    expect((corpo.get('arquivo') as File).name).toBe('serie.csv')
  })

  it('erros por linha (422) voltam como resultado', async () => {
    const erros = [{ linha: 3, mensagem: 'feriado inválido: CARNAVALL (veja /api/referencias)' }]
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ linhasLidas: 3, inseridos: 0, atualizados: 0, erros }), {
        status: 422,
      }),
    )

    await expect(importarHistorico(new File([''], 'a.csv'), 'x')).resolves.toMatchObject({ erros })
  })

  it('outras recusas viram erro', async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Informe a fonte dos dados (até 200 caracteres).' }), {
        status: 422,
      }),
    )

    await expect(importarHistorico(new File([''], 'a.csv'), ' ')).rejects.toMatchObject({
      status: 422,
      message: 'Informe a fonte dos dados (até 200 caracteres).',
    })
  })
})

describe('resultado.csv', () => {
  afterEach(() => vi.restoreAllMocks())

  it('baixa com o token e salva com o nome do cabeçalho', async () => {
    salvarSessao({ token: 'abc', expiraEm: new Date(Date.now() + 60_000).toISOString() })
    fetchFalso.mockResolvedValue(
      new Response('a;b', {
        headers: { 'Content-Disposition': 'attachment; filename="resultado-campanha-42.csv"' },
      }),
    )
    const salvar = vi.spyOn(download, 'salvarArquivo').mockImplementation(() => {})

    await baixarResultadoCsv(42)

    expect(chamada().url).toBe('http://localhost:8080/api/campanhas/42/resultado.csv')
    expect(fetchFalso.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer abc' })
    expect(salvar).toHaveBeenCalledWith(expect.any(Blob), 'resultado-campanha-42.csv')
    const [blob] = salvar.mock.calls[0] ?? []
    expect(await blob?.text()).toBe('a;b')
    limparSessao()
  })

  it('sem Content-Disposition, usa o nome padrão', async () => {
    fetchFalso.mockResolvedValue(new Response('a'))
    const salvar = vi.spyOn(download, 'salvarArquivo').mockImplementation(() => {})

    await baixarResultadoCsv(7)

    expect(salvar).toHaveBeenCalledWith(expect.any(Blob), 'resultado-campanha-7.csv')
  })

  it('erro da API não salva arquivo', async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Resultado não publicado.' }), { status: 403 }),
    )
    const salvar = vi.spyOn(download, 'salvarArquivo').mockImplementation(() => {})

    await expect(baixarResultadoCsv(42)).rejects.toMatchObject({
      status: 403,
      message: 'Resultado não publicado.',
    })

    expect(salvar).not.toHaveBeenCalled()
  })
})
