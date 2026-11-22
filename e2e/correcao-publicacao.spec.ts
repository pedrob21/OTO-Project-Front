import { expect, test, type Page } from '@playwright/test'
import { irPeloMenu } from './navegacao.ts'

const ADMIN = { id: 1, nome: 'Ana Souza', perfil: 'ADMIN' }

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
]

const CAMPANHA = {
  id: 50,
  rodadaId: 5,
  nome: 'Consolidada de outubro de 2026',
  modalidade: 'CONSOLIDADA',
  tipoPeriodo: 'MENSAL',
  periodoInicio: '2026-10-01',
  periodoFim: '2026-10-31',
  qtdDiarias: 31,
}

const LEITOS = { HOTEL: 300, RESORT: 700 }

type Estado = {
  publicada: boolean
  taxaHotel: number
  versaoHotel: number
  /** o resultado fica congelado no momento da publicação, como na API */
  publicado?: ReturnType<typeof calcular>
  envios: string[]
}

function calcular(estado: Estado) {
  const taxaResort = 80
  const taxa = (estado.taxaHotel * LEITOS.HOTEL + taxaResort * LEITOS.RESORT) / 1000
  return {
    campanha: CAMPANHA,
    taxaOcupacao: Math.round(taxa * 100) / 100,
    faixa: { codigo: 'OTIMA', nome: 'Ótima' },
    qtdMh: 2,
    qtdMhRespondentes: 2,
    percentualMhRespondentes: 100,
    leitosTotal: 1000,
    leitosRespondentes: 1000,
    percentualLeitosRespondentes: 100,
    porTipo: [
      { tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel', qtdMh: 1, taxaOcupacao: estado.taxaHotel },
      { tipoHospedagemCodigo: 'RESORT', nome: 'Resort', qtdMh: 1, taxaOcupacao: taxaResort },
    ],
  }
}

function csv(resultado: ReturnType<typeof calcular>) {
  const decimal = (valor: number) => valor.toFixed(2).replace('.', ',')
  return [
    'indicador;valor',
    `taxa_ocupacao;${decimal(resultado.taxaOcupacao)}`,
    ...resultado.porTipo.map(
      (tipo) => `taxa_ocupacao_${tipo.tipoHospedagemCodigo};${decimal(tipo.taxaOcupacao)}`,
    ),
  ].join('\n')
}

const NAO_PUBLICADA = { status: 422, json: { status: 422, detail: 'Campanha não publicada.' } }

async function mockarApi(page: Page, estado: Estado) {
  await page.clock.setFixedTime(new Date('2026-11-22T10:00:00-03:00'))
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })

  const rodada = () => ({
    id: 5,
    codigo: '005/26',
    titulo: 'Consolidada de outubro',
    status: 'ENCERRADA',
    dataAbertura: '2026-11-01',
    prazoResposta: '2026-11-15',
    campanhas: [
      {
        ...CAMPANHA,
        publicada: estado.publicada,
        publicadaEm: estado.publicada ? '2026-11-20T12:00:00Z' : undefined,
      },
    ],
  })
  const resposta = () => ({
    id: 303,
    estabelecimentoId: 7,
    taxaOcupacao: estado.taxaHotel,
    diariaMedia: 420,
    versao: estado.versaoHotel,
    enviadoEm: '2026-11-10T12:00:00Z',
  })

  await page.route('**/api/**', (rota) => {
    const pedido = rota.request()
    const { pathname } = new URL(pedido.url())
    const chave = `${pedido.method()} ${pathname}`
    if (pedido.method() !== 'GET') estado.envios.push(chave)

    if (chave === 'GET /api/me') return rota.fulfill({ json: ADMIN })
    if (chave === 'GET /api/referencias') {
      return rota.fulfill({
        json: {
          tiposHospedagem: TIPOS,
          faixasOcupacao: [{ codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61 }],
        },
      })
    }
    if (chave === 'GET /api/campanhas/publicadas') {
      return rota.fulfill({
        json: estado.publicada
          ? [{ campanhaId: 50, ...CAMPANHA, publicadaEm: '2026-11-20T12:00:00Z' }]
          : [],
      })
    }
    if (chave === 'GET /api/campanhas/50/resultado') {
      return estado.publicada && estado.publicado
        ? rota.fulfill({ json: { ...estado.publicado, publicado: true } })
        : rota.fulfill(NAO_PUBLICADA)
    }
    if (chave === 'GET /api/campanhas/50/resultado.csv') {
      if (!estado.publicada || !estado.publicado) return rota.fulfill(NAO_PUBLICADA)
      return rota.fulfill({
        body: csv(estado.publicado),
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="resultado-campanha-50.csv"',
        },
      })
    }
    if (chave === 'GET /api/rodadas') return rota.fulfill({ json: [rodada()] })
    if (chave === 'GET /api/rodadas/5') return rota.fulfill({ json: rodada() })
    if (chave === 'GET /api/rodadas/5/acompanhamento') {
      return rota.fulfill({
        json: {
          rodadaId: 5,
          codigo: '005/26',
          status: 'ENCERRADA',
          campanhas: [
            {
              campanhaId: 50,
              nome: CAMPANHA.nome,
              qtdMh: 2,
              qtdRespondentes: 2,
              leitosTotal: 1000,
              leitosRespondentes: 1000,
              percentualLeitosRespondentes: 100,
              percentualMinimoPublicacao: 70,
              atingiuMinimo: true,
              estabelecimentos: [
                {
                  estabelecimentoId: 7,
                  nomeFantasia: 'Hotel Thermas',
                  tipoHospedagemCodigo: 'HOTEL',
                  qtdLeitos: LEITOS.HOTEL,
                  respondeu: true,
                  versao: estado.versaoHotel,
                },
                {
                  estabelecimentoId: 9,
                  nomeFantasia: 'Resort Águas',
                  tipoHospedagemCodigo: 'RESORT',
                  qtdLeitos: LEITOS.RESORT,
                  respondeu: true,
                  versao: 1,
                },
              ],
            },
          ],
        },
      })
    }
    if (chave === 'GET /api/campanhas/50/respostas') return rota.fulfill({ json: [resposta()] })
    if (chave === 'GET /api/respostas/303/historico') return rota.fulfill({ json: [] })
    if (chave === 'PUT /api/campanhas/50/respostas/7') {
      if (estado.publicada) {
        return rota.fulfill({
          status: 422,
          json: { status: 422, detail: 'A campanha já foi publicada.' },
        })
      }
      const corpo = pedido.postDataJSON() as { taxaOcupacao: number }
      estado.taxaHotel = corpo.taxaOcupacao
      estado.versaoHotel += 1
      return rota.fulfill({ json: resposta() })
    }
    if (chave === 'GET /api/campanhas/50/previa') {
      return rota.fulfill({
        json: {
          campanhaId: 50,
          qtdMh: 2,
          qtdRespondentes: 2,
          leitosTotal: 1000,
          leitosRespondentes: 1000,
          percentualLeitosRespondentes: 100,
          percentualMinimoPublicacao: 70,
          podePublicar: !estado.publicada,
          impedimentos: [],
          avisos: [],
          resultado: estado.publicada ? estado.publicado : calcular(estado),
        },
      })
    }
    if (chave === 'GET /api/campanhas/50/diarias') return rota.fulfill({ json: [] })
    if (chave === 'DELETE /api/campanhas/50/publicacao') {
      estado.publicada = false
      estado.publicado = undefined
      return rota.fulfill({ status: 204 })
    }
    if (chave === 'POST /api/campanhas/50/publicacao') {
      estado.publicada = true
      estado.publicado = calcular(estado)
      return rota.fulfill({ json: estado.publicado })
    }
    if (chave === 'GET /api/dashboard/serie-mensal') {
      return rota.fulfill({ json: { indicador: 'TAXA_OCUPACAO', anos: [] } })
    }
    if (chave === 'GET /api/dashboard/feriados') return rota.fulfill({ json: [] })
    return rota.fulfill({ status: 404, json: { status: 404, detail: `sem rota: ${chave}` } })
  })
}

