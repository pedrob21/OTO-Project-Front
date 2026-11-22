import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarApiFalsa, type RotasFalsas } from '@/test/apiFalsa'
import { abrirTela, preencherCampo } from '@/test/telas'
import { HistoricoPage } from './HistoricoPage'

const nbsp = ' '
const TAXA = {
  id: 1,
  indicador: 'TAXA_OCUPACAO',
  modalidade: 'CONSOLIDADA',
  ano: 2024,
  mes: 7,
  valor: 68.4,
  fonte: 'Indicadores do Turismo 2017-2025',
}
const FLUXO = {
  id: 2,
  indicador: 'FLUXO_TURISTAS',
  modalidade: 'CONSOLIDADA',
  ano: 2024,
  feriadoCodigo: 'CARNAVAL',
  valor: 98512,
  fonte: 'Indicadores do Turismo 2017-2025',
}
const DIARIA = {
  id: 3,
  indicador: 'DIARIA_MEDIA',
  modalidade: 'EXPECTATIVA',
  ano: 2024,
  mes: 7,
  tipoHospedagemCodigo: 'HOTEL',
  valor: 412.9,
  observacao: 'tarifa de balcão',
  fonte: 'Booking',
}

let api: ReturnType<typeof criarApiFalsa>

function preparar(rotas: RotasFalsas = {}) {
  api = criarApiFalsa({
    'GET /api/historico': { corpo: [TAXA, FLUXO, DIARIA] },
    'GET /api/referencias': {
      corpo: {
        feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval' }],
        tiposHospedagem: [{ codigo: 'HOTEL', nome: 'Hotel' }],
      },
    },
    ...rotas,
  })
}

beforeEach(() => preparar())
afterEach(() => vi.unstubAllGlobals())

const linha = (texto: string) => screen.getByRole('row', { name: new RegExp(texto) })
const csv = (conteudo: string) => new File([conteudo], 'serie.csv', { type: 'text/csv' })

async function importar(arquivo: File, fonte = 'Indicadores do Turismo 2017-2025') {
  await userEvent.upload(await screen.findByLabelText('Arquivo CSV'), arquivo)
  await preencherCampo(screen.getByLabelText('Fonte dos dados'), fonte)
  await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
}

