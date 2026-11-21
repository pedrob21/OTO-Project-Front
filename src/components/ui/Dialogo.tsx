import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Dialogo.module.css'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type DialogoProps = {
  titulo: string
  descricao?: string
  aoFechar: () => void
  /** `larga`: para formulários com muitos campos */
  largura?: 'normal' | 'larga'
  children: ReactNode
}

/** Modal: o foco entra no primeiro campo, fica preso dentro e volta para onde estava ao fechar. */
export function Dialogo({
  titulo,
  descricao,
  aoFechar,
  largura = 'normal',
  children,
}: DialogoProps) {
  const id = useId()
  const painel = useRef<HTMLDivElement>(null)
  const corpo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anterior = document.activeElement
    const primeiro = corpo.current?.querySelector<HTMLElement>(FOCAVEIS)
    ;(primeiro ?? painel.current)?.focus()
    return () => {
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus()
    }
  }, [])

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      aoFechar()
      return
    }
    if (evento.key !== 'Tab' || !painel.current) return
    const focaveis = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
    const primeiro = focaveis[0]
    const ultimo = focaveis.at(-1)
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo?.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro?.focus()
    }
  }

  return createPortal(
    <div className={styles.fundo}>
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={descricao ? `${id}-descricao` : undefined}
        tabIndex={-1}
        className={largura === 'larga' ? `${styles.painel} ${styles.larga}` : styles.painel}
        onKeyDown={aoTeclar}
      >
        <header className={styles.cabecalho}>
          <div className={styles.textos}>
            <h2 id={`${id}-titulo`} className={styles.titulo}>
              {titulo}
            </h2>
            {descricao && (
              <p id={`${id}-descricao`} className={styles.descricao}>
                {descricao}
              </p>
            )}
          </div>
          <button type="button" className={styles.fechar} onClick={aoFechar}>
            Fechar
          </button>
        </header>
        <div ref={corpo} className={styles.corpo}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
