import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { violacoesDeAcessibilidade } from '@/test/acessibilidade'
import { preencherCampo } from '@/test/telas'
import { abrirTela, simularApi } from '../apiDeTeste'
import { PreviaPage } from '../PreviaPage'

const RODADA = {
  id: 5,
  codigo: '005/26',
  status: 'ENCERRADA',
  campanhas: [{ id: 50, nome: 'Consolidada de outubro de 2026', publicada: false }],
}
const RESULTADO = {
  campanha: { id: 50, nome: 'Consolidada de outubro de 2026', qtdDiarias: 31 },
  taxaOcupacao: 64.73,
  diariaMedia: 812.4,
  receitaHospedagem: 17137719.18,
  porTipo: [
    { tipoHospedagemCodigo: 'HOTEL', nome: 'Hotel', qtdMh: 20, diariaMedia: 700 },
    { tipoHospedagemCodigo: 'POUSADA', nome: 'Pousada', qtdMh: 12, diariaMedia: 380.5 },
  ],
}
const PREVIA = {
  campanhaId: 50,
  qtdMh: 74,
  qtdRespondentes: 41,
  leitosTotal: 13508,
  leitosRespondentes: 9720,
  percentualLeitosRespondentes: 71.96,
  percentualMinimoPublicacao: 70,
  podePublicar: true,
  impedimentos: [],
  avisos: [],
  resultado: RESULTADO,
}
const HOTEL = {
  tipoHospedagemCodigo: 'HOTEL',
  diariaMedia: 700,
  fonte: 'Planilha de tabulação',
  registradoPor: 1,
  registradoEm: '2026-11-12T17:30:00Z',
}
const POUSADA = { ...HOTEL, tipoHospedagemCodigo: 'POUSADA', diariaMedia: 410.5 }

let api: ReturnType<typeof simularApi>

