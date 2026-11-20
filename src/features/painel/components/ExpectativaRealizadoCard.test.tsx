import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dominioDeFeriados, linhasDeFeriados, posicaoNoDominio } from '../feriados'
import { feriadosExpectativa, feriadosRealizado } from '../fixtures'
import { ExpectativaRealizadoCard } from './ExpectativaRealizadoCard'

function abrir(expectativa = feriadosExpectativa, realizado = feriadosRealizado, ano = 2026) {
  return render(
    <ExpectativaRealizadoCard expectativa={expectativa} realizado={realizado} ano={ano} />,
  )
}

function feriado(codigo: string, nome: string, ano: number, taxaOcupacao: number) {
  return { feriadoCodigo: codigo, nome, anos: [{ ano, taxaOcupacao }] }
}

describe('linhasDeFeriados', () => {
  it('junta as modalidades e calcula a diferença', () => {
    const [carnaval] = linhasDeFeriados(feriadosExpectativa, feriadosRealizado, 2026)

    expect(carnaval).toEqual({
      codigo: 'CARNAVAL',
      nome: 'Carnaval',
      expectativa: 82,
      realizado: 87,
      diferenca: 5,
    })
  })

  it('mostra FEFOL em vez do nome cadastrado', () => {
    const linhas = linhasDeFeriados(feriadosExpectativa, feriadosRealizado, 2026)

    expect(linhas.find((linha) => linha.codigo === 'FEFOL')?.nome).toBe('FEFOL')
  })

  it('feriado com só um dos valores continua, sem diferença', () => {
    const [linha] = linhasDeFeriados([], [feriado('PASCOA', 'Páscoa', 2026, 71)], 2026)

    expect(linha).toMatchObject({ expectativa: null, realizado: 71, diferenca: null })
  })

  it('feriado sem valor no ano fica de fora', () => {
    expect(linhasDeFeriados([feriado('PASCOA', 'Páscoa', 2025, 71)], [], 2026)).toEqual([])
  })
})

describe('dominioDeFeriados', () => {
  it('vai de 50 a 100, como no design', () => {
    const linhas = linhasDeFeriados(feriadosExpectativa, feriadosRealizado, 2026)

    expect(dominioDeFeriados(linhas).marcas).toEqual([50, 60, 70, 80, 90, 100])
  })

  it('desce para caber uma taxa baixa, sem sair do gráfico', () => {
    const dominio = dominioDeFeriados(
      linhasDeFeriados([], [feriado('PASCOA', 'Páscoa', 2026, 34)], 2026),
    )

    expect(dominio.inicio).toBe(30)
    expect(posicaoNoDominio(34, dominio)).toBeGreaterThan(0)
  })

  it('posiciona 50 no início, 100 no fim e 82 no meio', () => {
    const dominio = dominioDeFeriados([])

    expect(posicaoNoDominio(50, dominio)).toBe(0)
    expect(posicaoNoDominio(100, dominio)).toBe(100)
    expect(posicaoNoDominio(82, dominio)).toBe(64)
  })
})

describe('ExpectativaRealizadoCard', () => {
  it('mostra os textos do design', () => {
    abrir()

    expect(screen.getByRole('heading', { name: 'Expectativa × realizado' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Taxa de ocupação nos feriados de 2026: previsão dos meios de hospedagem antes da data e resultado apurado depois',
      ),
    ).toBeInTheDocument()
    for (const nome of [
      'Carnaval',
      'Páscoa',
      'Tiradentes',
      '1º de Maio',
      'Corpus Christi',
      'FEFOL',
    ]) {
      expect(screen.getByText(nome)).toBeInTheDocument()
    }
  })

  it('a diferença tem a cor do sinal e também o sinal em texto', () => {
    const { container } = abrir()

    const diferencas = [...container.querySelectorAll('.diferenca')]
    expect(diferencas.map((item) => item.textContent?.replace(' ', ' '))).toEqual([
      '+5 p.p.',
      '−5 p.p.',
      '+4 p.p.',
      '−4 p.p.',
      '+4 p.p.',
      '+3 p.p.',
    ])
    expect(diferencas[0]).toHaveClass('positivo')
    expect(diferencas[1]).toHaveClass('negativo')
  })

  it('leitores de tela recebem os valores em texto', () => {
    abrir()

    expect(screen.getByText('Expectativa 82%, realizado 87%')).toBeInTheDocument()
  })

  it('valores iguais não têm sinal e os dois pontos aparecem', () => {
    const { container } = abrir(
      [feriado('PASCOA', 'Páscoa', 2026, 70)],
      [feriado('PASCOA', 'Páscoa', 2026, 70)],
    )

    expect(container.querySelector('.diferenca')).toHaveClass('neutro')
    expect(container.querySelectorAll('.linha .ponto')).toHaveLength(2)
  })

  it('sem um dos valores, mostra travessão e um ponto só', () => {
    const { container } = abrir([], [feriado('PASCOA', 'Páscoa', 2026, 71)])

    expect(container.querySelectorAll('.linha .ponto')).toHaveLength(1)
    expect(container.querySelector('.conexao')).not.toBeInTheDocument()
    expect(container.querySelector('.diferenca')).not.toBeInTheDocument()
    expect(screen.getByText('Expectativa —, realizado 71%')).toBeInTheDocument()
  })

  it('sem dados no ano, orienta em vez de mostrar o gráfico', () => {
    abrir([], [])

    expect(screen.getByText('Ainda não há feriados publicados neste ano')).toBeInTheDocument()
    expect(screen.queryByText('Expectativa')).not.toBeInTheDocument()
  })
})
