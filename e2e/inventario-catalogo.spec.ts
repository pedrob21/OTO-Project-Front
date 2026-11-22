import { expect, test, type Page } from '@playwright/test'
import { abrirCadastro } from './navegacao.ts'
import { injetarSessao } from './sessao.ts'
import { grupoLazer, grupoSelos, itemAcademia, itemPiscina } from './fixtures/catalogo.ts'
import { ADMIN } from './fixtures/usuarios.ts'

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
type Envio = { metodo: string; caminho: string; corpo: unknown }

type Estado = {
  catalogo: Grupo[]
  envios: Envio[]
  /** recusa a próxima gravação, uma única vez */
  recusaProxima?: { status: number; detail: string }
}

function novoEstado(): Estado {
  return {
    catalogo: [grupoLazer([itemPiscina(), itemAcademia()]), grupoSelos([])],
    envios: [],
  }
}

/** API em memória: o catálogo muda com o que a tela grava. */
async function entrar(page: Page, estado: Estado) {
  await injetarSessao(page)
  let proximoId = 100
  const grupoDoItem = (itemId: number) =>
    estado.catalogo.find((grupo) => grupo.itens.some((item) => item.id === itemId))

  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    if (pathname === '/api/me') return rota.fulfill({ json: ADMIN })
    if (metodo === 'GET' && pathname === '/api/inventario/catalogo/completo') {
      return rota.fulfill({ json: estado.catalogo })
    }
    if (metodo === 'GET' || !pathname.startsWith('/api/inventario/')) {
      return rota.fulfill({ json: [] })
    }

    const corpo = metodo === 'POST' || metodo === 'PUT' ? pedido.postDataJSON() : null
    estado.envios.push({ metodo, caminho: pathname, corpo })
    if (estado.recusaProxima) {
      const { status, detail } = estado.recusaProxima
      estado.recusaProxima = undefined
      return rota.fulfill({ status, json: { status, detail } })
    }

    const alvo = pathname.match(/^\/api\/inventario\/(grupos|itens)\/(\d+)(?:\/(\w+))?$/)
    if (metodo === 'POST' && pathname === '/api/inventario/grupos') {
      const novo: Grupo = {
        ...(corpo as Omit<Grupo, 'id' | 'codigo' | 'ativo' | 'itens'>),
        id: proximoId++,
        codigo: (corpo as { nome: string }).nome.toUpperCase(),
        ativo: true,
        itens: [],
      }
      estado.catalogo.push(novo)
      return rota.fulfill({ status: 201, json: novo })
    }
    const novoItem = pathname.match(/^\/api\/inventario\/grupos\/(\d+)\/itens$/)
    if (metodo === 'POST' && novoItem) {
      const item: Item = {
        ...(corpo as Omit<Item, 'id' | 'codigo' | 'ativo'>),
        id: proximoId++,
        codigo: (corpo as { nome: string }).nome.toUpperCase(),
        ativo: true,
      }
      estado.catalogo.find(({ id }) => id === Number(novoItem[1]))?.itens.push(item)
      return rota.fulfill({ status: 201, json: item })
    }
    if (!alvo) return rota.fulfill({ json: [] })

    const [, tipo, idTexto, acao] = alvo
    const id = Number(idTexto)
    const grupo = estado.catalogo.find((g) => g.id === id)
    const item = estado.catalogo.flatMap((g) => g.itens).find((i) => i.id === id)
    const registro = tipo === 'grupos' ? grupo : item
    if (!registro)
      return rota.fulfill({ status: 404, json: { status: 404, detail: 'Não existe.' } })

    if (metodo === 'POST' && acao) {
      registro.ativo = acao === 'reativar'
      return rota.fulfill({ status: 204 })
    }
    if (metodo === 'DELETE') {
      if (tipo === 'grupos') estado.catalogo.splice(estado.catalogo.indexOf(grupo!), 1)
      else grupoDoItem(id)!.itens = grupoDoItem(id)!.itens.filter((i) => i.id !== id)
      return rota.fulfill({ status: 204 })
    }
    Object.assign(registro, corpo)
    return rota.fulfill({ json: registro })
  })
}

async function abrirCatalogo(page: Page) {
  await page.goto('/')
  await abrirCadastro(page, 'Inventário')
  await expect(page.getByRole('heading', { level: 1, name: 'Inventário' })).toBeVisible()
}

