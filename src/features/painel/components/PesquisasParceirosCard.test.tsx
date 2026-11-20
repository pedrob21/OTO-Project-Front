import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { diasAte, textoDoPrazo } from '@/lib/datas'
import {
  acompanhamento,
  acompanhamentosRecentes,
  hojeDoDesign,
  pendenciasParceiro,
  referencias,
  rodadaAberta,
  rodadasRecentes,
} from '../fixtures'
import {
  campanhaDeReferencia,
  idsRecentesPublicadas,
  rodadaAbertaAtual,
  rodadasRecentesPublicadas,
  textoDasFaltantes,
} from '../pesquisas'
import { PendenciasParceiroCard } from './PendenciasParceiroCard'
import { PesquisasParceirosCard } from './PesquisasParceirosCard'

const tipos = referencias.tiposHospedagem ?? []

function abrirCartao(props: Partial<Parameters<typeof PesquisasParceirosCard>[0]> = {}) {
  return render(
    <PesquisasParceirosCard
      rodadaAberta={rodadaAberta}
      acompanhamento={acompanhamento}
      rodadas={rodadasRecentes}
      acompanhamentos={acompanhamentosRecentes}
      tipos={tipos}
      hoje={hojeDoDesign}
      {...props}
    />,
  )
}

describe('prazo', () => {
  it('conta os dias sem depender do fuso', () => {
    expect(diasAte('2026-10-09', '2026-10-05')).toBe(4)
    expect(diasAte('2026-11-01', '2026-10-31')).toBe(1)
    expect(diasAte('data errada', '2026-10-05')).toBeNull()
  })

  it.each([
    ['2026-10-09', 'Prazo de resposta: 09/10/2026 · faltam 4 dias'],
    ['2026-10-06', 'Prazo de resposta: 06/10/2026 · falta 1 dia'],
    ['2026-10-05', 'Prazo de resposta: 05/10/2026 · termina hoje'],
    ['2026-10-01', 'Prazo de resposta: 01/10/2026 · prazo encerrado'],
    [undefined, 'Sem prazo de resposta'],
  ])('%s vira "%s"', (prazo, texto) => {
    expect(textoDoPrazo(prazo, hojeDoDesign)).toBe(texto)
  })
})

describe('campanhaDeReferencia', () => {
  it('usa a campanha com menos respostas', () => {
    const campanhas = [
      { campanhaId: 1, qtdRespondentes: 50 },
      { campanhaId: 2, qtdRespondentes: 41 },
    ]

    expect(campanhaDeReferencia({ campanhas })?.campanhaId).toBe(2)
    expect(campanhaDeReferencia(undefined)).toBeUndefined()
  })
})

describe('textoDasFaltantes', () => {
  const faltando = (...codigos: string[]) =>
    codigos.map((tipoHospedagemCodigo) => ({ tipoHospedagemCodigo, respondeu: false }))

  it('monta o texto do design', () => {
    const campanha = campanhaDeReferencia(acompanhamento)

    expect(textoDasFaltantes(campanha ?? {}, tipos)).toBe(
      'Faltam 31 respostas: 19 pousadas, 8 hotéis, 2 resorts e 2 flats.',
    )
  })

  it('usa o singular', () => {
    const campanha = { qtdMh: 2, qtdRespondentes: 1, estabelecimentos: faltando('HOTEL_FAZENDA') }

    expect(textoDasFaltantes(campanha, tipos)).toBe('Falta 1 resposta: 1 hotel fazenda.')
  })

  it('ignora quem respondeu e aceita lista vazia', () => {
    const estabelecimentos = [
      ...faltando('HOTEL'),
      { tipoHospedagemCodigo: 'RESORT', respondeu: true },
    ]

    expect(textoDasFaltantes({ qtdMh: 3, qtdRespondentes: 2, estabelecimentos }, tipos)).toBe(
      'Falta 1 resposta: 1 hotel.',
    )
    expect(textoDasFaltantes({ qtdMh: 3, qtdRespondentes: 1 }, tipos)).toBe('Faltam 2 respostas.')
    expect(textoDasFaltantes({ qtdMh: 3, qtdRespondentes: 3 }, tipos)).toMatch(/Todos/)
    expect(textoDasFaltantes({ qtdMh: 0, qtdRespondentes: 0 }, tipos)).toBe(
      'Ainda não há meios de hospedagem cadastrados para responder.',
    )
  })
})

