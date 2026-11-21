import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlocoDoPainel } from './BlocoDoPainel'

const pronta = { isError: false, isPending: false } as never

describe('BlocoDoPainel', () => {
  it('pronto, mostra o conteúdo e, se pedido, a nota de todos os tipos', () => {
    const { rerender } = render(
      <BlocoDoPainel titulo="Bloco" mensagemDeErro="erro" consultas={[pronta]}>
        <p>conteúdo</p>
      </BlocoDoPainel>,
    )
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    expect(screen.queryByText(/Todos os tipos de hospedagem/)).not.toBeInTheDocument()

    rerender(
      <BlocoDoPainel titulo="Bloco" mensagemDeErro="erro" consultas={[pronta]} comNotaDeTipo>
        <p>conteúdo</p>
      </BlocoDoPainel>,
    )
    expect(screen.getByText(/Todos os tipos de hospedagem/)).toBeInTheDocument()
  })

  it('carregando ou com erro, não mostra a nota', () => {
    render(
      <BlocoDoPainel
        titulo="Bloco"
        mensagemDeErro="erro"
        consultas={[{ isError: false, isPending: true } as never]}
        comNotaDeTipo
      >
        <p>conteúdo</p>
      </BlocoDoPainel>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText(/Todos os tipos de hospedagem/)).not.toBeInTheDocument()
  })
})
