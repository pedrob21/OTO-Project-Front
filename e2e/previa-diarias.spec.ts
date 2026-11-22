import { expect, test, type Page } from '@playwright/test'
import { injetarSessao } from './sessao.ts'

const ADMIN = { id: 1, nome: 'Ana Souza', perfil: 'ADMIN' }

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
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

/** média das respostas e diárias vendidas no mês, por tipo */
const RESPOSTAS: Record<string, { media: number; vendidas: number }> = {
  HOTEL: { media: 420, vendidas: 1000 },
  POUSADA: { media: 300, vendidas: 500 },
}

type Diaria = { tipoHospedagemCodigo?: string; diariaMedia: number; fonte?: string }

type Estado = {
  publicada: boolean
  diarias: Diaria[]
  /** resposta da API para o próximo PUT, uma única vez */
  recusaProxima?: { status: number; json: object }
  envios: unknown[]
}

function novoEstado(diarias: Diaria[] = [], publicada = false): Estado {
  return { publicada, diarias, envios: [] }
}

/** A prévia calcula com a diária informada no lugar da média das respostas, como a API. */
function previa(estado: Estado) {
  const informada = (codigo?: string) =>
    estado.diarias.find((d) => (d.tipoHospedagemCodigo ?? undefined) === codigo)?.diariaMedia
  const porTipo = TIPOS.map(({ codigo, nome }) => {
    const { media, vendidas } = RESPOSTAS[codigo]!
    const diariaMedia = informada(codigo) ?? media
    return {
      tipoHospedagemCodigo: codigo,
      nome,
      qtdMh: 10,
      qtdUh: 100,
      taxaOcupacao: 50,
      diariaMedia,
      revpar: diariaMedia / 2,
      receitaEstimada: diariaMedia * vendidas,
    }
  })
  const vendidas = porTipo.reduce(
    (soma, tipo) => soma + RESPOSTAS[tipo.tipoHospedagemCodigo]!.vendidas,
    0,
  )
  const receitaHospedagem = porTipo.reduce((soma, tipo) => soma + tipo.receitaEstimada, 0)
  return {
    campanhaId: 50,
    qtdMh: 20,
    qtdRespondentes: 20,
    leitosTotal: 1000,
    leitosRespondentes: 1000,
    percentualLeitosRespondentes: 100,
    percentualMinimoPublicacao: 70,
    podePublicar: true,
    impedimentos: [],
    avisos: [],
    resultado: {
      campanha: CAMPANHA,
      taxaOcupacao: 50,
      diariaMedia: informada(undefined) ?? receitaHospedagem / vendidas,
      receitaHospedagem,
      porTipo,
    },
  }
}

async function abrirPrevia(page: Page, estado: Estado) {
  await injetarSessao(page)
  await page.route('**/api/**', (rota) => {
    const pedido = rota.request()
    const { pathname } = new URL(pedido.url())
    const chave = `${pedido.method()} ${pathname}`

    if (chave === 'GET /api/me') return rota.fulfill({ json: ADMIN })
    if (chave === 'GET /api/referencias') return rota.fulfill({ json: { tiposHospedagem: TIPOS } })
    if (chave === 'GET /api/rodadas/5') {
      return rota.fulfill({
        json: {
          id: 5,
          codigo: '005/26',
          titulo: 'Consolidada de outubro',
          status: 'ENCERRADA',
          campanhas: [{ ...CAMPANHA, publicada: estado.publicada }],
        },
      })
    }
    if (chave === 'GET /api/campanhas/50/previa') return rota.fulfill({ json: previa(estado) })
    if (chave === 'GET /api/campanhas/50/diarias') {
      return rota.fulfill({
        json: estado.diarias.map((d) => ({
          ...d,
          registradoPor: 1,
          registradoEm: '2026-11-20T13:00:00Z',
        })),
      })
    }
    if (chave === 'PUT /api/campanhas/50/diarias') {
      const corpo = pedido.postDataJSON() as { diarias: Diaria[]; fonte?: string }
      estado.envios.push(corpo)
      if (estado.recusaProxima) {
        const recusa = estado.recusaProxima
        estado.recusaProxima = undefined
        return rota.fulfill(recusa)
      }
      estado.diarias = corpo.diarias.map((d) => ({ ...d, fonte: corpo.fonte }))
      return rota.fulfill({ json: estado.diarias })
    }
    return rota.fulfill({ status: 404, json: { detail: `sem rota: ${chave}` } })
  })

  await page.goto('/pesquisas/5/campanhas/50/previa')
  const tabela = page.getByRole('table', { name: 'Diárias informadas pela equipe' })
  await expect(tabela).toBeVisible()
  return tabela
}

