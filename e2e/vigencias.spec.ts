import { expect, test, type Page } from '@playwright/test'
import { abrirCadastro } from './navegacao.ts'
import { injetarSessao } from './sessao.ts'
import { ADMIN } from './fixtures/usuarios.ts'

type Parametros = {
  id: number
  vigenteDesde: string
  percentualDayUse: number
  diasPermanenciaMedia: number
  diasEmParques: number
  gastoMedioDiario: number
  gastoMedioIngresso: number
  percentualMinimoLeitosPublicacao: number
  fonte: string
}

type Rhc = {
  id: number
  vigenteDesde: string
  qtdRegistros: number
  qtdUh: number
  qtdLeitos: number
  maxLeitosPorUh: number
  leitosUteis: number
}

const PARAMETROS_ANTIGOS: Parametros = {
  id: 1,
  vigenteDesde: '2024-01-01',
  percentualDayUse: 15.15,
  diasPermanenciaMedia: 4,
  diasEmParques: 2,
  gastoMedioDiario: 250,
  gastoMedioIngresso: 105,
  percentualMinimoLeitosPublicacao: 70,
  fonte: 'Estudo OTO 2024',
}

const RHC_ANTIGO: Rhc = {
  id: 1,
  vigenteDesde: '2024-01-01',
  qtdRegistros: 100,
  qtdUh: 200,
  qtdLeitos: 600,
  maxLeitosPorUh: 5,
  leitosUteis: 600,
}

type Estado = {
  parametros: Parametros[]
  rhc: Rhc[]
  /** corpo e status que a API devolve na próxima gravação, uma única vez */
  recusaProxima?: { status: number; json: object }
  enviados: { metodo: string; caminho: string; corpo: unknown }[]
}

/** API em memória: as vigências mudam com o que a tela grava. */
async function entrar(page: Page, estado: Estado) {
  await injetarSessao(page)
  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    if (pathname === '/api/me') return rota.fulfill({ json: ADMIN })

    const recurso = pathname.match(/^\/api\/(parametros-calculo|rhc)(?:\/(\d+|vigente))?$/)
    if (!recurso) return rota.fulfill({ json: [] })
    const [, nome, sufixo] = recurso
    const lista = (nome === 'rhc' ? estado.rhc : estado.parametros) as { id: number }[]

    if (metodo === 'GET' && sufixo === 'vigente') {
      const ultima = estado.rhc.at(-1)
      return ultima
        ? rota.fulfill({ json: ultima })
        : rota.fulfill({ status: 404, json: { status: 404, detail: 'Sem vigência.' } })
    }
    if (metodo === 'GET') return rota.fulfill({ json: lista })

    estado.enviados.push({
      metodo,
      caminho: pathname,
      corpo: metodo === 'DELETE' ? null : pedido.postDataJSON(),
    })
    if (estado.recusaProxima) {
      const recusa = estado.recusaProxima
      estado.recusaProxima = undefined
      return rota.fulfill(recusa)
    }
    if (metodo === 'DELETE') {
      lista.splice(
        lista.findIndex(({ id }) => id === Number(sufixo)),
        1,
      )
      return rota.fulfill({ status: 204 })
    }
    const dados = pedido.postDataJSON() as Record<string, unknown>
    if (nome === 'rhc') {
      dados.leitosUteis = ((dados.qtdUh as number) * (1 + (dados.maxLeitosPorUh as number))) / 2
    }
    if (metodo === 'POST') {
      const nova = { ...dados, id: lista.length + 10 } as { id: number }
      lista.push(nova)
      return rota.fulfill({ status: 201, json: nova })
    }
    const indice = lista.findIndex(({ id }) => id === Number(sufixo))
    lista[indice] = { ...dados, id: Number(sufixo) } as { id: number }
    return rota.fulfill({ json: lista[indice] })
  })
}

function novoEstado(): Estado {
  return { parametros: [{ ...PARAMETROS_ANTIGOS }], rhc: [{ ...RHC_ANTIGO }], enviados: [] }
}

async function abrirTelaDeCadastro(page: Page, tela: string, titulo: string) {
  await page.goto('/')
  await abrirCadastro(page, tela)
  await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
}

