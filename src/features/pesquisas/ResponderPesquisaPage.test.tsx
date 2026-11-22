import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type Auth } from '@/features/auth/AuthContext'
import { ResponderPesquisaPage } from './ResponderPesquisaPage'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'

type Resposta = { status?: number; corpo?: unknown }
let rotas: Record<string, Resposta | Resposta[]>
const chamadas: { metodo: string; caminho: string; corpo: unknown }[] = []

const PENDENTE = {
  campanhaId: 21,
  campanhaNome: 'Consolidada de setembro de 2026',
  rodadaCodigo: '002/26',
  periodoInicio: '2026-09-01',
  periodoFim: '2026-09-30',
  prazoResposta: '2026-11-30',
  estabelecimentoId: 7,
  nomeFantasia: 'Pousada do Sol',
  respondida: false,
  // a API manda null, e não omite o campo, quando ainda não há resposta
  respostaId: null,
  taxaOcupacao: null,
  diariaMedia: null,
  versao: null,
  enviadoEm: null,
}
const RESPONDIDA = {
  ...PENDENTE,
  estabelecimentoId: 8,
  nomeFantasia: 'Hotel das Águas',
  respondida: true,
  respostaId: 90,
  taxaOcupacao: 72.5,
  diariaMedia: 410,
  versao: 2,
  enviadoEm: '2026-11-12T17:30:00Z',
}

function responder(chave: string): Resposta {
  const resposta = rotas[chave]
  if (Array.isArray(resposta)) return (resposta.length > 1 ? resposta.shift() : resposta[0]) ?? {}
  return resposta ?? { status: 404, corpo: { detail: `sem rota: ${chave}` } }
}

