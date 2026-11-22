import { expect, test, type Page, type Route } from '@playwright/test'
import { irPeloMenu, semRolagemHorizontal } from './navegacao.ts'
import { injetarSessao } from './sessao.ts'

type Perfil = 'ADMIN' | 'PARCEIRO' | 'VISUALIZADOR'

const USUARIOS: Record<Perfil, { id: number; nome: string; perfil: Perfil }> = {
  ADMIN: { id: 1, nome: 'Ana Souza', perfil: 'ADMIN' },
  PARCEIRO: { id: 2, nome: 'Pousada do Sol', perfil: 'PARCEIRO' },
  VISUALIZADOR: { id: 3, nome: 'Vera Lima', perfil: 'VISUALIZADOR' },
}

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
  { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true },
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

const LEITOS_TOTAL = 13508
const LEITOS_RESPONDENTES = 9237
const LEITOS_DO_PENDENTE = 300

/** Sessão já salva, como depois do login: o teste começa na página. */
async function entrar(page: Page) {
  await injetarSessao(page)
}

function percentual(leitos: number) {
  return Math.round((leitos / LEITOS_TOTAL) * 10_000) / 100
}

/** API simulada com estado: as ações do ADMIN mudam o que as próximas chamadas devolvem. */
async function mockarApiDoAdmin(page: Page) {
  const estado = { status: 'ABERTA', respondeuPendente: false, publicada: false }
  const leitos = () => LEITOS_RESPONDENTES + (estado.respondeuPendente ? LEITOS_DO_PENDENTE : 0)
  const rodada = () => ({
    id: 5,
    codigo: '005/26',
    titulo: 'Consolidada de outubro',
    status: estado.status,
    dataAbertura: '2026-11-01',
    prazoResposta: '2099-11-30',
    campanhas: [
      {
        ...CAMPANHA,
        publicada: estado.publicada,
        publicadaEm: estado.publicada ? '2026-11-21T12:00:00Z' : undefined,
      },
    ],
  })
  const previa = () => {
    const pct = percentual(leitos())
    const impedimentos = [
      ...(estado.status === 'ENCERRADA'
        ? []
        : ['A pesquisa 005/26 precisa ser encerrada antes da publicação.']),
      ...(pct < 70
        ? [`Leitos respondentes: ${String(pct).replace('.', ',')}% (mínimo para publicar: 70%).`]
        : []),
    ]
    return {
      campanhaId: 50,
      qtdMh: 3,
      qtdRespondentes: estado.respondeuPendente ? 3 : 2,
      leitosTotal: LEITOS_TOTAL,
      leitosRespondentes: leitos(),
      percentualLeitosRespondentes: pct,
      percentualMinimoPublicacao: 70,
      podePublicar: impedimentos.length === 0,
      impedimentos,
      avisos: [],
      resultado: { campanha: CAMPANHA, taxaOcupacao: 64.73, fluxoTotal: 80394.15, porTipo: [] },
    }
  }

  await page.route('**/api/**', (rota: Route) => {
    const { pathname } = new URL(rota.request().url())
    const metodo = rota.request().method()
    const chave = `${metodo} ${pathname}`

    if (chave === 'GET /api/me') return rota.fulfill({ json: USUARIOS.ADMIN })
    if (chave === 'GET /api/referencias') return rota.fulfill({ json: { tiposHospedagem: TIPOS } })
    if (chave === 'GET /api/rodadas') return rota.fulfill({ json: [rodada()] })
    if (chave === 'GET /api/rodadas/5') return rota.fulfill({ json: rodada() })
    if (chave === 'POST /api/rodadas/5/encerrar') {
      estado.status = 'ENCERRADA'
      return rota.fulfill({ json: rodada() })
    }
    if (chave === 'GET /api/rodadas/5/acompanhamento') {
      return rota.fulfill({
        json: {
          rodadaId: 5,
          codigo: '005/26',
          status: estado.status,
          campanhas: [
            {
              campanhaId: 50,
              nome: CAMPANHA.nome,
              qtdMh: 3,
              qtdRespondentes: estado.respondeuPendente ? 3 : 2,
              leitosTotal: LEITOS_TOTAL,
              leitosRespondentes: leitos(),
              percentualLeitosRespondentes: percentual(leitos()),
              percentualMinimoPublicacao: 70,
              atingiuMinimo: percentual(leitos()) >= 70,
              estabelecimentos: [
                {
                  estabelecimentoId: 7,
                  nomeFantasia: 'Hotel Thermas',
                  tipoHospedagemCodigo: 'HOTEL',
                  qtdLeitos: LEITOS_DO_PENDENTE,
                  respondeu: estado.respondeuPendente,
                  versao: estado.respondeuPendente ? 1 : undefined,
                },
                {
                  estabelecimentoId: 8,
                  nomeFantasia: 'Pousada do Sol',
                  tipoHospedagemCodigo: 'POUSADA',
                  qtdLeitos: 37,
                  respondeu: true,
                  versao: 1,
                },
                {
                  estabelecimentoId: 9,
                  nomeFantasia: 'Resort Águas',
                  tipoHospedagemCodigo: 'RESORT',
                  qtdLeitos: 9200,
                  respondeu: true,
                  versao: 2,
                },
              ],
            },
          ],
        },
      })
    }
    if (chave === 'GET /api/campanhas/50/respostas') return rota.fulfill({ json: [] })
    if (chave === 'PUT /api/campanhas/50/respostas/7') {
      estado.respondeuPendente = true
      return rota.fulfill({
        json: { id: 303, estabelecimentoId: 7, taxaOcupacao: 64, versao: 1 },
      })
    }
    if (chave === 'GET /api/campanhas/50/previa') return rota.fulfill({ json: previa() })
    if (chave === 'POST /api/campanhas/50/publicacao') {
      estado.publicada = true
      return rota.fulfill({ json: previa().resultado })
    }
    return rota.fulfill({ json: [] })
  })
}

