import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as resultados from '@/api/resultados'
import { ErroRequisicao } from '@/api/erros'
import { BaixarCsvButton } from './BaixarCsvButton'

function abrir() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BaixarCsvButton campanhaId={42} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('BaixarCsvButton', () => {
  it('baixa a campanha e mostra o estado pendente enquanto espera', async () => {
    let concluir: () => void = () => {}
    const baixar = vi
      .spyOn(resultados, 'baixarResultadoCsv')
      .mockReturnValue(new Promise<void>((resolve) => (concluir = resolve)))
    abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Baixar CSV' }))

    expect(baixar).toHaveBeenCalledWith(42)
    expect(await screen.findByRole('button', { name: 'Baixando…' })).toBeDisabled()

    concluir()

    expect(await screen.findByRole('button', { name: 'Baixar CSV' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra o erro da API e permite tentar de novo', async () => {
    vi.spyOn(resultados, 'baixarResultadoCsv').mockRejectedValue(
      new ErroRequisicao(403, 'Resultado não publicado.'),
    )
    abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Baixar CSV' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível baixar o CSV.Resultado não publicado.',
    )
    expect(screen.getByRole('button', { name: 'Baixar CSV' })).toBeEnabled()
  })
})
