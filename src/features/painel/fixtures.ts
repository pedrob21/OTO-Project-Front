// Dados da tela exportada, no formato da API, para montar o painel antes da integração (T15).
// Os totais de leitos são aproximados, e as séries mensais foram lidas das linhas do gráfico.
import type { Esquemas } from '@/types/dominio'

const MESES_2026 = [80.6, 66.4, 47.4, 54.9, 45.9, 51.8, 85.1, 62.8]
const MESES_2025 = [77.8, 63.1, 44.6, 50.9, 42.7, 48.9, 82.4, 58.7, 49.5, 56.9, 60.8, 68.5]
const MESES_2024 = [74.2, 60.4, 41.8, 47.6, 39.9, 44.8, 78.9, 54.1, 46.3, 53.8, 57.2, 66.0]

function serie(ano: number, valores: number[]): Esquemas['SerieAno'] {
  return {
    ano,
    meses: Array.from({ length: 12 }, (_, indice) => ({
      mes: indice + 1,
      valor: valores[indice] ?? undefined,
      origem: ano === 2026 ? 'SISTEMA' : 'HISTORICO',
    })),
  }
}

export const serieMensal: Esquemas['SerieMensalResponse'] = {
  indicador: 'TAXA_OCUPACAO',
  modalidade: 'CONSOLIDADA',
  anos: [serie(2026, MESES_2026), serie(2025, MESES_2025), serie(2024, MESES_2024)],
}

export const referencias: Esquemas['Referencias'] = {
  tiposHospedagem: [
    { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true, ordem: 1 },
    { codigo: 'RESORT', nome: 'Resort', calculaReceita: true, ordem: 2 },
    { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true, ordem: 3 },
    { codigo: 'HOTEL_FAZENDA', nome: 'Hotel fazenda', calculaReceita: false, ordem: 4 },
    { codigo: 'FLAT', nome: 'Flat', calculaReceita: false, ordem: 5 },
  ],
  feriados: [
    { codigo: 'CARNAVAL', nome: 'Carnaval', ordem: 1 },
    { codigo: 'PASCOA', nome: 'Páscoa', ordem: 2 },
    { codigo: 'TIRADENTES', nome: 'Tiradentes', ordem: 3 },
    { codigo: 'DIA_DO_TRABALHO', nome: '1º de Maio', ordem: 4 },
    { codigo: 'CORPUS_CHRISTI', nome: 'Corpus Christi', ordem: 5 },
    { codigo: 'FEFOL', nome: 'Festival do Folclore de Olímpia (FEFOL)', ordem: 6 },
  ],
  faixasOcupacao: [
    { codigo: 'RUIM', nome: 'Ruim', percentualMinimo: 0 },
    { codigo: 'REGULAR', nome: 'Regular', percentualMinimo: 21 },
    { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41 },
    { codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61 },
    { codigo: 'EXCELENTE', nome: 'Excelente', percentualMinimo: 81 },
  ],
}

/** `codigoRodada` não vem da API hoje (decisão D8). */
export const campanhasPublicadas: (Esquemas['CampanhaPublicadaResponse'] & {
  codigoRodada?: string
})[] = [
  {
    campanhaId: 15,
    codigoRodada: '015/26',
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
    periodoFim: '2026-08-31',
    publicadaEm: '2026-09-18T12:00:00Z',
    taxaOcupacao: 62.8,
    faixa: { codigo: 'OTIMA', nome: 'Ótima' },
    fluxoTotal: 496_660,
    diariaMedia: 765,
  },
  {
    campanhaId: 13,
    codigoRodada: '013/26',
    nome: 'Julho de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-07-01',
    periodoFim: '2026-07-31',
    publicadaEm: '2026-08-12T12:00:00Z',
    taxaOcupacao: 85.2,
    faixa: { codigo: 'EXCELENTE', nome: 'Excelente' },
  },
]

export const resultado: Esquemas['ResultadoResponse'] = {
  campanha: {
    id: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
    periodoFim: '2026-08-31',
    qtdDiarias: 31,
    publicada: true,
    publicadaEm: '2026-09-18T12:00:00Z',
  },
  publicado: true,
  taxaOcupacao: 62.8,
  faixa: { codigo: 'OTIMA', nome: 'Ótima' },
  qtdMh: 72,
  qtdMhRespondentes: 58,
  percentualMhRespondentes: 80.6,
  leitosTotal: 12_000,
  leitosRespondentes: 10_968,
  percentualLeitosRespondentes: 91.4,
  fluxoMh: 365_620,
  fluxoRhc: 55_795,
  fluxoDayUse: 75_245,
  fluxoTotal: 496_660,
  fluxoMedioDiario: 16_021,
  diariaMedia: 765,
  receitaHospedagem: 89_000_000,
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
      omitido: false,
    },
    {
      tipoHospedagemCodigo: 'HOTEL',
      nome: 'Hotel',
      qtdMh: 18,
      qtdUh: 586,
      taxaOcupacao: 55,
      diariaMedia: 512,
      revpar: 282,
      receitaEstimada: 5_100_000,
      omitido: false,
    },
    {
      tipoHospedagemCodigo: 'POUSADA',
      nome: 'Pousada',
      qtdMh: 41,
      qtdUh: 635,
      taxaOcupacao: 48,
      diariaMedia: 478,
      revpar: 229,
      receitaEstimada: 4_500_000,
      omitido: false,
    },
    // Fora da tabela e da receita, mas somam nas UH da cidade: é o que dá os 78% da nota.
    { tipoHospedagemCodigo: 'FLAT', nome: 'Flat', qtdMh: 3, qtdUh: 70, omitido: false },
    {
      tipoHospedagemCodigo: 'HOTEL_FAZENDA',
      nome: 'Hotel fazenda',
      qtdMh: 1,
      qtdUh: 19,
      omitido: false,
    },
  ],
  distribuicaoFaixas: [
    { codigo: 'RUIM', nome: 'Ruim', percentualMinimo: 0, qtdMh: 2 },
    { codigo: 'REGULAR', nome: 'Regular', percentualMinimo: 21, qtdMh: 8 },
    { codigo: 'BOA', nome: 'Boa', percentualMinimo: 41, qtdMh: 19 },
    { codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61, qtdMh: 21 },
    { codigo: 'EXCELENTE', nome: 'Excelente', percentualMinimo: 81, qtdMh: 8 },
  ],
}

