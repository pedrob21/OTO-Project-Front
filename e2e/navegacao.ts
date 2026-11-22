import { expect, type Page } from '@playwright/test'

/**
 * Clica num item do menu principal. No celular e no tablet, o menu fica recolhido atrás do botão
 * "Menu": abre primeiro, como a pessoa faria.
 */
export async function irPeloMenu(page: Page, item: string) {
  // o cabeçalho só aparece depois de a sessão ser conferida
  await page.getByRole('banner').waitFor()
  const botao = page.getByRole('button', { name: 'Menu', exact: true })
  if (await botao.isVisible()) await botao.click()
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: item })
    .click()
}

/** A página cabe na largura da tela: nada obriga a rolar para o lado (o celular de 360 px). */
export async function semRolagemHorizontal(page: Page) {
  const { conteudo, tela } = (await page.evaluate(
    '({ conteudo: document.documentElement.scrollWidth, tela: window.innerWidth })',
  )) as { conteudo: number; tela: number }
  expect(conteudo, 'a página não deveria rolar para o lado').toBeLessThanOrEqual(tela)
}
