import { formatarMes } from '@/lib/formatos'
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
