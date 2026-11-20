import { formatarData } from './formatos'

// Datas da API chegam como texto "AAAA-MM-DD". As contas usam UTC, para o fuso e o horário de verão
// não mudarem o dia.

function diaUtc(data: string): number | null {
  const partes = data.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return partes ? Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : null
}

function paraTexto(utc: number): string {
  return new Date(utc).toISOString().slice(0, 10)
}

/** A data de hoje no fuso de quem usa: "2026-11-16". */
export function hojeLocal(agora = new Date()): string {
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

/** Dias de `hoje` até `prazo`: negativo quando o prazo já passou. */
export function diasAte(prazo: string, hoje: string): number | null {
  const fim = diaUtc(prazo)
  const inicio = diaUtc(hoje)
  return fim === null || inicio === null ? null : Math.round((fim - inicio) / 86_400_000)
}

/** Dias do período, contando o primeiro e o último: 01/02 a 28/02 → 28. */
export function diasDoPeriodo(inicio: string, fim: string): number | null {
  const dias = diasAte(fim, inicio)
  return dias === null ? null : dias + 1
}

/** "2026-02" → primeiro e último dia do mês. */
export function periodoDoMes(mes: string): { inicio: string; fim: string } | null {
  const partes = mes.match(/^(\d{4})-(\d{2})$/)
  if (!partes) return null
  const ano = Number(partes[1])
  const numero = Number(partes[2])
  if (numero < 1 || numero > 12) return null
  return {
    inicio: paraTexto(Date.UTC(ano, numero - 1, 1)),
    fim: paraTexto(Date.UTC(ano, numero, 0)),
  }
}

/** "2026-11-16" → "2026-10" */
export function mesAnterior(data: string): string {
  const utc = diaUtc(data)
  if (utc === null) return ''
  const atual = new Date(utc)
  return paraTexto(Date.UTC(atual.getUTCFullYear(), atual.getUTCMonth() - 1, 1)).slice(0, 7)
}

export function textoDosDias(prazo: string | undefined, hoje: string): string | null {
  const dias = prazo ? diasAte(prazo, hoje) : null
  if (dias === null) return null
  if (dias < 0) return 'prazo encerrado'
  if (dias === 0) return 'termina hoje'
  return dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`
}

/** "Prazo de resposta: 09/10/2026 · faltam 4 dias" */
export function textoDoPrazo(prazo: string | undefined, hoje: string): string {
  const dias = textoDosDias(prazo, hoje)
  return dias ? `Prazo de resposta: ${formatarData(prazo)} · ${dias}` : 'Sem prazo de resposta'
}
