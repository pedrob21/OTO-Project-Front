import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AcompanhamentoPage } from './AcompanhamentoPage'
import { abrirTela, simularApi } from './apiDeTeste'

const RODADA = {
  id: 5,
  codigo: '005/26',
  titulo: 'Consolidada de outubro',
  status: 'ABERTA',
  dataAbertura: '2026-11-01',
  prazoResposta: '2026-11-20',
  campanhas: [{ id: 50, nome: 'Consolidada de outubro de 2026', publicada: false }],
}

const ACOMPANHAMENTO = {
  rodadaId: 5,
  codigo: '005/26',
  status: 'ABERTA',
  campanhas: [
    {
      campanhaId: 50,
      nome: 'Consolidada de outubro de 2026',
      qtdMh: 3,
      qtdRespondentes: 2,
      leitosTotal: 13508,
      leitosRespondentes: 9237,
      percentualLeitosRespondentes: 68.38,
      percentualMinimoPublicacao: 70,
      atingiuMinimo: false,
      estabelecimentos: [
        {
          estabelecimentoId: 7,
          nomeFantasia: 'Hotel Thermas',
          tipoHospedagemCodigo: 'HOTEL',
          qtdLeitos: 4271,
          respondeu: false,
          contatoNome: 'Marta',
          telefonePesquisas: '(17) 3281-0000',
          aceitaPesquisas: true,
        },
        {
          estabelecimentoId: 8,
          nomeFantasia: 'Pousada do Sol',
          tipoHospedagemCodigo: 'POUSADA',
          qtdLeitos: 37,
          respondeu: true,
          versao: 2,
          enviadoEm: '2026-11-05T13:00:00Z',
          aceitaPesquisas: false,
        },
        {
          estabelecimentoId: 9,
          nomeFantasia: 'Resort Águas',
          tipoHospedagemCodigo: 'RESORT',
          qtdLeitos: 9200,
          respondeu: true,
          versao: 1,
          enviadoEm: '2026-11-03T10:00:00Z',
        },
      ],
    },
  ],
}

let api: ReturnType<typeof simularApi>

beforeEach(() => {
  api = simularApi({
    'GET /api/rodadas/5': { corpo: RODADA },
    'GET /api/rodadas/5/acompanhamento': { corpo: ACOMPANHAMENTO },
    'GET /api/referencias': {
      corpo: {
        tiposHospedagem: [
          { codigo: 'HOTEL', nome: 'Hotel' },
          { codigo: 'POUSADA', nome: 'Pousada' },
        ],
      },
    },
    'POST /api/rodadas/5/prorrogar': { corpo: RODADA },
    'POST /api/rodadas/5/encerrar': { corpo: { ...RODADA, status: 'ENCERRADA' } },
    'POST /api/rodadas/5/reabrir': { corpo: RODADA },
    'POST /api/rodadas/5/abrir': { corpo: RODADA },
  })
})

afterEach(() => vi.unstubAllGlobals())

function abrir() {
  return abrirTela(
    [
      { path: '/pesquisas', element: <p>lista</p> },
      { path: '/pesquisas/:id', element: <AcompanhamentoPage hoje="2026-11-16" /> },
    ],
    '/pesquisas/5',
  )
}

function comRodada(mudancas: Record<string, unknown>) {
  api.rotas['GET /api/rodadas/5'] = { corpo: { ...RODADA, ...mudancas } }
}

function linha(nome: string) {
  return within(screen.getByRole('rowheader', { name: nome }).closest('tr') as HTMLElement)
}

function novoPrazo(valor: string) {
  fireEvent.change(screen.getByLabelText('Novo prazo de resposta'), { target: { value: valor } })
}

