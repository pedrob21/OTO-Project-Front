import { expect, test, type Page } from '@playwright/test'

const PARCEIRO = {
  id: 2,
  nome: 'Paula Reis',
  email: 'paula@oto.test',
  perfil: 'PARCEIRO',
  ativo: true,
}

const RESUMO = (id: number, nomeFantasia: string, ativo = true) => ({
  id,
  nomeFantasia,
  tipoHospedagemCodigo: 'POUSADA',
  situacao: 'REGULAR',
  ativo,
})

const CADASTRO = (id: number, nomeFantasia: string) => ({
  id,
  ativo: true,
  dados: {
    nomeFantasia,
    razaoSocial: 'Sol Hospedagens Ltda',
    cnpj: '12345678000190',
    dataAbertura: '2015-03-10',
    bairro: 'Centro',
    emailComercial: 'contato@sol.test',
    possuiCadastur: true,
    cadasturExigencia: 'OBRIGATORIO',
    funcionamento24h: false,
    funcionariosFixos: 12,
    horarioCheckIn: '14:00:00',
  },
  secretaria: {
    tipoHospedagemCodigo: 'POUSADA',
    situacao: 'IRREGULAR',
    aceitaPesquisas: false,
    contatoNome: 'Maria da Secretaria',
  },
})

const CAPACIDADE_ANTIGA = {
  id: 1,
  vigenteDesde: '2025-01-01',
  qtdUh: 20,
  qtdUhPcd: 1,
  qtdLeitos: 50,
  maxLeitosPorUh: 3,
  leitosUteis: 40,
}

const CATALOGO = [
  {
    id: 1,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    codigo: 'LAZER',
    nome: 'Lazer',
    exclusivoSecretaria: false,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 10,
        codigo: 'PISCINA',
        nome: 'Piscina',
        permiteComplemento: true,
        ordem: 1,
        ativo: true,
      },
    ],
  },
  {
    id: 3,
    categoria: 'SUSTENTABILIDADE',
    codigo: 'SELOS',
    nome: 'Selos da Secretaria',
    exclusivoSecretaria: true,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 30,
        codigo: 'SELO',
        nome: 'Selo verde',
        permiteComplemento: false,
        ordem: 1,
        ativo: true,
      },
    ],
  },
]

type Envio = { metodo: string; caminho: string; corpo: unknown }
type Recusa = { status: number; detail: string }

type Estado = {
  resumos: ReturnType<typeof RESUMO>[]
  cadastros: Record<number, ReturnType<typeof CADASTRO>>
  capacidades: Record<number, (typeof CAPACIDADE_ANTIGA)[]>
  envios: Envio[]
  recusaProxima?: Recusa
  /** ids cujo detalhe ou lista falham com 403 */
  semDetalhe: number[]
  semLista: boolean
}

function novoEstado(): Estado {
  return {
    resumos: [RESUMO(7, 'Pousada do Sol')],
    cadastros: { 7: CADASTRO(7, 'Pousada do Sol') },
    capacidades: { 7: [{ ...CAPACIDADE_ANTIGA }] },
    envios: [],
    semDetalhe: [],
    semLista: false,
  }
}

