import type { ReactNode } from 'react'
import styles from './Card.module.css'

type CardProps = {
  titulo?: ReactNode
  subtitulo?: ReactNode
  /** conteúdo à direita do título, como um botão ou a alternância de visualização */
  acao?: ReactNode
  className?: string
  children?: ReactNode
}

export function Card({ titulo, subtitulo, acao, className, children }: CardProps) {
  return (
    <section className={className ? `${styles.card} ${className}` : styles.card}>
      {(titulo || acao) && (
        <header className={styles.cabecalho}>
          <div className={styles.textos}>
            {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
            {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}
