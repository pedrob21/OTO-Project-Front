import type { ReactNode } from 'react'
import styles from './KpiCard.module.css'

type KpiCardProps = {
  rotulo: string
  valor: string
  descricao: ReactNode
  /** conteúdo alinhado ao fim do cartão, como a variação */
  rodape?: ReactNode
}

export function KpiCard({ rotulo, valor, descricao, rodape }: KpiCardProps) {
  return (
    <section className={styles.cartao}>
      <h3 className={styles.rotulo}>{rotulo}</h3>
      <p className={styles.valor}>{valor}</p>
      <p className={styles.descricao}>{descricao}</p>
      {rodape && <div className={styles.rodape}>{rodape}</div>}
    </section>
  )
}