async function entrar(page: Page, estado: Estado) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })
  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    const proibido = () =>
      rota.fulfill({ status: 403, json: { status: 403, detail: 'Sem permissão.' } })

    if (pathname === '/api/me') return rota.fulfill({ json: PARCEIRO })
    if (pathname === '/api/referencias') {
      return rota.fulfill({ json: { tiposHospedagem: [{ codigo: 'POUSADA', nome: 'Pousada' }] } })
    }
    if (pathname === '/api/inventario/catalogo') return rota.fulfill({ json: CATALOGO })
    if (pathname === '/api/estabelecimentos' && metodo === 'GET') {
      return estado.semLista ? proibido() : rota.fulfill({ json: estado.resumos })
    }

    const rotaDoEstabelecimento = pathname.match(
      /^\/api\/estabelecimentos\/(\d+)(?:\/(capacidades|inventario))?$/,
    )
    if (!rotaDoEstabelecimento) return rota.fulfill({ json: [] })
    const id = Number(rotaDoEstabelecimento[1])
    const parte = rotaDoEstabelecimento[2]

    if (metodo === 'GET') {
      if (!parte) {
        return estado.semDetalhe.includes(id)
          ? proibido()
          : rota.fulfill({ json: estado.cadastros[id] })
      }
      if (parte === 'capacidades') return rota.fulfill({ json: estado.capacidades[id] ?? [] })
      return rota.fulfill({ json: { estabelecimentoId: id, itens: [] } })
    }

    const corpo = pedido.postDataJSON() as Record<string, unknown>
    estado.envios.push({ metodo, caminho: pathname, corpo })
    if (estado.recusaProxima) {
      const { status, detail } = estado.recusaProxima
      estado.recusaProxima = undefined
      return rota.fulfill({ status, json: { status, detail } })
    }
    if (!parte) {
      estado.cadastros[id] = { ...estado.cadastros[id]!, dados: corpo.dados as never }
      return rota.fulfill({ json: estado.cadastros[id] })
    }
    if (parte === 'capacidades') {
      const nova = { ...CAPACIDADE_ANTIGA, id: 2, ...corpo, leitosUteis: 90 }
      estado.capacidades[id] = [nova as never, ...(estado.capacidades[id] ?? [])]
      return rota.fulfill({ status: 201, json: nova })
    }
    return rota.fulfill({ json: { estabelecimentoId: id, itens: (corpo as { itens: [] }).itens } })
  })
}

async function abrirMeuEstabelecimento(page: Page) {
  await page.goto('/meu-estabelecimento')
  await expect(page.getByRole('heading', { level: 1, name: 'Meu estabelecimento' })).toBeVisible()
}

const secao = (page: Page, nome: string) => page.getByRole('region', { name: nome })

test('mostra os dados em leitura por grupo, com traço no que não foi informado', async ({
  page,
}) => {
  await entrar(page, novoEstado())
  await abrirMeuEstabelecimento(page)

  await expect(page.getByRole('heading', { name: 'Pousada do Sol' })).toBeVisible()
  await expect(page.getByText('Pousada', { exact: true }).first()).toBeVisible()

  const cadastrais = secao(page, 'Dados cadastrais')
  await expect(
    cadastrais.locator('div', { hasText: 'Razão social' }).locator('dd').first(),
  ).toHaveText('Sol Hospedagens Ltda')
  await expect(
    cadastrais.locator('div', { hasText: 'Data de abertura' }).locator('dd').first(),
  ).toHaveText('10/03/2015')
  await expect(cadastrais.locator('div', { hasText: 'CNAE' }).locator('dd').first()).toHaveText('—')

  const cadastur = secao(page, 'Cadastur')
  await expect(
    cadastur.locator('div', { hasText: 'Exigência do Cadastur' }).locator('dd'),
  ).toHaveText('Obrigatório')
  await expect(cadastur.locator('div', { hasText: 'Possui Cadastur' }).locator('dd')).toHaveText(
    'Sim',
  )

  const funcionamento = secao(page, 'Funcionamento')
  await expect(
    funcionamento.locator('div', { hasText: 'Funciona 24 horas' }).locator('dd'),
  ).toHaveText('Não')
  await expect(funcionamento.locator('div', { hasText: 'Check-in' }).locator('dd')).toHaveText(
    '14:00',
  )
  await expect(funcionamento.locator('div', { hasText: 'Check-out' }).locator('dd')).toHaveText('—')
})

