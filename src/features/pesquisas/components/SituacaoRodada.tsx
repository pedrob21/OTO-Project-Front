import { IconeCheck, IconeRelogio } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import type { Situacao } from '../rodadas'
import styles from './SituacaoRodada.module.css'

export function SituacaoRodada({ situacao }: { situacao: Situacao }) {
  const { variante, rotulo, detalhe } = situacao

  return (
    <span className={styles.situacao}>
      {variante === 'aberta' && (
        <Badge variante="aberta" icone={<IconeRelogio tamanho={14} />}>
          {rotulo}
        </Badge>
      )}
      {variante === 'publicada' && (
        <Badge variante="publicada" icone={<IconeCheck tamanho={14} />}>
          {rotulo}
        </Badge>
      )}
      {(variante === 'rascunho' || variante === 'encerrada') && (
        <span className={styles.neutra}>{rotulo}</span>
      )}
      {detalhe && <span className={styles.detalhe}>{detalhe}</span>}
    </span>
  )
}
