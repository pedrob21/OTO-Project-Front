import { describe, expect, it, vi } from 'vitest'
import { ErroRequisicao } from '@/api/erros'
import {
  type CampanhaRascunho,
  diariasDaCampanha,
  nomeSugerido,
  novaCampanha,
  OPCOES_DE_MES,
  opcoesDeAno,
  paraDadosCampanha,
} from './campanhas'
import { sugerirCodigo } from './codigo'
import { ErroDeEnvio, enviarPesquisa, textoDaEtapa, type Api } from './envio'
import { estadoInicial, reduzirPesquisa } from './estado'
import { campanhasRepetidas, errosDaCampanha, errosDaPesquisa } from './validacao'

const HOJE = '2026-11-16'
const FERIADOS = [{ codigo: 'CARNAVAL', nome: 'Carnaval' }]

function campanha(mudancas: Partial<CampanhaRascunho> = {}): CampanhaRascunho {
  return { ...novaCampanha(1, HOJE), ...mudancas }
}

const CARNAVAL = campanha({
  modalidade: 'EXPECTATIVA',
  tipoPeriodo: 'FERIADO',
  feriadoCodigo: 'CARNAVAL',
  inicio: '2027-02-05',
  fim: '2027-02-09',
})

describe('campanhas', () => {
  it('a primeira é a consolidada do mês anterior; as outras, expectativa de feriado', () => {
    expect(novaCampanha(1, HOJE)).toMatchObject({
      modalidade: 'CONSOLIDADA',
      tipoPeriodo: 'MENSAL',
      mes: '2026-10',
    })
    expect(novaCampanha(2, HOJE, false)).toMatchObject({
      modalidade: 'EXPECTATIVA',
      tipoPeriodo: 'FERIADO',
    })
  })

  it('sugere o nome pelo período', () => {
    expect(nomeSugerido(campanha(), FERIADOS)).toBe('Consolidada de outubro de 2026')
    expect(nomeSugerido(CARNAVAL, FERIADOS)).toBe('Expectativa Carnaval 2027')
    expect(nomeSugerido(campanha({ tipoPeriodo: 'FERIADO' }), FERIADOS)).toBe('')
  })

  it('diárias vêm dos dias do período até a pessoa mudar', () => {
    expect(diariasDaCampanha(campanha())).toBe('31')
    expect(diariasDaCampanha(CARNAVAL)).toBe('5')
    expect(diariasDaCampanha(campanha({ diarias: '20' }))).toBe('20')
  })

  it('monta o corpo da API', () => {
    expect(paraDadosCampanha(campanha({ nome: '  Outubro  ' }), FERIADOS)).toEqual({
      nome: 'Outubro',
      modalidade: 'CONSOLIDADA',
      tipoPeriodo: 'MENSAL',
      feriadoCodigo: undefined,
      periodoInicio: '2026-10-01',
      periodoFim: '2026-10-31',
      qtdDiarias: 31,
    })
    expect(paraDadosCampanha(CARNAVAL, FERIADOS)).toMatchObject({
      feriadoCodigo: 'CARNAVAL',
      periodoInicio: '2027-02-05',
      periodoFim: '2027-02-09',
      qtdDiarias: 5,
    })
  })
})

describe('opções de mês e ano', () => {
  it('doze meses com o valor de dois dígitos', () => {
    expect(OPCOES_DE_MES).toHaveLength(12)
    expect(OPCOES_DE_MES[1]).toEqual({ valor: '02', rotulo: 'Fevereiro' })
  })

  it('três anos para trás, um para a frente e o já escolhido', () => {
    expect(opcoesDeAno(2026).map((opcao) => opcao.valor)).toEqual([
      '2023',
      '2024',
      '2025',
      '2026',
      '2027',
    ])
    expect(opcoesDeAno(2026, 2019).map((opcao) => opcao.valor)[0]).toBe('2019')
  })
})

describe('validação', () => {
  it('campanha completa não tem erro', () => {
    expect(errosDaCampanha(campanha(), FERIADOS)).toEqual({})
    expect(errosDaCampanha(CARNAVAL, FERIADOS)).toEqual({})
  })

  it.each([
    [{ mes: '' }, 'mes', 'Escolha o mês.'],
    [{ diarias: '' }, 'diarias', 'Informe as diárias.'],
    [{ diarias: '2,5' }, 'diarias', 'Use um número inteiro.'],
    [{ diarias: '0' }, 'diarias', 'Use pelo menos 1 diária.'],
    [{ diarias: '32' }, 'diarias', 'Use até 31: o período tem 31 dias.'],
    [{ nome: ' ' }, 'nome', 'Informe o nome.'],
    [{ nome: 'x'.repeat(151) }, 'nome', 'Use até 150 caracteres.'],
  ])('mensal com %o: erro em %s', (mudancas, campo, mensagem) => {
    expect(errosDaCampanha(campanha(mudancas), FERIADOS)[campo]).toBe(mensagem)
  })

  it('feriado exige o feriado e um período em ordem', () => {
    const erros = errosDaCampanha(
      { ...CARNAVAL, feriadoCodigo: '', inicio: '2027-02-09', fim: '2027-02-05' },
      FERIADOS,
    )
    expect(erros.feriado).toBe('Escolha o feriado.')
    expect(erros.fim).toBe('O último dia não pode ser antes do primeiro.')
  })

  it('acusa a campanha repetida, não a primeira', () => {
    const segunda = campanha({ chave: 2 })
    expect([...campanhasRepetidas([campanha(), segunda, CARNAVAL])]).toEqual([2])
  })

  it('pesquisa: código, título, prazo e ao menos uma campanha', () => {
    const vazia = { codigo: '', titulo: '', prazo: '', campanhas: [] }
    expect(Object.keys(errosDaPesquisa(vazia, FERIADOS, HOJE))).toEqual([
      'codigo',
      'titulo',
      'campanhas',
      'prazo',
    ])

    const ontem = { codigo: '018/26', titulo: 'T', prazo: '2026-11-15', campanhas: [campanha()] }
    expect(errosDaPesquisa(ontem, FERIADOS, HOJE)).toEqual({
      prazo: 'O prazo não pode ser antes de hoje.',
    })
    expect(errosDaPesquisa({ ...ontem, prazo: HOJE }, FERIADOS, HOJE)).toEqual({})
  })
})

