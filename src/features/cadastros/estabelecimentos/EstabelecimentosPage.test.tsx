import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { EstabelecimentosPage } from './EstabelecimentosPage'

const HOTEL = {
  id: 12,
  nomeFantasia: 'Hotel Exemplo',
  tipoHospedagemCodigo: 'HOTEL',
  situacao: 'REGULAR',
  ativo: true,
  qtdUh: 1240,
  qtdLeitos: 3600,
}
const POUSADA = {
  id: 13,
  nomeFantasia: 'Pousada Sol',
  tipoHospedagemCodigo: 'POUSADA',
  situacao: 'IRREGULAR',
  ativo: false,
}
const CADASTRO = {
  id: 12,
  ativo: true,
  dados: { nomeFantasia: 'Hotel Exemplo', cnpj: '12345678000190', site: 'https://hotel.test' },
  secretaria: { tipoHospedagemCodigo: 'HOTEL', situacao: 'REGULAR', aceitaPesquisas: true },
}

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({
    'GET /api/estabelecimentos': { corpo: [HOTEL, POUSADA] },
    'GET /api/referencias': {
      corpo: {
        tiposHospedagem: [
          { codigo: 'HOTEL', nome: 'Hotel' },
          { codigo: 'POUSADA', nome: 'Pousada' },
        ],
      },
    },
    'GET /api/estabelecimentos/12': { corpo: CADASTRO },
    ...rotas,
  })
}

beforeEach(() => preparar())
afterEach(() => vi.unstubAllGlobals())

const linha = (nome: string) => screen.getByRole('row', { name: new RegExp(nome) })

async function abrirNovo() {
  abrirTela(<EstabelecimentosPage hoje="2026-11-16" />)
  await screen.findByRole('row', { name: /Hotel Exemplo/ })
  await userEvent.click(screen.getByRole('button', { name: 'Novo estabelecimento' }))
  return screen.getByRole('dialog', { name: 'Novo estabelecimento' })
}

async function preencherObrigatorios(dialogo: HTMLElement) {
  const campo = (rotulo: string) => within(dialogo).getByLabelText(rotulo)
  await preencherCampo(campo('Nome fantasia'), 'Resort Águas')
  await userEvent.selectOptions(campo('Tipo de hospedagem'), 'HOTEL')
  await preencherCampo(campo('UH'), '40')
  await preencherCampo(campo('UH PCD'), '2')
  await preencherCampo(campo('Leitos'), '120')
  await preencherCampo(campo('Máximo de pessoas por UH'), '4')
}

describe('lista de estabelecimentos', () => {
  it('mostra tipo, UH, leitos e situação', async () => {
    abrirTela(<EstabelecimentosPage />)

    expect(await screen.findByRole('table', { name: 'Meios de hospedagem' })).toBeInTheDocument()
    expect(await within(linha('Hotel Exemplo')).findByText('Hotel')).toBeInTheDocument()
    expect(linha('Hotel Exemplo')).toHaveTextContent('1.240')
    expect(linha('Hotel Exemplo')).toHaveTextContent('3.600')
    expect(linha('Hotel Exemplo')).toHaveTextContent('Regular')
    expect(linha('Pousada Sol')).toHaveTextContent('Irregular')
    expect(linha('Pousada Sol')).toHaveTextContent('Inativo')
    expect(linha('Pousada Sol')).toHaveTextContent('—')
  })

  it('cada linha leva às capacidades do estabelecimento', async () => {
    const router = abrirTela(<EstabelecimentosPage />)

    await userEvent.click(await screen.findByRole('link', { name: 'Capacidades de Hotel Exemplo' }))

    expect(router.state.location.pathname).toBe('/cadastros/estabelecimentos/12/capacidades')
  })

  it('cada linha leva ao inventário do estabelecimento', async () => {
    const router = abrirTela(<EstabelecimentosPage />)

    await userEvent.click(await screen.findByRole('link', { name: 'Inventário de Hotel Exemplo' }))

    expect(router.state.location.pathname).toBe('/cadastros/estabelecimentos/12/inventario')
  })

  it('sem estabelecimentos, mostra o estado vazio', async () => {
    preparar({ 'GET /api/estabelecimentos': { corpo: [] } })
    abrirTela(<EstabelecimentosPage />)

    expect(await screen.findByText('Nenhum estabelecimento cadastrado')).toBeInTheDocument()
  })

  it('erro ao carregar avisa e tenta de novo', async () => {
    preparar({
      'GET /api/estabelecimentos': [{ status: 503, corpo: {} }, { corpo: [HOTEL] }],
    })
    abrirTela(<EstabelecimentosPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os estabelecimentos.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('row', { name: /Hotel Exemplo/ })).toBeInTheDocument()
  })
})