test('os dados da Secretaria aparecem só para leitura, sem campo para editar', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirMeuEstabelecimento(page)

  const secretaria = secao(page, 'Dados da Secretaria')
  await expect(
    secretaria.locator('div', { hasText: 'Tipo de hospedagem' }).locator('dd'),
  ).toHaveText('Pousada')
  await expect(secretaria.locator('div', { hasText: 'Situação' }).locator('dd')).toHaveText(
    'Irregular',
  )
  await expect(
    secretaria.locator('div', { hasText: 'Aceita participar das pesquisas' }).locator('dd'),
  ).toHaveText('Não')
  await expect(secretaria.getByText('Maria da Secretaria')).toBeVisible()
  await expect(secretaria.getByRole('textbox')).toHaveCount(0)
  await expect(
    page.getByText('Os dados da Secretaria só a equipe do OTO altera.', { exact: false }),
  ).toBeVisible()
})

test('a capacidade mostra a vigência atual e não oferece corrigir nem excluir', async ({
  page,
}) => {
  await entrar(page, novoEstado())
  await abrirMeuEstabelecimento(page)

  const linha = page.getByRole('row', { name: /01\/01\/2025/ })
  await expect(linha).toContainText('20')
  await expect(linha).toContainText('40')
  await expect(linha).toContainText('Vigente')
  await expect(page.getByRole('button', { name: /Corrigir|Excluir/ })).toHaveCount(0)
  await expect(
    page.getByText('Lançamento errado só o OTO corrige.', { exact: false }),
  ).toBeVisible()
})

test('o parceiro não vê o grupo exclusivo da Secretaria no inventário', async ({ page }) => {
  await entrar(page, novoEstado())
  await abrirMeuEstabelecimento(page)

  const inventario = secao(page, 'Inventário')
  await expect(inventario.getByRole('checkbox', { name: 'Piscina' })).toBeVisible()
  await expect(inventario.getByText('Selos da Secretaria')).toHaveCount(0)
  await expect(inventario.getByRole('checkbox', { name: 'Selo verde' })).toHaveCount(0)
})

test('sem estabelecimento vinculado, orienta a falar com o OTO', async ({ page }) => {
  const estado = novoEstado()
  estado.resumos = []
  await entrar(page, estado)
  await abrirMeuEstabelecimento(page)

  await expect(page.getByText('Nenhum estabelecimento vinculado')).toBeVisible()
  await expect(
    page.getByText('Fale com o OTO para vincular o seu estabelecimento ao seu usuário.'),
  ).toBeVisible()
})

