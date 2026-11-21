import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { IconeSetaBaixo } from '@/components/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { iniciais } from '@/lib/perfis'
import styles from './UserMenu.module.css'

export function UserMenu() {
  const { usuario, sair } = useAuth()
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const primeiroItem = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!aberto) return

    primeiroItem.current?.focus()

    function aoClicarFora(evento: PointerEvent) {
      if (!raiz.current?.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener('pointerdown', aoClicarFora)
    return () => document.removeEventListener('pointerdown', aoClicarFora)
  }, [aberto])

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key === 'Escape' && aberto) {
      setAberto(false)
      botao.current?.focus()
    }
    if (evento.key === 'Tab') setAberto(false)
    if (evento.key === 'ArrowDown' && !aberto) {
      evento.preventDefault()
      setAberto(true)
    }
    if ((evento.key === 'ArrowDown' || evento.key === 'ArrowUp') && aberto) {
      evento.preventDefault()
      const itens = [...(raiz.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
      const passo = evento.key === 'ArrowDown' ? 1 : -1
      const atual = itens.indexOf(document.activeElement as HTMLElement)
      itens.at((atual + passo) % itens.length)?.focus()
    }
  }

  return (
    <div ref={raiz} className={styles.raiz} onKeyDown={aoTeclar}>
      <button
        ref={botao}
        type="button"
        className={styles.chip}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {iniciais(usuario?.nome)}
        </span>
        <span className={styles.nome}>{usuario?.nome}</span>
        <IconeSetaBaixo tamanho={14} className={styles.seta} />
      </button>

      {aberto && (
        <div className={styles.painel}>
          {usuario?.email && <p className={styles.email}>{usuario.email}</p>}
          <div role="menu" aria-label="Conta">
            <Link
              ref={primeiroItem}
              to="/minha-senha"
              role="menuitem"
              className={styles.acao}
              onClick={() => setAberto(false)}
            >
              Trocar senha
            </Link>
            <button type="button" role="menuitem" className={styles.acao} onClick={sair}>
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
