import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page, type Route } from '@playwright/test'

type Perfil = 'ADMIN' | 'PARCEIRO' | 'VISUALIZADOR'

const USUARIOS: Record<Perfil, object> = {
  ADMIN: { id: 1, nome: 'Ana Souza', email: 'ana@oto.test', perfil: 'ADMIN', ativo: true },
  PARCEIRO: { id: 2, nome: 'Paula Reis', email: 'paula@oto.test', perfil: 'PARCEIRO', ativo: true },
  VISUALIZADOR: {
    id: 3,
    nome: 'Vera Lima',
    email: 'vera@oto.test',
    perfil: 'VISUALIZADOR',
    ativo: true,
  },
}

const TIPOS = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true, ordem: 1 },
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true, ordem: 2 },
  { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: false, ordem: 3 },
]

const REFERENCIAS = {
  tiposHospedagem: TIPOS,
  feriados: [{ codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 }],
  faixasOcupacao: [
    { codigo: 'RUIM', nome: 'Ruim', percentualMinimo: 0 },
    { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41 },
    { codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61 },
  ],
}

const PUBLICADAS = [
  {
    campanhaId: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
    periodoFim: '2026-08-31',
    publicadaEm: '2026-09-18T12:00:00Z',
    taxaOcupacao: 62.8,
    faixa: { codigo: 'OTIMA', nome: 'Ótima' },
    fluxoTotal: 496_660,
  },
  {
    campanhaId: 9,
    nome: 'Carnaval 2026',
    modalidade: 'EXPECTATIVA',
    tipoPeriodo: 'FERIADO',
    periodoInicio: '2026-02-14',
    periodoFim: '2026-02-17',
    publicadaEm: '2026-02-10T12:00:00Z',
    taxaOcupacao: 71.5,
    faixa: { codigo: 'OTIMA', nome: 'Ótima' },
    fluxoTotal: 60_210,
  },
]

const RESULTADO = {
  campanha: { id: 15, ...PUBLICADAS[0], qtdDiarias: 31, publicada: true },
  publicado: true,
  taxaOcupacao: 62.8,
  faixa: { codigo: 'OTIMA', nome: 'Ótima' },
  qtdMh: 72,
  qtdMhRespondentes: 58,
  percentualMhRespondentes: 80.6,
  leitosTotal: 13_508,
  leitosRespondentes: 12_346,
  percentualLeitosRespondentes: 91.4,
  fluxoMh: 365_620,
  fluxoRhc: 55_795,
  fluxoDayUse: 75_245,
  fluxoTotal: 496_660,
  fluxoMedioDiario: 16_021,
  diariaMedia: 765,
  receitaHospedagem: 89_000_000,
  receitaSemHospedagem: 21_000_000,
  porTipo: [
    {
      tipoHospedagemCodigo: 'RESORT',
      nome: 'Resort',
      qtdMh: 9,
      qtdUh: 4_643,
      taxaOcupacao: 66,
      diariaMedia: 836,
      revpar: 552,
      receitaEstimada: 79_400_000,
    },
    {
      tipoHospedagemCodigo: 'HOTEL',
      nome: 'Hotel',
      qtdMh: 2,
      qtdUh: 120,
      taxaOcupacao: null,
      diariaMedia: null,
      revpar: null,
      receitaEstimada: null,
      omitido: true,
    },
  ],
  distribuicaoFaixas: [
    { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41, qtdMh: 30 },
    { codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61, qtdMh: 28 },
  ],
}

const FERIADOS = [
  {
    feriadoCodigo: 'CARNAVAL',
    nome: 'Carnaval',
    anos: [
      { ano: 2025, taxaOcupacao: 80, fluxoTotal: 54_000, diariaMedia: 910, origem: 'HISTORICO' },
      { ano: 2026, taxaOcupacao: 82.5, fluxoTotal: 60_210, diariaMedia: 950, origem: 'SISTEMA' },
    ],
  },
]

const CAMPANHA = {
  id: 50,
  rodadaId: 5,
  nome: 'Consolidada de outubro de 2026',
  modalidade: 'CONSOLIDADA',
  tipoPeriodo: 'MENSAL',
  periodoInicio: '2026-10-01',
  periodoFim: '2026-10-31',
  qtdDiarias: 31,
  publicada: false,
}

