import type { OpcaoSelect } from '@/components/ui/Select'
import { capitalizar, formatarMes } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { partesDoPeriodo } from './periodo'

type Campanha = Esquemas['CampanhaPublicadaResponse'] & { codigoRodada?: string }

export const TODOS_OS_TIPOS = 'todos'

/** "Agosto de 2026 • consolidada (015/26)" */
export function opcoesCampanha(campanhas: Campanha[]): OpcaoSelect[] {
  return campanhas.map(({ campanhaId, nome, modalidade, codigoRodada }) => {
    const partes = [nome, modalidade?.toLowerCase()].filter(Boolean).join(' • ')
    return {
      valor: String(campanhaId),
      rotulo: codigoRodada ? `${partes} (${codigoRodada})` : partes,
    }
  })
}

/** O mesmo mês em anos anteriores: "Agosto de 2025". */
export function opcoesComparacao(
  campanha: Pick<Campanha, 'periodoInicio'> | undefined,
  anosAnteriores = 2,
): OpcaoSelect[] {
  const partes = partesDoPeriodo(campanha?.periodoInicio)
  if (!partes) return []

  const { ano } = partes
  const mesNoTitulo = capitalizar(formatarMes(partes.mes))

  return Array.from({ length: anosAnteriores }, (_, indice) => {
    const anoComparado = ano - indice - 1
    return { valor: String(anoComparado), rotulo: `${mesNoTitulo} de ${anoComparado}` }
  })
}

export function opcoesTipo(tipos: Esquemas['TipoRef'][]): OpcaoSelect[] {
  return [
    { valor: TODOS_OS_TIPOS, rotulo: 'Todos os tipos' },
    ...tipos.map(({ codigo = '', nome = '' }) => ({ valor: codigo, rotulo: nome })),
  ]
}