describe('AcompanhamentoPage, dados', () => {
  it('mostra a rodada, a situação e o prazo', async () => {
    abrir()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Consolidada de outubro' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Rodada 005/26')).toBeInTheDocument()
    expect(screen.getByText('Aberta')).toBeInTheDocument()
    expect(screen.getByText('Prazo de resposta: 20/11/2026 · faltam 4 dias')).toBeInTheDocument()
  })

  it('mostra as taxas de resposta por estabelecimentos e por leitos, com o mínimo de 70%', async () => {
    abrir()

    const cartao = (
      await screen.findByRole('heading', { name: 'Consolidada de outubro de 2026' })
    ).closest('section') as HTMLElement
    expect(within(cartao).getByText('2 responderam · 1 pendente')).toBeInTheDocument()
    expect(
      within(cartao).getByRole('progressbar', { name: 'Taxa de resposta por estabelecimentos' }),
    ).toHaveAttribute('aria-valuenow', String((2 / 3) * 100))
    expect(within(cartao).getByText('2 de 3 (66,67%)')).toBeInTheDocument()
    expect(
      within(cartao).getByRole('progressbar', { name: 'Taxa de resposta por leitos' }),
    ).toHaveAttribute('aria-valuenow', '68.38')
    expect(within(cartao).getByText('9.237 de 13.508 leitos (68,38%)')).toBeInTheDocument()
    expect(within(cartao).getByText(/Mínimo para publicar: 70%/)).toBeInTheDocument()
    expect(within(cartao).getByText('Abaixo do mínimo.')).toBeInTheDocument()
  })

  it('lista quem respondeu e quem falta, com tipo, leitos e contato', async () => {
    abrir()

    await screen.findByRole('table', { name: 'Estabelecimentos de Consolidada de outubro de 2026' })
    expect(linha('Hotel Thermas').getByText('Pendente')).toBeInTheDocument()
    expect(linha('Hotel Thermas').getByText('Hotel')).toBeInTheDocument()
    expect(linha('Hotel Thermas').getByText('4.271')).toBeInTheDocument()
    expect(linha('Hotel Thermas').getByText('(17) 3281-0000')).toBeInTheDocument()
    expect(linha('Pousada do Sol').getByText('Respondeu')).toBeInTheDocument()
    expect(linha('Pousada do Sol').getByText('versão 2 · 05/11/2026')).toBeInTheDocument()
    expect(linha('Pousada do Sol').getByText('Não aceita receber pesquisas')).toBeInTheDocument()
    expect(linha('Resort Águas').getByText('RESORT')).toBeInTheDocument()
  })

  it('mínimo atingido aparece em texto', async () => {
    const [campanha] = ACOMPANHAMENTO.campanhas
    api.rotas['GET /api/rodadas/5/acompanhamento'] = {
      corpo: { ...ACOMPANHAMENTO, campanhas: [{ ...campanha, percentualLeitosRespondentes: 70 }] },
    }
    abrir()

    expect(await screen.findByText('Mínimo atingido.')).toBeInTheDocument()
  })

  it('erro ao carregar a rodada', async () => {
    api.rotas['GET /api/rodadas/5'] = {
      status: 404,
      corpo: { detail: 'Pesquisa 5 não encontrada.' },
    }
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent('Pesquisa 5 não encontrada.')
    expect(screen.getByRole('link', { name: 'Todas as pesquisas' })).toHaveAttribute(
      'href',
      '/pesquisas',
    )
  })

  it('erro só no acompanhamento mantém as ações', async () => {
    api.rotas['GET /api/rodadas/5/acompanhamento'] = { status: 500, corpo: { detail: 'Falhou.' } }
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as respostas desta pesquisa.',
    )
    expect(screen.getByRole('button', { name: 'Encerrar pesquisa' })).toBeInTheDocument()
  })
})

describe('AcompanhamentoPage, lançar resposta', () => {
  it('leva ao lançamento de um pendente e à edição de quem respondeu', async () => {
    abrir()

    await screen.findByRole('table')
    expect(
      linha('Hotel Thermas').getByRole('link', { name: 'Lançar resposta de Hotel Thermas' }),
    ).toHaveAttribute('href', '/pesquisas/5/campanhas/50/respostas/7')
    expect(
      linha('Pousada do Sol').getByRole('link', { name: 'Editar resposta de Pousada do Sol' }),
    ).toBeInTheDocument()
  })

  it('cada campanha leva à prévia e publicação', async () => {
    abrir()

    expect(
      await screen.findByRole('link', {
        name: 'Prévia e publicação de Consolidada de outubro de 2026',
      }),
    ).toHaveAttribute('href', '/pesquisas/5/campanhas/50/previa')
  })

  it('campanha publicada não oferece lançamento', async () => {
    comRodada({ status: 'ENCERRADA', campanhas: [{ id: 50, publicada: true }] })
    abrir()

    await screen.findByRole('table')
    expect(screen.queryByRole('link', { name: /Lançar resposta/ })).not.toBeInTheDocument()
  })
})

