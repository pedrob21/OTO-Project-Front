import { useId, type InputHTMLAttributes } from 'react'
import styles from './CampoTexto.module.css'

type CampoTextoProps = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string
  erro?: string
  /** explicação curta sob o campo */
  ajuda?: string
}

export function CampoTexto({ rotulo, erro, ajuda, id, className, ...props }: CampoTextoProps) {
  const idGerado = useId()
  const idCampo = id ?? idGerado
  const idErro = `${idCampo}-erro`
  const idAjuda = `${idCampo}-ajuda`
  const descricao = [ajuda && idAjuda, erro && idErro].filter(Boolean).join(' ')

  return (
    <div className={className ? `${styles.campo} ${className}` : styles.campo}>
      <label htmlFor={idCampo} className={styles.rotulo}>
        {rotulo}
      </label>
      <input
        id={idCampo}
        className={styles.entrada}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao || undefined}
        {...props}
      />
      {ajuda && (
        <p id={idAjuda} className={styles.ajuda}>
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className={styles.erro}>
          {erro}
        </p>
      )}
    </div>
  )
}
