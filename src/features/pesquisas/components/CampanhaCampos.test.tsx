import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { type CampanhaRascunho, novaCampanha } from '../campanhas'
import { type AcaoPesquisa, estadoInicial, reduzirPesquisa } from '../estado'
import { CampanhaCampos } from './CampanhaCampos'

const HOJE = '2026-11-16'
const FERIADOS = [
  { codigo: 'CARNAVAL', nome: 'Carnaval' },
  { codigo: 'PASCOA', nome: 'Páscoa' },
]

type Opcoes = Partial<{
  campanha: Partial<CampanhaRascunho>
  carregandoFeriados: boolean
  repetida: boolean
  mostrarErros: boolean
  incluida: boolean
  podeRemover: boolean
  erroApi: string
  focar: boolean
  aoDespachar: (acao: AcaoPesquisa) => void
}>

/** Renderiza a campanha com o mesmo reducer da página, para as mudanças aparecerem na tela. */
function Campanha({ campanha = {}, aoDespachar = () => {}, ...props }: Opcoes) {
  const [estado, despachar] = useReducer(reduzirPesquisa, HOJE, (hoje) => ({
    ...estadoInicial(hoje),
    campanhas: [{ ...novaCampanha(1, hoje), ...campanha }],
  }))
  const atual = estado.campanhas[0]
  if (!atual) return <p>removida</p>

  return (
    <ul>
      <CampanhaCampos
        campanha={atual}
        posicao={1}
        feriados={FERIADOS}
        carregandoFeriados={props.carregandoFeriados ?? false}
        repetida={props.repetida ?? false}
        mostrarErros={props.mostrarErros ?? false}
        incluida={props.incluida ?? false}
        podeRemover={props.podeRemover ?? false}
        erroApi={props.erroApi}
        focar={props.focar ?? false}
        anoAtual={2026}
        despachar={(acao) => {
          aoDespachar(acao)
          despachar(acao)
        }}
      />
    </ul>
  )
}

const FERIADO: Partial<CampanhaRascunho> = { modalidade: 'EXPECTATIVA', tipoPeriodo: 'FERIADO' }

