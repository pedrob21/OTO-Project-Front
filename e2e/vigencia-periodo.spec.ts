import { expect, test, type Page } from '@playwright/test'
import { injetarSessao } from './sessao.ts'

const CAMPANHA = {
  campanhaId: 15,
  nome: 'Outubro de 2026',
  modalidade: 'CONSOLIDADA',
  tipoPeriodo: 'MENSAL',
  periodoInicio: '2026-10-01',
  periodoFim: '2026-10-31',
  publicadaEm: '2026-11-18T12:00:00Z',
}

const PARAMETROS = [
  { id: 1, vigenteDesde: '2026-01-01', percentualDayUse: 15.15, fonte: 'Estudo OTO 2024' },
  { id: 2, vigenteDesde: '2026-10-16', percentualDayUse: 18.4, fonte: 'Estudo OTO 2026' },
]

const RHC = [
  { id: 1, vigenteDesde: '2026-01-01', qtdRegistros: 478, qtdLeitos: 5116 },
  { id: 2, vigenteDesde: '2026-10-16', qtdRegistros: 520, qtdLeitos: 5600 },
]

/** A vigência que vale na data pedida: a mais recente que já começou, como a API. */
function vigenteEm(lista: { vigenteDesde: string }[], data: string) {
  return lista.filter((item) => item.vigenteDesde <= data).at(-1)
}

async function abrirPainel(page: Page) {
  const consultas: { recurso: string; data: string | null }[] = []
  await page.clock.setFixedTime(new Date('2026-11-22T10:00:00-03:00'))
  await injetarSessao(page)
  await page.route('**/api/**', (rota) => {
    const url = new URL(rota.request().url())
    const { pathname } = url

    if (pathname === '/api/me') {
      return rota.fulfill({ json: { id: 3, nome: 'Vera Lima', perfil: 'VISUALIZADOR' } })
    }
    if (pathname === '/api/referencias') {
      return rota.fulfill({ json: { tiposHospedagem: [], faixasOcupacao: [] } })
    }
    if (pathname === '/api/campanhas/publicadas') return rota.fulfill({ json: [CAMPANHA] })
    if (pathname === '/api/campanhas/15/resultado') {
      return rota.fulfill({
        json: {
          campanha: { id: 15, ...CAMPANHA, qtdDiarias: 31, publicada: true },
          publicado: true,
          taxaOcupacao: 62.8,
          qtdMh: 72,
          qtdMhRespondentes: 58,
          fluxoMh: 365_620,
          fluxoRhc: 55_795,
          fluxoDayUse: 75_245,
          fluxoTotal: 496_660,
          fluxoMedioDiario: 16_021,
          porTipo: [],
        },
      })
    }
    const vigente = pathname.match(/^\/api\/(parametros-calculo|rhc)\/vigente$/)
    if (vigente) {
      const recurso = vigente[1]!
      const data = url.searchParams.get('data')
      consultas.push({ recurso, data })
      const vigencia = vigenteEm(recurso === 'rhc' ? RHC : PARAMETROS, data ?? '2026-11-22')
      return vigencia
        ? rota.fulfill({ json: vigencia })
        : rota.fulfill({ status: 404, json: { status: 404, detail: 'Sem vigência.' } })
    }
    if (pathname === '/api/dashboard/serie-mensal') {
      return rota.fulfill({ json: { indicador: 'TAXA_OCUPACAO', anos: [] } })
    }
    if (pathname === '/api/dashboard/feriados') return rota.fulfill({ json: [] })
    return rota.fulfill({ status: 404, json: { status: 404, detail: `sem rota: ${pathname}` } })
  })

  await page.goto('/')
  return consultas
}

test('painel usa os parâmetros e o RHC vigentes no fim do período da campanha (E2E-10)', async ({
  page,
}) => {
  const consultas = await abrirPainel(page)
  const fluxo = page.locator('section', {
    has: page.getByRole('heading', { name: 'Fluxo estimado de turistas' }),
  })
  await expect(fluxo.getByText(/registros e .* leitos/)).toBeVisible()
  await expect(fluxo.getByText(/^Day use estimado em/)).toBeVisible()

  expect(consultas).toEqual(
    expect.arrayContaining([
      { recurso: 'parametros-calculo', data: '2026-10-31' },
      { recurso: 'rhc', data: '2026-10-31' },
    ]),
  )
  expect(consultas.every(({ data }) => data === '2026-10-31')).toBe(true)
  await expect(fluxo.getByText('520 registros e 5.600 leitos')).toBeVisible()
  await expect(
    fluxo.getByText('Day use estimado em 18,40% do total, conforme a Estudo OTO 2026.'),
  ).toBeVisible()
})
