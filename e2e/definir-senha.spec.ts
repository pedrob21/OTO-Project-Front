import { expect, test, type Page } from '@playwright/test'

async function mockarApi(page: Page) {
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/auth/definir-senha') {
      const { token } = rota.request().postDataJSON() as { token: string }
      if (token === 'link-valido') return rota.fulfill({ status: 204 })
      return rota.fulfill({
        status: 422,
        json: { status: 422, detail: 'Link expirado ou já utilizado.' },
      })
    }
    return rota.fulfill({ json: [] })
  })
}

test.beforeEach(async ({ page }) => {
  await mockarApi(page)
})

test('link válido define a senha e leva ao login', async ({ page }) => {
  await page.goto('/definir-senha?token=link-valido')
  await page.getByLabel('Nova senha').fill('senha-nova-123')
  await page.getByLabel('Confirmar senha').fill('senha-nova-123')
  await page.getByRole('button', { name: 'Definir senha' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('status')).toHaveText(/Senha definida/)
})

test('link usado ou expirado mostra o erro da API', async ({ page }) => {
  await page.goto('/definir-senha?token=link-usado')
  await page.getByLabel('Nova senha').fill('senha-nova-123')
  await page.getByLabel('Confirmar senha').fill('senha-nova-123')
  await page.getByRole('button', { name: 'Definir senha' }).click()

  await expect(page.getByRole('alert')).toHaveText('Link expirado ou já utilizado.')
  await expect(page).toHaveURL(/\/definir-senha\?token=link-usado$/)
})

test('senha curta é barrada com aviso no campo', async ({ page }) => {
  await page.goto('/definir-senha?token=link-valido')
  await page.getByLabel('Nova senha').fill('curta')
  await page.getByLabel('Confirmar senha').fill('curta')
  await page.getByRole('button', { name: 'Definir senha' }).click()

  await expect(page.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeVisible()
})