test('ADMIN acompanha a rodada, lança a resposta que faltava e publica (E2E-02)', async ({
  page,
}) => {
  await entrar(page)
  await mockarApiDoAdmin(page)

  await page.goto('/pesquisas')
  const linha = page.getByRole('row', { name: /005\/26/ })
  await expect(linha.getByText('Aberta')).toBeVisible()
  await linha.getByRole('link', { name: 'Consolidada de outubro' }).click()

  await expect(page).toHaveURL(/\/pesquisas\/5$/)
  await expect(page.getByText('9.237 de 13.508 leitos (68,38%)')).toBeVisible()
  await expect(page.getByText('Abaixo do mínimo.')).toBeVisible()

  await page.getByRole('button', { name: 'Encerrar pesquisa' }).click()
  await page.getByRole('button', { name: 'Confirmar encerramento' }).click()
  await expect(page.getByRole('button', { name: 'Reabrir pesquisa' })).toBeVisible()

  await page
    .getByRole('link', { name: 'Prévia e publicação de Consolidada de outubro de 2026' })
    .click()
  const publicar = page.getByRole('button', { name: 'Publicar' })
  await expect(
    page.getByText('Leitos respondentes: 68,38% (mínimo para publicar: 70%).'),
  ).toBeVisible()
  await expect(publicar).toBeDisabled()

  await page.getByRole('link', { name: 'Voltar ao acompanhamento' }).click()
  await page.getByRole('link', { name: 'Lançar resposta de Hotel Thermas' }).click()
  await page.getByLabel('Taxa de ocupação (%)').fill('64')
  await page.getByRole('button', { name: 'Enviar resposta' }).click()
  await expect(page.getByText('Resposta enviada: versão 1 registrada.')).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao acompanhamento' }).click()
  await expect(page.getByText('Mínimo atingido.')).toBeVisible()
  await page
    .getByRole('link', { name: 'Prévia e publicação de Consolidada de outubro de 2026' })
    .click()
  await expect(page.getByText('Ainda não é possível publicar:')).toHaveCount(0)
  await expect(publicar).toBeEnabled()
  await publicar.click()

  await expect(page.getByRole('status').filter({ hasText: 'Campanha publicada.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancelar publicação' })).toBeVisible()
})

