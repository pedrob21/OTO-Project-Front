import { formatarMes, formatarMesAno } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'

/** "2026-08-01" → { ano: 2026, mes: 8 }. Lê o texto, sem Date, para o fuso não mudar o mês. */
export function partesDoPeriodo(data: string | null | undefined) {
  const partes = data?.match(/^(\d{4})-(\d{2})/)
  return partes ? { ano: Number(partes[1]), mes: Number(partes[2]) } : null
}

/** Mês: "agosto de 2026". Feriado ou evento: o nome da campanha. */
export function textoDoPeriodo(campanha: Esquemas['CampanhaResponse'] | undefined): string {
  if (campanha?.tipoPeriodo === 'FERIADO') return campanha.nome ?? ''
  const partes = partesDoPeriodo(campanha?.periodoInicio)
  return partes ? `${formatarMes(partes.mes)} de ${partes.ano}` : (campanha?.nome ?? '')
}

/** Mês: "em agosto". Feriado ou evento: "no período". */
export function textoDoPeriodoCurto(campanha: Esquemas['CampanhaResponse'] | undefined): string {
  const partes = partesDoPeriodo(campanha?.periodoInicio)
  return campanha?.tipoPeriodo === 'FERIADO' || !partes
    ? 'no período'
    : `em ${formatarMes(partes.mes)}`
}

/** O período comparado: "ago./2025". */
export function referenciaDaComparacao(
  campanha: Esquemas['CampanhaResponse'] | undefined,
  comparativo: Pick<Esquemas['Comparativo'], 'ano'> | undefined,
): string | undefined {
  const mes = partesDoPeriodo(campanha?.periodoInicio)?.mes
  return mes && comparativo?.ano ? formatarMesAno(mes, comparativo.ano) : undefined
}
