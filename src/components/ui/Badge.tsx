import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeProps = {
  variante: 'aberta' | 'publicada' | 'faixa'
  icone?: ReactNode
  children: ReactNode
}

export function Badge({ variante, icone, children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variante]}`}>
      {variante === 'faixa' ? <span className={styles.ponto} aria-hidden="true" /> : icone}
      {children}
    </span>
  )
}
