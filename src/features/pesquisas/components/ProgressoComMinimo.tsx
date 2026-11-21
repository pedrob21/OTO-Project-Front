import { BarraProgresso } from '@/components/ui/BarraProgresso'
import { formatarPercentual } from '@/lib/formatos'
import styles from './ProgressoComMinimo.module.css'

type ProgressoComMinimoProps = {
  rotulo: string
  /** percentual de 0 a 100 */
  percentual: number | null | undefined
  /** "41 de 74 (55,41%)" */
  valor: string
  /** mínimo para publicar, em %. Sem ele, a barra não tem marca. */
  minimo?: number
}

/** A situação vai em texto, além da cor e da marca na barra. */
export function ProgressoComMinimo({ rotulo, percentual, valor, minimo }: ProgressoComMinimoProps) {
  const atingiu =
    minimo !== undefined && percentual !== null && percentual !== undefined
      ? percentual >= minimo
      : undefined

  return (
    <div className={styles.progresso}>
      <span className={styles.rotulo}>{rotulo}</span>
      <span className={styles.valor}>{valor}</span>
      <div className={styles.barra}>
        <BarraProgresso valor={percentual} rotulo={rotulo} />
        {minimo !== undefined && (
          <span className={styles.marca} style={{ left: `${minimo}%` }} aria-hidden="true" />
        )}
      </div>
      {minimo !== undefined && (
        <p className={styles.nota}>
          Mínimo para publicar: {formatarPercentual(minimo, Number.isInteger(minimo) ? 0 : 2)}.{' '}
          {atingiu !== undefined && (
            <span className={atingiu ? styles.atingido : styles.abaixo}>
              {atingiu ? 'Mínimo atingido.' : 'Abaixo do mínimo.'}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