/** Mesmo período do ano anterior, como em `Comparativo` do resumo. A receita não existe na API (D3). */
export const comparativo: Esquemas['Comparativo'] & { variacaoReceitaPercentual: number } = {
  ano: 2025,
  taxaOcupacao: 58.7,
  diferencaTaxaPontos: 4.1,
  variacaoFluxoPercentual: 6.1,
  variacaoDiariaPercentual: 4.6,
  variacaoReceitaPercentual: 10.9,
  origem: 'HISTORICO',
}

function feriados(valores: Record<string, number>): Esquemas['FeriadoSerie'][] {
  return (referencias.feriados ?? []).map(({ codigo = '', nome }) => ({
    feriadoCodigo: codigo,
    nome,
    anos: [{ ano: 2026, taxaOcupacao: valores[codigo], origem: 'SISTEMA' }],
  }))
}

export const feriadosExpectativa = feriados({
  CARNAVAL: 82,
  PASCOA: 76,
  TIRADENTES: 68,
  DIA_DO_TRABALHO: 63,
  CORPUS_CHRISTI: 70,
  FEFOL: 78,
})

export const feriadosRealizado = feriados({
  CARNAVAL: 87,
  PASCOA: 71,
  TIRADENTES: 72,
  DIA_DO_TRABALHO: 59,
  CORPUS_CHRISTI: 74,
  FEFOL: 81,
})

export const rhcVigente: Esquemas['RhcResponse'] = { qtdRegistros: 478, qtdLeitos: 5_116 }

export const parametrosVigentes: Esquemas['ParametroResponse'] = {
  percentualDayUse: 15.15,
  fonte: 'Pesquisa de Demanda Turística 2024',
}

/** A data da tela exportada: é dela que sai o "faltam 4 dias". A T15 passa a usar a data de hoje. */
export const hojeDoDesign = '2026-10-05'

export const rodadaAberta: Esquemas['RodadaResponse'] = {
  id: 17,
  codigo: '017/26',
  titulo: 'Consolidada de setembro e expectativa da Semana do Saco Cheio',
  status: 'ABERTA',
  prazoResposta: '2026-10-09',
}

const FALTANTES: [tipo: string, quantidade: number][] = [
  ['POUSADA', 19],
  ['HOTEL', 8],
  ['RESORT', 2],
  ['FLAT', 2],
]

export const acompanhamento: Esquemas['AcompanhamentoResponse'] = {
  rodadaId: 17,
  codigo: '017/26',
  titulo: rodadaAberta.titulo,
  status: 'ABERTA',
  prazoResposta: '2026-10-09',
  campanhas: [
    {
      campanhaId: 17,
      qtdMh: 72,
      qtdRespondentes: 41,
      percentualLeitosRespondentes: 74.2,
      estabelecimentos: FALTANTES.flatMap(([tipo, quantidade]) =>
        Array.from({ length: quantidade }, () => ({
          tipoHospedagemCodigo: tipo,
          respondeu: false,
        })),
      ),
    },
  ],
}

export const rodadasRecentes: Esquemas['RodadaResponse'][] = [
  {
    id: 15,
    codigo: '015/26',
    titulo: 'Consolidada de agosto e FEFOL 2026',
    status: 'ENCERRADA',
    campanhas: [{ publicada: true, publicadaEm: '2026-09-18T12:00:00Z' }],
  },
  {
    id: 13,
    codigo: '013/26',
    titulo: 'Consolidada de julho de 2026',
    status: 'ENCERRADA',
    campanhas: [{ publicada: true, publicadaEm: '2026-08-12T12:00:00Z' }],
  },
  {
    id: 11,
    codigo: '011/26',
    titulo: 'Expectativa FEFOL 2026',
    status: 'ENCERRADA',
    campanhas: [{ publicada: true, publicadaEm: '2026-08-05T12:00:00Z' }],
  },
]

const RESPOSTAS_RECENTES: [rodadaId: number, respondentes: number][] = [
  [15, 58],
  [13, 61],
  [11, 52],
]

export const acompanhamentosRecentes: Esquemas['AcompanhamentoResponse'][] = RESPOSTAS_RECENTES.map(
  ([rodadaId, qtdRespondentes]) => ({
    rodadaId,
    campanhas: [{ qtdMh: 72, qtdRespondentes }],
  }),
)

export const pendenciasParceiro: Esquemas['PendenciaResponse'][] = [
  {
    campanhaId: 17,
    campanhaNome: 'Consolidada de setembro',
    rodadaCodigo: '017/26',
    prazoResposta: '2026-10-09',
    estabelecimentoId: 1,
    nomeFantasia: 'Pousada Exemplo',
    respondida: false,
  },
  {
    campanhaId: 18,
    campanhaNome: 'Expectativa da Semana do Saco Cheio',
    rodadaCodigo: '017/26',
    prazoResposta: '2026-10-09',
    estabelecimentoId: 1,
    nomeFantasia: 'Pousada Exemplo',
    respondida: true,
  },
]
