import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { CapacidadesPage } from './CapacidadesPage'

const ANTIGA = {
  id: 1,
  vigenteDesde: '2025-01-01',
  qtdUh: 40,
  qtdUhPcd: 2,
  qtdLeitos: 120,
  maxLeitosPorUh: 4,
  leitosUteis: 100,
}
const ATUAL = { ...ANTIGA, id: 2, vigenteDesde: '2026-03-01', qtdUh: 41, leitosUteis: 102.5 }
const FUTURA = { ...ANTIGA, id: 3, vigenteDesde: '2027-01-01', qtdUh: 50, leitosUteis: 125 }

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({
    'GET /api/estabelecimentos/12': { corpo: { id: 12, dados: { nomeFantasia: 'Hotel Exemplo' } } },
    'GET /api/estabelecimentos/12/capacidades': { corpo: [ANTIGA, FUTURA, ATUAL] },
    ...rotas,
  })
}

beforeEach(() => preparar())
afterEach(() => vi.unstubAllGlobals())

function abrir() {
  return abrirTela(<CapacidadesPage hoje="2026-11-16" />, {
    rota: '/cadastros/estabelecimentos/:id/capacidades',
    caminho: '/cadastros/estabelecimentos/12/capacidades',
  })
}

const linha = (data: string) => screen.getByRole('row', { name: new RegExp(data) })

async function abrirNova() {
  abrir()
  await screen.findByRole('table')
  await userEvent.click(screen.getByRole('button', { name: 'Nova vigência' }))
  return screen.getByRole('dialog', { name: 'Nova vigência de capacidade' })
}

async function preencher(dialogo: HTMLElement, valores: Record<string, string>) {
  for (const [rotulo, valor] of Object.entries(valores)) {
    await preencherCampo(within(dialogo).getByLabelText(rotulo), valor)
  }
}

describe('lista de capacidades', () => {
  it('ordena pela vigência e marca a que vale hoje', async () => {
    abrir()

    const tabela = await screen.findByRole('table', { name: 'Capacidades de Hotel Exemplo' })
    const datas = within(tabela)
      .getAllByRole('rowheader')
      .map((celula) => celula.textContent)
    expect(datas).toEqual(['01/01/2027', '01/03/2026', '01/01/2025'])
    expect(linha('01/03/2026')).toHaveTextContent('Vigente')
    expect(linha('01/03/2026')).toHaveTextContent('102,5')
    expect(linha('01/01/2027')).toHaveTextContent('Futura')
    expect(linha('01/01/2025')).toHaveTextContent('Anterior')
    expect(screen.getByText(/UH e leitos de Hotel Exemplo/)).toBeInTheDocument()
  })

  it('volta para a lista de estabelecimentos', async () => {
    const router = abrir()

    await userEvent.click(await screen.findByRole('link', { name: 'Estabelecimentos' }))

    expect(router.state.location.pathname).toBe('/cadastros/estabelecimentos')
  })

  it('sem capacidades, avisa que o estabelecimento fica fora do cálculo', async () => {
    preparar({ 'GET /api/estabelecimentos/12/capacidades': { corpo: [] } })
    abrir()

    expect(await screen.findByText('Nenhuma capacidade cadastrada')).toBeInTheDocument()
    expect(screen.getByText(/fica fora do cálculo/)).toBeInTheDocument()
  })

  it('erro ao carregar avisa e tenta de novo', async () => {
    preparar({
      'GET /api/estabelecimentos/12/capacidades': [
        { status: 404, corpo: { detail: 'Estabelecimento 12 não encontrado(a).' } },
        { corpo: [ATUAL] },
      ],
    })
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Estabelecimento 12 não encontrado(a).',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('row', { name: /01\/03\/2026/ })).toBeInTheDocument()
  })
})

