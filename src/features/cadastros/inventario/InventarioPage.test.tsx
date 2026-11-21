import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { InventarioPage } from './InventarioPage'

const CATALOGO = [
  {
    id: 1,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    codigo: 'LAZER',
    nome: 'Lazer',
    exclusivoSecretaria: false,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 10,
        codigo: 'PISCINA',
        nome: 'Piscina',
        permiteComplemento: true,
        ordem: 1,
        ativo: true,
      },
      { id: 11, codigo: 'SAUNA', nome: 'Sauna', permiteComplemento: false, ordem: 2, ativo: false },
    ],
  },
  {
    id: 2,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    codigo: 'ANTIGOS',
    nome: 'Antigos',
    exclusivoSecretaria: true,
    ordem: 2,
    ativo: false,
    itens: [],
  },
  {
    id: 3,
    categoria: 'ACESSIBILIDADE',
    codigo: 'ESTRUTURA',
    nome: 'Estrutura',
    exclusivoSecretaria: false,
    ordem: 1,
    ativo: true,
    itens: [
      { id: 20, codigo: 'RAMPA', nome: 'Rampa', permiteComplemento: false, ordem: 1, ativo: true },
    ],
  },
]

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({ 'GET /api/inventario/catalogo/completo': { corpo: CATALOGO }, ...rotas })
}

beforeEach(() => preparar())
afterEach(() => vi.unstubAllGlobals())

const botao = (nome: string) => screen.getByRole('button', { name: nome })
const grupo = (nome: string) =>
  screen.getByRole('heading', { name: nome }).closest('section') as HTMLElement

async function abrir() {
  abrirTela(<InventarioPage />)
  await screen.findByRole('tab', { name: 'Serviços e equipamentos' })
}

