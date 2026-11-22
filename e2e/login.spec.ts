import { expect, test, type Page } from '@playwright/test'
import { semRolagemHorizontal } from './navegacao.ts'

const usuario = { id: 1, nome: 'Ana Souza', email: 'ana@oto.test', perfil: 'ADMIN', ativo: true }

async function mockarApi(page: Page) {
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/auth/login') {
      const { email, senha } = rota.request().postDataJSON() as { email: string; senha: string }
      if (email === usuario.email && senha === 'senha-correta') {
        return rota.fulfill({
          json: {
            token: 'token-e2e',
            expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
            usuario,
          },
        })
      }
      return rota.fulfill({
        status: 401,
        json: { status: 401, detail: 'E-mail ou senha inválidos.' },
      })
    }
    if (pathname === '/api/me') return rota.fulfill({ json: usuario })
    return rota.fulfill({ json: [] })
  })
}

test.beforeEach(async ({ page }) => {
  await mockarApi(page)
})

test('redireciona para o login sem sessão', { tag: '@celular' }, async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible()
})

test('mostra erro com credenciais inválidas', { tag: '@celular' }, async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button')).not.toHaveCount(0)
  await semRolagemHorizontal(page)
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.')
  await expect(page).toHaveURL(/\/login$/)
})

test('entra no painel e sai', { tag: '@celular' }, async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('senha-correta')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).not.toHaveURL(/\/login$/)
  const menu = page.getByRole('button', { name: /Ana Souza/ })
  await expect(menu).toBeVisible()

  await menu.click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
