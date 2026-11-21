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

const ANTIGA = {
  id: 1,
  vigenteDesde: '2025-01-01',
  qtdUh: 20,
  qtdUhPcd: 1,
  qtdLeitos: 50,
  maxLeitosPorUh: 3,
  leitosUteis: 40,
}
const ATUAL = { ...ANTIGA, id: 2, vigenteDesde: '2026-03-01', qtdUh: 30, leitosUteis: 60 }

function preparar(rotas: RotasFalsas = {}) {
  return criarApiFalsa({
    'GET /api/estabelecimentos': { corpo: [RESUMO] },
    'GET /api/estabelecimentos/7': { corpo: CADASTRO },
    'GET /api/estabelecimentos/7/capacidades': { corpo: [ATUAL, ANTIGA] },
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

  it('mostra a capacidade vigente e o histórico só para leitura', async () => {
    preparar()
    abrir()

    const tabela = await screen.findByRole('table', { name: 'Capacidade de Pousada do Sol' })
    const datas = within(tabela)
      .getAllByRole('row')
      .slice(1)
      .map((linha) => linha.textContent)
    expect(datas).toHaveLength(2)
    expect(datas[0]).toContain('01/03/2026')
    expect(datas[1]).toContain('01/01/2025')
    expect(screen.queryByRole('button', { name: /Corrigir/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument()
  })

  it('informa nova capacidade com POST e atualiza o histórico', async () => {
    const NOVA = { ...ATUAL, id: 3, vigenteDesde: '2026-11-20', qtdUh: 35 }
    const api = preparar({
      'GET /api/estabelecimentos/7/capacidades': [
        { corpo: [ATUAL, ANTIGA] },
        { corpo: [NOVA, ATUAL, ANTIGA] },
      ],
      'POST /api/estabelecimentos/7/capacidades': { status: 201, corpo: NOVA },
    })
    abrir()
    await screen.findByRole('table', { name: 'Capacidade de Pousada do Sol' })

    await userEvent.click(screen.getByRole('button', { name: /Informar nova capacidade/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Informar nova capacidade' })
    expect(within(dialogo).getByLabelText('Vigente desde')).toHaveValue('2026-11-20')
    await preencherCampo(within(dialogo).getByLabelText('UH'), '35')
    await preencherCampo(within(dialogo).getByLabelText('UH PCD'), '2')
    await preencherCampo(within(dialogo).getByLabelText('Leitos'), '90')
    await preencherCampo(within(dialogo).getByLabelText('Máximo de pessoas por UH'), '4')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    await waitFor(() => expect(api.envios()).toHaveLength(1))
    expect(api.envios()[0]).toMatchObject({
      metodo: 'POST',
      caminho: '/api/estabelecimentos/7/capacidades',
      corpo: {
        vigenteDesde: '2026-11-20',
        qtdUh: 35,
        qtdUhPcd: 2,
        qtdLeitos: 90,
        maxLeitosPorUh: 4,
      },
    })
    expect(await screen.findByText('Capacidade a partir de 20/11/2026 informada.')).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByRole('row', { name: /20\/11\/2026/ })).toBeInTheDocument()
  })
})
