import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { RhcPage } from './RhcPage'

const ATUAL = {
  id: 1,
  vigenteDesde: '2026-01-01',
  qtdRegistros: 310,
  qtdUh: 420,
  qtdLeitos: 1300,
  maxLeitosPorUh: 5,
  leitosUteis: 1260,
}
const ANTIGO = {
  ...ATUAL,
  id: 2,
  vigenteDesde: '2025-01-01',
  qtdRegistros: 280,
  leitosUteis: 1150.5,
}

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({
    'GET /api/rhc': { corpo: [ANTIGO, ATUAL] },
    'GET /api/rhc/vigente': { corpo: ATUAL },
    ...rotas,
  })
}

beforeEach(() => preparar())
afterEach(() => vi.unstubAllGlobals())

const abrir = () => abrirTela(<RhcPage hoje="2026-11-16" />)
const linha = (data: string) => screen.getByRole('row', { name: new RegExp(data) })

async function preencher(dialogo: HTMLElement, valores: Record<string, string>) {
  for (const [rotulo, valor] of Object.entries(valores)) {
    await preencherCampo(within(dialogo).getByLabelText(rotulo), valor)
  }
}

const NOVOS = {
  'Vigente desde': '2027-01-01',
  'Imóveis registrados': '330',
  UH: '450',
  Leitos: '1400',
  'Máximo de pessoas por UH': '5',
}

describe('lista do RHC', () => {
  it('mostra os totais por vigência e o que vale hoje', async () => {
    abrir()

    const tabela = await screen.findByRole('table', { name: 'Totais do RHC' })
    expect(
      within(tabela)
        .getAllByRole('rowheader')
        .map((th) => th.textContent),
    ).toEqual(['01/01/2026', '01/01/2025'])
    expect(linha('01/01/2026')).toHaveTextContent('1.300')
    expect(linha('01/01/2026')).toHaveTextContent('Vigente')
    expect(linha('01/01/2025')).toHaveTextContent('1.150,5')
    expect(linha('01/01/2025')).toHaveTextContent('Anterior')
    expect(
      await screen.findByText(
        /Vigente hoje, desde 01\/01\/2026: 310 imóveis e 1\.260 leitos úteis/,
      ),
    ).toBeInTheDocument()
  })

  it('sem totais, avisa que o RHC fica fora do fluxo', async () => {
    preparar({
      'GET /api/rhc': { corpo: [] },
      'GET /api/rhc/vigente': {
        status: 404,
        corpo: { detail: 'Não há totais de RHC vigentes em 2026-11-16.' },
      },
    })
    abrir()

    expect(await screen.findByText('Nenhum total do RHC cadastrado')).toBeInTheDocument()
    expect(await screen.findByText(/Não há totais vigentes hoje/)).toBeInTheDocument()
  })

  it('erro ao carregar avisa e tenta de novo', async () => {
    preparar({ 'GET /api/rhc': [{ status: 500, corpo: {} }, { corpo: [ATUAL] }] })
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as vigências.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('row', { name: /01\/01\/2026/ })).toBeInTheDocument()
  })
})

describe('vigências do RHC', () => {
  it('inclui uma vigência', async () => {
    preparar({
      'POST /api/rhc': { status: 201, corpo: { ...ATUAL, id: 3, vigenteDesde: '2027-01-01' } },
    })
    abrir()
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Nova vigência' }))
    const dialogo = screen.getByRole('dialog', { name: 'Nova vigência: Totais do RHC' })

    await preencher(dialogo, NOVOS)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    expect(
      await screen.findByText('Totais do RHC a partir de 01/01/2027 incluídos.'),
    ).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'POST',
      caminho: '/api/rhc',
      corpo: {
        vigenteDesde: '2027-01-01',
        qtdRegistros: 330,
        qtdUh: 450,
        qtdLeitos: 1400,
        maxLeitosPorUh: 5,
      },
    })
  })

  it('valida os limites da API e mostra a data repetida no campo', async () => {
    preparar({
      'POST /api/rhc': {
        status: 422,
        corpo: { detail: 'Já existem totais de RHC a partir desta data. Use outra data.' },
      },
    })
    abrir()
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: 'Nova vigência' }))
    const dialogo = screen.getByRole('dialog')

    await preencher(dialogo, { ...NOVOS, UH: '-1', 'Máximo de pessoas por UH': '0' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))
    expect(within(dialogo).getByLabelText('UH')).toHaveAccessibleDescription(
      'Use um valor a partir de 0.',
    )
    expect(within(dialogo).getByLabelText('Máximo de pessoas por UH')).toHaveAccessibleDescription(
      'Use um valor a partir de 1.',
    )
    expect(api.envios()).toHaveLength(0)

    await preencher(dialogo, NOVOS)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    await waitFor(() =>
      expect(within(dialogo).getByLabelText('Vigente desde')).toHaveAccessibleDescription(
        'Já existem totais de RHC a partir desta data. Use outra data.',
      ),
    )
  })

  it('corrige um lançamento', async () => {
    preparar({ 'PUT /api/rhc/1': { corpo: { ...ATUAL, qtdRegistros: 311 } } })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Corrigir a vigência de 01/01/2026' }),
    )
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByLabelText('Imóveis registrados')).toHaveValue('310')

    await preencher(dialogo, { 'Imóveis registrados': '311' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar correção' }))

    expect(
      await screen.findByText('Totais do RHC a partir de 01/01/2026 corrigidos.'),
    ).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/rhc/1',
      corpo: { qtdRegistros: 311, qtdUh: 420 },
    })
  })

  it('exclui depois de confirmar', async () => {
    preparar({ 'DELETE /api/rhc/2': { status: 204 } })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir a vigência de 01/01/2025' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Excluir vigência' })
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(
      await screen.findByText('Totais do RHC a partir de 01/01/2025 excluídos.'),
    ).toBeInTheDocument()
    expect(api.envios()).toEqual([
      expect.objectContaining({ metodo: 'DELETE', caminho: '/api/rhc/2' }),
    ])
    expect(api.chamadas.filter((chamada) => chamada.caminho === '/api/rhc/vigente')).toHaveLength(2)
  })
})
