import { describe, expect, it, vi } from 'vitest'
import { type CampanhaRascunho, novaCampanha, paraDadosCampanha } from './campanhas'
import { type Api, ErroDeEnvio, enviarPesquisa, textoDaEtapa } from './envio'
import { estadoInicial, reduzirPesquisa } from './estado'
import { errosDaCampanha, errosDaPesquisa, idDoCampo } from './validacao'

const HOJE = '2026-11-16'
const FERIADOS = [{ codigo: 'CARNAVAL', nome: 'Carnaval' }]

function campanha(mudancas: Partial<CampanhaRascunho> = {}): CampanhaRascunho {
  return { ...novaCampanha(1, HOJE), ...mudancas }
}

function apiSemIds(): Api {
  return {
    criarRodada: vi.fn(async () => ({})),
    incluirCampanha: vi.fn(async () => ({})),
    abrirRodada: vi.fn(async () => ({ status: 'ABERTA' as const })),
  }
}

describe('enviarPesquisa', () => {
  it('resposta sem id nem código usa 0 e o código digitado', async () => {
    const api = apiSemIds()
    const salvos: unknown[] = []

    const rodada = await enviarPesquisa({
      codigo: ' 018/26 ',
      titulo: 'Outubro',
      prazo: '2026-11-30',
      campanhas: [campanha()],
      feriados: FERIADOS,
      salvo: { campanhas: {} },
      aoAvancar: () => {},
      aoSalvar: (salvo) => salvos.push(salvo),
      api,
    })

    expect(rodada).toEqual({ status: 'ABERTA' })
    expect(salvos).toEqual([
      { rodada: { id: 0, codigo: '018/26' }, campanhas: {} },
      { rodada: { id: 0, codigo: '018/26' }, campanhas: { 1: 0 } },
    ])
    expect(api.incluirCampanha).toHaveBeenCalledWith(0, paraDadosCampanha(campanha(), FERIADOS))
    expect(api.abrirRodada).toHaveBeenCalledWith(0, { prazoResposta: '2026-11-30' })
  })

  it('tudo já salvo: só abre a pesquisa', async () => {
    const api = apiSemIds()
    const etapas: string[] = []

    await enviarPesquisa({
      codigo: '018/26',
      titulo: 'Outubro',
      prazo: '2026-11-30',
      campanhas: [campanha()],
      feriados: FERIADOS,
      salvo: { rodada: { id: 9, codigo: '018/26' }, campanhas: { 1: 31 } },
      aoAvancar: (etapa) => etapas.push(textoDaEtapa(etapa)),
      aoSalvar: () => {},
      api,
    })

    expect(api.criarRodada).not.toHaveBeenCalled()
    expect(api.incluirCampanha).not.toHaveBeenCalled()
    expect(api.abrirRodada).toHaveBeenCalledWith(9, { prazoResposta: '2026-11-30' })
    expect(etapas).toEqual(['Abrindo para respostas…'])
  })

  it('falha que não é Error vira mensagem genérica, guardando a causa', async () => {
    const api = apiSemIds()
    vi.mocked(api.criarRodada).mockRejectedValue('timeout')

    const erro = await enviarPesquisa({
      codigo: '018/26',
      titulo: 'Outubro',
      prazo: '2026-11-30',
      campanhas: [],
      feriados: FERIADOS,
      salvo: { campanhas: {} },
      aoAvancar: () => {},
      aoSalvar: () => {},
      api,
    }).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ErroDeEnvio)
    expect(erro).toMatchObject({
      name: 'ErroDeEnvio',
      message: 'Não foi possível concluir o envio.',
      etapa: { tipo: 'pesquisa' },
      causa: 'timeout',
    })
  })

  it('falha ao abrir diz que parou na abertura', async () => {
    const api = apiSemIds()
    vi.mocked(api.abrirRodada).mockRejectedValue(new Error('Prazo inválido.'))

    const erro = await enviarPesquisa({
      codigo: '018/26',
      titulo: 'Outubro',
      prazo: '2026-11-30',
      campanhas: [],
      feriados: FERIADOS,
      salvo: { rodada: { id: 9, codigo: '018/26' }, campanhas: {} },
      aoAvancar: () => {},
      aoSalvar: () => {},
      api,
    }).catch((e: unknown) => e)

    expect(erro).toMatchObject({ etapa: { tipo: 'abrir' }, message: 'Prazo inválido.' })
  })
})

