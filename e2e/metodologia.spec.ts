import { expect, test, type Page } from '@playwright/test'

const VISUALIZADOR = {
  id: 3,
  nome: 'Vera Lima',
  email: 'vera@oto.test',
  perfil: 'VISUALIZADOR',
  ativo: true,
}

const PARAMETROS = {
  id: 1,
  vigenteDesde: '2025-01-01',
  percentualDayUse: 15.15,
  diasEmParques: 2,
  gastoMedioIngresso: 105,
  diasPermanenciaMedia: 4,
  gastoMedioDiario: 250,
  percentualMinimoLeitosPublicacao: 70,
  fonte: 'Estudo OTO 2025',
}

async function entrar(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })
}

test('mostra a explicação e os parâmetros em vigor', async ({ page }) => {
  await entrar(page)
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/me') return rota.fulfill({ json: VISUALIZADOR })
    if (pathname === '/api/parametros-calculo/vigente') return rota.fulfill({ json: PARAMETROS })
    return rota.fulfill({ json: [] })
  })

  await page.goto('/metodologia')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Como calculamos a taxa de ocupação e o fluxo de turistas',
    }),
  ).toBeVisible()
  for (const secao of ['Taxa de ocupação', 'Leito útil', 'Day use', 'Sigilo dos dados']) {
    await expect(page.getByRole('heading', { name: secao, exact: true })).toBeVisible()
  }

  await expect(page.getByRole('heading', { name: 'Valores em vigor' })).toBeVisible()
  const vigentes = page.locator('dl')
  await expect(vigentes.getByText('Day use sobre o público hospedado')).toBeVisible()
  await expect(vigentes.locator('dd').first()).toHaveText('15,15%')
  await expect(vigentes.getByText('Mínimo de leitos respondentes para publicar')).toBeVisible()
  await expect(page.getByText('Em vigor desde 01/01/2025. Fonte: Estudo OTO 2025.')).toBeVisible()
})

test('erro nos parâmetros não esconde o texto e permite tentar de novo', async ({ page }) => {
  await entrar(page)
  let tentativas = 0
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/me') return rota.fulfill({ json: VISUALIZADOR })
    if (pathname === '/api/parametros-calculo/vigente') {
      tentativas += 1
      return tentativas === 1
        ? rota.fulfill({ status: 403, json: { status: 403, detail: 'Sem permissão para isso.' } })
        : rota.fulfill({ json: PARAMETROS })
    }
    return rota.fulfill({ json: [] })
  })

  await page.goto('/metodologia')

  const alerta = page.getByRole('alert')
  await expect(alerta).toContainText('Não foi possível carregar os parâmetros em vigor.')
  await expect(alerta).toContainText('Sem permissão para isso.')
  await expect(page.getByRole('heading', { name: 'Leito útil' })).toBeVisible()

  await alerta.getByRole('button', { name: 'Tentar novamente' }).click()

  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('Fonte: Estudo OTO 2025.')).toBeVisible()
})

async function mockarMetodologia(
  page: Page,
  usuario: object,
  parametros: () => Promise<object> | object,
) {
  await entrar(page)
  await page.route('**/api/**', async (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/me') return rota.fulfill({ json: usuario })
    if (pathname === '/api/parametros-calculo/vigente') {
      return rota.fulfill({ json: await parametros() })
    }
    return rota.fulfill({ json: [] })
  })
}

test('formata cada valor em vigor e mostra as faixas de ocupação', async ({ page }) => {
  await mockarMetodologia(page, VISUALIZADOR, () => ({
    ...PARAMETROS,
    percentualDayUse: 12.5,
    percentualMinimoLeitosPublicacao: 80,
  }))

  await page.goto('/metodologia')

  const valores = page.locator('dl > div')
  await expect(valores).toHaveCount(6)
  const esperado: [string, RegExp][] = [
    ['Day use sobre o público hospedado', /^12,50%$/],
    ['Dias de ingresso em parque', /^2$/],
    ['Valor médio do ingresso', /^R\$\s105$/],
    ['Dias de gasto médio', /^4$/],
    ['Valor do gasto médio diário', /^R\$\s250$/],
    ['Mínimo de leitos respondentes para publicar', /^80%$/],
  ]
  for (const [rotulo, valor] of esperado) {
    await expect(valores.filter({ hasText: rotulo }).locator('dd')).toHaveText(valor)
  }

  const faixas = page.getByRole('heading', { name: 'Faixas de ocupação' })
  await expect(faixas).toBeVisible()
  const lista = page
    .getByRole('listitem')
    .filter({ hasText: /^(Ruim|Regular|Boa|Ótima|Excelente):/ })
  await expect(lista).toHaveText([
    'Ruim: até 20%',
    'Regular: de 21 a 40%',
    'Boa: de 41 a 60%',
    'Ótima: de 61 a 80%',
    'Excelente: de 81 a 100%',
  ])
})

