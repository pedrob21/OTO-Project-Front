import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parametrosVigentes, resultado, rhcVigente } from '../fixtures'
import { FluxoTuristasCard } from './FluxoTuristasCard'

function abrir(sobrescrever = {}) {
  return render(
    <FluxoTuristasCard
      resultado={resultado}
      rhc={rhcVigente}
      parametros={parametrosVigentes}
      {...sobrescrever}
    />,
  )
}

describe('FluxoTuristasCard', () => {
  it('mostra os textos do design', () => {
    abrir()

    expect(screen.getByRole('heading', { name: 'Fluxo estimado de turistas' })).toBeInTheDocument()
    expect(screen.getByText('Agosto de 2026 · 31 diárias')).toBeInTheDocument()
    expect(screen.getByText('496,7 mil')).toBeInTheDocument()
    expect(screen.getByText(/turistas no período, 16,0 mil por dia/)).toBeInTheDocument()
    expect(screen.getByText('72 estabelecimentos regulares')).toBeInTheDocument()
    expect(screen.getByText('478 registros e 5.116 leitos')).toBeInTheDocument()
    expect(screen.getByText('Visitantes que não pernoitam')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Day use estimado em 15,15% do total, conforme a Pesquisa de Demanda Turística 2024.',
      ),
    ).toBeInTheDocument()
  })

  it('cada origem tem valor e percentual, sem depender da cor', () => {
    abrir()

    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent?.replaceAll('\u00a0', ' ')),
    ).toEqual([
      'Meios de hospedagem72 estabelecimentos regulares365,6 mil73,6%',
      'Hospedagem caseira (RHC)478 registros e 5.116 leitos55,8 mil11,2%',
      'Day useVisitantes que não pernoitam75,2 mil15,2%',
    ])
    expect(
      screen.getByRole('img', {
        name: 'Meios de hospedagem: 73,6%, Hospedagem caseira (RHC): 11,2%, Day use: 15,2%',
      }),
    ).toBeInTheDocument()
  })

  it('os segmentos são proporcionais e somam o total', () => {
    const { container } = abrir()

    const larguras = [...container.querySelectorAll<HTMLElement>('.segmento')].map((segmento) =>
      Number(segmento.style.flexGrow),
    )

    expect(larguras).toEqual([resultado.fluxoMh, resultado.fluxoRhc, resultado.fluxoDayUse])
    expect(larguras.reduce((soma, largura) => soma + largura, 0)).toBe(resultado.fluxoTotal)
  })

  it('origem zerada fica na legenda, mas não vira segmento', () => {
    const { container } = abrir({
      resultado: { ...resultado, fluxoRhc: 0, fluxoTotal: 440_865 },
    })

    expect(container.querySelectorAll('.segmento')).toHaveLength(2)
    expect(screen.getByText('Hospedagem caseira (RHC)')).toBeInTheDocument()
  })

  it('sem acesso ao RHC, a origem fica sem o detalhe', () => {
    abrir({ rhc: undefined })

    expect(screen.queryByText(/registros e/)).not.toBeInTheDocument()
    expect(screen.getByText('Hospedagem caseira (RHC)')).toBeInTheDocument()
  })

  it('sem parâmetros, não mostra a nota', () => {
    abrir({ parametros: undefined })

    expect(screen.queryByText(/Day use estimado/)).not.toBeInTheDocument()
  })

  it('sem fluxo, orienta em vez de mostrar a barra', () => {
    abrir({ resultado: { campanha: resultado.campanha } })

    expect(screen.getByText('Ainda não há fluxo estimado para este período')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
