import { type ReactNode, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import comum from '../comum.module.css'

type ConfirmacaoProps = {
  id: string
  titulo: string
  children: ReactNode
  rotuloConfirmar: string
  ocupado: boolean
  aoConfirmar: () => void
  /** quem abriu a confirmação devolve o foco ao botão que a abriu */
  aoVoltar: () => void
}

/** Confirmação na própria página, para ações que não se desfazem sozinhas. Recebe o foco ao abrir. */
export function Confirmacao({
  id,
  titulo,
  children,
  rotuloConfirmar,
  ocupado,
  aoConfirmar,
  aoVoltar,
}: ConfirmacaoProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div
      id={id}
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-texto`}
      className={comum.confirmacao}
    >
      <h3 id={`${id}-titulo`} className={comum.tituloConfirmacao}>
        {titulo}
      </h3>
      <p id={`${id}-texto`}>{children}</p>
      <div className={comum.acoes}>
        <Button disabled={ocupado} onClick={aoConfirmar}>
          {rotuloConfirmar}
        </Button>
        <Button variante="secundaria" onClick={aoVoltar}>
          Voltar
        </Button>
      </div>
    </div>
  )
}
