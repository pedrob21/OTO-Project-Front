import { useId, type InputHTMLAttributes } from 'react'
import styles from './CampoTexto.module.css'

type CampoTextoProps = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string
  erro?: string
}

export function CampoTexto({ rotulo, erro, id, ...props }: CampoTextoProps) {
  const idGerado = useId()
  const idCampo = id ?? idGerado
  const idErro = `${idCampo}-erro`

  return (
    <div className={styles.campo}>
      <label htmlFor={idCampo} className={styles.rotulo}>
        {rotulo}
      </label>
      <input
        id={idCampo}
        className={styles.entrada}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        {...props}
      />
      {erro && (
        <p id={idErro} className={styles.erro}>
          {erro}
        </p>
      )}
    </div>
  )
}
