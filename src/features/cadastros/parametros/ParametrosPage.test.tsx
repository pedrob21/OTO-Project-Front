import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela } from '@/test/telas'
import { ParametrosPage } from './ParametrosPage'

const nbsp = ' '
const VIGENTE = {
  id: 1,
  vigenteDesde: '2026-01-01',
  percentualDayUse: 15.15,
  diasPermanenciaMedia: 4,
  diasEmParques: 2,
  gastoMedioDiario: 250,
  gastoMedioIngresso: 105,
  percentualMinimoLeitosPublicacao: 70,
  fonte: 'Pesquisa de Demanda Turística 2025',
}
const FUTURA = { ...VIGENTE, id: 2, vigenteDesde: '2027-01-01', percentualDayUse: 16 }

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({ 'GET /api/parametros-calculo': { corpo: [VIGENTE, FUTURA] }, ...rotas })
}

beforeEach(() => preparar())
afterEach(() => vi.unstubAllGlobals())

const abrir = () => abrirTela(<ParametrosPage hoje="2026-11-16" />)
const linha = (data: string) => screen.getByRole('row', { name: new RegExp(data) })

async function preencher(dialogo: HTMLElement, valores: Record<string, string>) {
  for (const [rotulo, valor] of Object.entries(valores)) {
    const campo = within(dialogo).getByLabelText(rotulo)
    if (campo.getAttribute('type') === 'date') fireEvent.change(campo, { target: { value: valor } })
    else {
      await userEvent.clear(campo)
      await userEvent.type(campo, valor)
    }
  }
}

const NOVOS = {
  'Vigente desde': '2028-01-01',
  'Índice de day use (%)': '80,5',
  'Permanência média (dias)': '4',
  'Dias de ingresso em parques': '2',
  'Gasto médio diário (R$)': '260.40',
  'Valor médio do ingresso (R$)': '110',
  'Mínimo de leitos para publicar (%)': '70',
  Fonte: 'Pesquisa de Demanda Turística 2027',
}

async function abrirNova() {
  abrir()
  await screen.findByRole('table')
  await userEvent.click(screen.getByRole('button', { name: 'Nova vigência' }))
  return screen.getByRole('dialog', { name: 'Nova vigência: parâmetros' })
}

describe('lista de parâmetros', () => {
  it('mostra os valores em pt-BR e marca a vigência atual', async () => {
    abrir()

    const tabela = await screen.findByRole('table', { name: 'Vigências dos parâmetros' })
    expect(
      within(tabela)
        .getAllByRole('rowheader')
        .map((th) => th.textContent),
    ).toEqual(['01/01/2027', '01/01/2026'])
    expect(linha('01/01/2026')).toHaveTextContent('15,15%')
    expect(linha('01/01/2026')).toHaveTextContent('4 dias')
    expect(linha('01/01/2026')).toHaveTextContent(`R$${nbsp}250,00`)
    expect(linha('01/01/2026')).toHaveTextContent('70,00%')
    expect(linha('01/01/2026')).toHaveTextContent('Vigente')
    expect(linha('01/01/2027')).toHaveTextContent('Futura')
  })

  it('sem parâmetros, avisa que não dá para publicar', async () => {
    preparar({ 'GET /api/parametros-calculo': { corpo: [] } })
    abrir()

    expect(await screen.findByText('Nenhum parâmetro cadastrado')).toBeInTheDocument()
  })

  it('erro ao carregar avisa e tenta de novo', async () => {
    preparar({ 'GET /api/parametros-calculo': [{ status: 500, corpo: {} }, { corpo: [VIGENTE] }] })
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar vigências dos parâmetros.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('row', { name: /01\/01\/2026/ })).toBeInTheDocument()
  })
})

