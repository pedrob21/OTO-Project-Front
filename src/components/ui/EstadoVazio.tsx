import type { ReactNode } from 'react'
import styles from './Estados.module.css'

type EstadoVazioProps = {
  titulo: string
  descricao?: string
  acao?: ReactNode
}

export function EstadoVazio({ titulo, descricao, acao }: EstadoVazioProps) {
  return (
    <div className={styles.estado}>
      <p className={styles.titulo}>{titulo}</p>
      {descricao && <p>{descricao}</p>}
      {acao && <div className={styles.acao}>{acao}</div>}
    </div>
  )
}