test('lista os grupos de cada categoria com situação e itens', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirCatalogo(page)

  await expect(page.getByRole('tab', { name: 'Serviços e equipamentos' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByText('Lazer', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('row', { name: /Piscina/ })).toContainText('Sim')
  await expect(page.getByRole('row', { name: /Piscina/ })).toContainText('Ativo')
  await expect(page.getByRole('row', { name: /Academia/ })).toContainText('Inativo')
  await expect(page.getByRole('row', { name: /Academia/ })).toContainText('Não')

  await page.getByRole('tab', { name: 'Acessibilidade' }).click()
  await expect(page.getByText('Nenhum grupo em Acessibilidade')).toBeVisible()

  await page.getByRole('tab', { name: 'Sustentabilidade' }).click()
  await expect(page.getByText('SELOS · Exclusivo da Secretaria')).toBeVisible()
  await expect(page.getByText('Nenhum item neste grupo')).toBeVisible()
})

test('edita um grupo mantendo o código travado e a categoria no pedido', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  await page.getByRole('button', { name: 'Editar grupo Lazer' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar Lazer' })
  await expect(dialogo.getByLabel('Código')).toBeDisabled()
  await dialogo.getByLabel('Nome').fill('Lazer e esporte')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('status')).toHaveText('Grupo Lazer e esporte alterado.')
  expect(estado.envios).toMatchObject([
    {
      metodo: 'PUT',
      caminho: '/api/inventario/grupos/1',
      corpo: { nome: 'Lazer e esporte', categoria: 'SERVICOS_EQUIPAMENTOS' },
    },
  ])
})

test('edita um item e troca o complemento', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  await page.getByRole('button', { name: 'Editar Academia' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar Academia' })
  await expect(dialogo.getByLabel('Código')).toBeDisabled()
  await dialogo.getByLabel('Aceita complemento em texto, como no item "Outros"').check()
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('status')).toHaveText('Item Academia alterado.')
  expect(estado.envios[0]).toMatchObject({
    metodo: 'PUT',
    caminho: '/api/inventario/itens/11',
    corpo: { nome: 'Academia', permiteComplemento: true },
  })
  await expect(page.getByRole('row', { name: /Academia/ })).toContainText('Sim')
})

test('inativa e reativa um item', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  await page.getByRole('button', { name: 'Inativar Piscina' }).click()
  await expect(page.getByRole('status')).toHaveText('Item Piscina inativado.')
  await expect(page.getByRole('row', { name: /Piscina/ })).toContainText('Inativo')

  await page.getByRole('button', { name: 'Reativar Piscina' }).click()
  await expect(page.getByRole('status')).toHaveText('Item Piscina reativado.')
  await expect(page.getByRole('row', { name: /Piscina/ })).toContainText('Ativo')
  expect(estado.envios.map(({ caminho }) => caminho)).toEqual([
    '/api/inventario/itens/10/inativar',
    '/api/inventario/itens/10/reativar',
  ])
})

test('inativa e reativa um grupo, e a situação aparece no subtítulo', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirCatalogo(page)

  await page.getByRole('button', { name: 'Inativar grupo Lazer' }).click()
  await expect(page.getByRole('status')).toHaveText('Grupo Lazer inativado.')
  await expect(page.getByText('LAZER · Inativo')).toBeVisible()

  await page.getByRole('button', { name: 'Reativar grupo Lazer' }).click()
  await expect(page.getByRole('status')).toHaveText('Grupo Lazer reativado.')
  await expect(page.getByText('LAZER · Inativo')).toHaveCount(0)
})

test('mostra o erro da API quando a situação não pode ser alterada', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  estado.recusaProxima = { status: 422, detail: 'O grupo tem itens ativos.' }
  await page.getByRole('button', { name: 'Inativar grupo Lazer' }).click()

  await expect(page.getByRole('alert')).toHaveText('O grupo tem itens ativos.')
  await expect(page.getByText('LAZER · Inativo')).toHaveCount(0)
})

test('exclui um item sem uso depois de confirmar', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  await page.getByRole('button', { name: 'Excluir Academia' }).click()
  const confirmacao = page.getByRole('dialog', { name: 'Excluir Academia' })
  await expect(confirmacao.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await confirmacao.getByRole('button', { name: 'Excluir' }).click()

  await expect(page.getByRole('status')).toHaveText('Item Academia excluído.')
  await expect(page.getByRole('row', { name: /Academia/ })).toHaveCount(0)
})

test('item já marcado por um estabelecimento não é excluído e o erro aparece', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  estado.recusaProxima = { status: 422, detail: 'O item Piscina já foi marcado em um inventário.' }
  await page.getByRole('button', { name: 'Excluir Piscina' }).click()
  const confirmacao = page.getByRole('dialog', { name: 'Excluir Piscina' })
  await confirmacao.getByRole('button', { name: 'Excluir' }).click()

  await expect(confirmacao.getByRole('alert')).toHaveText(
    'O item Piscina já foi marcado em um inventário.',
  )
  await confirmacao.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('row', { name: /Piscina/ })).toBeVisible()
})

