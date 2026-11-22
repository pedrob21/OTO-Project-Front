import { expect, test, type Page } from '@playwright/test'
import { injetarSessao } from './sessao.ts'
import { ADMIN } from './fixtures/usuarios.ts'

type Troca = { senhaAtual: string; novaSenha: string }

async function entrar(
  page: Page,
  aoTrocar: (corpo: Troca) => Parameters<Page['route']>[1] | object,
) {
  await injetarSessao(page)
  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const { pathname } = new URL(pedido.url())
    if (pathname === '/api/me') return rota.fulfill({ json: ADMIN })
    if (pedido.method() === 'PUT' && pathname === '/api/me/senha') {
      return rota.fulfill(aoTrocar(pedido.postDataJSON() as Troca) as object)
    }
    return rota.fulfill({ json: [] })
  })
}

async function abrirTrocaDeSenha(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Ana Souza/ }).click()
  await page.getByRole('menuitem', { name: 'Trocar senha' }).click()
  await expect(page).toHaveURL(/\/minha-senha$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Trocar senha' })).toBeVisible()
}

test('troca a senha pelo menu da conta e limpa o formulário', async ({ page }) => {
  const enviados: Troca[] = []
  await entrar(page, (corpo) => {
    enviados.push(corpo)
    return { status: 204 }
  })
  await abrirTrocaDeSenha(page)

  await page.getByLabel('Senha atual').fill('senha-antiga')
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-nova-123')
  await page.getByLabel('Confirmar senha').fill('senha-nova-123')
  await page.getByRole('button', { name: 'Trocar senha' }).click()

  await expect(page.getByRole('status')).toHaveText('Senha alterada com sucesso.')
  expect(enviados).toEqual([{ senhaAtual: 'senha-antiga', novaSenha: 'senha-nova-123' }])
  await expect(page.getByLabel('Senha atual')).toHaveValue('')
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Confirmar senha')).toHaveValue('')
})

test('barra no campo o que está errado antes de chamar a API', async ({ page }) => {
  const enviados: Troca[] = []
  await entrar(page, (corpo) => {
    enviados.push(corpo)
    return { status: 204 }
  })
  await abrirTrocaDeSenha(page)

  await page.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(page.getByText('Informe a senha atual.')).toBeVisible()
  await expect(page.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeVisible()

  await page.getByLabel('Senha atual').fill('senha-antiga')
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-nova-123')
  await page.getByLabel('Confirmar senha').fill('outra-senha-123')
  await page.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(page.getByText('As senhas não conferem.')).toBeVisible()

  expect(enviados).toHaveLength(0)
})

test('mostra o erro da API quando a senha atual está errada', async ({ page }) => {
  await entrar(page, () => ({
    status: 422,
    json: { status: 422, detail: 'A senha atual está incorreta.' },
  }))
  await abrirTrocaDeSenha(page)

  await page.getByLabel('Senha atual').fill('errada')
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-nova-123')
  await page.getByLabel('Confirmar senha').fill('senha-nova-123')
  await page.getByRole('button', { name: 'Trocar senha' }).click()

  await expect(page.getByRole('alert')).toHaveText('A senha atual está incorreta.')
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue('senha-nova-123')
})
