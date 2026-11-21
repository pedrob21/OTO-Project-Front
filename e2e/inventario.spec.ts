import { expect, test, type Page } from '@playwright/test'

const ADMIN = {
  id: 1,
  nome: 'Ana Souza',
  email: 'ana@oto.test',
  perfil: 'ADMIN',
  ativo: true,
}
const HOTEL = {
  id: 12,
  nomeFantasia: 'Hotel Exemplo',
  tipoHospedagemCodigo: 'HOTEL',
  situacao: 'REGULAR',
  ativo: true,
  qtdUh: 40,
  qtdLeitos: 120,
}

type Item = {
  id: number
  codigo: string
  nome: string
  descricao?: string
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

/** API em memória: o catálogo e o inventário mudam com o que a tela grava. */
async function mockarApi(page: Page) {
  const catalogo: Grupo[] = [
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
      ],
    },
  ]
  let proximoId = 100
  const puts: unknown[] = []
  let inventario = { itens: [] as { itemId: number; complemento?: string }[], atualizadoEm: '' }

  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    const chave = `${metodo} ${pathname}`

    if (chave === 'POST /api/auth/login') {
      return rota.fulfill({
        json: {
          token: 'token-e2e',
          expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
          usuario: ADMIN,
        },
      })
    }
    if (chave === 'GET /api/me') return rota.fulfill({ json: ADMIN })
    if (chave === 'GET /api/estabelecimentos') return rota.fulfill({ json: [HOTEL] })
    if (chave === 'GET /api/estabelecimentos/12') {
      return rota.fulfill({
        json: { id: 12, ativo: true, dados: { nomeFantasia: HOTEL.nomeFantasia } },
      })
    }
    if (chave === 'GET /api/inventario/catalogo/completo') return rota.fulfill({ json: catalogo })
    if (chave === 'GET /api/inventario/catalogo') {
      return rota.fulfill({
        json: catalogo
          .filter((grupo) => grupo.ativo)
          .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => item.ativo) })),
      })
    }
    if (chave === 'POST /api/inventario/grupos') {
      const dados = pedido.postDataJSON() as Omit<Grupo, 'id' | 'ativo' | 'itens' | 'codigo'>
      const novo: Grupo = {
        ...dados,
        id: proximoId++,
        codigo: dados.nome.toUpperCase(),
        ativo: true,
        itens: [],
      }
      catalogo.push(novo)
      return rota.fulfill({ status: 201, json: novo })
    }
    const novoItem = pathname.match(/^\/api\/inventario\/grupos\/(\d+)\/itens$/)
    if (metodo === 'POST' && novoItem) {
      const dados = pedido.postDataJSON() as Omit<Item, 'id' | 'ativo' | 'codigo'>
      const item: Item = {
        ...dados,
        id: proximoId++,
        codigo: dados.nome.toUpperCase(),
        ativo: true,
      }
      catalogo.find(({ id }) => id === Number(novoItem[1]))?.itens.push(item)
      return rota.fulfill({ status: 201, json: item })
    }
    if (chave === 'GET /api/estabelecimentos/12/inventario') {
      return rota.fulfill({
        json: {
          estabelecimentoId: 12,
          itens: inventario.itens,
          inventarioAtualizadoEm: inventario.atualizadoEm || undefined,
        },
      })
    }
    if (chave === 'PUT /api/estabelecimentos/12/inventario') {
      const corpo = pedido.postDataJSON() as { itens: typeof inventario.itens }
      puts.push(corpo)
      inventario = { itens: corpo.itens, atualizadoEm: '2026-11-20T15:00:00Z' }
      return rota.fulfill({
        json: {
          estabelecimentoId: 12,
          itens: corpo.itens,
          inventarioAtualizadoEm: inventario.atualizadoEm,
        },
      })
    }
    return rota.fulfill({ json: [] })
  })

  return { puts }
}

async function abrirCadastro(page: Page, tela: string) {
  const cadastros = page.getByRole('button', { name: 'Cadastros' })
  await cadastros.click()
  await expect(cadastros).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('link', { name: tela }).click()
}

test('cria grupo e item no catálogo e marca no inventário de um estabelecimento', async ({
  page,
}) => {
  const { puts } = await mockarApi(page)
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(ADMIN.email)
  await page.getByLabel('Senha').fill('senha-correta')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: new RegExp(ADMIN.nome) })).toBeVisible()

  await abrirCadastro(page, 'Inventário')
  await expect(page).toHaveURL(/\/cadastros\/inventario$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Inventário' })).toBeVisible()

  await page.getByRole('tab', { name: 'Acessibilidade' }).click()
  await page.getByRole('button', { name: 'Novo grupo' }).click()
  const grupo = page.getByRole('dialog', { name: 'Novo grupo' })
  await grupo.getByLabel('Nome').fill('Rampas')
  await grupo.getByRole('button', { name: 'Criar' }).click()
  await expect(page.getByText('Grupo Rampas criado.')).toBeVisible()

  await page.getByRole('button', { name: 'Novo item' }).click()
  const item = page.getByRole('dialog', { name: 'Novo item' })
  await item.getByLabel('Nome').fill('Rampa de acesso')
  await item.getByRole('button', { name: 'Criar' }).click()
  await expect(page.getByText('Item Rampa de acesso criado.')).toBeVisible()
  await expect(page.getByRole('row', { name: /Rampa de acesso/ })).toContainText('Ativo')

  await abrirCadastro(page, 'Estabelecimentos')
  await page.getByRole('link', { name: 'Inventário de Hotel Exemplo' }).click()
  await expect(page).toHaveURL(/\/cadastros\/estabelecimentos\/12\/inventario$/)
  await expect(page.getByText('Inventário ainda não preenchido.')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Piscina' }).check()
  await page.getByLabel('Complemento de Piscina').fill('2 piscinas aquecidas')
  await page.getByRole('checkbox', { name: 'Rampa de acesso' }).check()
  await page.getByRole('button', { name: 'Salvar inventário' }).click()

  await expect(page.getByText('Inventário salvo.')).toBeVisible()
  await expect(page.getByText(/Inventário atualizado em 20\/11\/2026/)).toBeVisible()
  expect(puts).toEqual([
    { itens: [{ itemId: 10, complemento: '2 piscinas aquecidas' }, { itemId: 100 + 1 }] },
  ])
})