describe('CampanhaCampos', () => {
  it('trocar para feriado mostra feriado, primeiro e último dia', async () => {
    render(<Campanha />)

    await userEvent.click(screen.getByRole('radio', { name: 'Feriado' }))

    expect(screen.queryByLabelText('Mês')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Qual feriado')).toHaveValue('')
    expect(screen.getByLabelText('Primeiro dia')).toBeInTheDocument()
    expect(screen.getByLabelText('Último dia')).toBeInTheDocument()
  })

  it('preencher o feriado sugere nome e diárias', async () => {
    render(<Campanha campanha={FERIADO} />)

    await userEvent.selectOptions(screen.getByLabelText('Qual feriado'), 'CARNAVAL')
    fireEvent.change(screen.getByLabelText('Primeiro dia'), { target: { value: '2027-02-05' } })
    fireEvent.change(screen.getByLabelText('Último dia'), { target: { value: '2027-02-09' } })

    expect(screen.getByLabelText('Nome da campanha')).toHaveValue('Expectativa Carnaval 2027')
    expect(screen.getByLabelText('Diárias')).toHaveValue(5)
    expect(screen.getByText('O período tem 5 dias.')).toBeInTheDocument()
    expect(screen.getByLabelText('Último dia')).toHaveAttribute('min', '2027-02-05')
  })

  it('período de um dia fica no singular', () => {
    render(
      <Campanha
        campanha={{ ...FERIADO, feriadoCodigo: 'PASCOA', inicio: '2027-03-28', fim: '2027-03-28' }}
      />,
    )

    expect(screen.getByText('O período tem 1 dia.')).toBeInTheDocument()
  })

  it('enquanto os feriados carregam, o select avisa', () => {
    render(<Campanha campanha={FERIADO} carregandoFeriados />)

    expect(screen.getByRole('option', { name: 'Carregando feriados…' })).toBeInTheDocument()
  })

  it('erros do feriado só aparecem depois de sair do campo', async () => {
    render(<Campanha campanha={FERIADO} />)
    const feriado = screen.getByLabelText('Qual feriado')

    expect(feriado).not.toHaveAttribute('aria-invalid')
    fireEvent.blur(feriado)
    fireEvent.blur(feriado)

    expect(feriado).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Escolha o feriado.')).toHaveAttribute('id', 'campo-1-feriado-erro')
    expect(feriado).toHaveAttribute('aria-describedby', 'campo-1-feriado-erro')
    expect(screen.queryByText('Informe o primeiro dia.')).not.toBeInTheDocument()

    fireEvent.blur(screen.getByLabelText('Primeiro dia'))
    fireEvent.blur(screen.getByLabelText('Último dia'))
    expect(screen.getByText('Informe o primeiro dia.')).toBeInTheDocument()
    expect(screen.getByText('Informe o último dia.')).toBeInTheDocument()
  })

  it('com mostrarErros, todos os erros aparecem de uma vez', () => {
    render(<Campanha campanha={{ mes: '' }} mostrarErros />)

    expect(screen.getByText('Escolha o mês.')).toBeInTheDocument()
    expect(screen.getByText('Informe as diárias.')).toBeInTheDocument()
    expect(screen.getByText('Informe o nome.')).toBeInTheDocument()
    expect(screen.getByLabelText('Mês')).toHaveAttribute('aria-invalid', 'true')
  })

  it('campanha repetida acusa o período mesmo sem tocar', () => {
    render(<Campanha repetida />)

    expect(
      screen.getByText('Já há uma campanha desta modalidade para este período.'),
    ).toBeInTheDocument()
  })

  it('campanha repetida de feriado acusa o primeiro dia', () => {
    render(
      <Campanha
        repetida
        campanha={{
          ...FERIADO,
          feriadoCodigo: 'CARNAVAL',
          inicio: '2027-02-05',
          fim: '2027-02-09',
        }}
      />,
    )

    expect(
      screen.getByText('Já há uma campanha desta modalidade para este período.'),
    ).toBeInTheDocument()
  })

  it('editar o nome mostra o botão para voltar à sugestão', async () => {
    render(<Campanha />)
    const nome = screen.getByLabelText('Nome da campanha')
    expect(screen.getByText('Sugerido a partir da modalidade e do período.')).toBeInTheDocument()

    await userEvent.clear(nome)
    await userEvent.type(nome, 'Outubro')

    expect(nome).toHaveValue('Outubro')
    expect(
      screen.queryByText('Sugerido a partir da modalidade e do período.'),
    ).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Usar “Consolidada de outubro de 2026”' }),
    )
    expect(nome).toHaveValue('Consolidada de outubro de 2026')
  })

  it('sem sugestão de nome, não há botão de voltar', async () => {
    render(<Campanha campanha={FERIADO} />)

    await userEvent.type(screen.getByLabelText('Nome da campanha'), 'Evento')

    expect(screen.queryByRole('button', { name: /^Usar/ })).not.toBeInTheDocument()
  })

  it('editar as diárias mostra o botão para voltar aos dias do período', async () => {
    render(<Campanha />)
    const diarias = screen.getByLabelText('Diárias')

    await userEvent.clear(diarias)
    await userEvent.type(diarias, '20')
    expect(diarias).toHaveValue(20)

    await userEvent.click(screen.getByRole('button', { name: 'Usar 31' }))
    expect(diarias).toHaveValue(31)
    expect(screen.queryByRole('button', { name: 'Usar 31' })).not.toBeInTheDocument()
  })

  it('trocar mês e ano monta o "AAAA-MM"', async () => {
    const acoes: AcaoPesquisa[] = []
    render(<Campanha aoDespachar={(acao) => acoes.push(acao)} />)

    await userEvent.selectOptions(screen.getByLabelText('Mês'), '02')
    await userEvent.selectOptions(screen.getByLabelText('Ano'), '2025')

    expect(acoes).toEqual([
      { tipo: 'campanha', chave: 1, mudancas: { mes: '2026-02' } },
      { tipo: 'campanha', chave: 1, mudancas: { mes: '2025-02' } },
    ])
    expect(screen.getByLabelText('Diárias')).toHaveValue(28)
  })

  it('trocar a modalidade', async () => {
    render(<Campanha />)

    await userEvent.click(screen.getByRole('radio', { name: 'Expectativa' }))

    expect(screen.getByLabelText('Nome da campanha')).toHaveValue('Expectativa de outubro de 2026')
  })

  it('remover só aparece quando pode, e despacha a remoção', async () => {
    const { unmount } = render(<Campanha />)
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
    unmount()

    render(<Campanha podeRemover />)
    await userEvent.click(screen.getByRole('button', { name: 'Remover a campanha 1' }))

    expect(screen.getByText('removida')).toBeInTheDocument()
  })

  it('incluída: mostra o selo, trava os campos e não pode remover', () => {
    render(<Campanha incluida podeRemover />)

    expect(screen.getByText('Incluída')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Dados da campanha 1' })).toBeDisabled()
  })

  it('mostra a recusa da API', () => {
    render(<Campanha erroApi="Já existe uma campanha para este período." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe uma campanha para este período.')
  })

  it('recebe o foco quando acaba de ser adicionada', () => {
    render(<Campanha focar />)

    expect(screen.getByRole('heading', { name: 'Campanha 1' })).toHaveFocus()
  })

  it('ano fora da lista padrão continua como opção', () => {
    render(<Campanha campanha={{ mes: '2019-05' }} />)

    expect(screen.getByLabelText('Ano')).toHaveValue('2019')
  })

  it('não despacha nada só por renderizar', () => {
    const aoDespachar = vi.fn()
    render(<Campanha aoDespachar={aoDespachar} />)

    expect(aoDespachar).not.toHaveBeenCalled()
  })
})
