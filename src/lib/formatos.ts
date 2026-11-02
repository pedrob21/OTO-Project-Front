// Formatadores pt-BR. Valor ausente (null) vira travessão: a API manda null quando não há dado.

const VAZIO = '—'
const ESPACO = ' '
const MENOS = '−'

type Valor = number | null | undefined

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]
const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

function numero(valor: number, casas: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)
}

function semValor(valor: Valor): valor is null | undefined {
  return valor === null || valor === undefined || Number.isNaN(valor)
}

/** 4643 → "4.643" */
export function formatarInteiro(valor: Valor): string {
  return semValor(valor) ? VAZIO : numero(valor, 0)
}

/** 62.8 → "62,8%" */
export function formatarPercentual(valor: Valor, casas = 1): string {
  return semValor(valor) ? VAZIO : `${numero(valor, casas)}%`
}

/** 496700 → "496,7 mil"; 89000000 → "89,0 mi"; 950 → "950" */
export function formatarCompacto(valor: Valor): string {
  if (semValor(valor)) return VAZIO
  const absoluto = Math.abs(valor)
  // 999.950 arredondaria para "1.000,0 mil"
  if (absoluto >= 999_950) return `${numero(valor / 1_000_000, 1)}${ESPACO}mi`
  if (absoluto >= 1_000) return `${numero(valor / 1_000, 1)}${ESPACO}mil`
  return numero(valor, 0)
}

/** 765 → "R$ 765" */
export function formatarMoeda(valor: Valor): string {
  return semValor(valor) ? VAZIO : `R$${ESPACO}${numero(valor, 0)}`
}

/** 89000000 → "R$ 89,0 mi" */
export function formatarMoedaCompacta(valor: Valor): string {
  return semValor(valor) ? VAZIO : `R$${ESPACO}${formatarCompacto(valor)}`
}

function comSinal(valor: number, casas: number): string {
  const texto = numero(Math.abs(valor), casas)
  // o sinal segue o valor arredondado: -0,04 com uma casa é "0,0"
  if (Number(valor.toFixed(casas)) === 0) return texto
  return `${valor > 0 ? '+' : MENOS}${texto}`
}

/** 4.1 → "+4,1 p.p."; -5 com 0 casas → "−5 p.p." */
export function formatarVariacaoPontos(valor: Valor, casas = 1): string {
  return semValor(valor) ? VAZIO : `${comSinal(valor, casas)}${ESPACO}p.p.`
}

/** 6.1 → "+6,1%" */
export function formatarVariacaoPercentual(valor: Valor, casas = 1): string {
  return semValor(valor) ? VAZIO : `${comSinal(valor, casas)}%`
}

/** mês de 1 a 12. 8 → "agosto" */
export function formatarMes(mes: number): string {
  return MESES[mes - 1] ?? VAZIO
}

/** mês de 1 a 12. 8 → "Ago" */
export function formatarMesCurto(mes: number): string {
  const nome = MESES_CURTOS[mes - 1]
  return nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : VAZIO
}

/** (8, 2025) → "ago./2025" */
export function formatarMesAno(mes: number, ano: number): string {
  const nome = MESES_CURTOS[mes - 1]
  return nome ? `${nome}./${ano}` : VAZIO
}

/** "2026-09-18" → "18/09/2026". Lê o texto, sem Date, para o fuso não mudar o dia. */
export function formatarData(data: string | null | undefined): string {
  const partes = data?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : VAZIO
}
