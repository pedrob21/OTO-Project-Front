import { Badge } from '@/components/ui/Badge'
import type { SituacaoDaVigencia as Situacao } from './vigencias'

export function SituacaoDaVigencia({ situacao }: { situacao: Situacao }) {
  if (situacao === 'vigente') return <Badge variante="publicada">Vigente</Badge>
  if (situacao === 'futura') return <Badge variante="aberta">Futura</Badge>
  return <Badge variante="inativa">Anterior</Badge>
}
