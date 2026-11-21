import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { ReferenciasPage } from './ReferenciasPage'

const REFERENCIAS = {
  tiposHospedagem: [
    { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true, ordem: 2 },
    { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true, ordem: 1 },
    { codigo: 'CAMPING', nome: 'Camping', calculaReceita: false, ordem: 3 },
  ],
  feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 }],
  faixasOcupacao: [
    { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41 },
    { codigo: 'RUIM', nome: 'Ruim', percentualMinimo: 0 },
  ],
}

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({ 'GET /api/referencias': { corpo: REFERENCIAS }, ...rotas })
}

beforeEach(() => preparar())
afterEach(() => vi.unstubAllGlobals())

const linha = (nome: string) => screen.getByRole('row', { name: new RegExp(nome) })

async function irPara(aba: string) {
  await userEvent.click(await screen.findByRole('tab', { name: aba }))
  return screen.getByRole('tabpanel', { name: aba })
}

describe('abas', () => {
  it('começa nos tipos de hospedagem, em ordem, e troca com as setas', async () => {
    abrirTela(<ReferenciasPage />)

    const tipos = await screen.findByRole('tab', { name: 'Tipos de hospedagem' })
    expect(tipos).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Feriados e eventos' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
    const tabela = within(screen.getByRole('tabpanel')).getByRole('table')
    expect(
      within(tabela)
        .getAllByRole('rowheader')
        .map((th) => th.textContent),
    ).toEqual(['Hotel', 'Pousada', 'Camping'])
    expect(linha('Camping')).toHaveTextContent('Não')

    tipos.focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Feriados e eventos' })).toHaveFocus()
    expect(screen.getByRole('tabpanel', { name: 'Feriados e eventos' })).toHaveTextContent(
      'Carnaval',
    )
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Faixas de ocupação' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Tipos de hospedagem' })).toHaveFocus()
  })

  it('erro ao carregar avisa e tenta de novo', async () => {
    preparar({
      'GET /api/referencias': [{ status: 500, corpo: {} }, { corpo: REFERENCIAS }],
    })
    abrirTela(<ReferenciasPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as referências.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('tablist', { name: 'Referências' })).toBeInTheDocument()
  })

  it('aba sem itens mostra o estado vazio', async () => {
    preparar({ 'GET /api/referencias': { corpo: { ...REFERENCIAS, feriados: [] } } })
    abrirTela(<ReferenciasPage />)

    const painel = await irPara('Feriados e eventos')

    expect(within(painel).getByText('Nenhum feriado ou evento cadastrado')).toBeInTheDocument()
  })
})

describe('tipos de hospedagem', () => {
  it('cria sem código, que a API gera do nome', async () => {
    preparar({
      'POST /api/referencias/tipos-hospedagem': {
        status: 201,
        corpo: { codigo: 'CHALE', nome: 'Chalé', calculaReceita: false, ordem: 4 },
      },
    })
    abrirTela(<ReferenciasPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Novo tipo de hospedagem' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo tipo de hospedagem' })

    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Chalé')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(await screen.findByText('Tipo de hospedagem Chalé criado.')).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'POST',
      caminho: '/api/referencias/tipos-hospedagem',
      corpo: { nome: 'Chalé', calculaReceita: false },
    })
    expect(api.chamadas.filter((chamada) => chamada.caminho === '/api/referencias')).toHaveLength(2)
  })

  it('edita sem mudar o código e marca a receita', async () => {
    preparar({
      'PUT /api/referencias/tipos-hospedagem/CAMPING': {
        corpo: { codigo: 'CAMPING', nome: 'Camping', calculaReceita: true, ordem: 3 },
      },
    })
    abrirTela(<ReferenciasPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Camping' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar Camping' })
    expect(within(dialogo).getByLabelText('Código')).toBeDisabled()
    expect(within(dialogo).getByLabelText('Ordem')).toHaveValue('3')

    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Entra na diária média/ }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Tipo de hospedagem Camping alterado.')).toBeInTheDocument()
    expect(api.envios()[0]?.corpo).toEqual({
      codigo: 'CAMPING',
      nome: 'Camping',
      ordem: 3,
      calculaReceita: true,
    })
  })

  it('código inválido não vai para a API; código repetido aparece no campo', async () => {
    preparar({
      'POST /api/referencias/tipos-hospedagem': {
        status: 422,
        corpo: { detail: 'Já existe tipo de hospedagem com o código HOTEL.' },
      },
    })
    abrirTela(<ReferenciasPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Novo tipo de hospedagem' }))
    const dialogo = screen.getByRole('dialog')
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Hotel')
    await preencherCampo(within(dialogo).getByLabelText('Código'), 'HOTÉL')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))
    expect(within(dialogo).getByText('Use letras sem acento, números e _.')).toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)

    await preencherCampo(within(dialogo).getByLabelText('Código'), 'hotel')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(
      await within(dialogo).findByText('Já existe tipo de hospedagem com o código HOTEL.'),
    ).toBeInTheDocument()
    expect(api.envios()[0]?.corpo).toMatchObject({ codigo: 'HOTEL' })
  })

  it('excluir um tipo em uso mostra o motivo da API', async () => {
    const EM_USO =
      'O tipo Hotel já é usado (estabelecimentos, resultados, diárias ou série histórica) e não pode ser excluído.'
    preparar({
      'DELETE /api/referencias/tipos-hospedagem/HOTEL': { status: 422, corpo: { detail: EM_USO } },
    })
    abrirTela(<ReferenciasPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Hotel' }))
    const dialogo = screen.getByRole('dialog', { name: 'Excluir Hotel' })

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(EM_USO)
  })
})