describe('sugerirCodigo', () => {
  it('próximo número do ano', () => {
    expect(
      sugerirCodigo([{ codigo: '017/26' }, { codigo: '009/26' }, { codigo: '040/25' }], HOJE),
    ).toBe('018/26')
    expect(sugerirCodigo([{ codigo: '040/25' }, { codigo: 'livre' }], HOJE)).toBe('001/26')
    expect(sugerirCodigo([], '2027-01-02')).toBe('001/27')
  })
})

describe('estado', () => {
  it('alterar uma campanha mantém as outras com a mesma referência', () => {
    const comDuas = reduzirPesquisa(estadoInicial(HOJE), { tipo: 'adicionar', hoje: HOJE })
    const [primeira] = comDuas.campanhas
    const depois = reduzirPesquisa(comDuas, { tipo: 'campanha', chave: 2, mudancas: { mes: '' } })

    expect(comDuas.adicionada).toBe(2)
    expect(depois.campanhas[0]).toBe(primeira)
    expect(depois.campanhas[1]).not.toBe(comDuas.campanhas[1])
  })
})

describe('enviarPesquisa', () => {
  function api(falhas: Partial<Record<keyof Api, unknown>> = {}) {
    let campanhaId = 30
    const responder = <T>(nome: keyof Api, valor: T) =>
      falhas[nome] ? Promise.reject(falhas[nome]) : Promise.resolve(valor)
    return {
      criarRodada: vi.fn((_dados: unknown) =>
        responder('criarRodada', { id: 9, codigo: '018/26' }),
      ),
      incluirCampanha: vi.fn((_rodadaId: number, _dados: unknown) =>
        responder('incluirCampanha', { id: ++campanhaId }),
      ),
      abrirRodada: vi.fn((_rodadaId: number, _dados: unknown) =>
        responder('abrirRodada', { id: 9, codigo: '018/26', status: 'ABERTA' as const }),
      ),
    }
  }

  const base = {
    codigo: ' 018/26 ',
    titulo: ' Outubro e Carnaval ',
    prazo: '2026-11-30',
    campanhas: [campanha(), { ...CARNAVAL, chave: 2 }],
    feriados: FERIADOS,
    salvo: { campanhas: {} },
    aoAvancar: () => {},
    aoSalvar: () => {},
  }

  it('cria, inclui as campanhas e abre, nessa ordem', async () => {
    const fake = api()
    const etapas: string[] = []

    await enviarPesquisa({
      ...base,
      api: fake,
      aoAvancar: (etapa) => etapas.push(textoDaEtapa(etapa)),
    })

    expect(fake.criarRodada).toHaveBeenCalledWith({
      codigo: '018/26',
      titulo: 'Outubro e Carnaval',
    })
    expect(fake.incluirCampanha).toHaveBeenCalledTimes(2)
    expect(fake.abrirRodada).toHaveBeenCalledWith(9, { prazoResposta: '2026-11-30' })
    expect(etapas).toEqual([
      'Criando a pesquisa…',
      'Incluindo a campanha 1 de 2…',
      'Incluindo a campanha 2 de 2…',
      'Abrindo para respostas…',
    ])
  })

  it('continua de onde parou, sem criar de novo', async () => {
    const fake = api()

    await enviarPesquisa({
      ...base,
      api: fake,
      salvo: { rodada: { id: 9, codigo: '018/26' }, campanhas: { 1: 31 } },
    })

    expect(fake.criarRodada).not.toHaveBeenCalled()
    expect(fake.incluirCampanha).toHaveBeenCalledTimes(1)
    expect(fake.incluirCampanha.mock.calls[0]?.[1]).toMatchObject({ feriadoCodigo: 'CARNAVAL' })
  })

  it('a falha diz em qual etapa parou e o que já foi salvo', async () => {
    const recusa = new ErroRequisicao(422, 'Já existe uma campanha EXPECTATIVA para este período.')
    const salvos: unknown[] = []

    const envio = enviarPesquisa({
      ...base,
      api: api({ incluirCampanha: recusa }),
      aoSalvar: (salvo) => salvos.push(salvo),
    })

    await expect(envio).rejects.toBeInstanceOf(ErroDeEnvio)
    await envio.catch((erro: ErroDeEnvio) => {
      expect(erro.etapa).toMatchObject({ tipo: 'campanha', chave: 1 })
      expect(erro.message).toBe(recusa.message)
    })
    expect(salvos).toEqual([{ rodada: { id: 9, codigo: '018/26' }, campanhas: {} }])
  })
})