describe('novo estabelecimento', () => {
  it('cadastra com dados, dados da Secretaria e capacidade inicial', async () => {
    preparar({
      'POST /api/estabelecimentos': {
        status: 201,
        corpo: { id: 20, dados: { nomeFantasia: 'Resort Águas' } },
      },
    })
    const dialogo = await abrirNovo()
    expect(within(dialogo).getByLabelText('Nome fantasia')).toHaveFocus()
    await preencherObrigatorios(dialogo)
    await preencherCampo(within(dialogo).getByLabelText('CNPJ'), '12.345.678/0001-90')
    await preencherCampo(within(dialogo).getByLabelText('Latitude'), '-20,7376')
    await preencherCampo(within(dialogo).getByLabelText('Check-in'), '14:00')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Situação'), 'IRREGULAR')
    await preencherCampo(within(dialogo).getByLabelText('Contato para as pesquisas'), 'Maria')

    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar estabelecimento' }),
    )

    expect(await screen.findByText('Estabelecimento Resort Águas cadastrado.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const [envio] = api.envios()
    expect(envio).toMatchObject({ metodo: 'POST', caminho: '/api/estabelecimentos' })
    expect(envio?.corpo).toMatchObject({
      dados: {
        nomeFantasia: 'Resort Águas',
        cnpj: '12345678000190',
        latitude: -20.7376,
        horarioCheckIn: '14:00:00',
      },
      secretaria: {
        tipoHospedagemCodigo: 'HOTEL',
        situacao: 'IRREGULAR',
        contatoNome: 'Maria',
        aceitaPesquisas: true,
      },
      capacidade: {
        vigenteDesde: '2026-11-16',
        qtdUh: 40,
        qtdUhPcd: 2,
        qtdLeitos: 120,
        maxLeitosPorUh: 4,
      },
    })
  })

  it('valida antes de enviar, inclusive as UH PCD', async () => {
    const dialogo = await abrirNovo()

    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar estabelecimento' }),
    )

    expect(within(dialogo).getByLabelText('Nome fantasia')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialogo).getByText('Escolha o tipo de hospedagem.')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('UH')).toHaveAttribute('aria-invalid', 'true')

    await preencherObrigatorios(dialogo)
    await preencherCampo(within(dialogo).getByLabelText('UH PCD'), '41')
    await preencherCampo(within(dialogo).getByLabelText('Latitude'), '-20,1234567')
    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar estabelecimento' }),
    )

    expect(
      within(dialogo).getByText('As UH PCD não podem passar o total de UH.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByText('Use um número com até 6 casas decimais.')).toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)
  })

  it('CNPJ repetido, recusado pela API, aparece no campo', async () => {
    preparar({
      'POST /api/estabelecimentos': {
        status: 422,
        corpo: { detail: 'Já existe um estabelecimento com este CNPJ.' },
      },
    })
    const dialogo = await abrirNovo()
    await preencherObrigatorios(dialogo)
    await preencherCampo(within(dialogo).getByLabelText('CNPJ'), '12345678000190')

    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar estabelecimento' }),
    )

    await waitFor(() =>
      expect(within(dialogo).getByLabelText('CNPJ')).toHaveAccessibleDescription(
        '14 dígitos. Já existe um estabelecimento com este CNPJ.',
      ),
    )
    expect(within(dialogo).getByLabelText('CNPJ')).toHaveAttribute('aria-invalid', 'true')
  })

  it('erro de validação da API vai para o campo aninhado', async () => {
    preparar({
      'POST /api/estabelecimentos': {
        status: 400,
        corpo: {
          detail: 'Corrija os campos indicados.',
          campos: { 'secretaria.emailPesquisas': 'deve ser um endereço de e-mail bem formado' },
        },
      },
    })
    const dialogo = await abrirNovo()
    await preencherObrigatorios(dialogo)

    await userEvent.click(
      within(dialogo).getByRole('button', { name: 'Cadastrar estabelecimento' }),
    )

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Corrija os campos indicados.',
    )
    expect(within(dialogo).getByLabelText('E-mail para as pesquisas')).toHaveAccessibleDescription(
      'deve ser um endereço de e-mail bem formado',
    )
  })
})

