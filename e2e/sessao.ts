import type { Page } from '@playwright/test'

/** Deixa uma sessão válida salva antes de a página abrir, como depois do login. */
export async function injetarSessao(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })
}
