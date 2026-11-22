import { expect, test, type Page, type Route } from '@playwright/test'
import { injetarSessao } from './sessao.ts'

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
  { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true },
]

const PUBLICADAS = [
  {
    campanhaId: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
    periodoFim: '2026-08-31',
    publicadaEm: '2026-09-18T12:00:00Z',
  },
  {
    campanhaId: 13,
    nome: 'Julho de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-07-01',
    periodoFim: '2026-07-31',
    publicadaEm: '2026-08-12T12:00:00Z',
  },
]

function resultado(campanha: (typeof PUBLICADAS)[number], taxaOcupacao: number) {
  return {
    campanha: { id: campanha.campanhaId, ...campanha, qtdDiarias: 31, publicada: true },
    publicado: true,
    taxaOcupacao,
    faixa: { codigo: 'OTIMA', nome: 'Ótima' },
    qtdMh: 72,
    qtdMhRespondentes: 58,
    percentualMhRespondentes: 80.6,
    percentualLeitosRespondentes: 91.4,
    fluxoMh: 365_620,
    fluxoRhc: 55_795,
    fluxoDayUse: 75_245,
    fluxoTotal: 496_660,
    fluxoMedioDiario: 16_021,
    diariaMedia: 765,
    receitaHospedagem: 89_000_000,
    porTipo: [
      {
        tipoHospedagemCodigo: 'RESORT',
        nome: 'Resort',
        qtdMh: 9,
        qtdUh: 4_643,
        taxaOcupacao: 66,
        diariaMedia: 836,
        revpar: 552,
        receitaEstimada: 79_400_000,
      },
      {
        tipoHospedagemCodigo: 'POUSADA',
        nome: 'Pousada',
        qtdMh: 41,
        qtdUh: 635,
        taxaOcupacao: 48,
        diariaMedia: 478,
        revpar: 229,
        receitaEstimada: 4_500_000,
      },
    ],
    distribuicaoFaixas: [{ codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61, qtdMh: 21 }],
  }
}

const SERIE = {
  indicador: 'TAXA_OCUPACAO',
  anos: [{ ano: 2026, meses: [{ mes: 8, valor: 62.8 }] }],
}

type Falhas = { serie?: boolean }

/** Sessão já salva, como depois do login: o teste começa na página. */
async function abrirPainel(
  page: Page,
  opcoes: { publicadas?: typeof PUBLICADAS; falhas?: Falhas; caminho?: string } = {},
) {
  const { publicadas = PUBLICADAS, falhas = {}, caminho = '/' } = opcoes
  const csv: string[] = []

  await injetarSessao(page)

  await page.route('**/api/**', (rota: Route) => {
    const { pathname } = new URL(rota.request().url())

    if (pathname === '/api/me') {
      return rota.fulfill({ json: { id: 3, nome: 'Vera Lima', perfil: 'VISUALIZADOR' } })
    }
    if (pathname === '/api/referencias') {
      return rota.fulfill({ json: { tiposHospedagem: TIPOS, faixasOcupacao: [] } })
    }
    if (pathname === '/api/campanhas/publicadas') return rota.fulfill({ json: publicadas })
    if (pathname.endsWith('/resultado.csv')) {
      csv.push(pathname)
      const id = pathname.split('/')[3]
      return rota.fulfill({
        body: 'campo;valor\n',
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="resultado-campanha-${id}.csv"`,
        },
      })
    }
    if (pathname === '/api/campanhas/15/resultado') {
      return rota.fulfill({ json: resultado(PUBLICADAS[0]!, 62.8) })
    }
    if (pathname === '/api/campanhas/13/resultado') {
      return rota.fulfill({ json: resultado(PUBLICADAS[1]!, 51.3) })
    }
    if (pathname === '/api/dashboard/serie-mensal') {
      return falhas.serie
        ? rota.fulfill({ status: 500, json: { detail: 'série fora do ar' } })
        : rota.fulfill({ json: SERIE })
    }
    if (pathname === '/api/dashboard/feriados') return rota.fulfill({ json: [] })
    if (pathname === '/api/rhc/vigente') {
      return rota.fulfill({ json: { qtdRegistros: 478, qtdLeitos: 5116 } })
    }
    if (pathname === '/api/parametros-calculo/vigente') {
      return rota.fulfill({ json: { percentualDayUse: 15.15 } })
    }
    return rota.fulfill({ status: 404, json: { detail: `sem rota: ${pathname}` } })
  })

  await page.goto(caminho)
  return { csv }
}

const destaque = (page: Page, mes: string) =>
  page.getByRole('heading', { name: `Taxa de ocupação hoteleira em ${mes} de 2026` })

test('painel mostra a campanha mais recente e troca de campanha', async ({ page }) => {
  await abrirPainel(page)

  await expect(destaque(page, 'agosto')).toBeVisible()
  await expect(page.getByLabel('Campanha')).toHaveValue('15')
  await expect(page.getByRole('option', { name: 'Agosto de 2026 • consolidada' })).toBeAttached()

  await page.getByLabel('Campanha').selectOption('13')

  await expect(destaque(page, 'julho')).toBeVisible()
  await expect(page).toHaveURL(/campanha=13/)
  await expect(page.getByLabel('Comparar com')).toHaveValue('2025')
})

test('filtro por tipo filtra o desempenho e avisa nos demais cartões', async ({ page }) => {
  await abrirPainel(page)
  await expect(destaque(page, 'agosto')).toBeVisible()
  await expect(page.getByRole('row', { name: /Resort/ })).toBeVisible()

  await page.getByLabel('Tipo de hospedagem').selectOption('POUSADA')

  await expect(page).toHaveURL(/tipo=POUSADA/)
  await expect(page.getByRole('row', { name: /Pousada/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Resort/ })).toHaveCount(0)
  await expect(
    page.getByText('Todos os tipos de hospedagem: este indicador não é separado por tipo.').first(),
  ).toBeVisible()
})

test('baixar csv traz o arquivo da campanha selecionada', async ({ page }) => {
  const { csv } = await abrirPainel(page)
  await expect(destaque(page, 'agosto')).toBeVisible()

  const primeiro = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar CSV' }).click()
  expect((await primeiro).suggestedFilename()).toBe('resultado-campanha-15.csv')

  await page.getByLabel('Campanha').selectOption('13')
  await expect(destaque(page, 'julho')).toBeVisible()
  const segundo = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar CSV' }).click()
  expect((await segundo).suggestedFilename()).toBe('resultado-campanha-13.csv')

  expect(csv).toEqual(['/api/campanhas/15/resultado.csv', '/api/campanhas/13/resultado.csv'])
})

test('sem campanha publicada, mostra o estado vazio no lugar do painel', async ({ page }) => {
  await abrirPainel(page, { publicadas: [] })

  await expect(page.getByText('Nenhuma campanha publicada ainda')).toBeVisible()
  await expect(page.getByLabel('Campanha')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Baixar CSV' })).toHaveCount(0)
})

test('erro num bloco não derruba os outros', async ({ page }) => {
  await abrirPainel(page, { falhas: { serie: true } })

  // o 500 passa pelas novas tentativas do queryClient (1 s e 2 s) antes de virar erro na tela
  await expect(page.getByText('Não foi possível carregar a taxa de ocupação mensal.')).toBeVisible({
    timeout: 10_000,
  })
  await expect(destaque(page, 'agosto')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Desempenho por tipo de hospedagem' }),
  ).toBeVisible()
  await expect(page.getByRole('row', { name: /Resort/ })).toBeVisible()
  await expect(page.getByLabel('Campanha')).toBeVisible()
})
