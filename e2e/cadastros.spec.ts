import { expect, test, type Page } from '@playwright/test'
import { abrirCadastro } from './navegacao.ts'

type Usuario = {
  id: number
  nome: string
  email: string
  perfil: 'ADMIN' | 'PARCEIRO' | 'VISUALIZADOR'
  ativo: boolean
  primeiroAcessoPendente?: boolean
  estabelecimentos?: { id: number; nomeFantasia: string }[]
}

const ADMIN: Usuario = {
  id: 1,
  nome: 'Ana Souza',
  email: 'ana@oto.test',
  perfil: 'ADMIN',
  ativo: true,
}
const VISUALIZADOR: Usuario = {
  id: 2,
  nome: 'Vera Lima',
  email: 'vera@oto.test',
  perfil: 'VISUALIZADOR',
  ativo: true,
}
const HOTEL = {
  id: 12,
  nomeFantasia: 'Hotel Exemplo',
  tipoHospedagemCodigo: 'HOTEL',
  situacao: 'REGULAR',
  ativo: true,
  qtdUh: 40,
  qtdLeitos: 120,
}

/** API em memória: as listas mudam com o que a tela grava. */
async function mockarApi(page: Page, logado: Usuario) {
  const usuarios: Usuario[] = [ADMIN, { ...VISUALIZADOR }]
  const capacidades = [
    {
      id: 1,
      vigenteDesde: '2025-01-01',
      qtdUh: 40,
      qtdUhPcd: 2,
      qtdLeitos: 120,
      maxLeitosPorUh: 4,
      leitosUteis: 100,
    },
  ]

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
          usuario: logado,
        },
      })
    }
    if (chave === 'GET /api/me') return rota.fulfill({ json: logado })
    if (chave === 'GET /api/usuarios') return rota.fulfill({ json: usuarios })
    if (chave === 'POST /api/usuarios') {
      const dados = pedido.postDataJSON() as Omit<Usuario, 'id' | 'ativo'> & {
        estabelecimentoIds: number[]
      }
      const novo: Usuario = {
        id: usuarios.length + 10,
        nome: dados.nome,
        email: dados.email,
        perfil: dados.perfil,
        ativo: true,
        primeiroAcessoPendente: true,
        estabelecimentos: dados.estabelecimentoIds.includes(HOTEL.id)
          ? [{ id: HOTEL.id, nomeFantasia: HOTEL.nomeFantasia }]
          : [],
      }
      usuarios.push(novo)
      return rota.fulfill({
        status: 201,
        json: {
          usuario: novo,
          convite: { token: 'convite-e2e', tipo: 'CONVITE', expiraEm: '2026-11-28T14:00:00Z' },
        },
      })
    }
    const inativar = pathname.match(/^\/api\/usuarios\/(\d+)\/inativar$/)
    if (metodo === 'POST' && inativar) {
      const usuario = usuarios.find(({ id }) => id === Number(inativar[1]))
      if (usuario) usuario.ativo = false
      return rota.fulfill({ status: 204 })
    }
    if (chave === 'GET /api/estabelecimentos') return rota.fulfill({ json: [HOTEL] })
    if (chave === 'GET /api/estabelecimentos/12') {
      return rota.fulfill({
        json: {
          id: 12,
          ativo: true,
          dados: { nomeFantasia: HOTEL.nomeFantasia },
          secretaria: { tipoHospedagemCodigo: 'HOTEL', situacao: 'REGULAR' },
        },
      })
    }
    if (chave === 'GET /api/estabelecimentos/12/capacidades') {
      return rota.fulfill({ json: capacidades })
    }
    if (chave === 'POST /api/estabelecimentos/12/capacidades') {
      const dados = pedido.postDataJSON() as (typeof capacidades)[number]
      const nova = {
        ...dados,
        id: capacidades.length + 1,
        leitosUteis: (dados.qtdUh * (1 + dados.maxLeitosPorUh)) / 2,
      }
      capacidades.push(nova)
      return rota.fulfill({ status: 201, json: nova })
    }
    if (chave === 'GET /api/referencias') {
      return rota.fulfill({
        json: {
          tiposHospedagem: [{ codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true, ordem: 1 }],
          feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 }],
          faixasOcupacao: [],
        },
      })
    }
    if (chave === 'POST /api/historico/importacao') {
      return rota.fulfill({
        status: 422,
        json: {
          linhasLidas: 2,
          inseridos: 0,
          atualizados: 0,
          erros: [{ linha: 2, mensagem: 'feriado inválido: CARNAVALL (veja /api/referencias)' }],
        },
      })
    }
    return rota.fulfill({ json: [] })
  })
}