describe('edição', () => {
  it('carrega o cadastro completo e salva dados e dados da Secretaria', async () => {
    preparar({
      'PUT /api/estabelecimentos/12': {
        corpo: { ...CADASTRO, dados: { nomeFantasia: 'Hotel Exemplo' } },
      },
    })
    abrirTela(<EstabelecimentosPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Hotel Exemplo' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar Hotel Exemplo' })

    expect(await within(dialogo).findByLabelText('CNPJ')).toHaveValue('12345678000190')
    expect(within(dialogo).getByLabelText('Site')).toHaveValue('https://hotel.test')
    expect(within(dialogo).getByLabelText('Tipo de hospedagem')).toHaveValue('HOTEL')
    expect(within(dialogo).queryByLabelText('UH')).not.toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Aceita participar/ }))
    await userEvent.clear(within(dialogo).getByLabelText('Site'))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Estabelecimento Hotel Exemplo alterado.')).toBeInTheDocument()
    const [envio] = api.envios()
    expect(envio).toMatchObject({ metodo: 'PUT', caminho: '/api/estabelecimentos/12' })
    expect(envio?.corpo).toMatchObject({
      dados: { nomeFantasia: 'Hotel Exemplo', cnpj: '12345678000190' },
      secretaria: { tipoHospedagemCodigo: 'HOTEL', aceitaPesquisas: false },
    })
    expect(envio?.corpo).not.toHaveProperty('capacidade')
    expect(envio?.corpo).not.toHaveProperty('dados.site')
  })

  it('erro ao carregar o cadastro deixa tentar de novo', async () => {
    preparar({ 'GET /api/estabelecimentos/12': [{ status: 500, corpo: {} }, { corpo: CADASTRO }] })
    abrirTela(<EstabelecimentosPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Hotel Exemplo' }))
    const dialogo = screen.getByRole('dialog')

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o cadastro.',
    )
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar novamente' }))

    expect(await within(dialogo).findByLabelText('CNPJ')).toHaveValue('12345678000190')
  })
})

describe('situação', () => {
  it('inativa e reativa', async () => {
    preparar({
      'POST /api/estabelecimentos/12/inativar': { status: 204 },
      'POST /api/estabelecimentos/13/reativar': { status: 204 },
    })
    abrirTela(<EstabelecimentosPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Inativar Hotel Exemplo' }))
    expect(await screen.findByText('Estabelecimento Hotel Exemplo inativado.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reativar Pousada Sol' }))
    expect(await screen.findByText('Estabelecimento Pousada Sol reativado.')).toBeInTheDocument()

    expect(api.envios().map((chamada) => chamada.caminho)).toEqual([
      '/api/estabelecimentos/12/inativar',
      '/api/estabelecimentos/13/reativar',
    ])
  })

  it('erro ao inativar mostra o motivo da API', async () => {
    preparar({
      'POST /api/estabelecimentos/12/inativar': {
        status: 403,
        corpo: { detail: 'Seu perfil não tem acesso a este recurso.' },
      },
    })
    abrirTela(<EstabelecimentosPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Inativar Hotel Exemplo' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível inativar Hotel Exemplo.')
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a este recurso.')
  })
})
