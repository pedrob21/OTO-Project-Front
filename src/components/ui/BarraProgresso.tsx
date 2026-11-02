import styles from './BarraProgresso.module.css'

type BarraProgressoProps = {
  /** percentual de 0 a 100 */
  valor: number | null | undefined
  /** o que a barra mede, para leitores de tela */
  rotulo: string
}

export function BarraProgresso({ valor, rotulo }: BarraProgressoProps) {
  const preenchido = Math.min(Math.max(valor ?? 0, 0), 100)

  return (
    <div
      className={styles.trilha}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor === null || valor === undefined ? undefined : preenchido}
    >
      <div className={styles.preenchido} style={{ width: `${preenchido}%` }} />
    </div>
  )
}
