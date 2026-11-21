import { describe, expect, it } from 'vitest'
import { formatarDataHora } from '@/lib/formatos'
import {
  autorDaVersao,
  campanhasParaResponder,
  errosDaResposta,
  faixaDaTaxa,
  lerNumero,
  paraCampo,
  paraRespostaRequest,
  resumoDasPendencias,
  textoDaDiaria,
} from './respostas'

const FAIXAS = [
  { codigo: 'RUIM', nome: 'Ruim', percentualMinimo: 0 },
  { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41 },
  { codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61 },
]

describe('lerNumero', () => {
  it.each([
    ['72,5', 72.5],
    ['72.5', 72.5],
    [' 100 ', 100],
    ['1.234,56', 1234.56],
    ['0', 0],
    ['', null],
    ['abc', null],
    ['-3', null],
    ['7,2,1', null],
  ])('"%s" → %s', (texto, numero) => {
    expect(lerNumero(texto)).toBe(numero)
  })
})

describe('errosDaResposta', () => {
  it('aceita taxa válida e diária opcional', () => {
    expect(errosDaResposta('72,5', '')).toEqual({})
    expect(errosDaResposta('0', '410,00')).toEqual({})
    expect(errosDaResposta('100', '')).toEqual({})
  })

  it.each([
    ['', '', 'taxa', 'Informe a taxa de ocupação.'],
    ['setenta', '', 'taxa', 'Use só números, como 72,5.'],
    ['100,5', '', 'taxa', 'A taxa vai de 0 a 100%.'],
    ['72,555', '', 'taxa', 'Use no máximo duas casas decimais.'],
    ['72', 'muito', 'diaria', 'Use só números, como 410,00.'],
    ['72', '0', 'diaria', 'A diária precisa ser maior que zero.'],
    ['72', '410,123', 'diaria', 'Use no máximo duas casas decimais.'],
  ])('taxa "%s" e diária "%s": erro em %s', (taxa, diaria, campo, mensagem) => {
    expect(errosDaResposta(taxa, diaria)).toMatchObject({ [campo]: mensagem })
  })
})

describe('conversões', () => {
  it('monta o corpo da API, sem diária quando vazia', () => {
    expect(paraRespostaRequest('72,5', '')).toEqual({ taxaOcupacao: 72.5, diariaMedia: undefined })
    expect(paraRespostaRequest('80', '1.250,90')).toEqual({ taxaOcupacao: 80, diariaMedia: 1250.9 })
  })

  it('valor da API vira texto do campo', () => {
    expect(paraCampo(72.5)).toBe('72,5')
    expect(paraCampo(410)).toBe('410')
    expect(paraCampo(undefined)).toBe('')
    expect(paraCampo(null)).toBe('')
  })

  it('diária com centavos', () => {
    expect(textoDaDiaria(410.5).replaceAll(' ', ' ')).toBe('R$ 410,50')
    expect(textoDaDiaria(undefined)).toBe('sem diária')
    expect(textoDaDiaria(null)).toBe('sem diária')
  })

  it('data e hora no fuso local', () => {
    expect(formatarDataHora('2026-11-12T17:30:00Z')).toMatch(/^\d{2}\/\d{2}\/2026 às \d{2}:\d{2}$/)
    expect(formatarDataHora(undefined)).toBe('—')
  })
})

describe('faixaDaTaxa', () => {
  it('fica com a maior faixa que a taxa alcança', () => {
    expect(faixaDaTaxa(FAIXAS, 72.5)?.nome).toBe('Ótima')
    expect(faixaDaTaxa(FAIXAS, 41)?.nome).toBe('Boa')
    expect(faixaDaTaxa(FAIXAS, 0)?.nome).toBe('Ruim')
    expect(faixaDaTaxa(FAIXAS, null)).toBeUndefined()
    expect(faixaDaTaxa(FAIXAS, 120)).toBeUndefined()
  })
})

describe('campanhasParaResponder', () => {
  const pendencia = (
    campanhaId: number,
    nomeFantasia: string,
    prazoResposta: string,
    respondida = false,
  ) => ({
    campanhaId,
    campanhaNome: `Campanha ${campanhaId}`,
    rodadaCodigo: '002/26',
    periodoInicio: '2026-09-01',
    periodoFim: '2026-09-30',
    prazoResposta,
    nomeFantasia,
    respondida,
  })

  it('agrupa por campanha, com o prazo mais próximo primeiro', () => {
    const campanhas = campanhasParaResponder(
      [
        pendencia(2, 'Pousada B', '2026-12-10'),
        pendencia(1, 'Pousada B', '2026-11-30'),
        pendencia(1, 'Hotel A', '2026-11-30'),
      ],
      '2026-11-20',
    )

    expect(campanhas.map((campanha) => campanha.campanhaId)).toEqual([1, 2])
    expect(campanhas[0]?.estabelecimentos.map((item) => item.nomeFantasia)).toEqual([
      'Hotel A',
      'Pousada B',
    ])
    expect(campanhas[0]).toMatchObject({
      periodo: '01/09/2026 a 30/09/2026',
      prazo: 'Prazo de resposta: 30/11/2026 · faltam 10 dias',
      prazoVencido: false,
    })
  })

  it('marca o prazo vencido', () => {
    const [campanha] = campanhasParaResponder([pendencia(1, 'Hotel A', '2026-11-19')], '2026-11-20')
    expect(campanha?.prazoVencido).toBe(true)
  })

  it('resume o que falta', () => {
    expect(resumoDasPendencias([pendencia(1, 'A', 'x'), pendencia(1, 'B', 'x', true)])).toBe(
      'Falta 1 de 2 respostas.',
    )
    expect(resumoDasPendencias([pendencia(1, 'A', 'x', true)])).toMatch(/^Todas as respostas/)
    expect(resumoDasPendencias([])).toBe('')
  })
})

describe('autorDaVersao', () => {
  it('diferencia o parceiro da equipe do OTO', () => {
    expect(autorDaVersao(7, 7)).toBe('por você')
    expect(autorDaVersao(1, 7)).toBe('pela equipe do OTO')
  })
})