async function entrar(page: Page, usuario: Usuario) {
  await mockarApi(page, usuario)
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(usuario.email)
  await page.getByLabel('Senha').fill('senha-correta')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: new RegExp(usuario.nome) })).toBeVisible()
}

test.describe('ADMIN', () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, ADMIN)
  })

  test('abre Usuários pelo submenu, cria um parceiro com estabelecimento e vê o convite', async ({
    page,
  }) => {
    await abrirCadastro(page, 'Usuários')
    await expect(page).toHaveURL(/\/cadastros\/usuarios$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible()

    await page.getByRole('button', { name: 'Novo usuário' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Novo usuário' })
    await dialogo.getByLabel('Nome').fill('Paulo Lima')
    await dialogo.getByLabel('E-mail').fill('paulo@hotel.test')
    await dialogo.getByLabel('Perfil').selectOption('PARCEIRO')
    await dialogo.getByRole('checkbox', { name: 'Hotel Exemplo' }).check()
    await dialogo.getByRole('button', { name: 'Criar usuário' }).click()

    const criado = page.getByRole('dialog', { name: 'Usuário criado' })
    await expect(criado.getByLabel('Link de acesso')).toHaveValue(
      /\/definir-senha\?token=convite-e2e$/,
    )
    await expect(criado).toContainText('Vale até 28/11/2026 às 11:00')
    await criado.getByRole('button', { name: 'Concluir' }).click()

    const linha = page.getByRole('row', { name: /Paulo Lima/ })
    await expect(linha).toContainText('Hotel Exemplo')
    await expect(linha).toContainText('Convite pendente')
  })

  test('inativa um usuário', async ({ page }) => {
    await abrirCadastro(page, 'Usuários')

    await page.getByRole('button', { name: 'Inativar Vera Lima' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'inativado' })).toHaveText(
      'Usuário Vera Lima inativado.',
    )
    await expect(page.getByRole('row', { name: /Vera Lima/ })).toContainText('Inativo')
    await expect(page.getByRole('button', { name: 'Reativar Vera Lima' })).toBeVisible()
  })

  test('abre as capacidades de um estabelecimento e inclui uma vigência', async ({ page }) => {
    await abrirCadastro(page, 'Estabelecimentos')
    await page.getByRole('link', { name: 'Capacidades de Hotel Exemplo' }).click()
    await expect(page).toHaveURL(/\/cadastros\/estabelecimentos\/12\/capacidades$/)

    await page.getByRole('button', { name: 'Nova vigência' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Nova vigência de capacidade' })
    await dialogo.getByLabel('Vigente desde').fill('2026-07-01')
    await dialogo.getByLabel('UH', { exact: true }).fill('45')
    await dialogo.getByLabel('UH PCD').fill('3')
    await dialogo.getByLabel('Leitos', { exact: true }).fill('135')
    await dialogo.getByLabel('Máximo de pessoas por UH').fill('4')
    await dialogo.getByRole('button', { name: 'Incluir vigência' }).click()

    await expect(page.getByText('Capacidade a partir de 01/07/2026 incluída.')).toBeVisible()
    const linha = page.getByRole('row', { name: /01\/07\/2026/ })
    await expect(linha).toContainText('112,5')
  })

  test('importa um CSV com erro e vê que nada foi gravado', async ({ page }) => {
    await abrirCadastro(page, 'Série histórica')

    await page.getByLabel('Arquivo CSV').setInputFiles({
      name: 'serie.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'indicador;modalidade;ano;mes;feriado;tipo;valor;observacao\nFLUXO_TURISTAS;CONSOLIDADA;2024;;CARNAVALL;;98.512;\n',
      ),
    })
    await page.getByLabel('Fonte dos dados').fill('Indicadores do Turismo 2017-2025')
    await page.getByRole('button', { name: 'Importar' }).click()

    const alerta = page.getByRole('alert')
    await expect(alerta).toContainText('Nada foi gravado: 1 erro em 2 linhas lidas.')
    await expect(alerta).toContainText(
      'Linha 2: feriado inválido: CARNAVALL (veja /api/referencias)',
    )
  })
})

test('VISUALIZADOR não vê Cadastros e não entra direto na tela', async ({ page }) => {
  await entrar(page, VISUALIZADOR)

  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cadastros' })).toHaveCount(0)

  await page.goto('/cadastros/usuarios')

  await expect(page.getByText('Sem permissão para esta página')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toHaveCount(0)
})
