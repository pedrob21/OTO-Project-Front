import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { GraficoLinhasMensal } from '@/components/charts/GraficoLinhasMensal'
import { serieMensal } from '../fixtures'
import { seriesDeOcupacao, textoDosAnos } from '../ocupacaoMensal'
import { OcupacaoMensalCard } from './OcupacaoMensalCard'

function grafico() {
  return screen.getByRole('group', { name: /Use as setas/ })
}

describe('seriesDeOcupacao', () => {
  it('ordena do ano mais novo para o mais antigo', () => {
    const series = seriesDeOcupacao({
      anos: [
        { ano: 2024, meses: [] },
        { ano: 2026, meses: [] },
        { ano: 2025, meses: [] },
      ],
    })

    expect(series.map((serie) => serie.nome)).toEqual(['2026', '2025', '2024'])
    expect(textoDosAnos(series)).toBe('2024 a 2026')
  })

  it('a cor segue a posição do ano, e só entram três anos', () => {
    const series = seriesDeOcupacao({
      anos: [2023, 2024, 2025, 2026].map((ano) => ({ ano, meses: [] })),
    })

    expect(series).toHaveLength(3)
    expect(series[0]?.cor).toBe('var(--cor-serie-atual)')
  })

  it('mês ausente vira null, não zero', () => {
    const [serie] = seriesDeOcupacao({
      anos: [{ ano: 2026, meses: [{ mes: 3, valor: 50 }, { mes: 4 }] }],
    })

    expect(serie?.valores.slice(0, 5)).toEqual([null, null, 50, null, null])
  })
})

describe('OcupacaoMensalCard', () => {
  it('mostra título, subtítulo, legenda e fonte do design', () => {
    render(<OcupacaoMensalCard serie={serieMensal} />)

    expect(screen.getByRole('heading', { name: 'Taxa de ocupação mensal' })).toBeInTheDocument()
    expect(
      screen.getByText('Consolidado mensal dos meios de hospedagem regulares, 2024 a 2026'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '2026',
      '2025',
      '2024',
    ])
    expect(screen.getByText(/^Fonte:/)).toBeInTheDocument()
  })

  it('rotula o último ponto com dado', () => {
    render(<OcupacaoMensalCard serie={serieMensal} />)

    expect(screen.getByText('62,8%')).toBeInTheDocument()
    expect(screen.getByText('ago.')).toBeInTheDocument()
  })

  it('a tabela mostra os mesmos valores e o traço para mês sem dado', async () => {
    render(<OcupacaoMensalCard serie={serieMensal} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Tabela' }))

    const agosto = screen.getByRole('row', { name: /agosto/i })
    expect(within(agosto).getByText('62,8%')).toBeInTheDocument()
    expect(within(agosto).getByText('58,7%')).toBeInTheDocument()
    const setembro = screen.getByRole('row', { name: /setembro/i })
    expect(within(setembro).getByText('—')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Use as setas/ })).not.toBeInTheDocument()
  })

  it('sem dados, orienta em vez de mostrar um gráfico vazio', () => {
    render(<OcupacaoMensalCard serie={{ anos: [] }} />)

    expect(screen.getByText('Ainda não há taxas mensais publicadas')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Use as setas/ })).not.toBeInTheDocument()
  })
})

describe('GraficoLinhasMensal', () => {
  it('mês sem dado interrompe a linha em vez de cair a zero', () => {
    const valores = Array<number | null>(12).fill(50)
    valores[5] = null
    const { container } = render(
      <GraficoLinhasMensal rotulo="Teste" series={[{ nome: 'A', valores, cor: 'red' }]} />,
    )

    const caminho = container.querySelector('.linha')?.getAttribute('d') ?? ''
    expect(caminho.match(/M/g)).toHaveLength(2)
    expect(caminho).not.toContain(',248.5')
  })

  it('pelo teclado, mostra e percorre a leitura dos meses', async () => {
    render(<OcupacaoMensalCard serie={serieMensal} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    grafico().focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('status')).toHaveTextContent('julho')
    expect(screen.getByRole('status')).toHaveTextContent('85,1%')

    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('status')).toHaveTextContent('setembro')
    expect(screen.getByRole('status')).toHaveTextContent('—')
    expect(screen.getByRole('status')).toHaveTextContent('49,5%')

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