const destaque = (page: Page) =>
  page.locator('section', {
    has: page.getByRole('heading', { name: 'Taxa de ocupação hoteleira em outubro de 2026' }),
  })

function indicador(page: Page, rotulo: string) {
  return page
    .locator('dl div', { has: page.locator('dt', { hasText: new RegExp(`^${rotulo}$`) }) })
    .locator('dd')
    .first()
}

async function baixarCsv(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar CSV' }).click()
  const arquivo = await download
  const caminho = await arquivo.path()
  const { readFile } = await import('node:fs/promises')
  return { nome: arquivo.suggestedFilename(), conteudo: await readFile(caminho, 'utf-8') }
}

test('ADMIN corrige uma resposta depois de publicar e o novo valor chega ao painel e ao CSV (E2E-05)', async ({
  page,
}) => {
  const estado: Estado = { publicada: false, taxaHotel: 64, versaoHotel: 1, envios: [] }
  estado.publicado = calcular(estado)
  estado.publicada = true
  await mockarApi(page, estado)

  await page.goto('/')
  await expect(destaque(page)).toContainText('75,2%')
  const antes = await baixarCsv(page)
  expect(antes.conteudo).toContain('taxa_ocupacao;75,20')

  await irPeloMenu(page, 'Pesquisas')
  await page.getByRole('link', { name: 'Consolidada de outubro', exact: true }).click()
  await expect(page).toHaveURL(/\/pesquisas\/5$/)
  await expect(page.getByRole('link', { name: 'Editar resposta de Hotel Thermas' })).toHaveCount(0)

  await page
    .getByRole('link', { name: 'Prévia e publicação de Consolidada de outubro de 2026' })
    .click()
  await page.getByRole('button', { name: 'Cancelar publicação' }).click()
  await page
    .getByRole('dialog', { name: 'Cancelar a publicação de Consolidada de outubro de 2026?' })
    .getByRole('button', { name: 'Confirmar cancelamento' })
    .click()
  await expect(page.getByRole('status').filter({ hasText: 'Publicação cancelada.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publicar' })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao acompanhamento' }).click()
  await page.getByRole('link', { name: 'Editar resposta de Hotel Thermas' }).click()
  const taxa = page.getByLabel('Taxa de ocupação (%)')
  await expect(taxa).toHaveValue('64')
  await taxa.fill('72')
  await page.getByRole('button', { name: 'Enviar correção' }).click()
  await expect(page.getByText('Resposta enviada: versão 2 registrada.')).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao acompanhamento' }).click()
  await page
    .getByRole('link', { name: 'Prévia e publicação de Consolidada de outubro de 2026' })
    .click()
  await expect(indicador(page, 'Taxa de ocupação')).toHaveText(/^77,60%/)
  await page.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Campanha publicada.' })).toBeVisible()

  await page.getByRole('link', { name: 'Ver resultado publicado' }).click()
  await expect(page).toHaveURL(/\/resultados\/50$/)
  await expect(indicador(page, 'Taxa de ocupação')).toHaveText(/^77,60%/)
  const depois = await baixarCsv(page)
  expect(depois.nome).toBe('resultado-campanha-50.csv')
  expect(depois.conteudo).toContain('taxa_ocupacao;77,60')
  expect(depois.conteudo).toContain('taxa_ocupacao_HOTEL;72,00')
  expect(depois.conteudo).not.toContain('75,20')

  await irPeloMenu(page, 'Painel')
  await expect(destaque(page)).toContainText('77,6%')
  await expect(destaque(page)).not.toContainText('75,2%')

  expect(estado.envios).toEqual([
    'DELETE /api/campanhas/50/publicacao',
    'PUT /api/campanhas/50/respostas/7',
    'POST /api/campanhas/50/publicacao',
  ])
})