describe('AcompanhamentoPage, ações por situação', () => {
  it('aberta: prorrogar e encerrar', async () => {
    abrir()

    expect(await screen.findByRole('button', { name: 'Prorrogar prazo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encerrar pesquisa' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reabrir pesquisa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir pesquisa' })).not.toBeInTheDocument()
  })

  it('rascunho: só abrir', async () => {
    comRodada({ status: 'RASCUNHO', dataAbertura: undefined })
    abrir()

    expect(await screen.findByRole('button', { name: 'Abrir pesquisa' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Encerrar pesquisa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prorrogar prazo' })).not.toBeInTheDocument()
  })

  it('encerrada: só reabrir', async () => {
    comRodada({ status: 'ENCERRADA' })
    abrir()

    expect(await screen.findByRole('button', { name: 'Reabrir pesquisa' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Encerrar pesquisa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prorrogar prazo' })).not.toBeInTheDocument()
  })

  it('encerrada com campanha publicada não reabre, e diz por quê', async () => {
    comRodada({ status: 'ENCERRADA', campanhas: [{ id: 50, publicada: true }] })
    abrir()

    const reabrir = await screen.findByRole('button', { name: 'Reabrir pesquisa' })
    expect(reabrir).toBeDisabled()
    expect(reabrir).toHaveAccessibleDescription(
      'Há campanha publicada. Cancele a publicação antes de reabrir a pesquisa.',
    )
  })
})

describe('AcompanhamentoPage, ações', () => {
  it('prorroga com o novo prazo e atualiza a rodada', async () => {
    abrir()
    await screen.findByRole('button', { name: 'Prorrogar prazo' })
    const leiturasAntes = api.leituras('/api/rodadas/5')

    novoPrazo('2026-11-30')
    await userEvent.click(screen.getByRole('button', { name: 'Prorrogar prazo' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Prazo de resposta prorrogado.')
    expect(api.escritas()).toEqual([
      expect.objectContaining({
        caminho: '/api/rodadas/5/prorrogar',
        corpo: { prazoResposta: '2026-11-30' },
      }),
    ])
    await vi.waitFor(() => expect(api.leituras('/api/rodadas/5')).toBeGreaterThan(leiturasAntes))
  })

  it('não envia prazo vazio nem anterior à abertura', async () => {
    abrir()
    await screen.findByRole('button', { name: 'Prorrogar prazo' })

    await userEvent.click(screen.getByRole('button', { name: 'Prorrogar prazo' }))
    expect(screen.getByLabelText('Novo prazo de resposta')).toHaveAccessibleDescription(
      'Informe o prazo de resposta.',
    )

    novoPrazo('2026-10-31')
    expect(
      screen.getByText('O prazo não pode ser anterior à abertura (01/11/2026).'),
    ).toBeInTheDocument()
    expect(api.escritas()).toEqual([])
  })

  it('encerrar pede confirmação; cancelar não encerra', async () => {
    abrir()
    const encerrar = await screen.findByRole('button', { name: 'Encerrar pesquisa' })

    await userEvent.click(encerrar)

    const confirmacao = screen.getByRole('dialog', { name: 'Encerrar a pesquisa 005/26?' })
    const cancelar = within(confirmacao).getByRole('button', { name: 'Cancelar' })
    expect(cancelar).toHaveFocus()
    await userEvent.click(cancelar)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(encerrar).toHaveFocus()
    expect(api.escritas()).toEqual([])
  })

  it('confirmado, encerra e mostra a nova situação', async () => {
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar pesquisa' }))
    comRodada({ status: 'ENCERRADA' })

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))

    expect(await screen.findByRole('button', { name: 'Reabrir pesquisa' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Pesquisa encerrada.')
    expect(screen.getByText('Encerrada')).toBeInTheDocument()
    expect(api.escritas().map(({ caminho }) => caminho)).toEqual(['/api/rodadas/5/encerrar'])
  })

  it('reabre com o novo prazo', async () => {
    comRodada({ status: 'ENCERRADA' })
    abrir()
    await screen.findByRole('button', { name: 'Reabrir pesquisa' })

    novoPrazo('2026-12-10')
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir pesquisa' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Pesquisa reaberta')
    expect(api.escritas()).toEqual([
      expect.objectContaining({
        caminho: '/api/rodadas/5/reabrir',
        corpo: { prazoResposta: '2026-12-10' },
      }),
    ])
  })

  it('abre o rascunho com o prazo', async () => {
    comRodada({ status: 'RASCUNHO', dataAbertura: undefined })
    abrir()
    await screen.findByRole('button', { name: 'Abrir pesquisa' })

    fireEvent.change(screen.getByLabelText('Prazo de resposta'), {
      target: { value: '2026-11-30' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir pesquisa' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Pesquisa aberta para respostas.')
    expect(api.escritas()).toEqual([
      expect.objectContaining({
        caminho: '/api/rodadas/5/abrir',
        corpo: { prazoResposta: '2026-11-30' },
      }),
    ])
  })

  it('erro da API aparece e a confirmação continua aberta', async () => {
    api.rotas['POST /api/rodadas/5/encerrar'] = {
      status: 422,
      corpo: { detail: 'Só é possível encerrar uma pesquisa aberta.' },
    }
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar pesquisa' }))

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Só é possível encerrar uma pesquisa aberta.',
    )
    expect(screen.getByRole('dialog', { name: 'Encerrar a pesquisa 005/26?' })).toBeInTheDocument()
  })
})