describe('textoDaEtapa', () => {
  it('com uma campanha só, não numera', () => {
    expect(textoDaEtapa({ tipo: 'campanha', chave: 1, posicao: 1, total: 1 })).toBe(
      'Incluindo a campanha…',
    )
  })
})

describe('reduzirPesquisa', () => {
  it('edita os campos da pesquisa', () => {
    const estado = reduzirPesquisa(estadoInicial(HOJE), {
      tipo: 'pesquisa',
      campo: 'titulo',
      valor: 'Outubro',
    })

    expect(estado.titulo).toBe('Outubro')
    expect(estado.codigo).toBeNull()
  })

  it('remover a única campanha e adicionar de novo volta à consolidada', () => {
    const vazia = reduzirPesquisa(estadoInicial(HOJE), { tipo: 'remover', chave: 1 })
    expect(vazia.campanhas).toEqual([])

    const nova = reduzirPesquisa(vazia, { tipo: 'adicionar', hoje: HOJE })
    expect(nova.campanhas[0]).toMatchObject({ chave: 2, modalidade: 'CONSOLIDADA' })
    expect(nova.proximaChave).toBe(3)
  })

  it('reiniciar volta ao estado inicial', () => {
    const editada = reduzirPesquisa(
      reduzirPesquisa(estadoInicial(HOJE), { tipo: 'adicionar', hoje: HOJE }),
      { tipo: 'pesquisa', campo: 'prazo', valor: '2026-12-01' },
    )

    expect(reduzirPesquisa(editada, { tipo: 'reiniciar', hoje: HOJE })).toEqual(estadoInicial(HOJE))
  })
})

describe('validação, casos de borda', () => {
  it('feriado sem o primeiro dia não compara a ordem das datas', () => {
    const erros = errosDaCampanha(
      campanha({
        tipoPeriodo: 'FERIADO',
        feriadoCodigo: 'CARNAVAL',
        inicio: '',
        fim: '2027-02-09',
        diarias: '3',
      }),
      FERIADOS,
    )

    expect(erros).toEqual({ inicio: 'Informe o primeiro dia.' })
  })

  it('feriado sem o último dia', () => {
    const erros = errosDaCampanha(
      campanha({ tipoPeriodo: 'FERIADO', feriadoCodigo: 'CARNAVAL', inicio: '2027-02-05' }),
      FERIADOS,
    )

    expect(erros.fim).toBe('Informe o último dia.')
    expect(erros.diarias).toBe('Informe as diárias.')
  })

  it('sem período definido, o limite de diárias é o máximo geral', () => {
    const erros = errosDaCampanha(
      campanha({ tipoPeriodo: 'FERIADO', feriadoCodigo: 'CARNAVAL', diarias: '400' }),
      FERIADOS,
    )

    expect(erros.diarias).toBe('Use até 366.')
  })

  it('prazo em formato inválido conta como passado', () => {
    const dados = { codigo: '018/26', titulo: 'T', prazo: '30/11/2026', campanhas: [campanha()] }

    expect(errosDaPesquisa(dados, FERIADOS, HOJE)).toEqual({
      prazo: 'O prazo não pode ser antes de hoje.',
    })
  })

  it('campanha repetida com o período já com erro mantém o erro original', () => {
    const repetida = campanha({ chave: 2, diarias: '0' })
    const erros = errosDaPesquisa(
      { codigo: '018/26', titulo: 'T', prazo: HOJE, campanhas: [campanha(), repetida] },
      FERIADOS,
      HOJE,
    )

    expect(erros).toEqual({
      '2.mes': 'Já há uma campanha desta modalidade para este período.',
      '2.diarias': 'Use pelo menos 1 diária.',
    })
  })

  it('id do campo troca o ponto por hífen', () => {
    expect(idDoCampo('2.mes')).toBe('campo-2-mes')
    expect(idDoCampo('prazo')).toBe('campo-prazo')
  })
})

describe('paraDadosCampanha sem período', () => {
  it('manda datas vazias', () => {
    const dados = paraDadosCampanha(
      campanha({ tipoPeriodo: 'FERIADO', feriadoCodigo: 'CARNAVAL', diarias: '3' }),
      FERIADOS,
    )

    expect(dados).toMatchObject({ periodoInicio: '', periodoFim: '', feriadoCodigo: 'CARNAVAL' })
  })
})
