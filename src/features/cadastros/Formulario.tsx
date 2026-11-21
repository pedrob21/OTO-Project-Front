import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import styles from './Cadastros.module.css'

type FormularioProps = {
  aoEnviar: () => void
  aoCancelar: () => void
  enviando: boolean
  rotuloEnviar: string
  /** erro da API que não é de um campo */
  falha?: string
  children: ReactNode
}

export function Formulario({
  aoEnviar,
  aoCancelar,
  enviando,
  rotuloEnviar,
  falha,
  children,
}: FormularioProps) {
  function enviar(evento: FormEvent) {
    evento.preventDefault()
    aoEnviar()
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {falha && (
        <p role="alert" className={styles.falha}>
          {falha}
        </p>
      )}
      {children}
      <div className={styles.acoesFormulario}>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Salvando…' : rotuloEnviar}
        </Button>
        <Button variante="secundaria" onClick={aoCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