beforeEach(() => {
  chamadas.length = 0
  rotas = {
    'GET /api/respostas/pendencias': { corpo: [PENDENTE, RESPONDIDA] },
    'GET /api/referencias': {
      corpo: {
        faixasOcupacao: [
          { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41 },
          { codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61 },
        ],
      },
    },
    'GET /api/respostas/minhas': {
      corpo: [
        {
          respostaId: 50,
          campanhaId: 11,
          campanhaNome: 'Consolidada de agosto de 2026',
          nomeFantasia: 'Pousada do Sol',
          taxaOcupacao: 70,
          taxaOcupacaoCidade: 62.8,
        },
        { respostaId: 90, campanhaId: 21, campanhaNome: 'aberta', taxaOcupacao: 72.5 },
        {
          respostaId: 52,
          campanhaId: 13,
          campanhaNome: 'Expectativa FEFOL 2026',
          nomeFantasia: 'Hotel das Águas',
          taxaOcupacao: 81,
          taxaOcupacaoCidade: null,
        },
      ],
    },
    'PUT /api/campanhas/21/respostas/7': {
      corpo: {
        id: 91,
        taxaOcupacao: 68.5,
        diariaMedia: 380.9,
        versao: 1,
        enviadoEm: '2026-11-20T13:00:00Z',
      },
    },
    'GET /api/respostas/90/historico': {
      corpo: [
        {
          versao: 2,
          taxaOcupacao: 72.5,
          diariaMedia: 410,
          enviadoPor: 3,
          enviadoEm: '2026-11-12T17:30:00Z',
        },
        {
          versao: 1,
          taxaOcupacao: 70,
          diariaMedia: null,
          enviadoPor: 1,
          enviadoEm: '2026-11-10T12:00:00Z',
        },
      ],
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const caminho = new URL(url).pathname
      const metodo = init?.method ?? 'GET'
      chamadas.push({ metodo, caminho, corpo: init?.body ? JSON.parse(String(init.body)) : null })
      const { status = 200, corpo } = responder(`${metodo} ${caminho}`)
      return new Response(JSON.stringify(corpo), { status })
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

function abrir() {
  const auth = { estado: 'autenticado', usuario: { id: 3, perfil: 'PARCEIRO' } } as Auth
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <ResponderPesquisaPage hoje="2026-11-20" />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const estabelecimento = (nome: string) => screen.getByRole('listitem', { name: nome })
const puts = () => chamadas.filter((chamada) => chamada.metodo === 'PUT')

describe('ResponderPesquisaPage', () => {
  it('lista as campanhas abertas com o que falta', async () => {
    abrir()

    expect(await screen.findByText('Falta 1 de 2 respostas.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Consolidada de setembro de 2026' }),
    ).toBeInTheDocument()
    expect(within(estabelecimento('Pousada do Sol')).getByText('Pendente')).toBeInTheDocument()
    expect(within(estabelecimento('Hotel das Águas')).getByText('Enviada')).toBeInTheDocument()
    expect(
      within(estabelecimento('Hotel das Águas')).getByLabelText('Taxa de ocupação (%)'),
    ).toHaveValue('72,5')
  })

  it('não tem violações de acessibilidade', async () => {
    abrir()
    await screen.findByText('Falta 1 de 2 respostas.')

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })

  it('resposta ainda não enviada começa com os campos vazios, e não com "—"', async () => {
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    expect(within(pousada).getByLabelText('Taxa de ocupação (%)')).toHaveValue('')
    expect(within(pousada).getByLabelText('Diária média (R$)')).toHaveValue('')
  })

  it('resposta sem diária não libera a correção até algo mudar', async () => {
    rotas['GET /api/respostas/pendencias'] = {
      corpo: [{ ...RESPONDIDA, diariaMedia: null }],
    }
    abrir()
    const hotel = await screen.findByRole('listitem', { name: 'Hotel das Águas' })

    expect(within(hotel).getByRole('button', { name: 'Salvar correção' })).toBeDisabled()
    await userEvent.type(within(hotel).getByLabelText('Diária média (R$)'), '300')
    expect(within(hotel).getByRole('button', { name: 'Salvar correção' })).toBeEnabled()
  })

  it('valida a taxa antes de enviar', async () => {
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    await userEvent.click(within(pousada).getByRole('button', { name: 'Enviar resposta' }))
    expect(within(pousada).getByText('Informe a taxa de ocupação.')).toBeInTheDocument()
    expect(within(pousada).getByLabelText('Taxa de ocupação (%)')).toHaveFocus()

    await userEvent.type(within(pousada).getByLabelText('Taxa de ocupação (%)'), '120')
    expect(within(pousada).getByText('A taxa vai de 0 a 100%.')).toBeInTheDocument()
    expect(puts()).toHaveLength(0)
  })

  it('mostra a faixa do painel enquanto a taxa é digitada', async () => {
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    await userEvent.type(within(pousada).getByLabelText('Taxa de ocupação (%)'), '65')

    expect(await within(pousada).findByText('Faixa ótima no painel')).toBeInTheDocument()
  })

  it('envia a resposta com vírgula decimal e confirma a versão', async () => {
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    await userEvent.type(within(pousada).getByLabelText('Taxa de ocupação (%)'), '68,5')
    await userEvent.type(within(pousada).getByLabelText('Diária média (R$)'), '380,90')
    await userEvent.click(within(pousada).getByRole('button', { name: 'Enviar resposta' }))

    expect(await within(pousada).findByText(/Resposta salva como versão 1/)).toBeInTheDocument()
    expect(within(pousada).getByText('Enviada')).toBeInTheDocument()
    expect(within(pousada).getByRole('button', { name: 'Salvar correção' })).toBeDisabled()
    expect(puts()).toEqual([
      {
        metodo: 'PUT',
        caminho: '/api/campanhas/21/respostas/7',
        corpo: { taxaOcupacao: 68.5, diariaMedia: 380.9 },
      },
    ])
  })

  it('correção só é liberada depois de mudar algum valor', async () => {
    abrir()
    const hotel = await screen.findByRole('listitem', { name: 'Hotel das Águas' })
    const salvar = within(hotel).getByRole('button', { name: 'Salvar correção' })
    expect(salvar).toBeDisabled()

    const taxa = within(hotel).getByLabelText('Taxa de ocupação (%)')
    await userEvent.clear(taxa)
    await userEvent.type(taxa, '75')

    expect(salvar).toBeEnabled()
  })

  it('mostra as versões anteriores, com quem enviou cada uma', async () => {
    abrir()
    const hotel = await screen.findByRole('listitem', { name: 'Hotel das Águas' })

    await userEvent.click(within(hotel).getByRole('button', { name: 'Ver versões anteriores' }))

    const versoes = await within(hotel).findAllByRole('listitem')
    expect(versoes[0]).toHaveTextContent('Versão 2 (atual)')
    expect(versoes[0]).toHaveTextContent('por você')
    expect(versoes[1]).toHaveTextContent('70% de ocupação, sem diária')
    expect(versoes[1]).toHaveTextContent('pela equipe do OTO')
  })

  it('a recusa da API aparece no estabelecimento', async () => {
    rotas['PUT /api/campanhas/21/respostas/7'] = {
      status: 422,
      corpo: { detail: 'A pesquisa 002/26 não está aberta para respostas.' },
    }
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    await userEvent.type(within(pousada).getByLabelText('Taxa de ocupação (%)'), '50')
    await userEvent.click(within(pousada).getByRole('button', { name: 'Enviar resposta' }))

    expect(await within(pousada).findByRole('alert')).toHaveTextContent(
      'não está aberta para respostas',
    )
  })

  it('FE-06: com a pesquisa fechada, o que foi digitado continua nos campos', async () => {
    rotas['PUT /api/campanhas/21/respostas/7'] = {
      status: 422,
      corpo: { detail: 'A pesquisa 002/26 não está aberta para respostas.' },
    }
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    await userEvent.type(within(pousada).getByLabelText('Taxa de ocupação (%)'), '68,5')
    await userEvent.type(within(pousada).getByLabelText(/Diária média/), '380,90')
    await userEvent.click(within(pousada).getByRole('button', { name: 'Enviar resposta' }))

    await within(pousada).findByRole('alert')
    expect(within(pousada).getByLabelText('Taxa de ocupação (%)')).toHaveValue('68,5')
    expect(within(pousada).getByLabelText(/Diária média/)).toHaveValue('380,90')
  })

  it('depois do limite da API, o formulário fica só em leitura e orienta o parceiro', async () => {
    rotas['GET /api/respostas/pendencias'] = {
      corpo: [
        {
          ...PENDENTE,
          prazoResposta: '2026-10-01',
          respostasAte: '2026-10-31',
          aceitaResposta: false,
        },
        {
          ...RESPONDIDA,
          prazoResposta: '2026-10-01',
          respostasAte: '2026-10-31',
          aceitaResposta: false,
        },
      ],
    }
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'O prazo para responder terminou em 31/10/2026. Para enviar ou corrigir a resposta, fale com a equipe do OTO.',
    )
    expect(within(pousada).getByLabelText('Taxa de ocupação (%)')).toBeDisabled()
    expect(within(pousada).getByLabelText(/Diária média/)).toBeDisabled()
    expect(within(pousada).getByRole('button', { name: 'Enviar resposta' })).toBeDisabled()
    expect(within(pousada).getByText('Sem resposta')).toBeInTheDocument()
    const hotel = estabelecimento('Hotel das Águas')
    expect(within(hotel).queryByText(/Você pode corrigir/)).not.toBeInTheDocument()
    expect(puts()).toHaveLength(0)
  })

  it('depois do prazo e dentro do limite, avisa até quando ainda dá para responder', async () => {
    rotas['GET /api/respostas/pendencias'] = {
      corpo: [
        {
          ...PENDENTE,
          prazoResposta: '2026-11-10',
          respostasAte: '2026-12-10',
          aceitaResposta: true,
        },
      ],
    }
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    expect(
      screen.getByText('O prazo terminou, mas você ainda pode responder até 10/12/2026.'),
    ).toBeInTheDocument()
    expect(within(pousada).getByLabelText('Taxa de ocupação (%)')).toBeEnabled()
  })

  it('erro de campo da API aparece no campo', async () => {
    rotas['PUT /api/campanhas/21/respostas/7'] = {
      status: 400,
      corpo: { detail: 'Dados inválidos.', campos: { taxaOcupacao: 'deve ser no máximo 100' } },
    }
    abrir()
    const pousada = await screen.findByRole('listitem', { name: 'Pousada do Sol' })

    await userEvent.type(within(pousada).getByLabelText('Taxa de ocupação (%)'), '50')
    await userEvent.click(within(pousada).getByRole('button', { name: 'Enviar resposta' }))

    expect(await within(pousada).findByText(/deve ser no máximo 100/)).toBeInTheDocument()
  })

  it('erro ao carregar as pesquisas abertas', async () => {
    rotas['GET /api/respostas/pendencias'] = {
      status: 500,
      corpo: { detail: 'Falha no servidor.' },
    }
    abrir()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('lista só as respostas de pesquisas encerradas, com a taxa da cidade', async () => {
    abrir()

    const tabela = await screen.findByRole('table')
    expect(within(tabela).getByText('Consolidada de agosto de 2026')).toBeInTheDocument()
    expect(within(tabela).getByText('62,8%')).toBeInTheDocument()
    expect(within(tabela).getByText('Ainda não publicada')).toBeInTheDocument()
    expect(within(tabela).queryByText('aberta')).not.toBeInTheDocument()
  })

  it('sem pesquisas abertas, explica quando elas aparecem', async () => {
    rotas['GET /api/respostas/pendencias'] = { corpo: [] }
    abrir()

    expect(await screen.findByText('Nenhuma pesquisa aberta agora')).toBeInTheDocument()
  })
})
