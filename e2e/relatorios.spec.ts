import { expect, test, type Page, type Route } from '@playwright/test'
import { irPeloMenu } from './navegacao.ts'
import { injetarSessao } from './sessao.ts'
import { PUBLICADA_AGOSTO, PUBLICADA_CARNAVAL, RESULTADO_AGOSTO } from './fixtures/resultado.ts'

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
]

const PUBLICADAS = [
  PUBLICADA_AGOSTO,
  PUBLICADA_CARNAVAL,
  {
    campanhaId: 3,
    nome: 'Julho de 2025',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2025-07-01',
    periodoFim: '2025-07-31',
    publicadaEm: '2025-08-12T12:00:00Z',
    taxaOcupacao: 55.1,
    faixa: { codigo: 'BOA', nome: 'Boa' },
    fluxoTotal: 410_300,
  },
]

/** Sessão já salva, como depois do login, e a API simulada. Guarda as buscas feitas à lista. */
async function abrir(page: Page, caminho = '/relatorios') {
  const buscas: string[] = []

  await injetarSessao(page)

  await page.route('**/api/**', (rota: Route) => {
    const url = new URL(rota.request().url())
    const { pathname, searchParams } = url

    if (pathname === '/api/me') {
      return rota.fulfill({ json: { id: 3, nome: 'Vera Lima', perfil: 'VISUALIZADOR' } })
    }
    if (pathname === '/api/referencias') {
      return rota.fulfill({ json: { tiposHospedagem: TIPOS, faixasOcupacao: [] } })
    }
    if (pathname === '/api/campanhas/publicadas') {
      buscas.push(url.search)
      const modalidade = searchParams.get('modalidade')
      const periodo = searchParams.get('tipoPeriodo')
      const ano = searchParams.get('ano')
      return rota.fulfill({
        json: PUBLICADAS.filter(
          (campanha) =>
            (!modalidade || campanha.modalidade === modalidade) &&
            (!periodo || campanha.tipoPeriodo === periodo) &&
            (!ano || campanha.periodoInicio.startsWith(ano)),
        ),
      })
    }
    if (pathname === '/api/campanhas/15/resultado') return rota.fulfill({ json: RESULTADO_AGOSTO })
    if (pathname.endsWith('/resultado.csv')) {
      const id = pathname.split('/')[3]
      return rota.fulfill({
        body: 'campo;valor\n',
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="resultado-campanha-${id}.csv"`,
        },
      })
    }
    return rota.fulfill({ status: 404, json: { detail: `sem rota: ${pathname}` } })
  })

  await page.goto(caminho)
  return { buscas }
}

const linha = (page: Page, nome: string) => page.getByRole('row', { name: new RegExp(nome) })

test('o menu leva aos relatórios, que listam as campanhas publicadas', async ({ page }) => {
  await abrir(page, '/')

  await irPeloMenu(page, 'Relatórios')

  await expect(page).toHaveURL(/\/relatorios$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Relatórios' })).toBeVisible()
  await expect(linha(page, 'Agosto de 2026')).toContainText('62,80%')
  await expect(linha(page, 'Carnaval 2026')).toContainText('Expectativa · Feriado ou evento')
  await expect(page.getByText('3 campanhas publicadas')).toBeVisible()
})

test('os filtros vão para a API e para a URL', async ({ page }) => {
  const { buscas } = await abrir(page)
  await expect(linha(page, 'Julho de 2025')).toBeVisible()

  await page.getByLabel('Ano').selectOption('2025')

  await expect(page).toHaveURL(/ano=2025/)
  await expect(linha(page, 'Agosto de 2026')).toHaveCount(0)
  await expect(linha(page, 'Julho de 2025')).toBeVisible()
  expect(buscas.at(-1)).toBe('?ano=2025')

  await page.reload()
  await expect(page.getByLabel('Ano')).toHaveValue('2025')
  await expect(linha(page, 'Agosto de 2026')).toHaveCount(0)

  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(linha(page, 'Agosto de 2026')).toBeVisible()
})

test('baixa o CSV da linha escolhida', async ({ page }) => {
  await abrir(page)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar CSV de Carnaval 2026' }).click()

  expect((await download).suggestedFilename()).toBe('resultado-campanha-9.csv')
})

test('abre o relatório e a versão impressa esconde a navegação', async ({ page }) => {
  await abrir(page)
  await page.getByRole('link', { name: 'Ver relatório de Agosto de 2026' }).click()

  await expect(page).toHaveURL(/\/resultados\/15$/)
  const titulo = page.getByRole('heading', { level: 1, name: 'Agosto de 2026' })
  await expect(titulo).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gerar relatório (PDF)' })).toBeVisible()
  await expect(page.getByText(/Relatório de resultado · Consolidada/)).toBeHidden()

  await page.emulateMedia({ media: 'print' })

  await expect(titulo).toBeVisible()
  await expect(page.getByText(/Relatório de resultado · Consolidada · Mensal/)).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden()
  await expect(page.getByRole('contentinfo')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Gerar relatório (PDF)' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Baixar CSV' })).toBeHidden()
  await expect(page.getByRole('region', { name: 'Nota metodológica' })).toContainText(/Gerado em/)
  // o sigilo vem da API: o tipo oculto segue oculto no papel
  await expect(page.getByText(/Valores ocultos para preservar o sigilo/)).toBeVisible()
})

test('o botão do PDF chama a impressão do navegador', async ({ page }) => {
  await abrir(page, '/resultados/15')
  await expect(page.getByRole('heading', { level: 1, name: 'Agosto de 2026' })).toBeVisible()
  // troca a impressão por um registro do título da aba (o nome sugerido do PDF)
  await page.evaluate(
    'window.impressoes = []; window.print = () => window.impressoes.push(document.title)',
  )

  await page.getByRole('button', { name: 'Gerar relatório (PDF)' }).click()

  expect(await page.evaluate('window.impressoes')).toEqual(['Relatório OTO - Agosto de 2026'])
})
