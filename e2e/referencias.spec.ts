import { expect, test, type Page } from '@playwright/test'

const ADMIN = {
  id: 1,
  nome: 'Ana Souza',
  email: 'ana@oto.test',
  perfil: 'ADMIN',
  ativo: true,
}

type Item = { codigo: string; nome: string; ordem?: number; calculaReceita?: boolean }
type Faixa = { codigo: string; nome: string; percentualMinimo: number }

type Estado = {
  tipos: Item[]
  feriados: Item[]
  faixas: Faixa[]
  recusaProxima?: { status: number; json: object }
  enviados: { metodo: string; caminho: string; corpo: unknown }[]
}

function novoEstado(): Estado {
  return {
    tipos: [
      { codigo: 'HOTEL', nome: 'Hotel', ordem: 1, calculaReceita: true },
      { codigo: 'POUSADA', nome: 'Pousada', ordem: 2, calculaReceita: false },
    ],
    feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 }],
    faixas: [
      { codigo: 'RUIM', nome: 'Ruim', percentualMinimo: 0 },
      { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41 },
    ],
    enviados: [],
  }
}

/** API em memória: as listas mudam com o que a tela grava. */
async function entrar(page: Page, estado: Estado) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })
  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    if (pathname === '/api/me') return rota.fulfill({ json: ADMIN })
    if (metodo === 'GET' && pathname === '/api/referencias') {
      return rota.fulfill({
        json: {
          tiposHospedagem: estado.tipos,
          feriados: estado.feriados,
          faixasOcupacao: estado.faixas,
        },
      })
    }

    const recurso = pathname.match(
      /^\/api\/referencias\/(tipos-hospedagem|feriados|faixas)(?:\/(\w+))?$/,
    )
    if (!recurso) return rota.fulfill({ json: [] })
    const [, nome, codigo] = recurso
    const lista = (
      nome === 'tipos-hospedagem'
        ? estado.tipos
        : nome === 'feriados'
          ? estado.feriados
          : estado.faixas
    ) as { codigo: string }[]

    estado.enviados.push({
      metodo,
      caminho: pathname,
      corpo: metodo === 'DELETE' ? null : pedido.postDataJSON(),
    })
    if (estado.recusaProxima) {
      const recusa = estado.recusaProxima
      estado.recusaProxima = undefined
      return rota.fulfill(recusa)
    }
    if (metodo === 'DELETE') {
      lista.splice(
        lista.findIndex((item) => item.codigo === codigo),
        1,
      )
      return rota.fulfill({ status: 204 })
    }
    const dados = pedido.postDataJSON() as Record<string, unknown>
    if (metodo === 'POST') {
      const gerado =
        (dados.codigo as string | undefined) ??
        (dados.nome as string).normalize('NFD').replace(/\W/g, '').toUpperCase()
      const novo = { ...dados, codigo: gerado } as { codigo: string }
      lista.push(novo)
      return rota.fulfill({ status: 201, json: novo })
    }
    const indice = lista.findIndex((item) => item.codigo === codigo)
    lista[indice] = { ...lista[indice], ...dados, codigo: codigo! }
    return rota.fulfill({ json: lista[indice] })
  })
}

