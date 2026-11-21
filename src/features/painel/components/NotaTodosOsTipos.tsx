import styles from './NotaTodosOsTipos.module.css'

/** Com um tipo escolhido no filtro, avisa que este indicador não é separado por tipo (D2). */
export function NotaTodosOsTipos({ className }: { className?: string }) {
  return (
    <p className={`${styles.nota} ${className ?? ''}`}>
      Todos os tipos de hospedagem: este indicador não é separado por tipo.
    </p>
  )
}
