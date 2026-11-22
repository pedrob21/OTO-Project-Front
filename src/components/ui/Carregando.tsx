import styles from './Estados.module.css'

export function Carregando({
  texto = 'Carregando dados',
  reservarAltura = false,
}: {
  texto?: string
  reservarAltura?: boolean
}) {
  const classe = reservarAltura ? `${styles.estado} ${styles.reservarAltura}` : styles.estado
  return (
    <p role="status" className={classe}>
      {texto}
    </p>
  )
}
