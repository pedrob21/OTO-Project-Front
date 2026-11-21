import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { MeuEstabelecimentoPage } from './MeuEstabelecimentoPage'

const PARCEIRO = {
  id: 2,
  nome: 'Pousada Sol',
  email: 'sol@oto.test',
  perfil: 'PARCEIRO',
  ativo: true,
} as const

const RESUMO = {
  id: 7,
  nomeFantasia: 'Pousada do Sol',
  tipoHospedagemCodigo: 'POUSADA',
  situacao: 'REGULAR',
  ativo: true,
}
const CADASTRO = {
  id: 7,
  ativo: true,
  dados: {
    nomeFantasia: 'Pousada do Sol',
    cnpj: '12345678000190',
    dataAbertura: '2015-03-02',
    horarioCheckIn: '14:00:00',
    possuiCadastur: true,
    funcionamento24h: false,
  },
  secretaria: {
    tipoHospedagemCodigo: 'POUSADA',
    situacao: 'REGULAR',
    aceitaPesquisas: true,
    contatoNome: 'Maria',
  },
}

function preparar(rotas: RotasFalsas = {}) {
  return criarApiFalsa({
    'GET /api/estabelecimentos': { corpo: [RESUMO] },
    'GET /api/estabelecimentos/7': { corpo: CADASTRO },
    'GET /api/referencias': {
      corpo: { tiposHospedagem: [{ codigo: 'POUSADA', nome: 'Pousada' }] },
    },
    ...rotas,
  })
}

const abrir = () => abrirTela(<MeuEstabelecimentoPage hoje="2026-11-20" />, { usuario: PARCEIRO })

afterEach(() => vi.unstubAllGlobals())

describe('meu estabelecimento', () => {
  it('mostra um card por estabelecimento com os dados em leitura', async () => {
    preparar({
      'GET /api/estabelecimentos': {
        corpo: [RESUMO, { ...RESUMO, id: 8, nomeFantasia: 'Pousada da Lua' }],
      },
      'GET /api/estabelecimentos/8': {
        corpo: { ...CADASTRO, id: 8, dados: { nomeFantasia: 'Pousada da Lua' } },
      },
    })
    abrir()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Meu estabelecimento' }),
    ).toBeVisible()
    const sol = (await screen.findByRole('heading', { name: 'Pousada do Sol' })).closest('section')!
    expect(await within(sol).findByText('12345678000190')).toBeVisible()
    expect(within(sol).getByText('02/03/2015')).toBeVisible()
    expect(within(sol).getByText('14:00')).toBeVisible()
    const secretaria = within(sol).getByRole('region', { name: 'Dados da Secretaria' })
    expect(within(secretaria).getByText('Pousada')).toBeVisible()
    expect(within(secretaria).getByText('Maria')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Pousada da Lua' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: /^Editar dados de/ })).toHaveLength(2)
  })

  it('edita só os dados cadastrais e envia o pedido sem o bloco da Secretaria', async () => {
    const api = preparar({
      'PUT /api/estabelecimentos/7': {
        corpo: { ...CADASTRO, dados: { ...CADASTRO.dados, nomeFantasia: 'Pousada Nova' } },
      },
    })
    abrir()
    await screen.findByText('12345678000190')

    await userEvent.click(screen.getByRole('button', { name: 'Editar dados de Pousada do Sol' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar dados de Pousada do Sol' })
    expect(within(dialogo).queryByLabelText('Tipo de hospedagem')).not.toBeInTheDocument()
    expect(within(dialogo).queryByText('Dados da Secretaria')).not.toBeInTheDocument()
    await preencherCampo(within(dialogo).getByLabelText('Nome fantasia'), 'Pousada Nova')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(api.envios()).toHaveLength(1))
    const [envio] = api.envios()
    expect(envio).toMatchObject({ metodo: 'PUT', caminho: '/api/estabelecimentos/7' })
    const corpo = envio!.corpo as { dados: { nomeFantasia: string }; secretaria?: unknown }
    expect(corpo.dados.nomeFantasia).toBe('Pousada Nova')
    expect(corpo).not.toHaveProperty('secretaria')
    expect(await screen.findByText('Dados atualizados.')).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mostra o erro da API no formulário e mantém o diálogo aberto', async () => {
    preparar({
      'PUT /api/estabelecimentos/7': { status: 422, corpo: { detail: 'CNPJ inválido.' } },
    })
    abrir()
    await screen.findByText('12345678000190')
    await userEvent.click(screen.getByRole('button', { name: 'Editar dados de Pousada do Sol' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText(/CNPJ inválido/)).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('sem estabelecimento vinculado, mostra o estado vazio', async () => {
    preparar({ 'GET /api/estabelecimentos': { corpo: [] } })
    abrir()

    expect(await screen.findByText('Nenhum estabelecimento vinculado')).toBeVisible()
  })

  it('com falha na lista, oferece tentar de novo', async () => {
    preparar({ 'GET /api/estabelecimentos': { status: 500, corpo: { detail: 'falhou' } } })
    abrir()

    expect(
      await screen.findByText('Não foi possível carregar os seus estabelecimentos.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })
})