describe('nova vigência', () => {
  it('aceita vírgula e ponto decimais e manda números', async () => {
    preparar({
      'POST /api/parametros-calculo': {
        status: 201,
        corpo: { ...VIGENTE, id: 3, vigenteDesde: '2028-01-01' },
      },
    })
    const dialogo = await abrirNova()

    await preencher(dialogo, NOVOS)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    expect(
      await screen.findByText('Parâmetros a partir de 01/01/2028 incluídos.'),
    ).toBeInTheDocument()
    expect(api.envios()[0]?.corpo).toEqual({
      vigenteDesde: '2028-01-01',
      percentualDayUse: 80.5,
      diasPermanenciaMedia: 4,
      diasEmParques: 2,
      gastoMedioDiario: 260.4,
      gastoMedioIngresso: 110,
      percentualMinimoLeitosPublicacao: 70,
      fonte: 'Pesquisa de Demanda Turística 2027',
    })
  })

  it('recusa mais de duas casas e dias em parques acima da permanência', async () => {
    const dialogo = await abrirNova()

    await preencher(dialogo, {
      ...NOVOS,
      'Índice de day use (%)': '80,555',
      'Dias de ingresso em parques': '5',
    })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    expect(within(dialogo).getByLabelText('Índice de day use (%)')).toHaveAccessibleDescription(
      'Parcela do fluxo que não pernoita. Use um número com até 2 casas decimais.',
    )
    expect(
      within(dialogo).getByLabelText('Dias de ingresso em parques'),
    ).toHaveAccessibleDescription('Os dias em parques não podem passar a permanência média.')
    expect(api.envios()).toHaveLength(0)
  })

  it('data repetida, recusada pela API, aparece na vigência', async () => {
    preparar({
      'POST /api/parametros-calculo': {
        status: 422,
        corpo: { detail: 'Já existem parâmetros a partir desta data. Use outra data.' },
      },
    })
    const dialogo = await abrirNova()
    await preencher(dialogo, NOVOS)

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Incluir vigência' }))

    await waitFor(() =>
      expect(within(dialogo).getByLabelText('Vigente desde')).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    )
  })
})

describe('parâmetros já usados em publicação', () => {
  const USADOS =
    'Estes parâmetros já foram usados em resultados publicados. Cadastre uma nova vigência.'

  it('corrige o que ainda não foi usado', async () => {
    preparar({ 'PUT /api/parametros-calculo/2': { corpo: { ...FUTURA, percentualDayUse: 16.5 } } })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Corrigir a vigência de 01/01/2027' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Corrigir a vigência de 01/01/2027' })
    expect(within(dialogo).getByLabelText('Índice de day use (%)')).toHaveValue('16')

    await preencher(dialogo, { 'Índice de day use (%)': '16,5' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar correção' }))

    expect(
      await screen.findByText('Parâmetros a partir de 01/01/2027 corrigidos.'),
    ).toBeInTheDocument()
    expect(api.envios()[0]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/parametros-calculo/2',
      corpo: { percentualDayUse: 16.5, gastoMedioDiario: 250 },
    })
  })

  it('a correção recusada mostra o motivo no diálogo', async () => {
    preparar({ 'PUT /api/parametros-calculo/1': { status: 422, corpo: { detail: USADOS } } })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Corrigir a vigência de 01/01/2026' }),
    )
    const dialogo = screen.getByRole('dialog')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar correção' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(USADOS)
  })

  it('a exclusão pede confirmação e mostra a recusa da API', async () => {
    preparar({
      'DELETE /api/parametros-calculo/1': {
        status: 422,
        corpo: {
          detail:
            'Estes parâmetros já foram usados em resultados publicados e não podem ser excluídos.',
        },
      },
    })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir a vigência de 01/01/2026' }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Excluir vigência' })

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('não podem ser excluídos')
  })

  it('exclui uma vigência não usada', async () => {
    preparar({ 'DELETE /api/parametros-calculo/2': { status: 204 } })
    abrir()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir a vigência de 01/01/2027' }),
    )

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }),
    )

    expect(
      await screen.findByText('Parâmetros a partir de 01/01/2027 excluídos.'),
    ).toBeInTheDocument()
    expect(api.envios()).toEqual([
      expect.objectContaining({ metodo: 'DELETE', caminho: '/api/parametros-calculo/2' }),
    ])
  })
})
