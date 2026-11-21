import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Badge } from './Badge'
import { Button } from './Button'
import { Card } from './Card'
import { Dialogo } from './Dialogo'
import { ErroApi } from './ErroApi'
import { EstadoVazio } from './EstadoVazio'
import { SegmentedControl } from './SegmentedControl'
import { Select } from './Select'
import { Tabela } from './Tabela'
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

describe('Tabela', () => {
  type Linha = { id: number; nome: string; uh: number }
  const colunas = [
    { titulo: 'Nome', celula: (linha: Linha) => linha.nome },
    { titulo: 'UH', celula: (linha: Linha) => linha.uh, numerica: true },
  ]
  const linhas = [
    { id: 1, nome: 'Hotel Exemplo', uh: 40 },
    { id: 2, nome: 'Pousada Sol', uh: 12 },
  ]

  it('tem legenda, cabeçalhos de coluna e a primeira célula como cabeçalho da linha', () => {
    render(
      <Tabela
        legenda="Estabelecimentos"
        colunas={colunas}
        linhas={linhas}
        chave={(linha) => linha.id}
        vazio={{ titulo: 'Nada' }}
      />,
    )

    const tabela = screen.getByRole('table', { name: 'Estabelecimentos' })
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Nome', 'UH'])
    expect(within(tabela).getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col')
    expect(within(tabela).getByRole('rowheader', { name: 'Pousada Sol' })).toHaveAttribute(
      'scope',
      'row',
    )
    expect(screen.getByRole('cell', { name: '40' })).toHaveClass('numero')
  })

  it('com ações, ganha a coluna Ações em cada linha', async () => {
    const aoEditar = vi.fn()
    render(
      <Tabela
        legenda="Estabelecimentos"
        colunas={colunas}
        linhas={linhas}
        chave={(linha) => linha.id}
        vazio={{ titulo: 'Nada' }}
        acoes={(linha) => <Button onClick={() => aoEditar(linha.id)}>Editar</Button>}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
    const linha = screen.getByRole('row', { name: /Pousada Sol/ })
    await userEvent.click(within(linha).getByRole('button', { name: 'Editar' }))

    expect(aoEditar).toHaveBeenCalledWith(2)
  })

  it('sem linhas, mostra o estado vazio no lugar da tabela', () => {
    render(
      <Tabela
        legenda="Estabelecimentos"
        colunas={colunas}
        linhas={[]}
        chave={(linha) => linha.id}
        vazio={{ titulo: 'Nenhum estabelecimento', descricao: 'Cadastre o primeiro.' }}
      />,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Nenhum estabelecimento')).toBeInTheDocument()
    expect(screen.getByText('Cadastre o primeiro.')).toBeInTheDocument()
  })
})

describe('Dialogo', () => {
  function Exemplo({ aoFechar = vi.fn() }: { aoFechar?: () => void }) {
    const [aberto, setAberto] = useState(false)
    const fechar = () => {
      aoFechar()
      setAberto(false)
    }
    return (
      <>
        <Button onClick={() => setAberto(true)}>Abrir</Button>
        {aberto && (
          <Dialogo titulo="Nova faixa" descricao="Faixas de ocupação" aoFechar={fechar}>
            <label>
              Nome
              <input />
            </label>
            <Button>Salvar</Button>
          </Dialogo>
        )}
      </>
    )
  }

  it('abre como modal com nome e descrição, e o foco vai ao primeiro campo', async () => {
    render(<Exemplo />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialogo = screen.getByRole('dialog', { name: 'Nova faixa' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAccessibleDescription('Faixas de ocupação')
    expect(within(dialogo).getByLabelText('Nome')).toHaveFocus()
  })

  it('Esc fecha e devolve o foco a quem abriu', async () => {
    const aoFechar = vi.fn()
    render(<Exemplo aoFechar={aoFechar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.keyboard('{Escape}')

    expect(aoFechar).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus()
  })

  it('o botão Fechar também fecha', async () => {
    render(<Exemplo />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Tab não sai do diálogo', async () => {
    render(<Exemplo />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus()
  })
})