test('sem fonte cadastrada, a vigência aparece só com a data', async ({ page }) => {
  await mockarMetodologia(page, VISUALIZADOR, () => ({ ...PARAMETROS, fonte: undefined }))

  await page.goto('/metodologia')

  await expect(page.getByText('Em vigor desde 01/01/2025.', { exact: true })).toBeVisible()
  await expect(page.getByText(/Fonte:/)).toHaveCount(0)
})

test('mostra o carregamento dos parâmetros sem esconder o texto da metodologia', async ({
  page,
}) => {
  let liberar: () => void = () => {}
  const espera = new Promise<void>((resolver) => {
    liberar = resolver
  })
  await mockarMetodologia(page, VISUALIZADOR, async () => {
    await espera
    return PARAMETROS
  })

  await page.goto('/metodologia')

  await expect(page.getByText('Carregando os parâmetros')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Leito útil' })).toBeVisible()
  await expect(page.locator('dl')).toHaveCount(0)

  liberar()
  await expect(page.getByText('Carregando os parâmetros')).toHaveCount(0)
  await expect(page.locator('dl > div')).toHaveCount(6)
})

test('todos os perfis abrem a página, e cada um com o seu menu', async ({ page }) => {
  for (const [perfil, nome] of [
    ['ADMIN', 'Ana Souza'],
    ['PARCEIRO', 'Paula Reis'],
  ] as const) {
    await mockarMetodologia(
      page,
      { id: 9, nome, email: 'x@oto.test', perfil, ativo: true },
      () => PARAMETROS,
    )
    await page.goto('/metodologia')

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Como calculamos a taxa de ocupação',
    )
    await expect(page.getByText('Sem permissão para esta página')).toHaveCount(0)
    await expect(page.getByRole('button', { name: new RegExp(nome) })).toBeVisible()
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  }
})

test('sem sessão, a metodologia leva ao login', async ({ page }) => {
  await page.route('**/api/**', (rota) => rota.fulfill({ status: 401, json: {} }))

  await page.goto('/metodologia')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('o painel leva à metodologia pelo link da taxa de ocupação', async ({ page }) => {
  const campanha = {
    campanhaId: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
    periodoFim: '2026-08-31',
    publicadaEm: '2026-09-18T12:00:00Z',
  }
  await entrar(page)
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/me') return rota.fulfill({ json: VISUALIZADOR })
    if (pathname === '/api/referencias') {
      return rota.fulfill({ json: { tiposHospedagem: [], faixasOcupacao: [] } })
    }
    if (pathname === '/api/campanhas/publicadas') return rota.fulfill({ json: [campanha] })
    if (pathname === '/api/campanhas/15/resultado') {
      return rota.fulfill({
        json: {
          campanha: { id: 15, ...campanha, qtdDiarias: 31, publicada: true },
          publicado: true,
          taxaOcupacao: 62.8,
          qtdMh: 72,
          qtdMhRespondentes: 58,
          porTipo: [],
          distribuicaoFaixas: [],
        },
      })
    }
    if (pathname === '/api/parametros-calculo/vigente') return rota.fulfill({ json: PARAMETROS })
    return rota.fulfill({ status: 404, json: { detail: `sem rota: ${pathname}` } })
  })

  await page.goto('/')
  await page
    .getByRole('link', { name: 'Como calculamos a taxa de ocupação e o fluxo de turistas' })
    .click()

  await expect(page).toHaveURL(/\/metodologia$/)
  await expect(page.getByRole('heading', { name: 'Valores em vigor' })).toBeVisible()
  await expect(page.locator('dl > div')).toHaveCount(6)
})
