import { expect, test, type Page } from '@playwright/test'
import { injetarSessao } from './sessao.ts'
import { ADMIN } from './fixtures/usuarios.ts'

type Marcado = { itemId: number; complemento?: string }

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
      {
        id: 11,
        codigo: 'ACADEMIA',
        nome: 'Academia',
        permiteComplemento: false,
        ordem: 2,
        ativo: true,
      },
    ],
  },
  {
    id: 2,
    categoria: 'ACESSIBILIDADE',
    codigo: 'RAMPAS',
    nome: 'Rampas',
    exclusivoSecretaria: false,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 20,
        codigo: 'RAMPA',
        nome: 'Rampa de acesso',
        permiteComplemento: false,
        ordem: 1,
        ativo: true,
      },
    ],
  },
  {
    id: 3,
    categoria: 'SUSTENTABILIDADE',
    codigo: 'SELOS',
    nome: 'Selos da Secretaria',
    exclusivoSecretaria: true,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 30,
        codigo: 'SELO',
        nome: 'Selo verde',
        permiteComplemento: false,
        ordem: 1,
        ativo: true,
      },
    ],
  },
]

type Estado = {
  catalogo: unknown[]
  inventario: { itens: Marcado[]; atualizadoEm?: string }
  puts: unknown[]
  recusaDoPut?: { status: number; detail: string }
}

function novoEstado(): Estado {
  return { catalogo: CATALOGO, inventario: { itens: [] }, puts: [] }
}

async function entrar(page: Page, estado: Estado) {
  await injetarSessao(page)
  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    const chave = `${metodo} ${pathname}`

    if (chave === 'GET /api/me') return rota.fulfill({ json: ADMIN })
    if (chave === 'GET /api/estabelecimentos/12') {
      return rota.fulfill({
        json: { id: 12, ativo: true, dados: { nomeFantasia: 'Hotel Exemplo' } },
      })
    }
    if (chave === 'GET /api/inventario/catalogo') return rota.fulfill({ json: estado.catalogo })
    if (chave === 'GET /api/estabelecimentos/12/inventario') {
      return rota.fulfill({
        json: {
          estabelecimentoId: 12,
          itens: estado.inventario.itens,
          inventarioAtualizadoEm: estado.inventario.atualizadoEm,
        },
      })
    }
    if (chave === 'PUT /api/estabelecimentos/12/inventario') {
      const corpo = pedido.postDataJSON() as { itens: Marcado[] }
      estado.puts.push(corpo)
      if (estado.recusaDoPut) {
        const { status, detail } = estado.recusaDoPut
        return rota.fulfill({ status, json: { status, detail } })
      }
      estado.inventario = { itens: corpo.itens, atualizadoEm: '2026-11-20T15:00:00Z' }
      return rota.fulfill({
        json: {
          estabelecimentoId: 12,
          itens: corpo.itens,
          inventarioAtualizadoEm: '2026-11-20T15:00:00Z',
        },
      })
    }
    return rota.fulfill({ json: [] })
  })
}

async function abrirInventario(page: Page) {
  await page.goto('/cadastros/estabelecimentos/12/inventario')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inventário do estabelecimento' }),
  ).toBeVisible()
}

test('mostra o nome do estabelecimento, as categorias e o inventário ainda vazio', async ({
  page,
}) => {
  await entrar(page, novoEstado())
  await abrirInventario(page)

  await expect(page.getByText(/de Hotel Exemplo\./)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Estabelecimentos' })).toHaveAttribute(
    'href',
    '/cadastros/estabelecimentos',
  )
  await expect(page.getByText('Inventário ainda não preenchido.')).toBeVisible()
  for (const categoria of ['Serviços e equipamentos', 'Acessibilidade', 'Sustentabilidade']) {
    await expect(page.getByRole('heading', { name: categoria })).toBeVisible()
  }
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0)
})

test('o ADMIN vê e marca o grupo exclusivo da Secretaria', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirInventario(page)

  const selos = page.getByRole('group', { name: 'Selos da Secretaria' })
  await selos.getByRole('checkbox', { name: 'Selo verde' }).check()
  await page.getByRole('button', { name: 'Salvar inventário' }).click()

  await expect(page.getByText('Inventário salvo.')).toBeVisible()
  expect(estado.puts).toEqual([{ itens: [{ itemId: 30 }] }])
})