test('mostra um cartão para cada estabelecimento vinculado, com o selo de inativo', async ({
  page,
}) => {
  const estado = novoEstado()
  estado.resumos = [RESUMO(7, 'Pousada do Sol'), RESUMO(8, 'Pousada da Lua', false)]
  estado.cadastros[8] = CADASTRO(8, 'Pousada da Lua')
  estado.capacidades[8] = []
  await entrar(page, estado)
  await abrirMeuEstabelecimento(page)

  await expect(page.getByRole('heading', { name: 'Pousada do Sol' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pousada da Lua' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Editar dados de/ })).toHaveCount(2)
  await expect(page.getByText('Inativo', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Nenhuma capacidade cadastrada')).toBeVisible()
})

test('erro ao carregar a lista permite tentar de novo', async ({ page }) => {
  const estado = novoEstado()
  estado.semLista = true
  await entrar(page, estado)
  await page.goto('/meu-estabelecimento')

  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível carregar os seus estabelecimentos.',
  )
  estado.semLista = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Pousada do Sol' })).toBeVisible()
})

test('erro ao carregar o cadastro bloqueia a edição até tentar de novo', async ({ page }) => {
  const estado = novoEstado()
  estado.semDetalhe = [7]
  await entrar(page, estado)
  await abrirMeuEstabelecimento(page)

  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o cadastro.')
  await expect(page.getByRole('button', { name: 'Editar dados de Pousada do Sol' })).toBeDisabled()

  estado.semDetalhe = []
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('button', { name: 'Editar dados de Pousada do Sol' })).toBeEnabled()
  await expect(secao(page, 'Dados cadastrais')).toBeVisible()
})

test.describe('edição dos dados', () => {
  async function abrirEdicao(page: Page) {
    await abrirMeuEstabelecimento(page)
    await page.getByRole('button', { name: 'Editar dados de Pousada do Sol' }).click()
    return page.getByRole('dialog', { name: 'Editar dados de Pousada do Sol' })
  }

  test('abre com os dados atuais, sem os campos da Secretaria nem da capacidade', async ({
    page,
  }) => {
    await entrar(page, novoEstado())
    const dialogo = await abrirEdicao(page)

    await expect(dialogo.getByLabel('Nome fantasia')).toHaveValue('Pousada do Sol')
    await expect(dialogo.getByLabel('CNPJ')).toHaveValue('12345678000190')
    await expect(dialogo.getByLabel('Contato para as pesquisas')).toHaveCount(0)
    await expect(dialogo.getByLabel('Tipo de hospedagem')).toHaveCount(0)
    await expect(dialogo.getByLabel('UH', { exact: true })).toHaveCount(0)
  })

  test('barra nome vazio, e-mail inválido e CNPJ curto sem chamar a API', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    const dialogo = await abrirEdicao(page)

    await dialogo.getByLabel('Nome fantasia').fill('')
    await dialogo.getByLabel('E-mail comercial').fill('sem-arroba')
    await dialogo.getByLabel('CNPJ').fill('123')
    await dialogo.getByRole('button', { name: 'Salvar' }).click()

    await expect(dialogo.getByText('Preencha este campo.')).toBeVisible()
    await expect(dialogo.getByText('Informe um e-mail válido.')).toBeVisible()
    await expect(dialogo.getByText('O CNPJ tem 14 dígitos.')).toBeVisible()
    expect(estado.envios).toHaveLength(0)
  })

  test('cancelar fecha o diálogo sem gravar e mantém os dados', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    const dialogo = await abrirEdicao(page)

    await dialogo.getByLabel('Nome fantasia').fill('Outro nome')
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()

    await expect(dialogo).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Pousada do Sol' })).toBeVisible()
    expect(estado.envios).toHaveLength(0)
  })

  test('a API recusa o CNPJ e a mensagem aparece no campo, com o diálogo aberto', async ({
    page,
  }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    const dialogo = await abrirEdicao(page)

    estado.recusaProxima = {
      status: 422,
      detail: 'O CNPJ já está cadastrado em outro estabelecimento.',
    }
    await dialogo.getByRole('button', { name: 'Salvar' }).click()

    await expect(
      dialogo.getByText('O CNPJ já está cadastrado em outro estabelecimento.'),
    ).toBeVisible()
    await expect(dialogo).toBeVisible()
    await expect(page.getByText('Dados atualizados.')).toHaveCount(0)
  })

  test('envia só o bloco de dados, com os valores atuais dos campos que não mudaram', async ({
    page,
  }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    const dialogo = await abrirEdicao(page)

    await dialogo.getByLabel('Bairro').fill('Jardim')
    await dialogo.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('Dados atualizados.')).toBeVisible()
    expect(estado.envios).toHaveLength(1)
    const { corpo } = estado.envios[0]!
    expect(Object.keys(corpo as object)).toEqual(['dados'])
    expect((corpo as { dados: Record<string, unknown> }).dados).toMatchObject({
      nomeFantasia: 'Pousada do Sol',
      cnpj: '12345678000190',
      bairro: 'Jardim',
    })
    await expect(
      secao(page, 'Endereço').locator('div', { hasText: 'Bairro' }).locator('dd').first(),
    ).toHaveText('Jardim')
  })
})

