import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { comparativo, resultado } from '../fixtures'
import { IndicadoresResumo } from './IndicadoresResumo'

describe('IndicadoresResumo', () => {
  it('mostra os valores do design', () => {
    render(<IndicadoresResumo resultado={resultado} comparativo={comparativo} />)

    for (const rotulo of [
      'Turistas estimados',
      'Diária média',
      'Receita em hospedagem',
      'Taxa de resposta',
    ]) {
      expect(screen.getByRole('heading', { name: rotulo })).toBeInTheDocument()
    }
    expect(screen.getByText('496,7 mil')).toBeInTheDocument()
    expect(screen.getByText('16,0 mil por dia em agosto')).toBeInTheDocument()
    expect(screen.getByText('R$ 765')).toBeInTheDocument()
    expect(screen.getByText('R$ 89,0 mi')).toBeInTheDocument()
    expect(screen.getByText('80,6%')).toBeInTheDocument()
    expect(screen.getByText('58 de 72 meios de hospedagem')).toBeInTheDocument()
    expect(screen.getByText('91,4%')).toBeInTheDocument()
  })

  it('mostra as três variações com o período comparado', () => {
    render(<IndicadoresResumo resultado={resultado} comparativo={comparativo} />)

    expect(screen.getByText('+6,1%')).toBeInTheDocument()
    expect(screen.getByText('+4,6%')).toBeInTheDocument()
    expect(screen.getByText('+10,9%')).toBeInTheDocument()
    expect(screen.getAllByText('vs ago./2025')).toHaveLength(3)
  })

  it('a barra mostra os leitos representados', () => {
    render(<IndicadoresResumo resultado={resultado} comparativo={comparativo} />)

    expect(screen.getByRole('progressbar', { name: 'Leitos representados' })).toHaveAttribute(
      'aria-valuenow',
      '91.4',
    )
  })

  it('sem comparação, não mostra variações', () => {
    render(<IndicadoresResumo resultado={resultado} />)

    expect(screen.queryByText(/^vs /)).not.toBeInTheDocument()
  })

  it('feriado não fala em mês', () => {
    render(
      <IndicadoresResumo
        resultado={{
          ...resultado,
          campanha: { tipoPeriodo: 'FERIADO', nome: 'Carnaval', periodoInicio: '2026-02-14' },
        }}
      />,
    )

    expect(screen.getByText('16,0 mil por dia no período')).toBeInTheDocument()
  })

  it('sem dados, mostra travessão', () => {
    render(<IndicadoresResumo resultado={{}} />)

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  })
})
