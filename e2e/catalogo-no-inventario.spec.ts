import { expect, test, type Page } from '@playwright/test'
import { injetarSessao } from './sessao.ts'
import { catalogoPadrao } from './fixtures/catalogo.ts'
import { ADMIN, PARCEIRO } from './fixtures/usuarios.ts'

type Marcado = { itemId: number; complemento?: string }
type Item = {
  id: number
  codigo: string
  nome: string
  permiteComplemento: boolean
  ordem: number
  ativo: boolean
}
type Grupo = {
  id: number
  categoria: string
  codigo: string
  nome: string
  exclusivoSecretaria: boolean
  ordem: number
  ativo: boolean
  itens: Item[]
}

type Estado = {
  usuario: typeof ADMIN | typeof PARCEIRO
  catalogo: Grupo[]
  inventario: Marcado[]
  puts: { itens: Marcado[] }[]
}

function novoEstado(): Estado {
  return {
    usuario: ADMIN,
    catalogo: catalogoPadrao(),
    inventario: [],
    puts: [],
  }
}

const RESUMO = {
  id: 12,
  nomeFantasia: 'Hotel Exemplo',
  tipoHospedagemCodigo: 'HOTEL',
  situacao: 'REGULAR',
  ativo: true,
}

async function mockarApi(page: Page, estado: Estado) {
  await injetarSessao(page)
  let proximoId = 100

  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    const chave = `${metodo} ${pathname}`

    if (chave === 'GET /api/me') return rota.fulfill({ json: estado.usuario })
    if (chave === 'GET /api/referencias') {
      return rota.fulfill({ json: { tiposHospedagem: [{ codigo: 'HOTEL', nome: 'Hotel' }] } })
    }
    if (chave === 'GET /api/estabelecimentos') return rota.fulfill({ json: [RESUMO] })
    if (chave === 'GET /api/estabelecimentos/12') {
      return rota.fulfill({
        json: { id: 12, ativo: true, dados: { nomeFantasia: 'Hotel Exemplo' }, secretaria: {} },
      })
    }
    if (chave === 'GET /api/estabelecimentos/12/capacidades') return rota.fulfill({ json: [] })
    if (chave === 'GET /api/inventario/catalogo') {
      const ativos = estado.catalogo
        .filter((grupo) => grupo.ativo)
        .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => item.ativo) }))
      return rota.fulfill({ json: ativos })
    }
    if (chave === 'GET /api/inventario/catalogo/completo') {
      return rota.fulfill({ json: estado.catalogo })
    }
    const novoItem = pathname.match(/^\/api\/inventario\/grupos\/(\d+)\/itens$/)
    if (metodo === 'POST' && novoItem) {
      const corpo = pedido.postDataJSON() as Omit<Item, 'id' | 'codigo' | 'ativo'>
      const item: Item = {
        ...corpo,
        id: proximoId++,
        codigo: corpo.nome.toUpperCase(),
        ativo: true,
      }
      estado.catalogo.find(({ id }) => id === Number(novoItem[1]))?.itens.push(item)
      return rota.fulfill({ status: 201, json: item })
    }
    if (chave === 'GET /api/estabelecimentos/12/inventario') {
      return rota.fulfill({ json: { estabelecimentoId: 12, itens: estado.inventario } })
    }
    if (chave === 'PUT /api/estabelecimentos/12/inventario') {
      const corpo = pedido.postDataJSON() as { itens: Marcado[] }
      estado.puts.push(corpo)
      estado.inventario = corpo.itens
      return rota.fulfill({ json: { estabelecimentoId: 12, itens: corpo.itens } })
    }
    return rota.fulfill({ json: [] })
  })
}

async function irParaCadastros(page: Page, destino: string) {
  await page.getByRole('button', { name: 'Cadastros' }).click()
  await page.getByRole('link', { name: destino, exact: true }).click()
}

test('item novo do catálogo aparece no inventário do estabelecimento e no do parceiro', async ({
  page,
}) => {
  const estado = novoEstado()
  await mockarApi(page, estado)

  await page.goto('/cadastros/estabelecimentos/12/inventario')
  await expect(page.getByRole('checkbox', { name: 'Piscina' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Sauna' })).toHaveCount(0)

  await irParaCadastros(page, 'Inventário')
  await expect(page.getByRole('heading', { level: 1, name: 'Inventário' })).toBeVisible()
  await page.getByRole('button', { name: 'Novo item' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo item' })
  await dialogo.getByLabel('Nome').fill('Sauna')
  await dialogo.getByRole('button', { name: 'Criar' }).click()
  await expect(page.getByRole('status')).toHaveText('Item Sauna criado.')

  await irParaCadastros(page, 'Estabelecimentos')
  await page.getByRole('link', { name: 'Inventário de Hotel Exemplo' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inventário do estabelecimento' }),
  ).toBeVisible()
  const sauna = page.getByRole('checkbox', { name: 'Sauna' })
  await expect(sauna).not.toBeChecked()
  await sauna.check()
  await page.getByRole('button', { name: 'Salvar inventário' }).click()
  await expect(page.getByText('Inventário salvo.')).toBeVisible()
  expect(estado.puts).toEqual([{ itens: [{ itemId: 100 }] }])

  estado.usuario = PARCEIRO
  await page.goto('/meu-estabelecimento')
  const inventario = page.getByRole('region', { name: 'Inventário' })
  await expect(inventario.getByRole('checkbox', { name: 'Sauna' })).toBeChecked()
  await expect(inventario.getByRole('checkbox', { name: 'Piscina' })).not.toBeChecked()
  await expect(inventario.getByText('Selos da Secretaria')).toHaveCount(0)
  await expect(inventario.getByRole('checkbox', { name: 'Selo verde' })).toHaveCount(0)
})

test('o parceiro vê o item novo do catálogo antes de qualquer estabelecimento marcá-lo', async ({
  page,
}) => {
  const estado = novoEstado()
  estado.catalogo[0]!.itens.push({
    id: 101,
    codigo: 'SAUNA',
    nome: 'Sauna',
    permiteComplemento: false,
    ordem: 2,
    ativo: true,
  })
  estado.usuario = PARCEIRO
  await mockarApi(page, estado)

  await page.goto('/meu-estabelecimento')
  const inventario = page.getByRole('region', { name: 'Inventário' })
  await expect(inventario.getByRole('checkbox', { name: 'Sauna' })).not.toBeChecked()

  await inventario.getByRole('checkbox', { name: 'Sauna' }).check()
  await inventario.getByRole('button', { name: 'Salvar inventário' }).click()
  await expect.poll(() => estado.puts).toEqual([{ itens: [{ itemId: 101 }] }])
})