const RODADA = {
  id: 5,
  codigo: '005/26',
  titulo: 'Consolidada de outubro',
  status: 'ABERTA',
  dataAbertura: '2026-11-01',
  prazoResposta: '2099-11-30',
  campanhas: [CAMPANHA],
}

const ACOMPANHAMENTO = {
  rodadaId: 5,
  codigo: '005/26',
  status: 'ABERTA',
  campanhas: [
    {
      campanhaId: 50,
      nome: CAMPANHA.nome,
      qtdMh: 2,
      qtdRespondentes: 1,
      leitosTotal: 9_500,
      leitosRespondentes: 9_200,
      percentualLeitosRespondentes: 96.84,
      percentualMinimoPublicacao: 70,
      atingiuMinimo: true,
      estabelecimentos: [
        {
          estabelecimentoId: 7,
          nomeFantasia: 'Hotel Thermas',
          tipoHospedagemCodigo: 'HOTEL',
          qtdLeitos: 300,
          respondeu: false,
        },
        {
          estabelecimentoId: 9,
          nomeFantasia: 'Resort Águas',
          tipoHospedagemCodigo: 'RESORT',
          qtdLeitos: 9_200,
          respondeu: true,
          versao: 2,
        },
      ],
    },
  ],
}

const PREVIA = {
  campanhaId: 50,
  qtdMh: 2,
  qtdRespondentes: 1,
  leitosTotal: 9_500,
  leitosRespondentes: 9_200,
  percentualLeitosRespondentes: 96.84,
  percentualMinimoPublicacao: 70,
  podePublicar: false,
  impedimentos: ['A pesquisa 005/26 precisa ser encerrada antes da publicação.'],
  avisos: ['Hotel Thermas ainda não respondeu.'],
  resultado: { ...RESULTADO, campanha: CAMPANHA, publicado: false },
}

const DIARIAS = [
  {
    tipoHospedagemCodigo: 'RESORT',
    diariaMedia: 900,
    fonte: 'Associação dos resorts',
    registradoPor: 1,
    registradoEm: '2026-11-20T13:00:00Z',
  },
]

const HOTEL = {
  id: 12,
  nomeFantasia: 'Hotel Exemplo',
  tipoHospedagemCodigo: 'HOTEL',
  situacao: 'REGULAR',
  ativo: true,
  qtdUh: 40,
  qtdLeitos: 120,
}

const POUSADA = {
  id: 7,
  nomeFantasia: 'Pousada do Sol',
  tipoHospedagemCodigo: 'POUSADA',
  situacao: 'REGULAR',
  ativo: true,
}

const CAPACIDADES = [
  {
    id: 1,
    vigenteDesde: '2025-01-01',
    qtdUh: 40,
    qtdUhPcd: 2,
    qtdLeitos: 120,
    maxLeitosPorUh: 4,
    leitosUteis: 100,
  },
]

const CATALOGO = [
  {
    id: 1,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    codigo: 'LAZER',
    nome: 'Lazer',
    exclusivoSecretaria: false,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 10,
        codigo: 'PISCINA',
        nome: 'Piscina',
        permiteComplemento: true,
        ordem: 1,
        ativo: true,
      },
      {
        id: 11,
        codigo: 'ACADEMIA',
        nome: 'Academia',
        permiteComplemento: false,
        ordem: 2,
        ativo: false,
      },
    ],
  },
  {
    id: 3,
    categoria: 'SUSTENTABILIDADE',
    codigo: 'SELOS',
    nome: 'Selos da Secretaria',
    exclusivoSecretaria: true,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 30,
        codigo: 'SELO',
        nome: 'Selo verde',
        permiteComplemento: false,
        ordem: 1,
        ativo: true,
      },
    ],
  },
]

const PARAMETROS = [
  {
    id: 1,
    vigenteDesde: '2025-01-01',
    percentualDayUse: 15.15,
    diasEmParques: 2,
    gastoMedioIngresso: 105,
    diasPermanenciaMedia: 4,
    gastoMedioDiario: 250,
    percentualMinimoLeitosPublicacao: 70,
    fonte: 'Estudo OTO 2025',
  },
]

const RHC = [
  {
    id: 1,
    vigenteDesde: '2025-01-01',
    qtdRegistros: 478,
    qtdUh: 1_200,
    qtdLeitos: 5_116,
    maxLeitosPorUh: 5,
    leitosUteis: 3_600,
  },
]

