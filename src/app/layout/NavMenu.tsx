import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { NavLink, useLocation } from 'react-router'
import { IconeSetaBaixo } from '@/components/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { itensDoPerfil, type ItemSubmenu } from '@/lib/perfis'
import styles from './NavMenu.module.css'

function Submenu({ rotulo, itens }: { rotulo: string; itens: ItemSubmenu[] }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const id = useId()
  const atual = itens.some((item) => pathname.startsWith(item.para))

  useEffect(() => {
    if (!aberto) return

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
  }

  // Sem destino (clique fora no Safari, que não foca links), quem fecha é o pointerdown.
  function aoSairDoFoco(evento: FocusEvent) {
    const destino = evento.relatedTarget
    if (destino instanceof Node && !raiz.current?.contains(destino)) setAberto(false)
  }

  return (
    <div ref={raiz} className={styles.raiz} onKeyDown={aoTeclar} onBlur={aoSairDoFoco}>
      <button
        ref={botao}
        type="button"
        className={atual ? `${styles.item} ${styles.atual}` : styles.item}
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((valor) => !valor)}
      >
        {rotulo}
        <IconeSetaBaixo tamanho={14} />
      </button>
      {aberto && (
        <ul id={id} className={styles.submenu}>
          {itens.map((item) => (
            <li key={item.para}>
              <NavLink
                to={item.para}
                className={styles.itemSubmenu}
                onClick={() => setAberto(false)}
              >
                {item.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function NavMenu() {
  const { usuario } = useAuth()

  return (
    <nav aria-label="Principal">
      <ul className={styles.lista}>
        {itensDoPerfil(usuario?.perfil).map(({ rotulo, para, temSubmenu, submenu }) => (
          <li key={rotulo} title={para || submenu ? undefined : 'Em construção'}>
            {submenu ? (
              <Submenu rotulo={rotulo} itens={submenu} />
            ) : para ? (
              <NavLink to={para} end={para === '/'} className={styles.link}>
                {rotulo}
              </NavLink>
            ) : (
              <button type="button" className={styles.item} disabled>
                {rotulo}
                {temSubmenu && <IconeSetaBaixo tamanho={14} />}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
