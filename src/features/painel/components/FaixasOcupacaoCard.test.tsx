import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { resultado } from '../fixtures'
import { notaDeConcentracao } from '../faixas'
import { FaixasOcupacaoCard } from './FaixasOcupacaoCard'

function linhas() {
  return screen.getAllByRole('listitem')
}

describe('FaixasOcupacaoCard', () => {
  it('lista da faixa mais alta para a mais baixa, com os intervalos', () => {
    render(<FaixasOcupacaoCard resultado={resultado} />)

    expect(screen.getByRole('heading', { name: 'Faixas de ocupação' })).toBeInTheDocument()
    expect(screen.getByText('Meios de hospedagem por faixa em agosto de 2026')).toBeInTheDocument()
    expect(linhas().map((linha) => linha.textContent)).toEqual([
      'Excelente81 a 100%8',
      'Ótima61 a 80%21',
      'Boa41 a 60%19',
      'Regular21 a 40%8',
      'Ruimaté 20%2',
    ])
  })

  it('a soma das barras é o total de respondentes', () => {
    render(<FaixasOcupacaoCard resultado={resultado} />)

    const soma = linhas().reduce((total, linha) => {
      return total + Number(linha.querySelector('.quantidade')?.textContent)
    }, 0)

    expect(soma).toBe(resultado.qtdMhRespondentes)
  })

  it('as barras são proporcionais à quantidade', () => {
    const { container } = render(<FaixasOcupacaoCard resultado={resultado} />)

    const larguras = [...container.querySelectorAll<HTMLElement>('.barra')].map((barra) =>
      parseFloat(barra.style.width),
    )

    expect(larguras[1]).toBe(85)
    expect(larguras[0]).toBeCloseTo((8 / 21) * 85)
    expect(larguras[4]).toBeCloseTo((2 / 21) * 85)
  })

  it('todas as faixas zeradas não quebram as barras', () => {
    const { container } = render(
      <FaixasOcupacaoCard
        resultado={{
          ...resultado,
          distribuicaoFaixas: resultado.distribuicaoFaixas?.map((faixa) => ({
            ...faixa,
            qtdMh: 0,
          })),
        }}
      />,
    )

    for (const barra of container.querySelectorAll<HTMLElement>('.barra')) {
      expect(barra.style.width).toBe('0%')
    }
  })

  it('sem distribuição, orienta em vez de mostrar barras', () => {
    render(<FaixasOcupacaoCard resultado={{ ...resultado, distribuicaoFaixas: [] }} />)

    expect(screen.getByText('Ainda não há respostas para distribuir')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})

describe('notaDeConcentracao', () => {
  it('reproduz o texto do design, com o percentual calculado', () => {
    expect(notaDeConcentracao(resultado.porTipo ?? [])).toBe(
      'Os resorts concentram 78% das UH da cidade e por isso pesam mais na taxa geral.',
    )
  })

  it('usa o artigo e o plural de cada tipo', () => {
    expect(
      notaDeConcentracao([
        { tipoHospedagemCodigo: 'POUSADA', nome: 'Pousada', qtdUh: 60 },
        { tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel', qtdUh: 40 },
      ]),
    ).toBe('As pousadas concentram 60% das UH da cidade e por isso pesam mais na taxa geral.')
    expect(
      notaDeConcentracao([{ tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel', qtdUh: 40 }]),
    ).toContain('Os hotéis concentram')
  })

  it('tipo cadastrado depois não tem plural conhecido', () => {
    expect(notaDeConcentracao([{ tipoHospedagemCodigo: 'CHALE', nome: 'Chalé', qtdUh: 10 }])).toBe(
      'O tipo chalé concentra 100% das UH da cidade e por isso pesa mais na taxa geral.',
    )
  })

  it('sem UH informadas, não há nota', () => {
    expect(notaDeConcentracao([])).toBeNull()
    expect(notaDeConcentracao([{ tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel' }])).toBeNull()
  })
})