async function abrirReferencias(page: Page) {
  await page.goto('/')
  const cadastros = page.getByRole('button', { name: 'Cadastros' })
  await cadastros.click()
  await expect(cadastros).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('link', { name: 'Referências' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Referências' })).toBeVisible()
}

test('lista os tipos de hospedagem e troca de aba pelo clique e pelo teclado', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirReferencias(page)

  await expect(page.getByRole('tab', { name: 'Tipos de hospedagem' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('row', { name: /Hotel/ })).toContainText('Sim')
  await expect(page.getByRole('row', { name: /Pousada/ })).toContainText('Não')

  await page.getByRole('tab', { name: 'Feriados e eventos' }).click()
  await expect(page.getByRole('row', { name: /Carnaval/ })).toBeVisible()

  await page.getByRole('tab', { name: 'Feriados e eventos' }).press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Faixas de ocupação' })).toBeFocused()
  await expect(page.getByRole('row', { name: /Boa/ })).toContainText('41,00%')
})

test('cria um tipo de hospedagem sem informar o código', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirReferencias(page)

  await page.getByRole('button', { name: 'Novo tipo de hospedagem' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo tipo de hospedagem' })
  await dialogo.getByRole('button', { name: 'Criar' }).click()
  await expect(dialogo.getByText('Preencha este campo.')).toBeVisible()
  expect(estado.enviados).toHaveLength(0)

  await dialogo.getByLabel('Nome').fill('Chalé')
  await dialogo.getByLabel('Entra na diária média, no RevPAR e na receita estimada').check()
  await dialogo.getByRole('button', { name: 'Criar' }).click()

  await expect(page.getByRole('status')).toHaveText('Tipo de hospedagem Chalé criado.')
  expect(estado.enviados).toMatchObject([
    {
      metodo: 'POST',
      caminho: '/api/referencias/tipos-hospedagem',
      corpo: { nome: 'Chalé', calculaReceita: true },
    },
  ])
  await expect(page.getByRole('row', { name: /Chalé/ })).toContainText('Sim')
})

test('edita um feriado mantendo o código travado', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirReferencias(page)
  await page.getByRole('tab', { name: 'Feriados e eventos' }).click()

  await page.getByRole('button', { name: 'Editar Carnaval' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar Carnaval' })
  await expect(dialogo.getByLabel('Código')).toBeDisabled()
  await dialogo.getByLabel('Nome').fill('Carnaval de rua')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('status')).toHaveText('Feriado ou evento Carnaval de rua alterado.')
  expect(estado.enviados[0]).toMatchObject({
    metodo: 'PUT',
    caminho: '/api/referencias/feriados/CARNAVAL',
  })
  await expect(page.getByRole('row', { name: /Carnaval de rua/ })).toBeVisible()
})

test('a primeira faixa de ocupação tem o percentual travado em zero', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirReferencias(page)
  await page.getByRole('tab', { name: 'Faixas de ocupação' }).click()

  await page.getByRole('button', { name: 'Editar Ruim' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Editar Ruim' }).getByLabel('A partir de (%)'),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Cancelar' }).click()

  await page.getByRole('button', { name: 'Editar Boa' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Editar Boa' }).getByLabel('A partir de (%)'),
  ).toBeEnabled()
})

test('exclui uma referência sem uso e mostra a recusa de uma que está em uso', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirReferencias(page)

  estado.recusaProxima = {
    status: 422,
    json: { status: 422, detail: 'O tipo Hotel está em uso por estabelecimentos.' },
  }
  await page.getByRole('button', { name: 'Excluir Hotel' }).click()
  const recusada = page.getByRole('dialog', { name: 'Excluir Hotel' })
  await expect(recusada.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await recusada.getByRole('button', { name: 'Excluir' }).click()
  await expect(recusada.getByRole('alert')).toHaveText(
    'O tipo Hotel está em uso por estabelecimentos.',
  )
  await recusada.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('row', { name: /Hotel/ })).toBeVisible()

  await page.getByRole('button', { name: 'Excluir Pousada' }).click()
  await page
    .getByRole('dialog', { name: 'Excluir Pousada' })
    .getByRole('button', { name: 'Excluir' })
    .click()
  await expect(page.getByRole('status')).toHaveText('Tipo de hospedagem Pousada excluído.')
  await expect(page.getByRole('row', { name: /Pousada/ })).toHaveCount(0)
})

test('erro ao carregar as referências permite tentar de novo', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  let falhou = false
  await page.route('**/api/referencias', (rota) => {
    if (falhou) return rota.fallback()
    falhou = true
    return rota.fulfill({ status: 403, json: { status: 403, detail: 'Sem permissão.' } })
  })

  await page.goto('/cadastros/referencias')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar as referências.')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('row', { name: /Hotel/ })).toBeVisible()
})