const USUARIOS_CADASTRADOS = [
  { ...USUARIOS.ADMIN },
  { ...USUARIOS.VISUALIZADOR, ativo: false },
  {
    ...USUARIOS.PARCEIRO,
    primeiroAcessoPendente: true,
    estabelecimentos: [{ id: 7, nomeFantasia: 'Pousada do Sol' }],
  },
]

const HISTORICO = [
  {
    id: 1,
    indicador: 'TAXA_OCUPACAO',
    modalidade: 'CONSOLIDADA',
    ano: 2024,
    mes: 7,
    valor: 80,
    fonte: 'Planilha 2017-2025',
  },
  {
    id: 2,
    indicador: 'FLUXO_TURISTAS',
    modalidade: 'CONSOLIDADA',
    ano: 2024,
    feriadoCodigo: 'CARNAVAL',
    valor: 52_000,
    fonte: 'Planilha 2017-2025',
  },
]

const PENDENCIAS = [
  {
    campanhaId: 50,
    campanhaNome: CAMPANHA.nome,
    periodoInicio: CAMPANHA.periodoInicio,
    periodoFim: CAMPANHA.periodoFim,
    rodadaCodigo: '005/26',
    prazoResposta: '2099-11-30',
    estabelecimentoId: 7,
    nomeFantasia: 'Pousada do Sol',
    respondida: false,
  },
]

const MINHAS = [
  {
    respostaId: 301,
    campanhaId: 15,
    campanhaNome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
    periodoFim: '2026-08-31',
    estabelecimentoId: 7,
    nomeFantasia: 'Pousada do Sol',
    taxaOcupacao: 58,
    diariaMedia: 320,
    taxaOcupacaoCidade: 62.8,
  },
]

function serieMensal(parametros: URLSearchParams) {
  const fim = Number(parametros.get('anoFim') || 2026)
  const inicio = Number(parametros.get('anoInicio') || fim - 2)
  const anos = []
  for (let ano = inicio; ano <= fim; ano++) {
    anos.push({
      ano,
      meses: Array.from({ length: 12 }, (_, indice) => ({
        mes: indice + 1,
        valor: ano === 2026 && indice > 7 ? null : 50 + ((indice * 7 + ano) % 30),
        origem: ano < 2025 ? 'HISTORICO' : 'SISTEMA',
      })),
    })
  }
  return { indicador: parametros.get('indicador') ?? 'TAXA_OCUPACAO', anos }
}

function respostaGet(perfil: Perfil, caminho: string, parametros: URLSearchParams): unknown {
  const estabelecimentos = perfil === 'PARCEIRO' ? [POUSADA] : [HOTEL, POUSADA]
  const fixas: Record<string, unknown> = {
    '/api/me': USUARIOS[perfil],
    '/api/referencias': REFERENCIAS,
    '/api/campanhas/publicadas': PUBLICADAS,
    '/api/campanhas/15/resultado': RESULTADO,
    '/api/dashboard/feriados': FERIADOS,
    '/api/rhc/vigente': RHC[0],
    '/api/rhc': RHC,
    '/api/parametros-calculo/vigente': PARAMETROS[0],
    '/api/parametros-calculo': PARAMETROS,
    '/api/rodadas': [RODADA, { ...RODADA, id: 4, codigo: '004/26', status: 'ENCERRADA' }],
    '/api/rodadas/5': RODADA,
    '/api/rodadas/5/acompanhamento': ACOMPANHAMENTO,
    '/api/campanhas/50/respostas': [],
    '/api/campanhas/50/previa': PREVIA,
    '/api/campanhas/50/diarias': DIARIAS,
    '/api/respostas/pendencias': PENDENCIAS,
    '/api/respostas/minhas': MINHAS,
    '/api/usuarios': USUARIOS_CADASTRADOS,
    '/api/estabelecimentos': estabelecimentos,
    '/api/estabelecimentos/12': {
      id: 12,
      ativo: true,
      dados: { nomeFantasia: HOTEL.nomeFantasia },
      secretaria: { tipoHospedagemCodigo: 'HOTEL', situacao: 'REGULAR' },
    },
    '/api/estabelecimentos/7': {
      id: 7,
      ativo: true,
      dados: { nomeFantasia: POUSADA.nomeFantasia, endereco: 'Rua das Flores, 10' },
      secretaria: {
        tipoHospedagemCodigo: 'POUSADA',
        situacao: 'REGULAR',
        aceitaPesquisas: true,
        contatoNome: 'Maria da Secretaria',
      },
    },
    '/api/estabelecimentos/12/capacidades': CAPACIDADES,
    '/api/estabelecimentos/7/capacidades': CAPACIDADES,
    '/api/estabelecimentos/12/inventario': { estabelecimentoId: 12, itens: [{ itemId: 30 }] },
    '/api/estabelecimentos/7/inventario': { estabelecimentoId: 7, itens: [{ itemId: 30 }] },
    '/api/inventario/catalogo': CATALOGO,
    '/api/inventario/catalogo/completo': CATALOGO,
    '/api/historico': HISTORICO,
  }
  if (caminho === '/api/dashboard/serie-mensal') return serieMensal(parametros)
  return fixas[caminho]
}