describe('lista da série histórica', () => {
  it('mostra período, indicador, tipo e o valor no formato de cada indicador', async () => {
    abrirTela(<HistoricoPage />)

    expect(await screen.findByRole('table', { name: 'Valores da série histórica' })).toBeVisible()
    expect(await within(linha('Carnaval 2024')).findByText('Fluxo de turistas')).toBeVisible()
    expect(linha('Carnaval 2024')).toHaveTextContent('98.512')
    expect(linha('Taxa de ocupação')).toHaveTextContent('Julho de 2024')
    expect(linha('Taxa de ocupação')).toHaveTextContent('68,40%')
    expect(linha('Taxa de ocupação')).toHaveTextContent('Geral')
    expect(linha('Diária média')).toHaveTextContent(`R$${nbsp}412,90`)
    expect(linha('Diária média')).toHaveTextContent('Hotel')
    expect(linha('Diária média')).toHaveTextContent('Expectativa')
  })

  it('filtra pela API', async () => {
    abrirTela(<HistoricoPage />)
    await screen.findByRole('table')

    await userEvent.selectOptions(screen.getByLabelText('Indicador'), 'FLUXO_TURISTAS')
    await preencherCampo(screen.getByLabelText('Ano'), '2024')
    await screen.findByRole('option', { name: 'Hotel' })
    await userEvent.selectOptions(screen.getByLabelText('Tipo de hospedagem'), 'HOTEL')

    await waitFor(() =>
      expect(api.chamadas.at(-1)?.busca).toBe('?indicador=FLUXO_TURISTAS&ano=2024&tipo=HOTEL'),
    )
  })

  it('sem valores e com erro', async () => {
    preparar({
      'GET /api/historico': [{ status: 500, corpo: {} }, { corpo: [] }],
    })
    abrirTela(<HistoricoPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a série histórica.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Nenhum valor encontrado')).toBeInTheDocument()
  })
})

describe('importação de CSV', () => {
  it('envia o arquivo e a fonte e mostra o resumo', async () => {
    preparar({
      'POST /api/historico/importacao': {
        corpo: { linhasLidas: 3, inseridos: 2, atualizados: 1, erros: [] },
      },
    })
    abrirTela(<HistoricoPage />)

    await importar(csv('TAXA_OCUPACAO;CONSOLIDADA;2024;1;;;63,45;'))

    expect(await screen.findByText(/Importação concluída/)).toHaveTextContent(
      'Importação concluída: 3 linhas lidas, 2 valores novos e 1 atualizado.',
    )
    const [envio] = api.envios()
    expect(envio?.caminho).toBe('/api/historico/importacao')
    const corpo = envio?.corpo as FormData
    expect((corpo.get('arquivo') as File).name).toBe('serie.csv')
    expect(corpo.get('fonte')).toBe('Indicadores do Turismo 2017-2025')
    expect(api.chamadas.filter((chamada) => chamada.caminho === '/api/historico')).toHaveLength(2)
  })

  it('com erros nas linhas, avisa que nada foi gravado e lista cada erro', async () => {
    preparar({
      'POST /api/historico/importacao': {
        status: 422,
        corpo: {
          linhasLidas: 3,
          inseridos: 0,
          atualizados: 0,
          erros: [
            { linha: 0, mensagem: 'o arquivo não tem linhas de dados' },
            { linha: 3, mensagem: 'feriado inválido: CARNAVALL (veja /api/referencias)' },
          ],
        },
      },
    })
    abrirTela(<HistoricoPage />)

    await importar(csv('x'))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(
      'Nada foi gravado: 2 erros em 3 linhas lidas. Corrija o arquivo e importe de novo.',
    )
    expect(
      within(alerta)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Arquivo: o arquivo não tem linhas de dados',
      'Linha 3: feriado inválido: CARNAVALL (veja /api/referencias)',
    ])
    expect(api.chamadas.filter((chamada) => chamada.caminho === '/api/historico')).toHaveLength(1)
  })

  it('pede o arquivo e a fonte antes de enviar', async () => {
    abrirTela(<HistoricoPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Importar' }))

    expect(screen.getByLabelText('Arquivo CSV')).toHaveAccessibleDescription(
      'Escolha o arquivo CSV.',
    )
    expect(screen.getByLabelText('Fonte dos dados')).toHaveAccessibleDescription(
      'Informe a fonte dos dados.',
    )
    expect(api.envios()).toHaveLength(0)
  })

  it('outra recusa da API aparece como erro geral', async () => {
    preparar({
      'POST /api/historico/importacao': {
        status: 403,
        corpo: { detail: 'Seu perfil não tem acesso a este recurso.' },
      },
    })
    abrirTela(<HistoricoPage />)

    await importar(csv('x'))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível importar. Nada foi gravado.')
    expect(alerta).toHaveTextContent('Seu perfil não tem acesso a este recurso.')
  })
})

describe('valores avulsos', () => {
  it('grava um valor de feriado, sem mês', async () => {
    preparar({
      'POST /api/historico': { corpo: { ...FLUXO, id: 9, ano: 2023, valor: 90000.5 } },
    })
    abrirTela(<HistoricoPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Novo valor' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo valor' })

    await userEvent.selectOptions(within(dialogo).getByLabelText('Indicador'), 'FLUXO_TURISTAS')
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Feriado ou evento' }))
    await userEvent.selectOptions(within(dialogo).getByLabelText('Feriado'), 'CARNAVAL')
    await preencherCampo(within(dialogo).getByLabelText('Ano'), '2023')
    await preencherCampo(within(dialogo).getByLabelText('Valor (pernoites)'), '90000,5')
    await preencherCampo(within(dialogo).getByLabelText('Fonte'), 'Planilha')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Gravar valor' }))

    expect(
      await screen.findByText('Valor gravado: Fluxo de turistas, consolidada, Carnaval 2023.'),
    ).toBeInTheDocument()
    expect(api.envios()[0]?.corpo).toEqual({
      indicador: 'FLUXO_TURISTAS',
      modalidade: 'CONSOLIDADA',
      ano: 2023,
      feriadoCodigo: 'CARNAVAL',
      valor: 90000.5,
      fonte: 'Planilha',
    })
  })

  it('grava um valor mensal de expectativa para um tipo de hospedagem', async () => {
    preparar({ 'POST /api/historico': { corpo: { ...DIARIA, id: 10 } } })
    abrirTela(<HistoricoPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Novo valor' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo valor' })

    await userEvent.selectOptions(within(dialogo).getByLabelText('Modalidade'), 'EXPECTATIVA')
    await within(dialogo).findByRole('option', { name: 'Hotel' })
    await userEvent.selectOptions(within(dialogo).getByLabelText('Tipo de hospedagem'), 'HOTEL')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Mês'), '3')
    await preencherCampo(within(dialogo).getByLabelText('Ano'), '2025')
    await preencherCampo(within(dialogo).getByLabelText('Valor (%)'), '55')
    await preencherCampo(within(dialogo).getByLabelText('Fonte'), 'Planilha')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Gravar valor' }))

    await waitFor(() => expect(api.envios()).toHaveLength(1))
    expect(api.envios()[0]?.corpo).toEqual({
      indicador: 'TAXA_OCUPACAO',
      modalidade: 'EXPECTATIVA',
      ano: 2025,
      mes: 3,
      tipoHospedagemCodigo: 'HOTEL',
      valor: 55,
      fonte: 'Planilha',
    })
  })

  it('sem as referências, o formulário oferece só a opção de escolher', async () => {
    preparar({ 'GET /api/referencias': { status: 500, corpo: {} } })
    abrirTela(<HistoricoPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Novo valor' }))
    const dialogo = screen.getByRole('dialog', { name: 'Novo valor' })

    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Feriado ou evento' }))

    const feriados = within(dialogo).getByLabelText('Feriado')
    expect(within(feriados).getAllByRole('option')).toHaveLength(1)
    const tipos = within(dialogo).getByLabelText('Tipo de hospedagem')
    expect(within(tipos).getAllByRole('option')).toHaveLength(1)
    expect(within(tipos).getByRole('option', { name: 'Geral da cidade' })).toBeInTheDocument()
  })

  it('valida como a API: mês ou feriado, ano e taxa até 100%', async () => {
    abrirTela(<HistoricoPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Novo valor' }))
    const dialogo = screen.getByRole('dialog')
    await preencherCampo(within(dialogo).getByLabelText('Ano'), '1999')
    await preencherCampo(within(dialogo).getByLabelText('Valor (%)'), '100,5')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Gravar valor' }))

    expect(within(dialogo).getByLabelText('Mês')).toHaveAccessibleDescription('Escolha o mês.')
    expect(within(dialogo).getByLabelText('Ano')).toHaveAccessibleDescription(
      'Use um valor a partir de 2000.',
    )
    expect(within(dialogo).getByLabelText('Valor (%)')).toHaveAccessibleDescription(
      'Use um valor até 100.',
    )
    expect(within(dialogo).getByLabelText('Fonte')).toHaveAttribute('aria-invalid', 'true')
    expect(api.envios()).toHaveLength(0)
  })

  it('corrige um valor e mostra a recusa da API', async () => {
    const OUTRO =
      'Já existe outro valor para este indicador, período e tipo (id 1). Corrija aquele ou exclua-o antes.'
    preparar({
      'PUT /api/historico/3': [
        { status: 422, corpo: { detail: OUTRO } },
        { corpo: { ...DIARIA, valor: 420 } },
      ],
    })
    abrirTela(<HistoricoPage />)
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Corrigir Diária média, expectativa, Julho de 2024, Hotel',
      }),
    )
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByLabelText('Valor (R$)')).toHaveValue('412,9')
    expect(within(dialogo).getByLabelText('Observação')).toHaveValue('tarifa de balcão')

    await preencherCampo(within(dialogo).getByLabelText('Valor (R$)'), '420')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar correção' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(OUTRO)

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar correção' }))

    expect(
      await screen.findByText('Valor corrigido: Diária média, expectativa, Julho de 2024, Hotel.'),
    ).toBeInTheDocument()
    expect(api.envios()[1]).toMatchObject({
      metodo: 'PUT',
      caminho: '/api/historico/3',
      corpo: { mes: 7, tipoHospedagemCodigo: 'HOTEL', valor: 420, observacao: 'tarifa de balcão' },
    })
  })

  it('exclui depois de confirmar', async () => {
    preparar({ 'DELETE /api/historico/1': { status: 204 } })
    abrirTela(<HistoricoPage />)
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Excluir Taxa de ocupação, consolidada, Julho de 2024',
      }),
    )
    const dialogo = screen.getByRole('dialog', { name: 'Excluir valor' })
    expect(dialogo).toHaveAccessibleDescription(/68,40%/)

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(
      await screen.findByText('Valor excluído: Taxa de ocupação, consolidada, Julho de 2024.'),
    ).toBeInTheDocument()
    expect(api.envios()).toEqual([
      expect.objectContaining({ metodo: 'DELETE', caminho: '/api/historico/1' }),
    ])
  })
})
