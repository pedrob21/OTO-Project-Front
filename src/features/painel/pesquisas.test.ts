import { describe, expect, it } from 'vitest'
import type { Esquemas } from '@/types/dominio'
import {
  campanhaDeReferencia,
  idsRecentesPublicadas,
  rodadaAbertaAtual,
  rodadasRecentesPublicadas,
  textoDasFaltantes,
} from './pesquisas'

const TIPOS: Esquemas['TipoRef'][] = [
  { codigo: 'POUSADA', nome: 'Pousada' },
  { codigo: 'HOTEL', nome: 'Hotel' },
  { codigo: 'RESORT', nome: 'Resort' },
  { codigo: 'CHALE', nome: 'Chalé' },
]

function estabelecimentos(codigo: string, faltando: number, responderam = 0) {
  return [
    ...Array.from({ length: faltando }, () => ({ tipoHospedagemCodigo: codigo, respondeu: false })),
    ...Array.from({ length: responderam }, () => ({
      tipoHospedagemCodigo: codigo,
      respondeu: true,
    })),
  ]
}

describe('campanhaDeReferencia', () => {
  it('escolhe a campanha com menos respostas', () => {
    const campanha = campanhaDeReferencia({
      campanhas: [
        { campanhaId: 1, qtdRespondentes: 10 },
        { campanhaId: 2, qtdRespondentes: 3 },
        { campanhaId: 3, qtdRespondentes: 7 },
      ],
    })

    expect(campanha?.campanhaId).toBe(2)
  })

  it('sem respondentes conta como zero', () => {
    const campanha = campanhaDeReferencia({
      campanhas: [{ campanhaId: 1, qtdRespondentes: 4 }, { campanhaId: 2 }],
    })

    expect(campanha?.campanhaId).toBe(2)
  })

  it('sem acompanhamento ou sem campanhas, não há referência', () => {
    expect(campanhaDeReferencia(undefined)).toBeUndefined()
    expect(campanhaDeReferencia({})).toBeUndefined()
    expect(campanhaDeReferencia({ campanhas: [] })).toBeUndefined()
  })
})

describe('textoDasFaltantes', () => {
  it('sem meios de hospedagem cadastrados', () => {
    expect(textoDasFaltantes({ qtdMh: 0 }, TIPOS)).toBe(
      'Ainda não há meios de hospedagem cadastrados para responder.',
    )
    expect(textoDasFaltantes({}, TIPOS)).toBe(
      'Ainda não há meios de hospedagem cadastrados para responder.',
    )
  })

  it('todos responderam', () => {
    expect(textoDasFaltantes({ qtdMh: 5, qtdRespondentes: 5 }, TIPOS)).toBe(
      'Todos os meios de hospedagem responderam.',
    )
  })

  it('agrupa por tipo, do maior grupo para o menor, no plural', () => {
    const texto = textoDasFaltantes(
      {
        qtdMh: 30,
        qtdRespondentes: 3,
        estabelecimentos: [
          ...estabelecimentos('HOTEL', 8, 2),
          ...estabelecimentos('POUSADA', 17, 1),
          ...estabelecimentos('RESORT', 2),
        ],
      },
      TIPOS,
    )

    expect(texto).toBe('Faltam 27 respostas: 17 pousadas, 8 hotéis e 2 resorts.')
  })

  it('uma resposta faltando fica no singular', () => {
    const texto = textoDasFaltantes(
      { qtdMh: 4, qtdRespondentes: 3, estabelecimentos: estabelecimentos('HOTEL', 1, 3) },
      TIPOS,
    )

    expect(texto).toBe('Falta 1 resposta: 1 hotel.')
  })

  it('tipo sem plural conhecido ou sem cadastro usa o nome ou o código', () => {
    const texto = textoDasFaltantes(
      {
        qtdMh: 5,
        estabelecimentos: [...estabelecimentos('CHALE', 3), ...estabelecimentos('IGLU', 2)],
      },
      TIPOS,
    )

    expect(texto).toBe('Faltam 5 respostas: 3 chalé e 2 IGLU.')
  })

  it('estabelecimento sem tipo entra num grupo sem nome', () => {
    const texto = textoDasFaltantes({ qtdMh: 1, estabelecimentos: [{ respondeu: false }] }, TIPOS)

    expect(texto).toBe('Falta 1 resposta: 1 .')
  })

  it('sem a lista de estabelecimentos, só a contagem', () => {
    expect(textoDasFaltantes({ qtdMh: 10, qtdRespondentes: 4 }, TIPOS)).toBe('Faltam 6 respostas.')
  })
})