describe('feriados e eventos', () => {
  it('cria com código e ordem, e exclui depois de confirmar', async () => {
    preparar({
      'POST /api/referencias/feriados': {
        status: 201,
        corpo: { codigo: 'FESTA_JUNINA', nome: 'Festa Junina', ordem: 2 },
      },
      'DELETE /api/referencias/feriados/CARNAVAL': { status: 204 },
    })
    abrirTela(<ReferenciasPage />)
    const painel = await irPara('Feriados e eventos')
    await userEvent.click(within(painel).getByRole('button', { name: 'Novo feriado ou evento' }))
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).queryByRole('checkbox')).not.toBeInTheDocument()

    await preencherCampo(within(dialogo).getByLabelText('Código'), 'festa_junina')
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Festa Junina')
    await preencherCampo(within(dialogo).getByLabelText('Ordem'), '2')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(await screen.findByText('Feriado ou evento Festa Junina criado.')).toBeInTheDocument()
    expect(api.envios()[0]?.corpo).toEqual({
      codigo: 'FESTA_JUNINA',
      nome: 'Festa Junina',
      ordem: 2,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Carnaval' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    )

    expect(await screen.findByText('Feriado ou evento Carnaval excluído.')).toBeInTheDocument()
    expect(api.envios()[1]).toMatchObject({
      metodo: 'DELETE',
      caminho: '/api/referencias/feriados/CARNAVAL',
    })
  })

  it('ordem fora do intervalo da API', async () => {
    abrirTela(<ReferenciasPage />)
    const painel = await irPara('Feriados e eventos')
    await userEvent.click(within(painel).getByRole('button', { name: 'Novo feriado ou evento' }))
    const dialogo = screen.getByRole('dialog')
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Réveillon')
    await preencherCampo(within(dialogo).getByLabelText('Ordem'), '0')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(within(dialogo).getByText('Use um valor a partir de 1.')).toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)
  })
})

describe('faixas de ocupação', () => {
  it('ordena pelo percentual e cria com vírgula decimal', async () => {
    preparar({
      'POST /api/referencias/faixas': {
        status: 201,
        corpo: { codigo: 'MEDIA', nome: 'Média', percentualMinimo: 20.5 },
      },
    })
    abrirTela(<ReferenciasPage />)
    const painel = await irPara('Faixas de ocupação')
    expect(
      within(painel)
        .getAllByRole('rowheader')
        .map((th) => th.textContent),
    ).toEqual(['Ruim', 'Boa'])
    expect(linha('Boa')).toHaveTextContent('41,00%')

    await userEvent.click(within(painel).getByRole('button', { name: 'Nova faixa de ocupação' }))
    const dialogo = screen.getByRole('dialog')
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Média')
    await preencherCampo(within(dialogo).getByLabelText('A partir de (%)'), '20,5')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(await screen.findByText('Faixa de ocupação Média criada.')).toBeInTheDocument()
    expect(api.envios()[0]?.corpo).toEqual({ nome: 'Média', percentualMinimo: 20.5 })
  })

  it('a faixa de 0% só muda o nome', async () => {
    abrirTela(<ReferenciasPage />)
    const painel = await irPara('Faixas de ocupação')

    await userEvent.click(within(painel).getByRole('button', { name: 'Editar Ruim' }))

    const percentual = within(screen.getByRole('dialog')).getByLabelText('A partir de (%)')
    expect(percentual).toBeDisabled()
    expect(percentual).toHaveAccessibleDescription('A primeira faixa começa sempre em 0%.')
  })

  it('percentual repetido, recusado pela API, aparece no campo', async () => {
    preparar({
      'PUT /api/referencias/faixas/BOA': {
        status: 422,
        corpo: { detail: 'A faixa Ruim já começa em 0%.' },
      },
    })
    abrirTela(<ReferenciasPage />)
    const painel = await irPara('Faixas de ocupação')
    await userEvent.click(within(painel).getByRole('button', { name: 'Editar Boa' }))
    const dialogo = screen.getByRole('dialog')
    await preencherCampo(within(dialogo).getByLabelText('A partir de (%)'), '0')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(within(dialogo).getByLabelText('A partir de (%)')).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    )
    expect(within(dialogo).getByText('A faixa Ruim já começa em 0%.')).toBeInTheDocument()
  })
})
