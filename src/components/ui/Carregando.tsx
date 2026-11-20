import styles from './Estados.module.css'

export function Carregando({ texto = 'Carregando dados' }: { texto?: string }) {
  return (
    <p role="status" className={styles.estado}>
      {texto}
    </p>
  )
}
