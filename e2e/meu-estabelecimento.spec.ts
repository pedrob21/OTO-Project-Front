import { expect, test, type Page } from '@playwright/test'

const PARCEIRO = {
  id: 2,
  nome: 'Paula Reis',
  email: 'paula@oto.test',
  perfil: 'PARCEIRO',
  ativo: true,
}
const RESUMO = {
  id: 7,
  nomeFantasia: 'Pousada do Sol',
  tipoHospedagemCodigo: 'POUSADA',
  situacao: 'REGULAR',
  ativo: true,
}
const SECRETARIA = {
  tipoHospedagemCodigo: 'POUSADA',
  situacao: 'REGULAR',
  aceitaPesquisas: true,
  contatoNome: 'Maria da Secretaria',
}
const ANTIGA = {
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

/** API em memória: o cadastro, a capacidade e o inventário mudam com o que a tela grava. */
async function mockarApi(page: Page) {
  let cadastro = {
    id: 7,
    ativo: true,
    dados: { nomeFantasia: 'Pousada do Sol' },
    secretaria: SECRETARIA,
  }
  let capacidades = [ANTIGA]
  let inventario: { itemId: number; complemento?: string }[] = [{ itemId: 30 }]
  const envios: Envio[] = []

  await page.route('**/api/**', async (rota) => {
    const pedido = rota.request()
    const metodo = pedido.method()
    const { pathname } = new URL(pedido.url())
    const chave = `${metodo} ${pathname}`

    if (chave === 'POST /api/auth/login') {
      return rota.fulfill({
        json: {
          token: 'token-e2e',
          expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
          usuario: PARCEIRO,
        },
      })
    }
    if (chave === 'GET /api/me') return rota.fulfill({ json: PARCEIRO })
    if (chave === 'GET /api/referencias') {
      return rota.fulfill({ json: { tiposHospedagem: [{ codigo: 'POUSADA', nome: 'Pousada' }] } })
    }
    if (chave === 'GET /api/estabelecimentos') {
      return rota.fulfill({
        json: [{ ...RESUMO, nomeFantasia: cadastro.dados.nomeFantasia }],
      })
    }
    if (chave === 'GET /api/estabelecimentos/7') return rota.fulfill({ json: cadastro })
    if (chave === 'GET /api/estabelecimentos/7/capacidades') {
      return rota.fulfill({ json: capacidades })
    }
    if (chave === 'GET /api/inventario/catalogo') return rota.fulfill({ json: CATALOGO })
    if (chave === 'GET /api/estabelecimentos/7/inventario') {
      return rota.fulfill({ json: { estabelecimentoId: 7, itens: inventario } })
    }
    if (metodo === 'PUT' || metodo === 'POST') {
      const corpo = pedido.postDataJSON() as Record<string, unknown>
      envios.push({ metodo, caminho: pathname, corpo })
      if (chave === 'PUT /api/estabelecimentos/7') {
        cadastro = { ...cadastro, dados: corpo.dados as typeof cadastro.dados }
        return rota.fulfill({ json: cadastro })
      }
      if (chave === 'POST /api/estabelecimentos/7/capacidades') {
        const nova = { ...ANTIGA, id: 2, ...corpo, leitosUteis: 90 }
        capacidades = [nova as typeof ANTIGA, ...capacidades]
        return rota.fulfill({ status: 201, json: nova })
      }
      if (chave === 'PUT /api/estabelecimentos/7/inventario') {
        inventario = corpo.itens as typeof inventario
        return rota.fulfill({ json: { estabelecimentoId: 7, itens: inventario } })
      }
    }
    return rota.fulfill({ json: [] })
  })

  return { envios }
}

test('o parceiro atualiza dados, capacidade e inventário do seu estabelecimento', async ({
  page,
}) => {
  const { envios } = await mockarApi(page)
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(PARCEIRO.email)
  await page.getByLabel('Senha').fill('senha-correta')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: new RegExp(PARCEIRO.nome) })).toBeVisible()

  await page.getByRole('link', { name: 'Meu estabelecimento' }).click()
  await expect(page).toHaveURL(/\/meu-estabelecimento$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Meu estabelecimento' })).toBeVisible()
  await expect(page.getByText('Maria da Secretaria')).toBeVisible()

  await page.getByRole('button', { name: 'Editar dados de Pousada do Sol' }).click()
  const dados = page.getByRole('dialog', { name: 'Editar dados de Pousada do Sol' })
  await expect(dados.getByLabel('Tipo de hospedagem')).toHaveCount(0)
  await dados.getByLabel('Nome fantasia').fill('Pousada Nova')
  await dados.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Dados atualizados.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pousada Nova' })).toBeVisible()

  await page.getByRole('button', { name: /Informar nova capacidade/ }).click()
  const capacidade = page.getByRole('dialog', { name: 'Informar nova capacidade' })
  await capacidade.getByLabel('Vigente desde').fill('2026-11-20')
  await capacidade.getByLabel('UH', { exact: true }).fill('35')
  await capacidade.getByLabel('UH PCD').fill('2')
  await capacidade.getByLabel('Leitos').fill('90')
  await capacidade.getByLabel('Máximo de pessoas por UH').fill('4')
  await capacidade.getByRole('button', { name: 'Incluir vigência' }).click()
  await expect(page.getByText('Capacidade a partir de 20/11/2026 informada.')).toBeVisible()
  await expect(page.getByRole('row', { name: /20\/11\/2026/ })).toBeVisible()

  const inventario = page.getByRole('region', { name: 'Inventário' })
  await expect(inventario.getByRole('group', { name: 'Selos da Secretaria' })).toHaveCount(0)
  await inventario.getByRole('checkbox', { name: 'Piscina' }).check()
  await inventario.getByLabel('Complemento de Piscina').fill('2 piscinas')
  await inventario.getByRole('button', { name: 'Salvar inventário' }).click()
  await expect(page.getByText('Inventário salvo.')).toBeVisible()

  expect(envios.map(({ metodo, caminho }) => `${metodo} ${caminho}`)).toEqual([
    'PUT /api/estabelecimentos/7',
    'POST /api/estabelecimentos/7/capacidades',
    'PUT /api/estabelecimentos/7/inventario',
  ])
  const [alteracao, vigencia, itens] = envios
  expect(Object.keys(alteracao!.corpo as object)).toEqual(['dados'])
  expect((alteracao!.corpo as { dados: { nomeFantasia: string } }).dados.nomeFantasia).toBe(
    'Pousada Nova',
  )
  expect(vigencia!.corpo).toEqual({
    vigenteDesde: '2026-11-20',
    qtdUh: 35,
    qtdUhPcd: 2,
    qtdLeitos: 90,
    maxLeitosPorUh: 4,
  })
  expect(itens!.corpo).toEqual({ itens: [{ itemId: 10, complemento: '2 piscinas' }] })
})