test('grupo com itens não é excluído, e o sem itens é', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  estado.recusaProxima = { status: 422, detail: 'O grupo Lazer ainda tem itens.' }
  await page.getByRole('button', { name: 'Excluir grupo Lazer' }).click()
  const recusado = page.getByRole('dialog', { name: 'Excluir Lazer' })
  await recusado.getByRole('button', { name: 'Excluir' }).click()
  await expect(recusado.getByRole('alert')).toHaveText('O grupo Lazer ainda tem itens.')
  await recusado.getByRole('button', { name: 'Cancelar' }).click()

  await page.getByRole('tab', { name: 'Sustentabilidade' }).click()
  await page.getByRole('button', { name: 'Excluir grupo Selos da Secretaria' }).click()
  await page
    .getByRole('dialog', { name: 'Excluir Selos da Secretaria' })
    .getByRole('button', { name: 'Excluir' })
    .click()
  await expect(page.getByRole('status')).toHaveText('Grupo Selos da Secretaria excluído.')
  await expect(page.getByText('Nenhum grupo em Sustentabilidade')).toBeVisible()
})

test('barra nome vazio e código inválido sem chamar a API', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  await page.getByRole('button', { name: 'Novo grupo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo grupo' })
  await dialogo.getByRole('button', { name: 'Criar' }).click()
  await expect(dialogo.getByText('Preencha este campo.')).toBeVisible()

  await dialogo.getByLabel('Código').fill('área lazer')
  await dialogo.getByLabel('Nome').fill('Área de lazer')
  await dialogo.getByRole('button', { name: 'Criar' }).click()
  await expect(dialogo.getByText('Use letras sem acento, números e _.')).toBeVisible()
  expect(estado.envios).toHaveLength(0)
})

test('código repetido é recusado pela API no campo do código', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  estado.recusaProxima = { status: 422, detail: 'Já existe um grupo com este código.' }
  await page.getByRole('button', { name: 'Novo grupo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo grupo' })
  await dialogo.getByLabel('Código').fill('LAZER')
  await dialogo.getByLabel('Nome').fill('Outro lazer')
  await dialogo.getByRole('button', { name: 'Criar' }).click()

  await expect(dialogo.getByText('Já existe um grupo com este código.')).toBeVisible()
  await expect(dialogo).toBeVisible()
})

test('cria um grupo exclusivo da Secretaria na categoria aberta', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  await page.getByRole('tab', { name: 'Acessibilidade' }).click()
  await page.getByRole('button', { name: 'Novo grupo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo grupo' })
  await dialogo.getByLabel('Nome').fill('Vistorias')
  await dialogo.getByLabel('Ordem').fill('2')
  await dialogo.getByLabel('Exclusivo da Secretaria: o parceiro não vê nem preenche').check()
  await dialogo.getByRole('button', { name: 'Criar' }).click()

  await expect(page.getByRole('status')).toHaveText('Grupo Vistorias criado.')
  expect(estado.envios[0]).toMatchObject({
    metodo: 'POST',
    caminho: '/api/inventario/grupos',
    corpo: {
      nome: 'Vistorias',
      ordem: 2,
      exclusivoSecretaria: true,
      categoria: 'ACESSIBILIDADE',
    },
  })
  await expect(page.getByText('VISTORIAS · Exclusivo da Secretaria')).toBeVisible()
})

test('cria um item que aceita complemento no grupo escolhido', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirCatalogo(page)

  await page.getByRole('button', { name: 'Novo item' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo item' })
  await expect(dialogo).toContainText('Em Lazer.')
  await dialogo.getByLabel('Nome').fill('Outros')
  await dialogo.getByLabel('Descrição').fill('Itens que não estão na lista')
  await dialogo.getByLabel('Aceita complemento em texto, como no item "Outros"').check()
  await dialogo.getByRole('button', { name: 'Criar' }).click()

  await expect(page.getByRole('status')).toHaveText('Item Outros criado.')
  expect(estado.envios[0]).toMatchObject({
    caminho: '/api/inventario/grupos/1/itens',
    corpo: {
      nome: 'Outros',
      descricao: 'Itens que não estão na lista',
      permiteComplemento: true,
    },
  })
  await expect(page.getByRole('row', { name: /Outros/ })).toContainText('Sim')
})

test('erro ao carregar o catálogo permite tentar de novo', async ({ page }) => {
  await entrar(page, novoEstado())
  let falhou = false
  await page.route('**/api/inventario/catalogo/completo', (rota) => {
    if (falhou) return rota.fallback()
    falhou = true
    return rota.fulfill({ status: 403, json: { status: 403, detail: 'Sem permissão.' } })
  })

  await page.goto('/cadastros/inventario')
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar o catálogo do inventário.',
  )
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('row', { name: /Piscina/ })).toBeVisible()
})