const linha = (tabela: ReturnType<Page['getByRole']>, recorte: string) =>
  tabela.getByRole('row').filter({ has: tabela.page().getByRole('rowheader', { name: recorte }) })

const desempenho = (page: Page, tipo: string) =>
  page
    .getByRole('table', { name: 'Desempenho por tipo de hospedagem' })
    .getByRole('row')
    .filter({ hasText: tipo })

const aviso = (page: Page) => page.getByRole('status').filter({ hasText: /^Diária/ })

function indicador(page: Page, rotulo: string) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Resultado com as respostas atuais' }) })
    .locator('div', { has: page.locator('dt', { hasText: new RegExp(`^${rotulo}$`) }) })
    .locator('dd')
    .first()
}

test('informa a diária de um tipo e a geral, e a prévia passa a usá-las no lugar da média', async ({
  page,
}) => {
  const estado = novoEstado()
  const tabela = await abrirPrevia(page, estado)

  await expect(
    page.getByText('Nenhuma diária informada. O cálculo usa a média das respostas.'),
  ).toBeVisible()
  await expect(linha(tabela, 'Pousada')).toContainText('Não informada')
  await expect(linha(tabela, 'Pousada')).toContainText('R$ 300,00média das respostas')
  await expect(desempenho(page, 'Pousada')).toContainText(/R\$\s150,0\smil/)
  await expect(indicador(page, 'Receita em hospedagem')).toHaveText(/R\$\s570,0\smil/)

  await page.getByRole('button', { name: 'Informar diária de Pousada' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Informar diária de Pousada' })
  await expect(dialogo.getByText('Média das respostas na prévia: R$ 300,00.')).toBeVisible()
  await dialogo.getByLabel('Diária média (R$)').fill('360')
  await dialogo.getByLabel('Fonte (opcional)').fill('Pesquisa por telefone')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(aviso(page)).toHaveText('Diária de Pousada salva. A prévia já usa o novo valor.')
  await expect(dialogo).toHaveCount(0)
  await expect(linha(tabela, 'Pousada')).toContainText('R$ 360,00informada pela equipe')
  await expect(desempenho(page, 'Pousada')).toContainText(/R\$\s360/)
  await expect(desempenho(page, 'Pousada')).toContainText(/R\$\s180,0\smil/)
  await expect(indicador(page, 'Receita em hospedagem')).toHaveText(/R\$\s600,0\smil/)
  await expect(page.getByText(/^Fonte: Pesquisa por telefone\. Última alteração em/)).toBeVisible()

  await expect(indicador(page, 'Diária média')).toHaveText(/R\$\s400/)
  await page.getByRole('button', { name: 'Informar diária geral' }).click()
  const geral = page.getByRole('dialog', { name: 'Informar diária geral' })
  await expect(geral.getByLabel('Fonte (opcional)')).toHaveValue('Pesquisa por telefone')
  await geral.getByLabel('Diária média (R$)').fill('450,50')
  await geral.getByRole('button', { name: 'Salvar' }).click()

  await expect(aviso(page)).toHaveText('Diária geral salva. A prévia já usa o novo valor.')
  await expect(linha(tabela, 'Geral (todos os tipos)')).toContainText(
    'R$ 450,50informada pela equipe',
  )
  await expect(indicador(page, 'Diária média')).toHaveText(/R\$\s451/)
  expect(estado.envios).toEqual([
    {
      diarias: [{ tipoHospedagemCodigo: 'POUSADA', diariaMedia: 360 }],
      fonte: 'Pesquisa por telefone',
    },
    {
      diarias: [{ tipoHospedagemCodigo: 'POUSADA', diariaMedia: 360 }, { diariaMedia: 450.5 }],
      fonte: 'Pesquisa por telefone',
    },
  ])
})

test('corrige a diária informada de um tipo mantendo as demais e a fonte', async ({ page }) => {
  const estado = novoEstado([
    { tipoHospedagemCodigo: 'HOTEL', diariaMedia: 500, fonte: 'Pesquisa de balcão' },
    { diariaMedia: 410, fonte: 'Pesquisa de balcão' },
  ])
  const tabela = await abrirPrevia(page, estado)

  await expect(linha(tabela, 'Hotel')).toContainText('R$ 500,00informada pela equipe')
  await expect(desempenho(page, 'Hotel')).toContainText(/R\$\s500,0\smil/)

  await page.getByRole('button', { name: 'Corrigir diária de Hotel' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Corrigir diária de Hotel' })
  await expect(dialogo.getByLabel('Diária média (R$)')).toHaveValue('500')
  await expect(dialogo.getByLabel('Fonte (opcional)')).toHaveValue('Pesquisa de balcão')
  await dialogo.getByLabel('Diária média (R$)').fill('520')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(aviso(page)).toHaveText('Diária de Hotel salva. A prévia já usa o novo valor.')
  await expect(linha(tabela, 'Hotel')).toContainText('R$ 520,00informada pela equipe')
  await expect(desempenho(page, 'Hotel')).toContainText(/R\$\s520,0\smil/)
  expect(estado.envios).toEqual([
    {
      diarias: [{ diariaMedia: 410 }, { tipoHospedagemCodigo: 'HOTEL', diariaMedia: 520 }],
      fonte: 'Pesquisa de balcão',
    },
  ])
})

test('remove a diária de um tipo e o cálculo volta à média das respostas', async ({ page }) => {
  const estado = novoEstado([
    { tipoHospedagemCodigo: 'HOTEL', diariaMedia: 500, fonte: 'Pesquisa de balcão' },
    { tipoHospedagemCodigo: 'POUSADA', diariaMedia: 360, fonte: 'Pesquisa de balcão' },
  ])
  const tabela = await abrirPrevia(page, estado)
  await expect(desempenho(page, 'Hotel')).toContainText(/R\$\s500,0\smil/)

  await page.getByRole('button', { name: 'Remover diária de Hotel' }).click()
  const confirmacao = page.getByRole('dialog', { name: 'Remover diária de Hotel?' })
  await confirmacao.getByRole('button', { name: 'Remover' }).click()

  await expect(aviso(page)).toHaveText(
    'Diária de Hotel removida. O cálculo volta a usar a média das respostas.',
  )
  await expect(linha(tabela, 'Hotel')).toContainText('Não informada')
  await expect(linha(tabela, 'Hotel')).toContainText('R$ 420,00média das respostas')
  await expect(page.getByRole('button', { name: 'Remover diária de Hotel' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Informar diária de Hotel' })).toBeVisible()
  await expect(linha(tabela, 'Pousada')).toContainText('R$ 360,00informada pela equipe')
  await expect(desempenho(page, 'Hotel')).toContainText(/R\$\s420,0\smil/)
  expect(estado.envios).toEqual([
    {
      diarias: [{ tipoHospedagemCodigo: 'POUSADA', diariaMedia: 360 }],
      fonte: 'Pesquisa de balcão',
    },
  ])
})

test('barra diária vazia ou zero sem chamar a API', async ({ page }) => {
  const estado = novoEstado()
  const tabela = await abrirPrevia(page, estado)

  await page.getByRole('button', { name: 'Informar diária de Hotel' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Informar diária de Hotel' })
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialogo.getByText('Informe a diária média.')).toBeVisible()
  await expect(dialogo.getByLabel('Diária média (R$)')).toBeFocused()

  await dialogo.getByLabel('Diária média (R$)').fill('0')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialogo.getByText('A diária precisa ser maior que zero.')).toBeVisible()

  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(linha(tabela, 'Hotel')).toContainText('Não informada')
  expect(estado.envios).toEqual([])
})

test('recusa da API mantém o diálogo aberto com o valor digitado', async ({ page }) => {
  const estado = novoEstado()
  estado.recusaProxima = {
    status: 422,
    json: { status: 422, detail: 'As diárias só podem mudar antes da publicação.' },
  }
  const tabela = await abrirPrevia(page, estado)

  await page.getByRole('button', { name: 'Informar diária de Hotel' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Informar diária de Hotel' })
  await dialogo.getByLabel('Diária média (R$)').fill('480')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(dialogo.getByRole('alert')).toHaveText(
    'As diárias só podem mudar antes da publicação.',
  )
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByLabel('Diária média (R$)')).toHaveValue('480')
  await expect(linha(tabela, 'Hotel')).toContainText('Não informada')
  expect(estado.envios).toHaveLength(1)
})

test('campanha publicada mostra as diárias sem os botões de mudar', async ({ page }) => {
  const estado = novoEstado(
    [{ tipoHospedagemCodigo: 'HOTEL', diariaMedia: 500, fonte: 'Pesquisa de balcão' }],
    true,
  )
  const tabela = await abrirPrevia(page, estado)

  await expect(
    page.getByText('A campanha já foi publicada. Cancele a publicação para mudar as diárias.'),
  ).toBeVisible()
  await expect(linha(tabela, 'Hotel')).toContainText('R$ 500,00informada pela equipe')
  await expect(tabela.getByRole('columnheader', { name: 'Ações' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /diária/ })).toHaveCount(0)
})
