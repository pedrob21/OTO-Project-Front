import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import { ErroApi } from './ErroApi'
import { EstadoVazio } from './EstadoVazio'
import { SegmentedControl } from './SegmentedControl'
import { Select } from './Select'
import { VariacaoBadge } from './VariacaoBadge'

describe('Select', () => {
  const opcoes = [
    { valor: '015', rotulo: 'Agosto de 2026' },
    { valor: '013', rotulo: 'Julho de 2026' },
  ]

  it('liga o rótulo ao campo e avisa a troca', async () => {
    const aoMudar = vi.fn()
    render(<Select rotulo="Campanha" valor="015" opcoes={opcoes} aoMudar={aoMudar} />)

    await userEvent.selectOptions(screen.getByLabelText('Campanha'), '013')

    expect(aoMudar).toHaveBeenCalledWith('013')
  })

  it('desativado não abre', () => {
    render(<Select rotulo="Campanha" valor="015" opcoes={opcoes} aoMudar={vi.fn()} disabled />)

    expect(screen.getByLabelText('Campanha')).toBeDisabled()
  })
})

describe('Button', () => {
  it('é type=button por padrão, para não enviar formulários', () => {
    render(<Button>Ver pendências</Button>)

    expect(screen.getByRole('button', { name: 'Ver pendências' })).toHaveAttribute('type', 'button')
  })

  it('desativado não dispara o clique', async () => {
    const aoClicar = vi.fn()
    render(
      <Button disabled onClick={aoClicar}>
        Lançar resposta
      </Button>,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(aoClicar).not.toHaveBeenCalled()
  })
})

describe('SegmentedControl', () => {
  function Exemplo() {
    const [valor, setValor] = useState<'grafico' | 'tabela'>('grafico')
    return (
      <SegmentedControl
        rotulo="Visualização"
        valor={valor}
        aoMudar={setValor}
        opcoes={[
          { valor: 'grafico', rotulo: 'Gráfico' },
          { valor: 'tabela', rotulo: 'Tabela' },
        ]}
      />
    )
  }

  it('troca a opção com clique', async () => {
    render(<Exemplo />)

    await userEvent.click(screen.getByRole('radio', { name: 'Tabela' }))

    expect(screen.getByRole('radio', { name: 'Tabela' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Gráfico' })).not.toBeChecked()
  })

  it('troca a opção com as setas do teclado', async () => {
    render(<Exemplo />)

    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'Gráfico' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: 'Tabela' })).toBeChecked()
  })

  it('tem nome acessível no grupo', () => {
    render(<Exemplo />)

    expect(screen.getByRole('group', { name: 'Visualização' })).toBeInTheDocument()
  })
})

describe('VariacaoBadge', () => {
  it('mostra alta com sinal e período', () => {
    const { container } = render(
      <VariacaoBadge valor={4.1} unidade="pontos" referencia="ago./2025" />,
    )

    expect(container).toHaveTextContent('+4,1 p.p.')
    expect(container).toHaveTextContent('vs ago./2025')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('mostra queda com sinal de menos', () => {
    const { container } = render(<VariacaoBadge valor={-2.5} unidade="percentual" />)

    expect(container).toHaveTextContent('−2,5%')
    expect(container.querySelector('.negativo')).toBeInTheDocument()
  })

  it('valor que arredonda para zero é neutro e sem seta', () => {
    const { container } = render(<VariacaoBadge valor={0.04} unidade="percentual" />)

    expect(container).toHaveTextContent('0,0%')
    expect(container.querySelector('.neutro')).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('sem valor, não mostra nada', () => {
    const { container } = render(
      <VariacaoBadge valor={null} unidade="pontos" referencia="ago./2025" />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe('Card', () => {
  it('título vira heading da seção', () => {
    render(<Card titulo="Faixas de ocupação" subtitulo="Meios de hospedagem por faixa" />)

    expect(screen.getByRole('heading', { name: 'Faixas de ocupação' })).toBeInTheDocument()
  })

  it('sem título, não cria cabeçalho', () => {
    render(<Card>conteúdo</Card>)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })
})

describe('estados', () => {
  it('Badge mostra o texto', () => {
    render(<Badge variante="publicada">Publicada</Badge>)

    expect(screen.getByText('Publicada')).toBeInTheDocument()
  })

  it('ErroApi avisa o leitor de tela e tenta de novo', async () => {
    const tentar = vi.fn()
    render(<ErroApi mensagem="Não foi possível carregar." aoTentarNovamente={tentar} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(tentar).toHaveBeenCalledOnce()
  })

  it('ErroApi sem ação não mostra botão', () => {
    render(<ErroApi mensagem="Erro." />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('EstadoVazio mostra título e ação', () => {
    render(<EstadoVazio titulo="Nenhuma campanha publicada" acao={<Button>Criar</Button>} />)

    expect(screen.getByText('Nenhuma campanha publicada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })
})
