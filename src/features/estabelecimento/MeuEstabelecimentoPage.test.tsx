import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { MeuEstabelecimentoPage } from './MeuEstabelecimentoPage'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'

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

const CATALOGO = [
  {
    id: 1,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    nome: 'Lazer',
    exclusivoSecretaria: false,
    itens: [
      { id: 10, nome: 'Piscina', permiteComplemento: false },
      { id: 11, nome: 'Academia', permiteComplemento: false },
    ],
  },
  {
    id: 3,
    categoria: 'SUSTENTABILIDADE',
    nome: 'Selos da Secretaria',
    exclusivoSecretaria: true,
    itens: [{ id: 30, nome: 'Selo verde', permiteComplemento: false }],
  },
]

function preparar(rotas: RotasFalsas = {}) {
  return criarApiFalsa({
    'GET /api/estabelecimentos': { corpo: [RESUMO] },
    'GET /api/estabelecimentos/7': { corpo: CADASTRO },
    'GET /api/estabelecimentos/7/capacidades': { corpo: [ATUAL, ANTIGA] },
    'GET /api/inventario/catalogo': { corpo: CATALOGO },
    'GET /api/estabelecimentos/7/inventario': {
      corpo: { estabelecimentoId: 7, itens: [{ itemId: 10 }, { itemId: 30 }] },
    },
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

  it('não tem violações de acessibilidade', async () => {
    preparar()
    abrir()
    await screen.findByRole('heading', { name: 'Pousada do Sol' })
    await screen.findByText('12345678000190')

    expect(await violacoesDeAcessibilidade()).toEqual([])
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

  it('mostra o inventário sem o grupo exclusivo da Secretaria e salva com PUT', async () => {
    const api = preparar({
      'PUT /api/estabelecimentos/7/inventario': { corpo: { estabelecimentoId: 7, itens: [] } },
    })
    abrir()

    const inventario = await screen.findByRole('region', { name: 'Inventário' })
    expect(await within(inventario).findByRole('group', { name: 'Lazer' })).toBeVisible()
    expect(
      within(inventario).queryByRole('group', { name: 'Selos da Secretaria' }),
    ).not.toBeInTheDocument()
    expect(
      within(inventario).queryByRole('checkbox', { name: 'Selo verde' }),
    ).not.toBeInTheDocument()

    await userEvent.click(within(inventario).getByRole('checkbox', { name: 'Academia' }))
    await userEvent.click(within(inventario).getByRole('button', { name: /Salvar/ }))

    await waitFor(() => expect(api.envios()).toHaveLength(1))
    expect(api.envios()[0]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/estabelecimentos/7/inventario',
      corpo: { itens: [{ itemId: 10 }, { itemId: 11 }] },
    })
  })

  it('mostra números formatados, Cadastur, situação irregular e o selo de inativo', async () => {
    preparar({
      'GET /api/estabelecimentos': { corpo: [{ ...RESUMO, ativo: false }] },
      'GET /api/estabelecimentos/7': {
        corpo: {
          ...CADASTRO,
          dados: {
            ...CADASTRO.dados,
            cadasturExigencia: 'OBRIGATORIO',
            funcionariosFixos: 1200,
          },
          secretaria: { tipoHospedagemCodigo: 'POUSADA', situacao: 'IRREGULAR' },
        },
      },
    })
    abrir()

    const cadastur = await screen.findByRole('region', { name: 'Cadastur' })
    expect(within(cadastur).getByText('Obrigatório')).toBeVisible()
    const funcionamento = screen.getByRole('region', { name: 'Funcionamento' })
    expect(within(funcionamento).getByText('1.200')).toBeVisible()
    expect(within(funcionamento).getByText('Não')).toBeVisible()
    const secretaria = screen.getByRole('region', { name: 'Dados da Secretaria' })
    expect(within(secretaria).getByText('Irregular')).toBeVisible()
    expect(screen.getByText('Inativo')).toBeVisible()
  })

  it('sem dados da Secretaria nem referências, mostra traço e o código do tipo', async () => {
    preparar({
      'GET /api/referencias': { status: 500, corpo: { detail: 'falhou' } },
      'GET /api/estabelecimentos/7': { corpo: { id: 7, ativo: true } },
    })
    abrir()

    const secretaria = await screen.findByRole('region', { name: 'Dados da Secretaria' })
    expect(within(secretaria).getByText('Regular')).toBeVisible()
    expect(within(secretaria).getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Pousada do Sol' })).toBeVisible()
    expect(screen.getByText('POUSADA')).toBeVisible()
  })

  it('cancelar a edição fecha o diálogo sem enviar nada', async () => {
    const api = preparar()
    abrir()
    await screen.findByText('12345678000190')

    await userEvent.click(screen.getByRole('button', { name: 'Editar dados de Pousada do Sol' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)
  })

  it('cancelar a nova capacidade fecha o diálogo sem enviar nada', async () => {
    const api = preparar()
    abrir()
    await screen.findByRole('table', { name: 'Capacidade de Pousada do Sol' })

    await userEvent.click(screen.getByRole('button', { name: /Informar nova capacidade/ }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)
  })

  it('Esc fecha os diálogos de edição e de capacidade', async () => {
    preparar()
    abrir()
    await screen.findByRole('table', { name: 'Capacidade de Pousada do Sol' })

    await userEvent.click(screen.getByRole('button', { name: 'Editar dados de Pousada do Sol' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Informar nova capacidade/ }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sem nome fantasia, usa textos genéricos na capacidade', async () => {
    preparar({
      'GET /api/estabelecimentos': { corpo: [{ ...RESUMO, nomeFantasia: undefined }] },
    })
    abrir()

    expect(
      await screen.findByRole('button', { name: 'Informar nova capacidade de o estabelecimento' }),
    ).toBeVisible()
    expect(await screen.findByRole('table', { name: 'Capacidade' })).toBeVisible()
  })

  it('mostra o erro da API ao informar a capacidade e mantém o diálogo aberto', async () => {
    preparar({
      'POST /api/estabelecimentos/7/capacidades': {
        status: 422,
        corpo: { detail: 'Vigência duplicada.' },
      },
    })
    abrir()
    await screen.findByRole('table', { name: 'Capacidade de Pousada do Sol' })

    await userEvent.click(screen.getByRole('button', { name: /Informar nova capacidade/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Informar nova capacidade' })
    await preencherCampo(within(dialogo).getByLabelText('UH'), '35')
    await preencherCampo(within(dialogo).getByLabelText('UH PCD'), '2')
    await preencherCampo(within(dialogo).getByLabelText('Leitos'), '90')
    await preencherCampo(within(dialogo).getByLabelText('Máximo de pessoas por UH'), '4')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    expect(await within(dialogo).findByText(/Vigência duplicada/)).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('sem capacidade cadastrada, orienta a informar a primeira', async () => {
    preparar({ 'GET /api/estabelecimentos/7/capacidades': { corpo: [] } })
    abrir()

    expect(await screen.findByText('Nenhuma capacidade cadastrada')).toBeVisible()
  })

  it('com falha na capacidade, tenta de novo e mostra a tabela', async () => {
    preparar({
      'GET /api/estabelecimentos/7/capacidades': [
        { status: 500, corpo: { detail: 'falhou' } },
        { corpo: [ATUAL] },
      ],
    })
    abrir()

    expect(await screen.findByText('Não foi possível carregar a capacidade.')).toBeVisible()
    await userEvent.click(
      within(screen.getByRole('region', { name: 'Capacidade' })).getByRole('button', {
        name: 'Tentar novamente',
      }),
    )

    expect(await screen.findByRole('table', { name: 'Capacidade de Pousada do Sol' })).toBeVisible()
  })

  it('com falha no cadastro, tenta de novo e mostra os dados', async () => {
    preparar({
      'GET /api/estabelecimentos/7': [
        { status: 500, corpo: { detail: 'falhou' } },
        { corpo: CADASTRO },
      ],
    })
    abrir()

    expect(await screen.findByText('Não foi possível carregar o cadastro.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Editar dados de Pousada do Sol' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('12345678000190')).toBeVisible()
  })

  it('tenta de novo a lista de estabelecimentos', async () => {
    preparar({
      'GET /api/estabelecimentos': [
        { status: 500, corpo: { detail: 'falhou' } },
        { corpo: [RESUMO] },
      ],
    })
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { name: 'Pousada do Sol' })).toBeVisible()
  })

  it('sem a data fixa, usa o dia de hoje como vigência padrão', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2027, 0, 5, 12) })
    try {
      preparar()
      abrirTela(<MeuEstabelecimentoPage />, { usuario: PARCEIRO })
      await screen.findByRole('table', { name: 'Capacidade de Pousada do Sol' })

      await userEvent.click(screen.getByRole('button', { name: /Informar nova capacidade/ }))

      expect(screen.getByLabelText('Vigente desde')).toHaveValue('2027-01-05')
    } finally {
      vi.useRealTimers()
    }
  })
})