describe('nova vigência e correção', () => {
  it('inclui uma vigência a partir de hoje', async () => {
    preparar({
      'POST /api/estabelecimentos/12/capacidades': {
        status: 201,
        corpo: { ...ATUAL, id: 4, vigenteDesde: '2026-11-16' },
      },
    })
    const dialogo = await abrirNova()
    expect(within(dialogo).getByLabelText('Vigente desde')).toHaveValue('2026-11-16')

    await preencher(dialogo, {
      UH: '45',
      'UH PCD': '3',
      Leitos: '135',
      'Máximo de pessoas por UH': '4',
    })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    expect(
      await screen.findByText('Capacidade a partir de 16/11/2026 incluída.'),
    ).toBeInTheDocument()
    expect(api.envios()).toEqual([
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/api/estabelecimentos/12/capacidades',
        corpo: {
          vigenteDesde: '2026-11-16',
          qtdUh: 45,
          qtdUhPcd: 3,
          qtdLeitos: 135,
          maxLeitosPorUh: 4,
        },
      }),
    ])
  })

  it('valida como a API: obrigatórios, UH PCD até o total e no máximo 30 pessoas por UH', async () => {
    const dialogo = await abrirNova()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))
    expect(within(dialogo).getByLabelText('UH')).toHaveAccessibleDescription('Preencha este campo.')

    await preencher(dialogo, {
      UH: '10',
      'UH PCD': '11',
      Leitos: '0',
      'Máximo de pessoas por UH': '31',
    })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    expect(within(dialogo).getByLabelText('UH PCD')).toHaveAccessibleDescription(
      'As UH PCD não podem passar o total de UH.',
    )
    expect(within(dialogo).getByLabelText('Leitos')).toHaveAccessibleDescription(
      'Use um valor a partir de 1.',
    )
    expect(within(dialogo).getByLabelText('Máximo de pessoas por UH')).toHaveAccessibleDescription(
      'Use um valor até 30.',
    )
    expect(api.envios()).toHaveLength(0)
  })

  it('data repetida, recusada pela API, aparece na vigência', async () => {
    preparar({
      'POST /api/estabelecimentos/12/capacidades': {
        status: 422,
        corpo: { detail: 'Já existe uma capacidade a partir desta data. Use outra data.' },
      },
    })
    const dialogo = await abrirNova()
    await preencher(dialogo, {
      'Vigente desde': '2026-03-01',
      UH: '45',
      'UH PCD': '3',
      Leitos: '135',
      'Máximo de pessoas por UH': '4',
    })

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    await waitFor(() =>
      expect(within(dialogo).getByLabelText('Vigente desde')).toHaveAccessibleDescription(
        'Já existe uma capacidade a partir desta data. Use outra data.',
      ),
    )
  })

  it('corrige um lançamento com os valores dele', async () => {
    preparar({
      'PUT /api/estabelecimentos/12/capacidades/2': { corpo: { ...ATUAL, qtdLeitos: 123 } },
    })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Corrigir a capacidade de 01/03/2026' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Corrigir capacidade' })
    expect(within(dialogo).getByLabelText('UH')).toHaveValue('41')

    await preencher(dialogo, { Leitos: '123' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar correção' }))

    expect(
      await screen.findByText('Capacidade a partir de 01/03/2026 corrigida.'),
    ).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/estabelecimentos/12/capacidades/2',
      corpo: { vigenteDesde: '2026-03-01', qtdUh: 41, qtdLeitos: 123 },
    })
  })
})

describe('exclusão', () => {
  it('pede confirmação, com o foco em Cancelar, e exclui', async () => {
    preparar({ 'DELETE /api/estabelecimentos/12/capacidades/3': { status: 204 } })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir a capacidade de 01/01/2027' }),
    )

    const dialogo = screen.getByRole('dialog', { name: 'Excluir capacidade' })
    expect(dialogo).toHaveAccessibleDescription(/a partir de 01\/01\/2027/)
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(
      await screen.findByText('Capacidade a partir de 01/01/2027 excluída.'),
    ).toBeInTheDocument()
    expect(api.envios()).toEqual([
      expect.objectContaining({
        metodo: 'DELETE',
        caminho: '/api/estabelecimentos/12/capacidades/3',
      }),
    ])
  })

  it('cancelar não exclui', async () => {
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir a capacidade de 01/01/2027' }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.envios()).toHaveLength(0)
  })

  it('a única capacidade não sai: mostra o motivo da API', async () => {
    preparar({
      'GET /api/estabelecimentos/12/capacidades': { corpo: [ATUAL] },
      'DELETE /api/estabelecimentos/12/capacidades/2': {
        status: 422,
        corpo: {
          detail: 'É a única capacidade do estabelecimento: corrija os números em vez de excluir.',
        },
      },
    })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir a capacidade de 01/03/2026' }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('É a única capacidade')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
