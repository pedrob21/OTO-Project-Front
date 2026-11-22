import { expect, test, type Page, type Route } from '@playwright/test'
import { irPeloMenu } from './navegacao.ts'
import { injetarSessao } from './sessao.ts'

function meses(valores: (number | null)[], origem = 'SISTEMA') {
  return valores.map((valor, indice) => ({
    mes: indice + 1,
    valor,
    origem: valor === null ? null : origem,
  }))
}

const VAZIO = Array<null>(12).fill(null)

/** Valores por indicador: 2024 da série histórica, 2025 e 2026 das pesquisas publicadas. */
const SERIES: Record<string, Record<number, (number | null)[]>> = {
  TAXA_OCUPACAO: {
    2024: [50, 52, 55, 58, 60, 61, 80, 57, 50, 49, 51, 66],
    2025: [55, 58, 60, 64, 66, 63, 80, 58.7, 52, 49.5, 51, 70],
    2026: [60, 62, 65, 70, 72, 68, 85, 62.8, null, null, null, null],
  },
  FLUXO_TURISTAS: {
    2024: [
      300_000, 310_000, 320_000, 330_000, 350_000, 360_000, 480_000, 340_000, 300_000, 290_000,
      310_000, 400_000,
    ],
    2025: [
      320_000, 330_000, 350_000, 360_000, 380_000, 370_000, 490_000, 350_000, 320_000, 300_000,
      320_000, 420_000,
    ],
    2026: [
      340_000,
      350_000,
      370_000,
      390_000,
      400_000,
      390_000,
      497_000,
      370_000,
      null,
      null,
      null,
      null,
    ],
  },
  DIARIA_MEDIA: { 2024: VAZIO, 2025: VAZIO, 2026: VAZIO },
}

const FERIADOS = [
  {
    feriadoCodigo: 'CARNAVAL',
    nome: 'Carnaval',
    anos: [
      { ano: 2024, taxaOcupacao: 78, fluxoTotal: 52_000, diariaMedia: 880, origem: 'HISTORICO' },
      { ano: 2025, taxaOcupacao: 80, fluxoTotal: 54_000, diariaMedia: 910, origem: 'SISTEMA' },
      { ano: 2026, taxaOcupacao: 82.5, fluxoTotal: 60_210, diariaMedia: 950, origem: 'SISTEMA' },
    ],
  },
]

async function abrir(page: Page, caminho = '/indicadores') {
  const consultas: string[] = []

  await injetarSessao(page)

  await page.route('**/api/**', (rota: Route) => {
    const url = new URL(rota.request().url())
    const { pathname, searchParams } = url

    if (pathname === '/api/me') {
      return rota.fulfill({ json: { id: 2, nome: 'Pousada do Sol', perfil: 'PARCEIRO' } })
    }
    if (pathname === '/api/dashboard/serie-mensal') {
      consultas.push(url.search)
      const indicador = searchParams.get('indicador') ?? 'TAXA_OCUPACAO'
      const inicio = Number(searchParams.get('anoInicio'))
      const fim = Number(searchParams.get('anoFim'))
      const anos = []
      for (let ano = inicio; ano <= fim; ano++) {
        anos.push({
          ano,
          meses: meses(SERIES[indicador]?.[ano] ?? VAZIO, ano < 2025 ? 'HISTORICO' : 'SISTEMA'),
        })
      }
      return rota.fulfill({ json: { indicador, modalidade: searchParams.get('modalidade'), anos } })
    }
    if (pathname === '/api/dashboard/feriados') return rota.fulfill({ json: FERIADOS })
    // a metodologia, que abre antes, pede os parâmetros vigentes
    return rota.fulfill({
      json: pathname.startsWith('/api/campanhas') || pathname.startsWith('/api/rodadas') ? [] : {},
    })
  })

  await page.goto(caminho)
  return { consultas }
}

test('o menu leva aos indicadores, com a taxa dos três últimos anos', async ({ page }) => {
  await abrir(page, '/metodologia')

  await irPeloMenu(page, 'Indicadores')

  await expect(page).toHaveURL(/\/indicadores$/)
  await expect(
    page.getByRole('group', { name: /Taxa de ocupação mensal, 2024 a 2026/ }),
  ).toBeVisible()
  await expect(page.getByText('62,8% ago.')).toBeVisible()
  await expect(page.getByRole('row', { name: /Carnaval/ })).toContainText('82,5%')
})

test('troca de indicador e de anos, com a tabela mensal', async ({ page }) => {
  const { consultas } = await abrir(page)
  await expect(page.getByRole('group', { name: /Taxa de ocupação mensal/ })).toBeVisible()

  await page.getByRole('radio', { name: 'Fluxo de turistas' }).click()
  await page.getByLabel('De', { exact: true }).selectOption('2025')

  await expect(page).toHaveURL(/indicador=FLUXO_TURISTAS/)
  await expect(page).toHaveURL(/de=2025/)
  const grafico = page.getByRole('group', { name: /Fluxo de turistas mensal, 2025 a 2026/ })
  await expect(grafico).toBeVisible()
  await expect(grafico).toContainText('500 mil')
  expect(consultas.at(-1)).toBe(
    '?indicador=FLUXO_TURISTAS&modalidade=CONSOLIDADA&anoInicio=2025&anoFim=2026',
  )

  await page.getByRole('radio', { name: 'Tabela' }).click()
  const tabela = page.getByRole('table', { name: 'Fluxo de turistas por mês, 2025 a 2026' })
  await expect(tabela.getByRole('row', { name: /Julho/ })).toContainText('497.000')

  await page.reload()
  await expect(page.getByLabel('De', { exact: true })).toHaveValue('2025')
  await expect(page.getByRole('radio', { name: 'Fluxo de turistas' })).toBeChecked()
})

test('indicador sem valores mostra o estado vazio, e o intervalo invertido é recusado', async ({
  page,
}) => {
  await abrir(page, '/indicadores?indicador=DIARIA_MEDIA')

  await expect(page.getByText('Sem valores mensais de 2024 a 2026')).toBeVisible()
  await expect(page.getByRole('row', { name: /Carnaval/ })).toContainText('R$ 950')

  await page.getByLabel('Até', { exact: true }).selectOption('2020')

  await expect(page.getByRole('alert')).toHaveText('O ano inicial não pode ser maior que o final.')
  await expect(page.getByRole('row', { name: /Carnaval/ })).toHaveCount(0)
})