describe('rodadaAbertaAtual', () => {
  it('a aberta com prazo mais próximo; sem prazo vai para o fim', () => {
    const rodadas: Esquemas['RodadaResponse'][] = [
      { id: 1, status: 'ENCERRADA', prazoResposta: '2026-01-01' },
      { id: 2, status: 'ABERTA' },
      { id: 3, status: 'ABERTA', prazoResposta: '2026-12-10' },
      { id: 4, status: 'ABERTA', prazoResposta: '2026-11-30' },
    ]

    expect(rodadaAbertaAtual(rodadas)?.id).toBe(4)
  })

  it('sem prazo em nenhuma, fica a primeira aberta', () => {
    expect(
      rodadaAbertaAtual([
        { id: 5, status: 'ABERTA' },
        { id: 6, status: 'ABERTA' },
      ])?.id,
    ).toBe(5)
  })

  it('sem rodada aberta', () => {
    expect(rodadaAbertaAtual([{ id: 1, status: 'RASCUNHO' }])).toBeUndefined()
    expect(rodadaAbertaAtual([])).toBeUndefined()
  })
})

describe('rodadas recentes publicadas', () => {
  const RODADAS: Esquemas['RodadaResponse'][] = [
    {
      id: 1,
      codigo: '001/26',
      titulo: 'Janeiro',
      campanhas: [{ publicadaEm: '2026-02-10' }, { publicadaEm: '2026-02-20' }],
    },
    { id: 2, codigo: '002/26', titulo: 'Rascunho', campanhas: [{}] },
    { id: 3, codigo: '003/26', titulo: 'Março', campanhas: [{ publicadaEm: '2026-04-05' }] },
    { id: 4, codigo: '004/26', titulo: 'Abril', campanhas: [{ publicadaEm: '2026-05-01' }] },
    { id: 5, codigo: '005/26', titulo: 'Fevereiro', campanhas: [{ publicadaEm: '2026-03-01' }] },
    { codigo: 'sem id', campanhas: [{ publicadaEm: '2026-06-01' }] },
    { id: 7, codigo: 'sem campanhas' },
  ]

  it('ids das mais recentes, sem as que não têm id', () => {
    expect(idsRecentesPublicadas(RODADAS)).toEqual([4, 3])
    expect(idsRecentesPublicadas(RODADAS, 5)).toEqual([4, 3, 5, 1])
  })

  it('junta a campanha de referência do acompanhamento de cada rodada', () => {
    const recentes = rodadasRecentesPublicadas(
      RODADAS,
      [
        {
          rodadaId: 4,
          campanhas: [
            { campanhaId: 40, qtdRespondentes: 9 },
            { campanhaId: 41, qtdRespondentes: 2 },
          ],
        },
      ],
      2,
    )

    expect(recentes).toEqual([
      {
        id: undefined,
        codigo: 'sem id',
        titulo: undefined,
        publicadaEm: '2026-06-01',
        campanha: undefined,
      },
      {
        id: 4,
        codigo: '004/26',
        titulo: 'Abril',
        publicadaEm: '2026-05-01',
        campanha: { campanhaId: 41, qtdRespondentes: 2 },
      },
    ])
  })

  it('a data de publicação da rodada é a da última campanha', () => {
    const [recente] = rodadasRecentesPublicadas([RODADAS[0] ?? {}], [], 1)

    expect(recente?.publicadaEm).toBe('2026-02-20')
  })
})