/** API simulada só de leitura: cada tela recebe dados para mostrar a versão completa. */
async function abrir(page: Page, perfil: Perfil | undefined, caminho: string) {
  await page.clock.setFixedTime(new Date('2026-11-16T12:00:00-03:00'))
  if (perfil) {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'oto.sessao',
        JSON.stringify({ token: 'token-e2e', expiraEm: '2099-01-01T00:00:00Z' }),
      )
    })
  }
  await page.route('**/api/**', (rota: Route) => {
    const url = new URL(rota.request().url())
    const corpo =
      rota.request().method() === 'GET' && perfil
        ? respostaGet(perfil, url.pathname, url.searchParams)
        : undefined
    return corpo === undefined
      ? rota.fulfill({ status: 404, json: { detail: `sem rota: ${url.pathname}` } })
      : rota.fulfill({ json: corpo })
  })
  await page.goto(caminho)
}

const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const GRAVES = new Set(['serious', 'critical'])

async function verificarAcessibilidade(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze()
  const descrever = (v: (typeof violations)[number]) =>
    `${v.id} (${v.impact}): ${v.help} em ${v.nodes.map((no) => no.target.join(' ')).join(', ')}`
  for (const leve of violations.filter((v) => !GRAVES.has(v.impact ?? ''))) {
    test.info().annotations.push({ type: 'acessibilidade', description: descrever(leve) })
  }
  expect(violations.filter((v) => GRAVES.has(v.impact ?? '')).map(descrever)).toEqual([])
}

/**
 * Como o semRolagemHorizontal, mas compara com a largura do aparelho: no celular emulado, o
 * innerWidth cresce até a largura do conteúdo e esconderia o corte.
 */
async function cabeNaLargura(page: Page) {
  const conteudo = (await page.evaluate('document.documentElement.scrollWidth')) as number
  expect(conteudo, 'a página não deveria rolar para o lado').toBeLessThanOrEqual(
    page.viewportSize()!.width,
  )
}

type Tela = {
  nome: string
  caminho: string
  perfil?: Perfil
  pronta: (page: Page) => Locator
  dialogo?: (page: Page) => Locator
  celular?: boolean
}

const titulo = (nome: string | RegExp) => (page: Page) =>
  page.getByRole('heading', { level: 1, name: nome })
const botao = (nome: string | RegExp) => (page: Page) =>
  page.getByRole('button', { name: nome }).first()