async function preencherParametros(dialogo: ReturnType<Page['getByRole']>, fonte: string) {
  await dialogo.getByLabel('Vigente desde').fill('2026-01-01')
  await dialogo.getByLabel('Índice de day use (%)').fill('16,5')
  await dialogo.getByLabel('Permanência média (dias)').fill('5')
  await dialogo.getByLabel('Dias de ingresso em parques').fill('3')
  await dialogo.getByLabel('Gasto médio diário (R$)').fill('280,50')
  await dialogo.getByLabel('Valor médio do ingresso (R$)').fill('110')
  await dialogo.getByLabel('Mínimo de leitos para publicar (%)').fill('75')
  await dialogo.getByLabel('Fonte').fill(fonte)
}

test.describe('Parâmetros de cálculo', () => {
  test('lista as vigências e inclui uma nova com números em vírgula', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Parâmetros de cálculo', 'Parâmetros de cálculo')

    const antiga = page.getByRole('row', { name: /01\/01\/2024/ })
    await expect(antiga).toContainText('15,15%')
    await expect(antiga).toContainText('4 dias')
    await expect(antiga).toContainText('Estudo OTO 2024')
    await expect(antiga).toContainText('Vigente')

    await page.getByRole('button', { name: 'Nova vigência' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nova vigência: Parâmetros' })
    await preencherParametros(dialogo, 'Estudo OTO 2026')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(page.getByRole('status')).toHaveText(
      'Parâmetros a partir de 01/01/2026 incluídos.',
    )
    expect(estado.enviados).toEqual([
      {
        metodo: 'POST',
        caminho: '/api/parametros-calculo',
        corpo: {
          vigenteDesde: '2026-01-01',
          percentualDayUse: 16.5,
          diasPermanenciaMedia: 5,
          diasEmParques: 3,
          gastoMedioDiario: 280.5,
          gastoMedioIngresso: 110,
          percentualMinimoLeitosPublicacao: 75,
          fonte: 'Estudo OTO 2026',
        },
      },
    ])
    const nova = page.getByRole('row', { name: /01\/01\/2026/ })
    await expect(nova).toContainText('16,50%')
    await expect(nova).toContainText('5 dias')
    await expect(nova).toContainText('Estudo OTO 2026')
  })

  test('barra campos vazios e dias em parques acima da permanência sem chamar a API', async ({
    page,
  }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Parâmetros de cálculo', 'Parâmetros de cálculo')

    await page.getByRole('button', { name: 'Nova vigência' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nova vigência: Parâmetros' })
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()
    await expect(dialogo.getByText('Preencha este campo.').first()).toBeVisible()

    await preencherParametros(dialogo, 'Estudo OTO 2026')
    await dialogo.getByLabel('Dias de ingresso em parques').fill('9')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()
    await expect(
      dialogo.getByText('Os dias em parques não podem passar a permanência média.'),
    ).toBeVisible()
    expect(estado.enviados).toHaveLength(0)
  })

  test('mostra no campo a recusa da API para uma data já cadastrada', async ({ page }) => {
    const estado = novoEstado()
    estado.recusaProxima = {
      status: 422,
      json: { status: 422, detail: 'Já existe uma vigência a partir desta data.' },
    }
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Parâmetros de cálculo', 'Parâmetros de cálculo')

    await page.getByRole('button', { name: 'Nova vigência' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nova vigência: Parâmetros' })
    await preencherParametros(dialogo, 'Estudo OTO 2026')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(dialogo.getByText('Já existe uma vigência a partir desta data.')).toBeVisible()
    await expect(dialogo).toBeVisible()
  })

  test('corrige uma vigência e depois exclui', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Parâmetros de cálculo', 'Parâmetros de cálculo')

    await page.getByRole('button', { name: 'Corrigir a vigência de 01/01/2024' }).click()
    const correcao = page.getByRole('dialog', { name: 'Corrigir a vigência de 01/01/2024' })
    await expect(correcao.getByLabel('Fonte')).toHaveValue('Estudo OTO 2024')
    await correcao.getByLabel('Fonte').fill('Estudo OTO 2024 revisado')
    await correcao.getByRole('button', { name: 'Salvar correção' }).click()

    await expect(page.getByRole('status')).toHaveText(
      'Parâmetros a partir de 01/01/2024 corrigidos.',
    )
    await expect(page.getByRole('row', { name: /01\/01\/2024/ })).toContainText(
      'Estudo OTO 2024 revisado',
    )
    expect(estado.enviados[0]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/parametros-calculo/1',
    })

    await page.getByRole('button', { name: 'Excluir a vigência de 01/01/2024' }).click()
    const confirmacao = page.getByRole('dialog', { name: 'Excluir vigência' })
    await expect(confirmacao.getByRole('button', { name: 'Cancelar' })).toBeFocused()
    await confirmacao.getByRole('button', { name: 'Excluir' }).click()

    await expect(page.getByRole('status')).toHaveText(
      'Parâmetros a partir de 01/01/2024 excluídos.',
    )
    await expect(page.getByText('Nenhum parâmetro cadastrado')).toBeVisible()
  })

  test('vigência já usada em resultado publicado não é excluída e o erro aparece', async ({
    page,
  }) => {
    const estado = novoEstado()
    estado.recusaProxima = {
      status: 422,
      json: { status: 422, detail: 'A vigência já foi usada em um resultado publicado.' },
    }
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Parâmetros de cálculo', 'Parâmetros de cálculo')

    await page.getByRole('button', { name: 'Excluir a vigência de 01/01/2024' }).click()
    const confirmacao = page.getByRole('dialog', { name: 'Excluir vigência' })
    await confirmacao.getByRole('button', { name: 'Excluir' }).click()

    await expect(confirmacao.getByRole('alert')).toHaveText(
      'A vigência já foi usada em um resultado publicado.',
    )
    await confirmacao.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('row', { name: /01\/01\/2024/ })).toBeVisible()
  })
})

test.describe('Hospedagem caseira (RHC)', () => {
  test('mostra o total vigente, inclui uma vigência e atualiza a lista', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Hospedagem caseira (RHC)', 'Hospedagem caseira (RHC)')

    await expect(
      page.getByText('Vigente hoje, desde 01/01/2024: 100 imóveis e 600 leitos úteis no cálculo.'),
    ).toBeVisible()
    await expect(page.getByRole('row', { name: /01\/01\/2024/ })).toContainText('600')

    await page.getByRole('button', { name: 'Nova vigência' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nova vigência: Totais do RHC' })
    await dialogo.getByLabel('Vigente desde').fill('2026-01-01')
    await dialogo.getByLabel('Imóveis registrados').fill('120')
    await dialogo.getByLabel('UH', { exact: true }).fill('240')
    await dialogo.getByLabel('Leitos', { exact: true }).fill('700')
    await dialogo.getByLabel('Máximo de pessoas por UH').fill('5')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(page.getByRole('status')).toHaveText(
      'Totais do RHC a partir de 01/01/2026 incluídos.',
    )
    expect(estado.enviados).toEqual([
      {
        metodo: 'POST',
        caminho: '/api/rhc',
        corpo: {
          vigenteDesde: '2026-01-01',
          qtdRegistros: 120,
          qtdUh: 240,
          qtdLeitos: 700,
          maxLeitosPorUh: 5,
        },
      },
    ])
    await expect(page.getByRole('row', { name: /01\/01\/2026/ })).toContainText('720')
  })

  test('sem totais, avisa que o RHC fica fora do fluxo de turistas', async ({ page }) => {
    const estado = novoEstado()
    estado.rhc = []
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Hospedagem caseira (RHC)', 'Hospedagem caseira (RHC)')

    await expect(
      page.getByText('Não há totais vigentes hoje: o RHC fica fora do fluxo de turistas.'),
    ).toBeVisible()
    await expect(page.getByText('Nenhum total do RHC cadastrado')).toBeVisible()
  })

  test('barra o máximo de pessoas por UH acima do limite sem chamar a API', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    await abrirTelaDeCadastro(page, 'Hospedagem caseira (RHC)', 'Hospedagem caseira (RHC)')

    await page.getByRole('button', { name: 'Nova vigência' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nova vigência: Totais do RHC' })
    await dialogo.getByLabel('Imóveis registrados').fill('120')
    await dialogo.getByLabel('UH', { exact: true }).fill('240')
    await dialogo.getByLabel('Leitos', { exact: true }).fill('700')
    await dialogo.getByLabel('Máximo de pessoas por UH').fill('31')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(dialogo.getByText('Use um valor até 30.')).toBeVisible()
    expect(estado.enviados).toHaveLength(0)
  })
})
