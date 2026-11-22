import { expect, test, type Page } from '@playwright/test'

const ADMIN = {
  id: 1,
  nome: 'Ana Souza',
  email: 'ana@oto.test',
  perfil: 'ADMIN',
  ativo: true,
}

const RODADAS = [
  { id: 4, codigo: '017/26', titulo: 'Anterior', status: 'ENCERRADA', campanhas: [] },
]

type Envio = { metodo: string; caminho: string; corpo: unknown }

type Api = { envios: Envio[] }

/** Dia fixo: o código, o mês e o prazo sugeridos não dependem do dia em que o teste roda. */
async function entrar(page: Page): Promise<Api> {
  const api: Api = { envios: [] }
  await page.clock.setFixedTime(new Date('2026-11-16T12:00:00-03:00'))
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })
  let ultimaCampanha = 100
  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    const chave = `${metodo} ${pathname}`

    if (chave === 'GET /api/me') return rota.fulfill({ json: ADMIN })
    if (chave === 'GET /api/rodadas') return rota.fulfill({ json: RODADAS })
    if (chave === 'GET /api/referencias') {
      return rota.fulfill({
        json: {
          tiposHospedagem: [],
          feriados: [
            { codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 },
            { codigo: 'NATAL', nome: 'Natal', ordem: 2 },
          ],
          faixasOcupacao: [],
        },
      })
    }
    if (metodo !== 'POST') return rota.fulfill({ json: [] })

    const corpo = pedido.postDataJSON() as Record<string, unknown>
    api.envios.push({ metodo, caminho: pathname, corpo })

    if (chave === 'POST /api/rodadas') {
      return rota.fulfill({ status: 201, json: { id: 9, ...corpo, status: 'RASCUNHO' } })
    }
    if (chave === 'POST /api/rodadas/9/campanhas') {
      ultimaCampanha += 1
      return rota.fulfill({ status: 201, json: { id: ultimaCampanha, ...corpo } })
    }
    if (chave === 'POST /api/rodadas/9/abrir') {
      return rota.fulfill({
        json: { id: 9, codigo: '018/26', status: 'ABERTA', prazoResposta: corpo.prazoResposta },
      })
    }
    return rota.fulfill({ json: [] })
  })
  return api
}

async function adicionarCarnaval(page: Page) {
  await page.getByRole('button', { name: 'Adicionar campanha' }).click()
  const campanha = page.getByRole('listitem', { name: 'Campanha 2' })
  await campanha.getByLabel('Qual feriado').selectOption('CARNAVAL')
  await campanha.getByLabel('Primeiro dia').fill('2027-02-13')
  await campanha.getByLabel('Último dia').fill('2027-02-17')
  return campanha
}

test('cria a pesquisa com uma campanha mensal e uma de feriado e abre para respostas', async ({
  page,
}) => {
  const api = await entrar(page)
  await page.goto('/pesquisas/nova')

  await expect(page.getByRole('heading', { level: 1, name: 'Nova pesquisa' })).toBeVisible()
  await expect(page.getByLabel('Código')).toHaveValue('018/26')
  await expect(page.getByText('Próximo número do ano.')).toBeVisible()

  const primeira = page.getByRole('listitem', { name: 'Campanha 1' })
  await expect(primeira.getByLabel('Mês')).toHaveValue('10')
  await expect(primeira.getByLabel('Ano')).toHaveValue('2026')
  await expect(primeira.getByLabel('Nome da campanha')).toHaveValue(
    'Consolidada de outubro de 2026',
  )
  await expect(primeira.getByLabel('Diárias')).toHaveValue('31')

  await page.getByLabel('Título').fill('Consolidada de outubro e expectativa do Carnaval')
  const segunda = await adicionarCarnaval(page)
  await expect(segunda.getByLabel('Nome da campanha')).toHaveValue('Expectativa Carnaval 2027')
  await expect(segunda.getByLabel('Diárias')).toHaveValue('5')
  await page.getByLabel('Prazo de resposta').fill('2026-11-30')

  const previa = page.getByRole('complementary', { name: 'Prévia e envio' })
  await expect(previa.getByText('Rodada 018/26')).toBeVisible()
  await expect(previa.getByText('Consolidada de outubro e expectativa do Carnaval')).toBeVisible()
  await expect(previa).toContainText('Expectativa Carnaval 2027')

  await page.getByRole('button', { name: 'Abrir pesquisa' }).click()

  await expect(
    page.getByRole('heading', { name: 'Pesquisa 018/26 aberta para respostas' }),
  ).toBeVisible()
  await expect(
    page.getByText('Os meios de hospedagem podem responder até 30/11/2026 (faltam 14 dias).'),
  ).toBeVisible()
  const resumo = page.getByRole('list').filter({ hasText: 'Expectativa Carnaval 2027' })
  await expect(resumo).toContainText('Consolidada de outubro de 2026')
  await expect(resumo).toContainText('31 diárias')
  await expect(resumo).toContainText('5 diárias')

  expect(api.envios).toEqual([
    {
      metodo: 'POST',
      caminho: '/api/rodadas',
      corpo: { codigo: '018/26', titulo: 'Consolidada de outubro e expectativa do Carnaval' },
    },
    {
      metodo: 'POST',
      caminho: '/api/rodadas/9/campanhas',
      corpo: {
        nome: 'Consolidada de outubro de 2026',
        modalidade: 'CONSOLIDADA',
        tipoPeriodo: 'MENSAL',
        periodoInicio: '2026-10-01',
        periodoFim: '2026-10-31',
        qtdDiarias: 31,
      },
    },
    {
      metodo: 'POST',
      caminho: '/api/rodadas/9/campanhas',
      corpo: {
        nome: 'Expectativa Carnaval 2027',
        modalidade: 'EXPECTATIVA',
        tipoPeriodo: 'FERIADO',
        feriadoCodigo: 'CARNAVAL',
        periodoInicio: '2027-02-13',
        periodoFim: '2027-02-17',
        qtdDiarias: 5,
      },
    },
    { metodo: 'POST', caminho: '/api/rodadas/9/abrir', corpo: { prazoResposta: '2026-11-30' } },
  ])

  await page.getByRole('button', { name: 'Criar outra pesquisa' }).click()
  await expect(page.getByLabel('Título')).toHaveValue('')
  await expect(page.getByLabel('Código')).toHaveValue('018/26')
})

