import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { EditorDeInventario } from './EditorDeInventario'

const CATALOGO = [
  {
    id: 1,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    nome: 'Lazer',
    exclusivoSecretaria: false,
    itens: [
      { id: 10, nome: 'Piscina', permiteComplemento: true },
      { id: 11, nome: 'Academia', permiteComplemento: false },
    ],
  },
  {
    id: 2,
    categoria: 'ACESSIBILIDADE',
    nome: 'Estrutura',
    exclusivoSecretaria: false,
    itens: [{ id: 20, nome: 'Rampa', permiteComplemento: false }],
  },
  {
    id: 3,
    categoria: 'SUSTENTABILIDADE',
    nome: 'Selos da Secretaria',
    exclusivoSecretaria: true,
    itens: [{ id: 30, nome: 'Selo verde', permiteComplemento: false }],
  },
]

const INVENTARIO = {
  estabelecimentoId: 12,
  inventarioAtualizadoEm: '2026-11-12T17:30:00Z',
  itens: [{ itemId: 10, complemento: '2 piscinas' }, { itemId: 30 }, { itemId: 99 }],
}

let api: ReturnType<typeof criarApiFalsa>

function abrir(ocultar = false, embutido = false) {
  api = criarApiFalsa({
    'GET /api/inventario/catalogo': { corpo: CATALOGO },
    'GET /api/estabelecimentos/12/inventario': { corpo: INVENTARIO },
    'PUT /api/estabelecimentos/12/inventario': { corpo: INVENTARIO },
  })
  abrirTela(
    <EditorDeInventario
      estabelecimentoId={12}
      ocultarExclusivosDaSecretaria={ocultar}
      embutido={embutido}
    />,
  )
}

afterEach(() => vi.unstubAllGlobals())

const caixa = (nome: string) => screen.getByRole('checkbox', { name: nome })

describe('EditorDeInventario', () => {
  it('agrupa por categoria e grupo, com os itens marcados e a data da atualização', async () => {
    abrir()

    expect(await screen.findByRole('heading', { name: 'Serviços e equipamentos' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Acessibilidade' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Lazer' })).toBeVisible()
    expect(caixa('Piscina')).toBeChecked()
    expect(caixa('Academia')).not.toBeChecked()
    expect(screen.getByLabelText('Complemento de Piscina')).toHaveValue('2 piscinas')
    expect(screen.getByText('Inventário atualizado em 12/11/2026 às 14:30.')).toBeVisible()
  })

  it('só pede complemento de item marcado que o permite', async () => {
    abrir()
    await screen.findByRole('group', { name: 'Lazer' })

    await userEvent.click(caixa('Academia'))
    expect(screen.queryByLabelText('Complemento de Academia')).not.toBeInTheDocument()

    await userEvent.click(caixa('Piscina'))
    expect(screen.queryByLabelText('Complemento de Piscina')).not.toBeInTheDocument()
  })

  it('envia os itens marcados, com complemento e sem os campos vazios', async () => {
    abrir()
    await screen.findByRole('group', { name: 'Lazer' })

    await userEvent.click(caixa('Academia'))
    await userEvent.click(caixa('Rampa'))
    await preencherCampo(screen.getByLabelText('Complemento de Piscina'), '  3 piscinas ')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar inventário' }))

    expect(await screen.findByText('Inventário salvo.')).toBeVisible()
    expect(api.envios()).toEqual([
      expect.objectContaining({
        metodo: 'PUT',
        caminho: '/api/estabelecimentos/12/inventario',
        corpo: {
          itens: [
            { itemId: 10, complemento: '3 piscinas' },
            { itemId: 11 },
            { itemId: 20 },
            { itemId: 30 },
          ],
        },
      }),
    ])
  })

  it('desmarcado sai do corpo', async () => {
    abrir()
    await screen.findByRole('group', { name: 'Lazer' })

    await userEvent.click(caixa('Piscina'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar inventário' }))

    await screen.findByText('Inventário salvo.')
    expect(api.envios()[0]?.corpo).toEqual({ itens: [{ itemId: 30 }] })
  })

  it('oculta os grupos exclusivos da Secretaria e não os envia', async () => {
    abrir(true)
    await screen.findByRole('group', { name: 'Lazer' })

    expect(screen.queryByRole('group', { name: 'Selos da Secretaria' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sustentabilidade' })).not.toBeInTheDocument()

    await userEvent.click(caixa('Rampa'))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar inventário' }))

    await screen.findByText('Inventário salvo.')
    expect(api.envios()[0]?.corpo).toEqual({
      itens: [{ itemId: 10, complemento: '2 piscinas' }, { itemId: 20 }],
    })
  })

  it('mostra o erro de gravação da API', async () => {
    abrir()
    await screen.findByRole('group', { name: 'Lazer' })
    api.rotas['PUT /api/estabelecimentos/12/inventario'] = {
      status: 422,
      corpo: { detail: 'Item de inventário inexistente ou inativo: 10.' },
    }

    await userEvent.click(screen.getByRole('button', { name: 'Salvar inventário' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('inexistente ou inativo')
  })

  it('embutido: categorias como regiões com h4, sem h2 de Card', async () => {
    abrir(false, true)
    await screen.findByRole('group', { name: 'Lazer' })

    expect(screen.getByRole('region', { name: 'Serviços e equipamentos' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 4, name: 'Acessibilidade' })).toBeVisible()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