const TELAS: Tela[] = [
  { nome: 'login', caminho: '/login', pronta: titulo('Entrar no painel') },
  {
    nome: 'definir senha',
    caminho: '/definir-senha?token=link-valido',
    pronta: (page) => page.getByLabel('Confirmar senha'),
  },
  {
    nome: 'painel',
    caminho: '/',
    perfil: 'VISUALIZADOR',
    pronta: (page) =>
      page.getByRole('heading', { name: 'Taxa de ocupação hoteleira em agosto de 2026' }),
    celular: true,
  },
  {
    nome: 'metodologia',
    caminho: '/metodologia',
    perfil: 'VISUALIZADOR',
    pronta: (page) => page.getByText('Fonte: Estudo OTO 2025.'),
  },
  { nome: 'minha senha', caminho: '/minha-senha', perfil: 'ADMIN', pronta: titulo('Trocar senha') },
  {
    nome: 'resultado da campanha',
    caminho: '/resultados/15',
    perfil: 'VISUALIZADOR',
    pronta: (page) => page.getByRole('row', { name: /Resort/ }),
    celular: true,
  },
  {
    nome: 'relatórios',
    caminho: '/relatorios',
    perfil: 'VISUALIZADOR',
    pronta: (page) => page.getByRole('row', { name: /Carnaval 2026/ }),
  },
  {
    nome: 'indicadores',
    caminho: '/indicadores',
    perfil: 'VISUALIZADOR',
    pronta: (page) => page.getByRole('row', { name: /Carnaval/ }),
  },
  {
    nome: 'rodadas',
    caminho: '/pesquisas',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /005\/26/ }),
  },
  {
    nome: 'acompanhamento',
    caminho: '/pesquisas/5',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('link', { name: 'Lançar resposta de Hotel Thermas' }),
  },
  {
    nome: 'nova pesquisa',
    caminho: '/pesquisas/nova',
    perfil: 'ADMIN',
    pronta: titulo('Nova pesquisa'),
  },
  {
    nome: 'lançar resposta',
    caminho: '/pesquisas/5/campanhas/50/respostas/7',
    perfil: 'ADMIN',
    pronta: (page) => page.getByLabel('Taxa de ocupação (%)'),
  },
  {
    nome: 'prévia',
    caminho: '/pesquisas/5/campanhas/50/previa',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('table', { name: 'Diárias informadas pela equipe' }),
    dialogo: botao(/^Corrigir /),
  },
  {
    nome: 'responder pesquisa',
    caminho: '/pesquisas/responder',
    perfil: 'PARCEIRO',
    pronta: (page) => page.getByRole('listitem', { name: 'Pousada do Sol' }),
    celular: true,
  },
  {
    nome: 'meu estabelecimento',
    caminho: '/meu-estabelecimento',
    perfil: 'PARCEIRO',
    pronta: botao('Editar dados de Pousada do Sol'),
    dialogo: botao('Editar dados de Pousada do Sol'),
    celular: true,
  },
  {
    nome: 'usuários',
    caminho: '/cadastros/usuarios',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /Paula Reis/ }),
    dialogo: botao('Novo usuário'),
  },
  {
    nome: 'estabelecimentos',
    caminho: '/cadastros/estabelecimentos',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /Hotel Exemplo/ }),
    dialogo: botao('Novo estabelecimento'),
  },
  {
    nome: 'capacidades',
    caminho: '/cadastros/estabelecimentos/12/capacidades',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /01\/01\/2025/ }),
    dialogo: botao('Nova vigência'),
  },
  {
    nome: 'parâmetros',
    caminho: '/cadastros/parametros',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /01\/01\/2025/ }),
    dialogo: botao('Nova vigência'),
  },
  {
    nome: 'RHC',
    caminho: '/cadastros/rhc',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /01\/01\/2025/ }),
    dialogo: botao('Nova vigência'),
  },
  {
    nome: 'referências',
    caminho: '/cadastros/referencias',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /Pousada/ }),
    dialogo: botao('Novo tipo de hospedagem'),
  },
  {
    nome: 'inventário',
    caminho: '/cadastros/inventario',
    perfil: 'ADMIN',
    pronta: (page) => page.getByText('Piscina').first(),
    dialogo: botao('Novo grupo'),
  },
  {
    nome: 'inventário do estabelecimento',
    caminho: '/cadastros/estabelecimentos/12/inventario',
    perfil: 'ADMIN',
    pronta: (page) => page.getByText('Piscina').first(),
  },
  {
    nome: 'série histórica',
    caminho: '/cadastros/historico',
    perfil: 'ADMIN',
    pronta: (page) => page.getByRole('row', { name: /Carnaval/ }),
    dialogo: botao('Novo valor'),
  },
]

for (const tela of TELAS) {
  test(
    `${tela.nome}: sem violações de acessibilidade`,
    { tag: tela.celular ? '@celular' : [] },
    async ({ page }) => {
      await abrir(page, tela.perfil, tela.caminho)
      await expect(tela.pronta(page)).toBeVisible()
      await verificarAcessibilidade(page)

      if (tela.dialogo) {
        await tela.dialogo(page).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await verificarAcessibilidade(page)
      }
    },
  )
}

for (const tela of TELAS.filter(({ celular }) => celular)) {
  test(
    `${tela.nome}: cabe na tela sem rolar para o lado`,
    { tag: '@celular' },
    async ({ page }) => {
      if (!test.info().project.use.isMobile) await page.setViewportSize({ width: 360, height: 740 })
      await abrir(page, tela.perfil, tela.caminho)
      await expect(tela.pronta(page)).toBeVisible()
      await cabeNaLargura(page)
    },
  )
}
