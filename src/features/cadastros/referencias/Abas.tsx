import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Abas.module.css'

type AbasProps = {
  rotulo: string
  abas: string[]
  ativa: number
  aoMudar: (indice: number) => void
  /** conteúdo da aba ativa */
  children: ReactNode
}

/** Abas do padrão WAI-ARIA: as setas trocam de aba e só a ativa entra na ordem do Tab. */
export function Abas({ rotulo, abas, ativa, aoMudar, children }: AbasProps) {
  const id = useId()
  const lista = useRef<HTMLDivElement>(null)

  function aoTeclar(evento: KeyboardEvent) {
    const destinos: Record<string, number> = {
      ArrowRight: (ativa + 1) % abas.length,
      ArrowLeft: (ativa - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    }
    const destino = destinos[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    aoMudar(destino)
    lista.current?.querySelectorAll<HTMLElement>('[role="tab"]')[destino]?.focus()
  }

  return (
    <>
      <div
        ref={lista}
        role="tablist"
        aria-label={rotulo}
        className={styles.lista}
        onKeyDown={aoTeclar}
      >
        {abas.map((aba, indice) => (
          <button
            key={aba}
            type="button"
            role="tab"
            id={`${id}-aba-${indice}`}
            aria-selected={indice === ativa}
            aria-controls={`${id}-painel`}
            tabIndex={indice === ativa ? 0 : -1}
            className={styles.aba}
            onClick={() => aoMudar(indice)}
          >
            {aba}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-painel`} aria-labelledby={`${id}-aba-${ativa}`}>
        {children}
      </div>
    </>
  )
}
