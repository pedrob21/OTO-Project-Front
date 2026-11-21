import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { abrirTela, simularApi } from './apiDeTeste'
import { RodadasPage } from './RodadasPage'

const ABERTA = {
  id: 2,
  codigo: '002/26',
  titulo: 'Consolidada de setembro',
  status: 'ABERTA',
  prazoResposta: '2026-11-20',
  campanhas: [
    {
      id: 21,
      nome: 'Consolidada de setembro de 2026',
      periodoInicio: '2026-09-01',
      periodoFim: '2026-09-30',
    },
  ],
}
const PUBLICADA = {
  id: 1,
  codigo: '001/26',
  titulo: 'Consolidada de agosto',
  status: 'ENCERRADA',
  prazoResposta: '2026-09-10',
  campanhas: [{ id: 11, nome: 'Consolidada de agosto de 2026', publicadaEm: '2026-09-18' }],
}
const RASCUNHO = { id: 3, codigo: '003/26', titulo: 'Outubro', status: 'RASCUNHO', campanhas: [] }

let api: ReturnType<typeof simularApi>

beforeEach(() => {
  api = simularApi({ 'GET /api/rodadas': { corpo: [RASCUNHO, ABERTA, PUBLICADA] } })
})

afterEach(() => vi.unstubAllGlobals())

function abrir(caminho = '/pesquisas') {
  return abrirTela(
    [
      { path: '/pesquisas', element: <RodadasPage hoje="2026-11-16" /> },
      { path: '/pesquisas/nova', element: <p>nova pesquisa</p> },
      { path: '/pesquisas/:id', element: <p>acompanhamento</p> },
    ],
    caminho,
  )
}

function linha(codigo: string) {
  return screen.getByRole('rowheader', { name: codigo }).closest('tr') as HTMLElement
}

describe('RodadasPage', () => {
  it('lista as rodadas com campanhas, prazo e situação', async () => {
    abrir()

    expect(await screen.findByRole('table', { name: 'Pesquisas' })).toBeInTheDocument()
    const aberta = within(linha('002/26'))
    expect(aberta.getByText('Consolidada de setembro de 2026')).toBeInTheDocument()
    expect(aberta.getByText('01/09/2026 a 30/09/2026')).toBeInTheDocument()
    expect(aberta.getByText('20/11/2026')).toBeInTheDocument()
    expect(aberta.getByText('faltam 4 dias')).toBeInTheDocument()
    expect(aberta.getByText('Aberta')).toBeInTheDocument()

    expect(within(linha('001/26')).getByText('Publicada')).toBeInTheDocument()
    expect(within(linha('001/26')).queryByText(/faltam/)).not.toBeInTheDocument()
    expect(within(linha('003/26')).getByText('Rascunho')).toBeInTheDocument()
    expect(within(linha('003/26')).getByText('Sem campanhas')).toBeInTheDocument()
    expect(within(linha('003/26')).getByText('—')).toBeInTheDocument()
  })

  it('o título leva ao acompanhamento', async () => {
    const router = abrir()

    await userEvent.click(await screen.findByRole('link', { name: 'Consolidada de setembro' }))

    expect(router.state.location.pathname).toBe('/pesquisas/2')
  })

  it('leva à criação de pesquisa', async () => {
    const router = abrir()

    await userEvent.click(await screen.findByRole('link', { name: 'Nova pesquisa' }))

    expect(router.state.location.pathname).toBe('/pesquisas/nova')
  })

  it('filtra pela situação na API e guarda o filtro na URL', async () => {
    const router = abrir()
    await screen.findByRole('table')
    api.rotas['GET /api/rodadas'] = { corpo: [ABERTA] }

    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'Abertas')

    expect(await screen.findByRole('rowheader', { name: '002/26' })).toBeInTheDocument()
    await vi.waitFor(() =>
      expect(screen.queryByRole('rowheader', { name: '001/26' })).not.toBeInTheDocument(),
    )
    expect(api.chamadas.at(-1)?.busca).toBe('?status=ABERTA')
    expect(router.state.location.search).toBe('?situacao=ABERTA')
  })

  it('abre já filtrada pela URL', async () => {
    abrir('/pesquisas?situacao=ENCERRADA')

    await screen.findByRole('table')
    expect(screen.getByLabelText('Situação')).toHaveValue('ENCERRADA')
    expect(api.chamadas[0]?.busca).toBe('?status=ENCERRADA')
  })

  it('sem pesquisas, oferece criar a primeira', async () => {
    api.rotas['GET /api/rodadas'] = { corpo: [] }
    abrir()

    expect(await screen.findByText('Nenhuma pesquisa criada ainda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar pesquisa' })).toHaveAttribute(
      'href',
      '/pesquisas/nova',
    )
  })

  it('filtro sem resultado diz qual situação', async () => {
    api.rotas['GET /api/rodadas'] = { corpo: [] }
    abrir('/pesquisas?situacao=RASCUNHO')

    expect(await screen.findByText('Nenhuma pesquisa na situação "rascunho"')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Criar pesquisa' })).not.toBeInTheDocument()
  })

  it('erro da API aparece e permite tentar de novo', async () => {
    api.rotas['GET /api/rodadas'] = [
      { status: 500, corpo: { detail: 'Falha no banco.' } },
      { corpo: [ABERTA] },
    ]
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no banco.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('rowheader', { name: '002/26' })).toBeInTheDocument()
  })
})
