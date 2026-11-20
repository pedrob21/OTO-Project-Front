import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { comparativo, referencias, resultado } from '../fixtures'
import { TaxaOcupacaoDestaque } from './TaxaOcupacaoDestaque'

const FAIXAS = referencias.faixasOcupacao ?? []

describe('TaxaOcupacaoDestaque', () => {
  it('mostra os textos do design', () => {
    render(<TaxaOcupacaoDestaque resultado={resultado} faixas={FAIXAS} comparativo={comparativo} />)

    expect(
      screen.getByRole('heading', { name: 'Taxa de ocupação hoteleira em agosto de 2026' }),
    ).toBeInTheDocument()
    expect(screen.getByText('62,8%')).toBeInTheDocument()
    expect(screen.getByText('Faixa ótima')).toBeInTheDocument()
    expect(screen.getByText(/\+4,1/)).toBeInTheDocument()
    expect(screen.getByText('vs ago./2025')).toBeInTheDocument()
    expect(
      screen.getByText('Média ponderada pelas UH dos 58 meios de hospedagem que responderam.'),
    ).toBeInTheDocument()
  })

  it('marca a faixa atual também para leitores de tela', () => {
    render(<TaxaOcupacaoDestaque resultado={resultado} faixas={FAIXAS} comparativo={comparativo} />)

    const atual = screen
      .getAllByRole('listitem')
      .filter((item) => item.getAttribute('aria-current') === 'true')

    expect(atual).toHaveLength(1)
    expect(within(atual[0] as HTMLElement).getByText('61 a 80%')).toBeInTheDocument()
  })

  it('coloca o marcador na posição da taxa', () => {
    const { container } = render(<TaxaOcupacaoDestaque resultado={resultado} faixas={FAIXAS} />)

    expect(container.querySelector('.marcador')).toHaveStyle({ left: '62.8%' })
  })

  it('sem comparação, não mostra a variação', () => {
    render(<TaxaOcupacaoDestaque resultado={resultado} faixas={FAIXAS} />)

    expect(screen.queryByText(/p\.p\./)).not.toBeInTheDocument()
  })

  it('sem taxa, mostra travessão e nenhum marcador', () => {
    const { container } = render(
      <TaxaOcupacaoDestaque
        resultado={{ ...resultado, taxaOcupacao: undefined, faixa: undefined }}
        faixas={FAIXAS}
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/^Faixa /)).not.toBeInTheDocument()
    expect(container.querySelector('.marcador')).not.toBeInTheDocument()
  })
})