test('sem título e sem prazo, o resumo de erros leva ao campo e nada é enviado', async ({
  page,
}) => {
  const api = await entrar(page)
  await page.goto('/pesquisas/nova')
  await expect(page.getByLabel('Código')).toHaveValue('018/26')

  await page.getByRole('button', { name: 'Abrir pesquisa' }).click()

  await expect(
    page.getByRole('heading', { name: 'Revise 2 campos antes de abrir a pesquisa' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Título: Informe o título da pesquisa.' }).click()
  await expect(page.getByLabel('Título')).toBeFocused()
  await expect(page.getByText('Informe o prazo de resposta.').first()).toBeVisible()
  expect(api.envios).toHaveLength(0)

  await page.getByLabel('Título').fill('Consolidada de outubro')
  await page.getByLabel('Prazo de resposta').fill('2026-11-30')
  await expect(page.getByText('Informe o título da pesquisa.')).toHaveCount(0)
})

test('barra campanha repetida e diárias acima do período, e permite remover a campanha', async ({
  page,
}) => {
  const api = await entrar(page)
  await page.goto('/pesquisas/nova')
  await expect(page.getByLabel('Código')).toHaveValue('018/26')
  await page.getByLabel('Título').fill('Consolidada de outubro')
  await page.getByLabel('Prazo de resposta').fill('2026-11-30')

  await page.getByRole('button', { name: 'Adicionar campanha' }).click()
  const segunda = page.getByRole('listitem', { name: 'Campanha 2' })
  await segunda.getByRole('radio', { name: 'Consolidada' }).check()
  await segunda.getByRole('radio', { name: 'Mensal' }).check()
  await expect(
    segunda.getByText('Já há uma campanha desta modalidade para este período.'),
  ).toBeVisible()

  const primeira = page.getByRole('listitem', { name: 'Campanha 1' })
  await primeira.getByLabel('Diárias').fill('40')
  await page.getByRole('button', { name: 'Abrir pesquisa' }).click()
  await expect(primeira.getByText('Use até 31: o período tem 31 dias.')).toBeVisible()
  expect(api.envios).toHaveLength(0)

  await page.getByRole('button', { name: 'Remover a campanha 2' }).click()
  await expect(page.getByRole('listitem', { name: 'Campanha 2' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Remover a campanha/ })).toHaveCount(0)
  await primeira.getByRole('button', { name: 'Usar 31' }).click()
  await expect(primeira.getByLabel('Diárias')).toHaveValue('31')
})

test('falha numa campanha mantém o que já foi criado e o reenvio continua de onde parou', async ({
  page,
}) => {
  const api = await entrar(page)
  await page.goto('/pesquisas/nova')
  await expect(page.getByLabel('Código')).toHaveValue('018/26')
  await page.getByLabel('Título').fill('Consolidada de outubro e Carnaval')
  await adicionarCarnaval(page)
  await page.getByLabel('Prazo de resposta').fill('2026-11-30')

  let campanhas = 0
  await page.route('**/api/rodadas/9/campanhas', (rota) => {
    campanhas += 1
    if (campanhas !== 2) return rota.fallback()
    return rota.fulfill({
      status: 422,
      json: { status: 422, detail: 'Já existe campanha neste período.' },
    })
  })

  await page.getByRole('button', { name: 'Abrir pesquisa' }).click()

  const falha = page
    .getByRole('alert')
    .filter({ hasText: 'Não foi possível incluir uma das campanhas.' })
  await expect(falha).toContainText('Já existe campanha neste período.')
  await expect(
    page.getByText(
      'A pesquisa 018/26 já foi criada, com 1 de 2 campanhas. Corrija e envie de novo: o envio continua de onde parou.',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('listitem', { name: 'Campanha 1' }).getByText('Incluída'),
  ).toBeVisible()
  await expect(page.getByLabel('Título')).toBeDisabled()

  await page.getByRole('button', { name: 'Abrir pesquisa' }).click()

  await expect(
    page.getByRole('heading', { name: 'Pesquisa 018/26 aberta para respostas' }),
  ).toBeVisible()
  const criacoes = api.envios.filter(({ caminho }) => caminho === '/api/rodadas')
  const inclusoes = api.envios.filter(({ caminho }) => caminho === '/api/rodadas/9/campanhas')
  expect(criacoes).toHaveLength(1)
  expect(inclusoes).toHaveLength(2)
})

test('vai para o painel depois de abrir a pesquisa', async ({ page }) => {
  await entrar(page)
  await page.goto('/pesquisas/nova')
  await expect(page.getByLabel('Código')).toHaveValue('018/26')
  await page.getByLabel('Título').fill('Consolidada de outubro')
  await page.getByLabel('Prazo de resposta').fill('2026-11-30')
  await page.getByRole('button', { name: 'Abrir pesquisa' }).click()

  await page.getByRole('button', { name: 'Ir para o painel' }).click()
  await expect(page).toHaveURL(/\/$/)
})
