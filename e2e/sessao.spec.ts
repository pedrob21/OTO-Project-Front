import { expect, test, type Page } from '@playwright/test'

const usuario = { id: 1, nome: 'Ana Souza', email: 'ana@oto.test', perfil: 'ADMIN', ativo: true }

type Estado = { tokenRecusado: boolean; chamadas: string[] }

async function mockarApi(page: Page, estado: Estado) {
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    estado.chamadas.push(pathname)
    if (pathname === '/api/auth/login') {
      return rota.fulfill({
        json: {
          token: 'token-e2e',
          expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
          usuario,
        },
      })
    }
    if (estado.tokenRecusado) {
      return rota.fulfill({ status: 401, json: { status: 401, detail: 'Token expirado.' } })
    }
    if (pathname === '/api/me') return rota.fulfill({ json: usuario })
    return rota.fulfill({ json: [] })
  })
}

async function entrar(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('senha-correta')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible()
  await page.waitForLoadState('networkidle')
}

const sessaoSalva = (page: Page) => page.evaluate(() => sessionStorage.getItem('oto.sessao'))

test('a API recusa o token no meio do uso: volta ao login com o aviso e apaga a sessão', async ({
  page,
}) => {
  const estado: Estado = { tokenRecusado: false, chamadas: [] }
  await mockarApi(page, estado)
  await entrar(page)
  expect(await sessaoSalva(page)).not.toBeNull()

  estado.tokenRecusado = true
  await page.getByRole('button', { name: 'Cadastros' }).click()
  await page.getByRole('link', { name: 'Usuários' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText(
    'Sua sessão expirou. Entre novamente para continuar.',
  )
  expect(await sessaoSalva(page)).toBeNull()
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toHaveCount(0)
})

test('depois de expirar, entrar de novo limpa o aviso e reabre o app', async ({ page }) => {
  const estado: Estado = { tokenRecusado: false, chamadas: [] }
  await mockarApi(page, estado)
  await entrar(page)

  estado.tokenRecusado = true
  await page.getByRole('button', { name: 'Cadastros' }).click()
  await page.getByRole('link', { name: 'Usuários' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Sua sessão expirou. Entre novamente para continuar.',
  )

  estado.tokenRecusado = false
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('senha-correta')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible()
  expect(await sessaoSalva(page)).not.toBeNull()
})

test('sair pelo menu da conta apaga a sessão e o botão voltar não reabre a tela protegida', async ({
  page,
}) => {
  const estado: Estado = { tokenRecusado: false, chamadas: [] }
  await mockarApi(page, estado)
  await entrar(page)
  await page.getByRole('link', { name: 'Indicadores' }).click()
  await expect(page).toHaveURL(/\/indicadores$/)

  await page.getByRole('button', { name: /Ana Souza/ }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await sessaoSalva(page)).toBeNull()
  await expect(page.getByRole('status')).toHaveCount(0)

  const chamadasAntes = estado.chamadas.length
  await page.goBack()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
  expect(estado.chamadas).toHaveLength(chamadasAntes)
})

test('sessão com expiraEm no passado leva direto ao login, sem chamar a API', async ({ page }) => {
  const estado: Estado = { tokenRecusado: false, chamadas: [] }
  await mockarApi(page, estado)
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-velho', expiraEm: '2020-01-01T00:00:00Z' }),
    )
  })

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible()
  expect(estado.chamadas).toEqual([])
})

test('a sessão vence pelo relógio: válida às 10h, recusada às 11h', async ({ page }) => {
  const estado: Estado = { tokenRecusado: false, chamadas: [] }
  await mockarApi(page, estado)
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2026-11-22T10:30:00-03:00' }),
    )
  })

  await page.clock.setFixedTime(new Date('2026-11-22T10:00:00-03:00'))
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible()

  await page.clock.setFixedTime(new Date('2026-11-22T11:00:00-03:00'))
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})