describe('catálogo do inventário', () => {
  it('uma aba por categoria, com um card por grupo e os inativos marcados', async () => {
    await abrir()

    expect(screen.getAllByRole('tab').map((aba) => aba.textContent)).toEqual([
      'Serviços e equipamentos',
      'Acessibilidade',
      'Sustentabilidade',
    ])
    expect(grupo('Lazer')).toHaveTextContent('LAZER')
    expect(within(grupo('Lazer')).getByRole('row', { name: /Piscina/ })).toHaveTextContent('Sim')
    expect(within(grupo('Lazer')).getByRole('row', { name: /Sauna/ })).toHaveTextContent('Inativo')
    expect(grupo('Antigos')).toHaveTextContent('Exclusivo da Secretaria · Inativo')
    expect(screen.queryByText('Rampa')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Acessibilidade' }))
    expect(screen.getByText('Rampa')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Sustentabilidade' }))
    expect(screen.getByText('Nenhum grupo em Sustentabilidade')).toBeInTheDocument()
  })

  it('erro ao carregar avisa e tenta de novo', async () => {
    preparar({
      'GET /api/inventario/catalogo/completo': [{ status: 500, corpo: {} }, { corpo: CATALOGO }],
    })
    abrirTela(<InventarioPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o catálogo do inventário.',
    )
    await userEvent.click(botao('Tentar novamente'))

    expect(await screen.findByRole('heading', { name: 'Lazer' })).toBeInTheDocument()
  })

  it('cria grupo na categoria da aba', async () => {
    preparar({ 'POST /api/inventario/grupos': { status: 201, corpo: { id: 9, nome: 'Rampas' } } })
    await abrir()
    await userEvent.click(screen.getByRole('tab', { name: 'Acessibilidade' }))

    await userEvent.click(botao('Novo grupo'))
    const dialogo = screen.getByRole('dialog', { name: 'Novo grupo' })
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Rampas')
    await userEvent.click(
      within(dialogo).getByRole('checkbox', { name: /Exclusivo da Secretaria/ }),
    )
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(await screen.findByText('Grupo Rampas criado.')).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'POST',
      caminho: '/api/inventario/grupos',
      corpo: { categoria: 'ACESSIBILIDADE', nome: 'Rampas', exclusivoSecretaria: true },
    })
  })

  it('edita grupo mantendo a categoria e o código', async () => {
    preparar({ 'PUT /api/inventario/grupos/1': { corpo: { id: 1, nome: 'Lazer e esporte' } } })
    await abrir()

    await userEvent.click(botao('Editar o grupo Lazer'))
    const dialogo = screen.getByRole('dialog', { name: 'Editar Lazer' })
    expect(within(dialogo).getByLabelText('Código')).toBeDisabled()
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Lazer e esporte')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Grupo Lazer e esporte alterado.')).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/inventario/grupos/1',
      corpo: {
        categoria: 'SERVICOS_EQUIPAMENTOS',
        codigo: 'LAZER',
        nome: 'Lazer e esporte',
        ordem: 1,
      },
    })
  })

  it('cria item no grupo escolhido', async () => {
    preparar({
      'POST /api/inventario/grupos/1/itens': { status: 201, corpo: { id: 12, nome: 'Academia' } },
    })
    await abrir()

    await userEvent.click(within(grupo('Lazer')).getByRole('button', { name: 'Novo item' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo item' })
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Academia')
    await preencherCampo(within(dialogo).getByLabelText('Descrição'), 'Musculação')
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Aceita complemento/ }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(await screen.findByText('Item Academia criado.')).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      caminho: '/api/inventario/grupos/1/itens',
      corpo: { nome: 'Academia', descricao: 'Musculação', permiteComplemento: true },
    })
  })

  it('edita item', async () => {
    preparar({ 'PUT /api/inventario/itens/10': { corpo: { id: 10, nome: 'Piscina aquecida' } } })
    await abrir()

    await userEvent.click(botao('Editar Piscina'))
    const dialogo = screen.getByRole('dialog', { name: 'Editar Piscina' })
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Piscina aquecida')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Item Piscina aquecida alterado.')).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/inventario/itens/10',
      corpo: { codigo: 'PISCINA', nome: 'Piscina aquecida', permiteComplemento: true },
    })
  })

  it('mostra o erro de código repetido no campo', async () => {
    preparar({
      'POST /api/inventario/grupos': {
        status: 422,
        corpo: { detail: 'Já existe um grupo com o código LAZER.' },
      },
    })
    await abrir()

    await userEvent.click(botao('Novo grupo'))
    const dialogo = screen.getByRole('dialog', { name: 'Novo grupo' })
    await preencherCampo(within(dialogo).getByLabelText('Nome'), 'Lazer')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar' }))

    expect(await within(dialogo).findByText('Já existe um grupo com o código LAZER.')).toBeVisible()
  })

  it('inativa e reativa grupo e item pela API', async () => {
    preparar({
      'POST /api/inventario/grupos/1/inativar': { status: 204 },
      'POST /api/inventario/grupos/2/reativar': { status: 204 },
      'POST /api/inventario/itens/10/inativar': { status: 204 },
      'POST /api/inventario/itens/11/reativar': { status: 204 },
    })
    await abrir()

    await userEvent.click(botao('Inativar o grupo Lazer'))
    expect(await screen.findByText('Grupo Lazer inativado.')).toBeInTheDocument()
    await userEvent.click(botao('Reativar o grupo Antigos'))
    expect(await screen.findByText('Grupo Antigos reativado.')).toBeInTheDocument()
    await userEvent.click(botao('Inativar Piscina'))
    expect(await screen.findByText('Item Piscina inativado.')).toBeInTheDocument()
    await userEvent.click(botao('Reativar Sauna'))
    expect(await screen.findByText('Item Sauna reativado.')).toBeInTheDocument()

    expect(api.envios().map((envio) => `${envio.metodo} ${envio.caminho}`)).toEqual([
      'POST /api/inventario/grupos/1/inativar',
      'POST /api/inventario/grupos/2/reativar',
      'POST /api/inventario/itens/10/inativar',
      'POST /api/inventario/itens/11/reativar',
    ])
  })

  it('exclui item e grupo depois de confirmar', async () => {
    preparar({
      'DELETE /api/inventario/itens/11': { status: 204 },
      'DELETE /api/inventario/grupos/2': { status: 204 },
    })
    await abrir()

    await userEvent.click(botao('Excluir Sauna'))
    expect(api.envios()).toHaveLength(0)
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    )
    expect(await screen.findByText('Item Sauna excluído.')).toBeInTheDocument()

    await userEvent.click(botao('Excluir o grupo Antigos'))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    )
    expect(await screen.findByText('Grupo Antigos excluído.')).toBeInTheDocument()
    expect(api.envios().map((envio) => `${envio.metodo} ${envio.caminho}`)).toEqual([
      'DELETE /api/inventario/itens/11',
      'DELETE /api/inventario/grupos/2',
    ])
  })

  it('mostra a recusa da exclusão no diálogo', async () => {
    preparar({
      'DELETE /api/inventario/itens/10': {
        status: 422,
        corpo: {
          detail: 'Há estabelecimentos com este item marcado. Inative o item em vez de excluir.',
        },
      },
    })
    await abrir()

    await userEvent.click(botao('Excluir Piscina'))
    const dialogo = screen.getByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(await within(dialogo).findByText(/Inative o item em vez de excluir/)).toBeVisible()
  })
})