beforeEach(() => {
  api = simularApi({
    'GET /api/campanhas/50/previa': { corpo: PREVIA },
    'GET /api/rodadas/5': { corpo: RODADA },
    'GET /api/campanhas/50/diarias': { corpo: [HOTEL] },
    'PUT /api/campanhas/50/diarias': { corpo: [] },
    'GET /api/referencias': {
      corpo: {
        tiposHospedagem: [
          { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
          { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true },
        ],
      },
    },
  })
})

afterEach(() => vi.unstubAllGlobals())

function abrir() {
  return abrirTela(
    [{ path: '/pesquisas/:id/campanhas/:campanhaId/previa', element: <PreviaPage /> }],
    '/pesquisas/5/campanhas/50/previa',
  )
}

async function tabela() {
  return screen.findByRole('table', { name: 'Diárias informadas pela equipe' })
}

function bloco() {
  return screen
    .getByRole('heading', { level: 2, name: 'Diárias informadas pela equipe' })
    .closest('section')!
}

function linha(tabela: HTMLElement, recorte: string) {
  return within(within(tabela).getByRole('rowheader', { name: recorte }).closest('tr')!)
}

describe('DiariasInformadas, lista', () => {
  it('mostra a diária informada e a usada na prévia de cada recorte', async () => {
    abrir()
    const lista = await tabela()

    expect(linha(lista, 'Geral (todos os tipos)').getByText('Não informada')).toBeInTheDocument()
    expect(linha(lista, 'Geral (todos os tipos)').getByText('R$ 812,40')).toBeInTheDocument()
    expect(
      linha(lista, 'Geral (todos os tipos)').getByText('média das respostas'),
    ).toBeInTheDocument()
    expect(linha(lista, 'Hotel').getAllByText('R$ 700,00')).toHaveLength(2)
    expect(linha(lista, 'Hotel').getByText('informada pela equipe')).toBeInTheDocument()
    expect(linha(lista, 'Pousada').getByText('Não informada')).toBeInTheDocument()
    expect(
      screen.getByText('Fonte: Planilha de tabulação. Última alteração em 12/11/2026 às 14:30.'),
    ).toBeInTheDocument()
    expect(
      linha(lista, 'Hotel').getByRole('button', { name: 'Corrigir diária de Hotel' }),
    ).toBeInTheDocument()
    expect(
      linha(lista, 'Hotel').getByRole('button', { name: 'Remover diária de Hotel' }),
    ).toBeInTheDocument()
    expect(
      linha(lista, 'Pousada').queryByRole('button', { name: /Remover/ }),
    ).not.toBeInTheDocument()
  })

  it('sem diárias informadas, o cálculo usa a média das respostas', async () => {
    api.rotas['GET /api/campanhas/50/diarias'] = { corpo: [] }
    abrir()
    await tabela()

    expect(
      screen.getByText('Nenhuma diária informada. O cálculo usa a média das respostas.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Informar diária geral' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Informar diária de Hotel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Informar diária de Pousada' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeInTheDocument()
  })

  it('erro ao carregar as diárias fica no bloco e permite tentar de novo', async () => {
    api.rotas['GET /api/campanhas/50/diarias'] = [
      { status: 500, corpo: { detail: 'Falha no servidor.' } },
      { corpo: [] },
    ]
    abrir()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as diárias informadas.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await tabela()).toBeInTheDocument()
  })

  it('campanha publicada: sem incluir, corrigir nem remover', async () => {
    api.rotas['GET /api/rodadas/5'] = {
      corpo: { ...RODADA, campanhas: [{ ...RODADA.campanhas[0], publicada: true }] },
    }
    abrir()
    const lista = await tabela()

    expect(
      screen.getByText('A campanha já foi publicada. Cancele a publicação para mudar as diárias.'),
    ).toBeInTheDocument()
    expect(within(lista).queryByRole('button')).not.toBeInTheDocument()
    expect(within(lista).queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument()
  })
})

describe('DiariasInformadas, edição', () => {
  it('inclui a diária de um tipo, regrava a prévia e devolve o foco', async () => {
    abrir()
    await tabela()
    api.rotas['PUT /api/campanhas/50/diarias'] = { corpo: [HOTEL, POUSADA] }
    api.rotas['GET /api/campanhas/50/diarias'] = { corpo: [HOTEL, POUSADA] }
    api.rotas['GET /api/campanhas/50/previa'] = {
      corpo: {
        ...PREVIA,
        resultado: {
          ...RESULTADO,
          diariaMedia: 820.1,
          porTipo: [RESULTADO.porTipo[0], { ...RESULTADO.porTipo[1], diariaMedia: 410.5 }],
        },
      },
    }

    await userEvent.click(screen.getByRole('button', { name: 'Informar diária de Pousada' }))
    const dialogo = screen.getByRole('dialog', { name: 'Informar diária de Pousada' })
    const campo = within(dialogo).getByRole('textbox', { name: 'Diária média (R$)' })
    expect(campo).toHaveFocus()
    expect(campo).toHaveValue('')
    expect(campo).toHaveAccessibleDescription('Média das respostas na prévia: R$ 380,50.')
    expect(within(dialogo).getByRole('textbox', { name: 'Fonte (opcional)' })).toHaveValue(
      'Planilha de tabulação',
    )
    await preencherCampo(campo, '410,5')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await within(bloco()).findByRole('status')).toHaveTextContent(
      'Diária de Pousada salva. A prévia já usa o novo valor.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.escritas()).toEqual([
      expect.objectContaining({
        metodo: 'PUT',
        caminho: '/api/campanhas/50/diarias',
        corpo: {
          diarias: [
            { tipoHospedagemCodigo: 'HOTEL', diariaMedia: 700 },
            { tipoHospedagemCodigo: 'POUSADA', diariaMedia: 410.5 },
          ],
          fonte: 'Planilha de tabulação',
        },
      }),
    ])
    expect(api.leituras('/api/campanhas/50/previa')).toBe(2)
    const lista = await tabela()
    expect(linha(lista, 'Pousada').getAllByText('R$ 410,50')).toHaveLength(2)
    expect(linha(lista, 'Pousada').getByText('informada pela equipe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Corrigir diária de Pousada' })).toHaveFocus()
  })

  it('corrige a diária informada a partir do valor atual', async () => {
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('button', { name: 'Corrigir diária de Hotel' }))
    const dialogo = screen.getByRole('dialog', { name: 'Corrigir diária de Hotel' })
    const campo = within(dialogo).getByRole('textbox', { name: 'Diária média (R$)' })
    expect(campo).toHaveValue('700')
    await preencherCampo(campo, '720.25')
    await preencherCampo(within(dialogo).getByRole('textbox', { name: 'Fonte (opcional)' }), '')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await within(bloco()).findByRole('status')).toHaveTextContent('Diária de Hotel salva.')
    expect(api.escritas()[0]?.corpo).toEqual({
      diarias: [{ tipoHospedagemCodigo: 'HOTEL', diariaMedia: 720.25 }],
    })
  })

  it('a diária geral vai sem código de tipo', async () => {
    api.rotas['GET /api/campanhas/50/diarias'] = { corpo: [] }
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('button', { name: 'Informar diária geral' }))
    const dialogo = screen.getByRole('dialog', { name: 'Informar diária geral' })
    await preencherCampo(within(dialogo).getByRole('textbox', { name: 'Diária média (R$)' }), '800')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await within(bloco()).findByRole('status')).toHaveTextContent('Diária geral salva.')
    expect(api.escritas()[0]?.corpo).toEqual({ diarias: [{ diariaMedia: 800 }] })
  })

  it('remove depois de confirmar e o cálculo volta à média', async () => {
    abrir()
    await tabela()
    api.rotas['GET /api/campanhas/50/diarias'] = { corpo: [] }

    await userEvent.click(screen.getByRole('button', { name: 'Remover diária de Hotel' }))
    const confirmacao = screen.getByRole('dialog', { name: 'Remover diária de Hotel?' })
    expect(confirmacao).toHaveAccessibleDescription('O cálculo volta a usar a média das respostas.')
    expect(within(confirmacao).getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Remover' }))

    expect(await within(bloco()).findByRole('status')).toHaveTextContent(
      'Diária de Hotel removida. O cálculo volta a usar a média das respostas.',
    )
    expect(api.escritas()[0]?.corpo).toEqual({ diarias: [], fonte: 'Planilha de tabulação' })
    expect(api.leituras('/api/campanhas/50/previa')).toBe(2)
    expect(screen.getByRole('button', { name: 'Informar diária de Hotel' })).toHaveFocus()
  })

  it('desistir da remoção não grava e devolve o foco', async () => {
    abrir()
    await tabela()
    const remover = screen.getByRole('button', { name: 'Remover diária de Hotel' })

    await userEvent.click(remover)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(remover).toHaveFocus()
    expect(api.escritas()).toEqual([])
  })

  it.each([
    ['', 'Informe a diária média.'],
    ['0', 'A diária precisa ser maior que zero.'],
    ['410,555', 'Use no máximo duas casas decimais.'],
    ['quatrocentos', 'Use só números, como 410,00.'],
  ])('valida "%s" antes de enviar', async (texto, erro) => {
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('button', { name: 'Informar diária de Pousada' }))
    const dialogo = screen.getByRole('dialog', { name: 'Informar diária de Pousada' })
    const campo = within(dialogo).getByRole('textbox', { name: 'Diária média (R$)' })
    await preencherCampo(campo, texto)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAccessibleDescription(expect.stringContaining(erro))
    expect(campo).toHaveFocus()
    expect(api.escritas()).toEqual([])
  })

  it('recusa da API aparece no diálogo, que continua aberto', async () => {
    api.rotas['PUT /api/campanhas/50/diarias'] = {
      status: 422,
      corpo: { detail: 'A campanha já foi publicada. Cancele a publicação para mudar as diárias.' },
    }
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('button', { name: 'Corrigir diária de Hotel' }))
    const dialogo = screen.getByRole('dialog', { name: 'Corrigir diária de Hotel' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'A campanha já foi publicada. Cancele a publicação para mudar as diárias.',
    )
    expect(within(dialogo).getByRole('button', { name: 'Salvar' })).toBeEnabled()
    expect(within(bloco()).queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('DiariasInformadas, acessibilidade', () => {
  it('não tem violações na lista nem no diálogo', async () => {
    abrir()
    await tabela()

    expect(await violacoesDeAcessibilidade()).toEqual([])

    await userEvent.click(screen.getByRole('button', { name: 'Corrigir diária de Hotel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await within(bloco()).findByRole('status')
    await userEvent.click(screen.getByRole('button', { name: 'Remover diária de Hotel' }))

    expect(await violacoesDeAcessibilidade()).toEqual([])
  })
})