describe('rodadaAbertaAtual', () => {
  it('com mais de uma aberta, fica com a de prazo mais próximo', () => {
    const rodadas = [
      { id: 1, status: 'ENCERRADA' as const, prazoResposta: '2026-01-01' },
      { id: 2, status: 'ABERTA' as const, prazoResposta: '2026-12-10' },
      { id: 3, status: 'ABERTA' as const, prazoResposta: '2026-11-30' },
      { id: 4, status: 'ABERTA' as const },
    ]

    expect(rodadaAbertaAtual(rodadas)?.id).toBe(3)
    expect(rodadaAbertaAtual([])).toBeUndefined()
  })
})

describe('rodadasRecentesPublicadas', () => {
  it('fica com as três últimas publicadas, da mais recente para a mais antiga', () => {
    const antiga = {
      id: 9,
      codigo: '009/26',
      campanhas: [{ publicadaEm: '2026-07-01T12:00:00Z' }],
    }
    const semPublicar = { id: 16, codigo: '016/26', campanhas: [{ publicada: false }] }

    const recentes = rodadasRecentesPublicadas(
      [antiga, semPublicar, ...rodadasRecentes],
      acompanhamentosRecentes,
    )

    expect(recentes.map((rodada) => rodada.codigo)).toEqual(['015/26', '013/26', '011/26'])
    expect(recentes[0]?.campanha?.qtdRespondentes).toBe(58)
    expect(idsRecentesPublicadas([antiga, semPublicar, ...rodadasRecentes])).toEqual([15, 13, 11])
  })
})

describe('PesquisasParceirosCard', () => {
  it('mostra a rodada aberta como no design', () => {
    abrirCartao()

    expect(screen.getByText('Rodada 017/26')).toBeInTheDocument()
    expect(screen.getByText(/faltam 4 dias/)).toBeInTheDocument()
    expect(screen.getByText('41 de 72')).toBeInTheDocument()
    expect(screen.getByText('74,2%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Leitos representados' })).toHaveAttribute(
      'aria-valuenow',
      '74.2',
    )
  })

  it('mostra as rodadas recentes', () => {
    abrirCartao()

    const [primeira] = screen.getAllByRole('listitem')
    expect(within(primeira as HTMLElement).getByText('015/26')).toBeInTheDocument()
    expect(within(primeira as HTMLElement).getByText('Publicada em 18/09/2026')).toBeInTheDocument()
    expect(within(primeira as HTMLElement).getByText('58 de 72')).toBeInTheDocument()
  })

  it('as ações sem página ficam desativadas', () => {
    abrirCartao()

    for (const nome of ['Acompanhamento completo', 'Ver pendências', 'Lançar resposta']) {
      expect(screen.getByRole('button', { name: nome })).toBeDisabled()
    }
  })

  it('sem rodada aberta e sem publicadas, mostra os estados vazios', () => {
    abrirCartao({ rodadaAberta: undefined, acompanhamento: undefined, rodadas: [] })

    expect(screen.getByText('Nenhuma rodada aberta agora')).toBeInTheDocument()
    expect(screen.getByText('Ainda não há rodadas publicadas')).toBeInTheDocument()
  })

  it('rodada aberta sem acompanhamento não quebra', () => {
    abrirCartao({ acompanhamento: undefined })

    expect(screen.getByText('Rodada 017/26')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

describe('PendenciasParceiroCard', () => {
  it('coloca as pendentes primeiro e mostra a situação', () => {
    render(
      <PendenciasParceiroCard pendencias={pendenciasParceiro.toReversed()} hoje={hojeDoDesign} />,
    )

    const [primeira, segunda] = screen.getAllByRole('listitem')
    expect(within(primeira as HTMLElement).getByText('Pendente')).toBeInTheDocument()
    expect(within(segunda as HTMLElement).getByText('Respondida')).toBeInTheDocument()
  })

  it('sem pesquisas, mostra o estado vazio', () => {
    render(<PendenciasParceiroCard pendencias={[]} hoje={hojeDoDesign} />)

    expect(screen.getByText('Nenhuma pesquisa aberta agora')).toBeInTheDocument()
  })
})