test('carrega o que já foi marcado, com o complemento, e a data da última atualização', async ({
  page,
}) => {
  const estado = novoEstado()
  estado.inventario = {
    itens: [{ itemId: 10, complemento: '2 piscinas' }, { itemId: 20 }],
    atualizadoEm: '2026-11-18T12:00:00Z',
  }
  await entrar(page, estado)
  await abrirInventario(page)

  await expect(page.getByRole('checkbox', { name: 'Piscina' })).toBeChecked()
  await expect(page.getByLabel('Complemento de Piscina')).toHaveValue('2 piscinas')
  await expect(page.getByRole('checkbox', { name: 'Rampa de acesso' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Academia' })).not.toBeChecked()
  await expect(page.getByText(/Inventário atualizado em 18\/11\/2026/)).toBeVisible()
})

test('o complemento só aparece para o item marcado que aceita complemento', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirInventario(page)

  await expect(page.getByLabel('Complemento de Piscina')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Piscina' }).check()
  await expect(page.getByLabel('Complemento de Piscina')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Academia' }).check()
  await expect(page.getByLabel('Complemento de Academia')).toHaveCount(0)

  await page.getByRole('checkbox', { name: 'Piscina' }).uncheck()
  await expect(page.getByLabel('Complemento de Piscina')).toHaveCount(0)
})

test('desmarcar tira o item e o complemento do que é salvo', async ({ page }) => {
  const estado = novoEstado()
  estado.inventario = {
    itens: [{ itemId: 10, complemento: '2 piscinas' }, { itemId: 20 }],
    atualizadoEm: '2026-11-18T12:00:00Z',
  }
  await entrar(page, estado)
  await abrirInventario(page)

  await page.getByRole('checkbox', { name: 'Piscina' }).uncheck()
  await page.getByRole('button', { name: 'Salvar inventário' }).click()

  await expect(page.getByText('Inventário salvo.')).toBeVisible()
  expect(estado.puts).toEqual([{ itens: [{ itemId: 20 }] }])
})

test('complemento só com espaços não é enviado e o texto vai sem as bordas', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirInventario(page)

  await page.getByRole('checkbox', { name: 'Piscina' }).check()
  await page.getByLabel('Complemento de Piscina').fill('   ')
  await page.getByRole('button', { name: 'Salvar inventário' }).click()
  await expect(page.getByText('Inventário salvo.')).toBeVisible()

  await page.getByLabel('Complemento de Piscina').fill('  aquecida  ')
  await page.getByRole('button', { name: 'Salvar inventário' }).click()
  await expect.poll(() => estado.puts.length).toBe(2)

  expect(estado.puts).toEqual([
    { itens: [{ itemId: 10 }] },
    { itens: [{ itemId: 10, complemento: 'aquecida' }] },
  ])
})

test('o aviso de salvo some quando o usuário volta a editar', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirInventario(page)

  await page.getByRole('checkbox', { name: 'Academia' }).check()
  await page.getByRole('button', { name: 'Salvar inventário' }).click()
  await expect(page.getByText('Inventário salvo.')).toBeVisible()
  await expect(page.getByText(/Inventário atualizado em 20\/11\/2026/)).toBeVisible()

  await page.getByRole('checkbox', { name: 'Rampa de acesso' }).check()
  await expect(page.getByText('Inventário salvo.')).toHaveCount(0)
})

test('item que saiu do catálogo não volta no corpo do salvamento', async ({ page }) => {
  const estado = novoEstado()
  estado.inventario = { itens: [{ itemId: 999 }, { itemId: 11 }] }
  await entrar(page, estado)
  await abrirInventario(page)

  await expect(page.getByRole('checkbox', { name: 'Academia' })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Piscina' }).check()
  await page.getByRole('button', { name: 'Salvar inventário' }).click()

  await expect(page.getByText('Inventário salvo.')).toBeVisible()
  expect(estado.puts).toEqual([{ itens: [{ itemId: 10 }, { itemId: 11 }] }])
})

test('erro ao salvar mostra o aviso e mantém o que foi marcado', async ({ page }) => {
  const estado = novoEstado()
  estado.recusaDoPut = { status: 422, detail: 'Item inativo no catálogo.' }
  await entrar(page, estado)
  await abrirInventario(page)

  await page.getByRole('checkbox', { name: 'Piscina' }).check()
  await page.getByLabel('Complemento de Piscina').fill('2 piscinas')
  await page.getByRole('button', { name: 'Salvar inventário' }).click()

  await expect(page.getByRole('alert')).toHaveText('Item inativo no catálogo.')
  await expect(page.getByText('Inventário salvo.')).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: 'Piscina' })).toBeChecked()
  await expect(page.getByLabel('Complemento de Piscina')).toHaveValue('2 piscinas')
})

test('catálogo vazio mostra o estado vazio', async ({ page }) => {
  const estado = novoEstado()
  estado.catalogo = []
  await entrar(page, estado)
  await abrirInventario(page)

  await expect(page.getByText('Catálogo vazio')).toBeVisible()
  await expect(page.getByText('Não há itens de inventário cadastrados.')).toBeVisible()
})

test('erro ao carregar o inventário permite tentar de novo', async ({ page }) => {
  await entrar(page, novoEstado())
  let falhou = false
  await page.route('**/api/estabelecimentos/12/inventario', (rota) => {
    if (falhou || rota.request().method() !== 'GET') return rota.fallback()
    falhou = true
    return rota.fulfill({ status: 403, json: { status: 403, detail: 'Sem permissão.' } })
  })

  await abrirInventario(page)
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o inventário.')
  await expect(page.getByRole('alert')).toContainText('Sem permissão.')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('checkbox', { name: 'Piscina' })).toBeVisible()
})
