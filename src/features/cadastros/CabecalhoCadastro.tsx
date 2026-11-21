import type { ReactNode } from 'react'
import styles from './Cadastros.module.css'

type CabecalhoCadastroProps = {
  titulo: string
  introducao: ReactNode
  /** acima do título; padrão "Cadastros" */
  sobrelinha?: ReactNode
}

export function CabecalhoCadastro({
  titulo,
  introducao,
  sobrelinha = 'Cadastros',
}: CabecalhoCadastroProps) {
  return (
    <div className={styles.titulos}>
      <p className={styles.sobrelinha}>{sobrelinha}</p>
      <h1 className={styles.titulo}>{titulo}</h1>
      <p className={styles.introducao}>{introducao}</p>
    </div>
  )
}