test(
  'PARCEIRO responde e, com a pesquisa fechada, o erro mantém o que digitou (FE-06)',
  { tag: '@celular' },
  async ({ page }) => {
    await entrar(page)
    const estado = { fechada: false, versao: 0 }
    await page.route('**/api/**', (rota) => {
      const { pathname } = new URL(rota.request().url())
      const chave = `${rota.request().method()} ${pathname}`
      if (chave === 'GET /api/me') return rota.fulfill({ json: USUARIOS.PARCEIRO })
      if (chave === 'GET /api/respostas/pendencias') {
        return rota.fulfill({
          json: [
            {
              campanhaId: 50,
              campanhaNome: CAMPANHA.nome,
              periodoInicio: CAMPANHA.periodoInicio,
              periodoFim: CAMPANHA.periodoFim,
              rodadaCodigo: '005/26',
              prazoResposta: '2099-11-30',
              estabelecimentoId: 8,
              nomeFantasia: 'Pousada do Sol',
              respondida: estado.versao > 0,
              versao: estado.versao || undefined,
            },
          ],
        })
      }
      if (chave === 'PUT /api/campanhas/50/respostas/8') {
        if (estado.fechada) {
          return rota.fulfill({
            status: 422,
            json: { status: 422, detail: 'A pesquisa 005/26 não está aberta para respostas.' },
          })
        }
        estado.versao += 1
        return rota.fulfill({
          json: { id: 301, ...rota.request().postDataJSON(), versao: estado.versao },
        })
      }
      return rota.fulfill({ json: [] })
    })

    await page.goto('/')
    await irPeloMenu(page, 'Pesquisas')
    await expect(page).toHaveURL(/\/pesquisas\/responder$/)
    await semRolagemHorizontal(page)

    const pousada = page.getByRole('listitem', { name: 'Pousada do Sol' })
    const taxa = pousada.getByLabel('Taxa de ocupação (%)')
    const diaria = pousada.getByLabel(/Diária média/)
    await taxa.fill('80,5')
    await pousada.getByRole('button', { name: 'Enviar resposta' }).click()
    await expect(pousada.getByText(/Resposta salva como versão 1/)).toBeVisible()

    estado.fechada = true
    await taxa.fill('82')
    await diaria.fill('395,90')
    await pousada.getByRole('button', { name: /Enviar resposta|Salvar correção/ }).click()

    await expect(pousada.getByRole('alert')).toContainText(
      'A pesquisa 005/26 não está aberta para respostas.',
    )
    await expect(taxa).toHaveValue('82')
    await expect(diaria).toHaveValue('395,90')
  },
)

test(
  'PARCEIRO depois do limite de resposta vê o formulário bloqueado e não envia nada',
  { tag: '@celular' },
  async ({ page }) => {
    await entrar(page)
    const envios: string[] = []
    await page.route('**/api/**', (rota) => {
      const { pathname } = new URL(rota.request().url())
      const chave = `${rota.request().method()} ${pathname}`
      if (chave === 'GET /api/me') return rota.fulfill({ json: USUARIOS.PARCEIRO })
      if (chave === 'GET /api/respostas/pendencias') {
        return rota.fulfill({
          json: [
            {
              campanhaId: 50,
              campanhaNome: CAMPANHA.nome,
              periodoInicio: CAMPANHA.periodoInicio,
              periodoFim: CAMPANHA.periodoFim,
              rodadaCodigo: '005/26',
              prazoResposta: '2026-10-01',
              respostasAte: '2026-10-31',
              aceitaResposta: false,
              estabelecimentoId: 8,
              nomeFantasia: 'Pousada do Sol',
              respondida: false,
            },
          ],
        })
      }
      if (rota.request().method() === 'PUT') envios.push(chave)
      return rota.fulfill({ json: [] })
    })

    await page.goto('/pesquisas/responder')

    await expect(page.getByRole('alert')).toContainText(
      'O prazo para responder terminou em 31/10/2026. Para enviar ou corrigir a resposta, fale com a equipe do OTO.',
    )
    const pousada = page.getByRole('listitem', { name: 'Pousada do Sol' })
    await expect(pousada.getByLabel('Taxa de ocupação (%)')).toBeDisabled()
    await expect(pousada.getByRole('button', { name: 'Enviar resposta' })).toBeDisabled()
    expect(envios).toEqual([])
  },
)

test('VISUALIZADOR vê o resultado publicado com o tipo oculto por sigilo', async ({ page }) => {
  await entrar(page)
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/me') return rota.fulfill({ json: USUARIOS.VISUALIZADOR })
    if (pathname === '/api/referencias') return rota.fulfill({ json: { tiposHospedagem: TIPOS } })
    if (pathname === '/api/campanhas/50/resultado') {
      return rota.fulfill({
        json: {
          campanha: { ...CAMPANHA, publicada: true, publicadaEm: '2026-11-12T15:00:00Z' },
          publicado: true,
          taxaOcupacao: 64.73,
          faixa: { codigo: 'OTIMA', nome: 'Ótima' },
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
              taxaOcupacao: null,
              diariaMedia: null,
              revpar: null,
              receitaEstimada: null,
              omitido: true,
            },
          ],
        },
      })
    }
    return rota.fulfill({ json: [] })
  })

  await page.goto('/resultados/50')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Consolidada de outubro de 2026' }),
  ).toBeVisible()
  const resort = page.getByRole('row', { name: /Resort/ })
  await expect(resort).toContainText('Valores ocultos para preservar o sigilo')
  await expect(resort.getByRole('cell')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Baixar CSV' })).toBeVisible()
})
