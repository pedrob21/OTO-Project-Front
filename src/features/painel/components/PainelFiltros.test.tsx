import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PainelFiltros } from './PainelFiltros'

function abrir(caminho = '/') {
  const router = createMemoryRouter([{ path: '/', element: <PainelFiltros /> }], {
    initialEntries: [caminho],
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('PainelFiltros', () => {
  it('sem nada na URL, usa a primeira opção de cada filtro', () => {
    abrir()

    expect(screen.getByLabelText('Campanha')).toHaveDisplayValue(
      'Agosto de 2026 • consolidada (015/26)',
    )
    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Agosto de 2025')
    expect(screen.getByLabelText('Tipo de hospedagem')).toHaveDisplayValue('Todos os tipos')
  })

  it('trocar um filtro muda a URL e mantém os outros parâmetros', async () => {
    const router = abrir('/?tipo=HOTEL')

    await userEvent.selectOptions(screen.getByLabelText('Comparar com'), '2024')

    const busca = new URLSearchParams(router.state.location.search)
    expect(busca.get('comparar')).toBe('2024')
    expect(busca.get('tipo')).toBe('HOTEL')
    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Agosto de 2024')
  })

  it('abrir o link de novo mantém a seleção', () => {
    abrir('/?campanha=13&comparar=2024&tipo=POUSADA')

    expect(screen.getByLabelText('Campanha')).toHaveDisplayValue(
      'Julho de 2026 • consolidada (013/26)',
    )
    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Julho de 2024')
    expect(screen.getByLabelText('Tipo de hospedagem')).toHaveDisplayValue('Pousada')
  })

  it('a comparação acompanha o mês da campanha', async () => {
    abrir()

    await userEvent.selectOptions(screen.getByLabelText('Campanha'), '13')

    expect(screen.getByLabelText('Comparar com')).toHaveDisplayValue('Julho de 2025')
  })

  it('valor inválido na URL cai na primeira opção', () => {
    abrir('/?campanha=999&tipo=NAO_EXISTE')

    expect(screen.getByLabelText('Campanha')).toHaveDisplayValue(
      'Agosto de 2026 • consolidada (015/26)',
    )
    expect(screen.getByLabelText('Tipo de hospedagem')).toHaveDisplayValue('Todos os tipos')
  })
})