test.describe('capacidade', () => {
  async function abrirNovaCapacidade(page: Page) {
    await abrirMeuEstabelecimento(page)
    await page.getByRole('button', { name: /Informar nova capacidade/ }).click()
    return page.getByRole('dialog', { name: 'Informar nova capacidade' })
  }

  test('barra UH PCD acima do total de UH e campos obrigatórios vazios', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    const dialogo = await abrirNovaCapacidade(page)

    await dialogo.getByLabel('Vigente desde').fill('2026-11-20')
    await dialogo.getByLabel('UH', { exact: true }).fill('10')
    await dialogo.getByLabel('UH PCD').fill('11')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(dialogo.getByText('As UH PCD não podem passar o total de UH.')).toBeVisible()
    await expect(dialogo.getByText('Preencha este campo.').first()).toBeVisible()
    expect(estado.envios).toHaveLength(0)
  })

  test('data já usada por outra vigência é recusada no campo da data', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    const dialogo = await abrirNovaCapacidade(page)

    estado.recusaProxima = {
      status: 422,
      detail: 'Já existe uma capacidade a partir desta data.',
    }
    await dialogo.getByLabel('Vigente desde').fill('2025-01-01')
    await dialogo.getByLabel('UH', { exact: true }).fill('35')
    await dialogo.getByLabel('UH PCD').fill('2')
    await dialogo.getByLabel('Leitos').fill('90')
    await dialogo.getByLabel('Máximo de pessoas por UH').fill('4')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(dialogo.getByText('Já existe uma capacidade a partir desta data.')).toBeVisible()
    await expect(dialogo).toBeVisible()
  })

  test('a nova vigência entra na tabela e a anterior passa a ser a vigente mais antiga', async ({
    page,
  }) => {
    await entrar(page, novoEstado())
    const dialogo = await abrirNovaCapacidade(page)

    await dialogo.getByLabel('Vigente desde').fill('2026-01-01')
    await dialogo.getByLabel('UH', { exact: true }).fill('35')
    await dialogo.getByLabel('UH PCD').fill('2')
    await dialogo.getByLabel('Leitos').fill('90')
    await dialogo.getByLabel('Máximo de pessoas por UH').fill('4')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(page.getByText('Capacidade a partir de 01/01/2026 informada.')).toBeVisible()
    await expect(page.getByRole('row', { name: /01\/01\/2026/ })).toContainText('Vigente')
    await expect(page.getByRole('row', { name: /01\/01\/2025/ })).toContainText('Anterior')
  })

  test('cancelar fecha o diálogo sem gravar', async ({ page }) => {
    const estado = novoEstado()
    await entrar(page, estado)
    const dialogo = await abrirNovaCapacidade(page)

    await dialogo.getByRole('button', { name: 'Cancelar' }).click()

    await expect(dialogo).toHaveCount(0)
    expect(estado.envios).toHaveLength(0)
  })
})

test('erro ao salvar o inventário aparece no cartão e mantém as marcações', async ({ page }) => {
  const estado = novoEstado()
  await entrar(page, estado)
  await abrirMeuEstabelecimento(page)

  const inventario = secao(page, 'Inventário')
  await inventario.getByRole('checkbox', { name: 'Piscina' }).check()
  estado.recusaProxima = { status: 422, detail: 'Item inativo no catálogo.' }
  await inventario.getByRole('button', { name: 'Salvar inventário' }).click()

  await expect(inventario.getByRole('alert')).toHaveText('Item inativo no catálogo.')
  await expect(inventario.getByRole('checkbox', { name: 'Piscina' })).toBeChecked()
})

test('o menu do parceiro leva ao cartão do estabelecimento', async ({ page }) => {
  await entrar(page, novoEstado())
  await page.goto('/')
  await page.getByRole('link', { name: 'Meu estabelecimento' }).click()
  await expect(page).toHaveURL(/\/meu-estabelecimento$/)
  await expect(page.getByRole('heading', { name: 'Pousada do Sol' })).toBeVisible()
})

test('o ADMIN não vê o item no menu e a tela diz que não tem permissão', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'oto.sessao',
      JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
    )
  })
  await page.route('**/api/**', (rota) => {
    const { pathname } = new URL(rota.request().url())
    if (pathname === '/api/me') {
      return rota.fulfill({
        json: { id: 1, nome: 'Ana Souza', email: 'ana@oto.test', perfil: 'ADMIN', ativo: true },
      })
    }
    return rota.fulfill({ json: [] })
  })

  await page.goto('/')
  await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Meu estabelecimento' })).toHaveCount(0)

  await page.goto('/meu-estabelecimento')
  await expect(page.getByText('Sem permissão para esta página')).toBeVisible()
})
