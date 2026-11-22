import { expect, test, type Page } from '@playwright/test'

const PARCEIRO = {
  id: 2,
  nome: 'Paula Reis',
  email: 'paula@oto.test',
  perfil: 'PARCEIRO',
  ativo: true,
}
const VISUALIZADOR = { id: 3, nome: 'Vera Lima', email: 'vera@oto.test', perfil: 'VISUALIZADOR' }

const RESUMO = (id: number, nomeFantasia: string) => ({
  id,
  nomeFantasia,
  tipoHospedagemCodigo: 'HOTEL',
  situacao: 'REGULAR',
  ativo: true,
})

const CADASTRO = (id: number, nomeFantasia: string) => ({
  id,
  ativo: true,
  dados: { nomeFantasia, razaoSocial: `${nomeFantasia} Ltda` },
  secretaria: { tipoHospedagemCodigo: 'HOTEL', situacao: 'REGULAR', aceitaPesquisas: true },
})

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
]

async function injetarSessao(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })
}

test.describe('E2E-01 primeiro acesso do parceiro', () => {
  test('define a senha pelo convite, entra e vê só o seu estabelecimento', async ({ page }) => {
    const estado = { senha: '', convitesUsados: new Set<string>(), chamadas: [] as string[] }
    await page.route('**/api/**', (rota) => {
      const pedido = rota.request()
      const { pathname } = new URL(pedido.url())
      estado.chamadas.push(`${pedido.method()} ${pathname}`)

      if (pathname === '/api/auth/definir-senha') {
        const { token, novaSenha, senha } = pedido.postDataJSON() as Record<string, string>
        if (token !== 'convite-hotel-a' || estado.convitesUsados.has(token)) {
          return rota.fulfill({
            status: 422,
            json: { status: 422, detail: 'Link expirado ou já utilizado.' },
          })
        }
        estado.convitesUsados.add(token)
        estado.senha = novaSenha ?? senha ?? ''
        return rota.fulfill({ status: 204 })
      }
      if (pathname === '/api/auth/login') {
        const { email, senha } = pedido.postDataJSON() as { email: string; senha: string }
        if (email !== PARCEIRO.email || senha !== estado.senha || estado.senha === '') {
          return rota.fulfill({
            status: 401,
            json: { status: 401, detail: 'E-mail ou senha inválidos.' },
          })
        }
        return rota.fulfill({
          json: {
            token: 'token-e2e',
            expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
            usuario: PARCEIRO,
          },
        })
      }
      if (pathname === '/api/me') return rota.fulfill({ json: PARCEIRO })
      if (pathname === '/api/referencias') {
        return rota.fulfill({ json: { tiposHospedagem: TIPOS } })
      }
      if (pathname === '/api/estabelecimentos') {
        return rota.fulfill({ json: [RESUMO(7, 'Hotel A')] })
      }
      if (pathname === '/api/estabelecimentos/7')
        return rota.fulfill({ json: CADASTRO(7, 'Hotel A') })
      if (pathname === '/api/estabelecimentos/8') {
        return rota.fulfill({
          status: 403,
          json: { status: 403, detail: 'Sem permissão.' },
        })
      }
      return rota.fulfill({ json: [] })
    })

    await page.goto('/definir-senha?token=convite-hotel-a')
    await page.getByLabel('Nova senha').fill('senha-nova-123')
    await page.getByLabel('Confirmar senha').fill('senha-nova-123')
    await page.getByRole('button', { name: 'Definir senha' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('status')).toHaveText(/Senha definida/)

    await page.getByLabel('E-mail').fill(PARCEIRO.email)
    await page.getByLabel('Senha').fill('senha-nova-123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('button', { name: /Paula Reis/ })).toBeVisible()

    await page.getByRole('link', { name: 'Meu estabelecimento' }).click()
    await expect(page).toHaveURL(/\/meu-estabelecimento$/)
    await expect(page.getByRole('heading', { name: 'Hotel A', exact: true })).toBeVisible()
    await expect(page.getByText('Hotel A Ltda')).toBeVisible()
    await expect(page.getByText('Hotel B')).toHaveCount(0)
    expect(estado.chamadas.filter((chamada) => chamada.includes('/estabelecimentos/8'))).toEqual([])

    await page.goto('/definir-senha?token=convite-hotel-a')
    await page.getByLabel('Nova senha').fill('outra-senha-456')
    await page.getByLabel('Confirmar senha').fill('outra-senha-456')
    await page.getByRole('button', { name: 'Definir senha' }).click()
    await expect(page.getByRole('alert')).toHaveText('Link expirado ou já utilizado.')
    await expect(page).toHaveURL(/\/definir-senha\?token=convite-hotel-a$/)
    expect(estado.senha).toBe('senha-nova-123')
  })

  test('antes de definir a senha, o login do convidado é recusado', async ({ page }) => {
    await page.route('**/api/**', (rota) => {
      if (new URL(rota.request().url()).pathname === '/api/auth/login') {
        return rota.fulfill({
          status: 401,
          json: { status: 401, detail: 'E-mail ou senha inválidos.' },
        })
      }
      return rota.fulfill({ json: [] })
    })

    await page.goto('/login')
    await page.getByLabel('E-mail').fill(PARCEIRO.email)
    await page.getByLabel('Senha').fill('senha-nova-123')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.')
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('E2E-04 perfis e sigilo', () => {
  test('PARCEIRO diante de estabelecimento alheio: a API nega, a tela não vaza e a sessão segue', async ({
    page,
  }) => {
    const chamadas: string[] = []
    await injetarSessao(page)
    await page.route('**/api/**', (rota) => {
      const { pathname } = new URL(rota.request().url())
      chamadas.push(pathname)
      if (pathname === '/api/me') return rota.fulfill({ json: PARCEIRO })
      if (pathname === '/api/referencias') {
        return rota.fulfill({ json: { tiposHospedagem: TIPOS } })
      }
      if (pathname === '/api/inventario/catalogo') return rota.fulfill({ json: [] })
      if (pathname === '/api/estabelecimentos') {
        return rota.fulfill({ json: [RESUMO(7, 'Hotel A'), RESUMO(9, 'Hotel Alheio')] })
      }
      if (pathname === '/api/estabelecimentos/7')
        return rota.fulfill({ json: CADASTRO(7, 'Hotel A') })
      if (/^\/api\/estabelecimentos\/9(\/|$)/.test(pathname)) {
        return rota.fulfill({
          status: 403,
          json: { status: 403, detail: 'Você não tem acesso a este estabelecimento.' },
        })
      }
      if (/^\/api\/estabelecimentos\/7\/(capacidades|inventario)$/.test(pathname)) {
        return rota.fulfill({
          json: pathname.endsWith('inventario') ? { estabelecimentoId: 7, itens: [] } : [],
        })
      }
      return rota.fulfill({ json: [] })
    })

    await page.goto('/meu-estabelecimento')

    await expect(page.getByRole('heading', { name: 'Hotel A', exact: true })).toBeVisible()
    const alertas = page.getByRole('alert')
    await expect(alertas).toHaveCount(1)
    await expect(alertas).toContainText('Não foi possível carregar o cadastro.')
    await expect(alertas).toContainText('Você não tem acesso a este estabelecimento.')
    await expect(page.getByRole('button', { name: 'Editar dados de Hotel Alheio' })).toBeDisabled()
    await expect(page.getByText('Hotel Alheio Ltda')).toHaveCount(0)

    await expect(page).toHaveURL(/\/meu-estabelecimento$/)
    await expect(page.getByRole('button', { name: /Paula Reis/ })).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('oto.sessao'))).not.toBeNull()
    expect(chamadas).toContain('/api/estabelecimentos/9')
    expect(chamadas).not.toContain('/api/estabelecimentos/9/capacidades')
    expect(chamadas).not.toContain('/api/estabelecimentos/9/inventario')
  })

  test('PARCEIRO não vê itens de ADMIN no menu e as rotas de ADMIN dizem sem permissão', async ({
    page,
  }) => {
    const chamadas: string[] = []
    await injetarSessao(page)
    await page.route('**/api/**', (rota) => {
      const { pathname } = new URL(rota.request().url())
      chamadas.push(pathname)
      if (pathname === '/api/me') return rota.fulfill({ json: PARCEIRO })
      return rota.fulfill({ json: [] })
    })

    await page.goto('/')
    await expect(page.getByRole('button', { name: /Paula Reis/ })).toBeVisible()
    const menu = page.getByRole('navigation', { name: 'Principal' })
    await expect(menu.getByRole('link', { name: 'Meu estabelecimento' })).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Cadastros' })).toHaveCount(0)
    await expect(menu.getByRole('link', { name: 'Cadastros' })).toHaveCount(0)

    for (const rota of [
      '/cadastros/usuarios',
      '/cadastros/estabelecimentos',
      '/cadastros/estabelecimentos/9/inventario',
      '/cadastros/parametros',
      '/cadastros/rhc',
      '/cadastros/referencias',
      '/cadastros/inventario',
      '/cadastros/historico',
      '/pesquisas/nova',
    ]) {
      await page.goto(rota)
      await expect(page.getByText('Sem permissão para esta página')).toBeVisible()
    }
    expect(chamadas.filter((c) => c.startsWith('/api/estabelecimentos'))).toEqual([])
    expect(chamadas.filter((c) => c.startsWith('/api/usuarios'))).toEqual([])
  })

  const campanha = {
    id: 50,
    rodadaId: 5,
    nome: 'Consolidada de outubro de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-10-01',
    periodoFim: '2026-10-31',
    publicadaEm: '2026-11-12T15:00:00Z',
    qtdDiarias: 31,
    publicada: true,
  }

  const resultado = {
    campanha,
    publicado: true,
    taxaOcupacao: 64.73,
    faixa: { codigo: 'OTIMA', nome: 'Ótima' },
    diariaMedia: 657.13,
    receitaHospedagem: 776805.3,
    porTipo: [
      {
        tipoHospedagemCodigo: 'HOTEL',
        nome: 'Hotel',
        qtdMh: 20,
        qtdUh: 980,
        taxaOcupacao: 40.35,
        diariaMedia: 657.13,
        revpar: 265.12,
        receitaEstimada: 776805.3,
        omitido: false,
      },
      {
        tipoHospedagemCodigo: 'RESORT',
        nome: 'Resort',
        qtdMh: 2,
        qtdUh: 600,
        omitido: true,
      },
    ],
  }

  async function mockarVisualizador(page: Page) {
    await injetarSessao(page)
    await page.route('**/api/**', (rota) => {
      const { pathname } = new URL(rota.request().url())
      if (pathname === '/api/me') return rota.fulfill({ json: VISUALIZADOR })
      if (pathname === '/api/referencias') {
        return rota.fulfill({ json: { tiposHospedagem: TIPOS, faixasOcupacao: [] } })
      }
      if (pathname === '/api/campanhas/publicadas') {
        return rota.fulfill({
          json: [
            {
              campanhaId: 50,
              nome: campanha.nome,
              modalidade: campanha.modalidade,
              tipoPeriodo: campanha.tipoPeriodo,
              periodoInicio: campanha.periodoInicio,
              periodoFim: campanha.periodoFim,
              publicadaEm: campanha.publicadaEm,
            },
          ],
        })
      }
      if (pathname === '/api/campanhas/50/resultado') return rota.fulfill({ json: resultado })
      if (pathname === '/api/dashboard/serie-mensal') {
        return rota.fulfill({ json: { indicador: 'TAXA_OCUPACAO', anos: [] } })
      }
      if (pathname === '/api/dashboard/feriados') return rota.fulfill({ json: [] })
      if (pathname === '/api/rhc/vigente') {
        return rota.fulfill({ json: { qtdRegistros: 478, qtdLeitos: 5116 } })
      }
      if (pathname === '/api/parametros-calculo/vigente') {
        return rota.fulfill({ json: { percentualDayUse: 15.15 } })
      }
      return rota.fulfill({ json: [] })
    })
  }

  async function conferirSigilo(page: Page) {
    const tabela = page.getByRole('table', { name: 'Desempenho por tipo de hospedagem' })
    const resort = tabela.getByRole('row', { name: /Resort/ })
    await expect(resort).toBeVisible()
    await expect(resort.getByRole('cell')).toHaveCount(2)
    await expect(resort.getByRole('cell').last()).toHaveText(
      'Valores ocultos para preservar o sigilo: poucos estabelecimentos responderam.',
    )
    await expect(resort).not.toContainText('%')
    await expect(resort).not.toContainText('R$')

    const hotel = tabela.getByRole('row', { name: /Hotel/ })
    await expect(hotel).toContainText('40,4%')
    await expect(hotel).toContainText('R$')

    const total = tabela.locator('tfoot tr')
    await expect(total).not.toContainText('%')
    await expect(
      page.getByText('A taxa do total não aparece porque há tipo oculto por sigilo.'),
    ).toBeVisible()
  }

  test('VISUALIZADOR vê o painel com o tipo de poucos respondentes sem valores', async ({
    page,
  }) => {
    await mockarVisualizador(page)
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Taxa de ocupação hoteleira em outubro de 2026' }),
    ).toBeVisible()
    await conferirSigilo(page)

    await page.getByLabel('Tipo de hospedagem').selectOption('RESORT')
    const tabela = page.getByRole('table', { name: 'Desempenho por tipo de hospedagem' })
    await expect(tabela.getByRole('row', { name: /Hotel/ })).toHaveCount(0)
    await expect(tabela.getByRole('row', { name: /Resort/ })).toContainText(
      'Valores ocultos para preservar o sigilo',
    )
    await expect(tabela.getByRole('row', { name: /Resort/ })).not.toContainText('%')
  })

  test('VISUALIZADOR vê o resultado publicado com o tipo oculto, e a tabela não mostra valores', async ({
    page,
  }) => {
    await mockarVisualizador(page)
    await page.goto('/resultados/50')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Consolidada de outubro de 2026' }),
    ).toBeVisible()
    await conferirSigilo(page)
  })
})
