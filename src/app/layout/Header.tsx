import { useId, useState, type KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router'
import logoOto from '@/assets/logo-oto.png'
import logoPrefeitura from '@/assets/logo-prefeitura-olimpia.png'
import { IconeFechar, IconeMenu } from '@/components/icons'
import styles from './Header.module.css'
import { NavMenu } from './NavMenu'
import { UserMenu } from './UserMenu'

/**
 * Em telas largas, o menu fica em linha. Em celular e tablet, vira um painel aberto pelo botão
 * "Menu", que fecha ao trocar de página ou com Esc.
 */
export function Header() {
  const { pathname } = useLocation()
  // guarda a página em que o menu foi aberto: em outra página, ele já aparece fechado
  const [abertoEm, setAbertoEm] = useState<string | null>(null)
  const menuAberto = abertoEm === pathname
  const idMenu = useId()

  function setMenuAberto(aberto: boolean) {
    setAbertoEm(aberto ? pathname : null)
  }

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key === 'Escape' && menuAberto) {
      setMenuAberto(false)
      document.getElementById(`${idMenu}-botao`)?.focus()
    }
  }

  return (
    <header className={styles.cabecalho} onKeyDown={aoTeclar}>
      <Link to="/" className={styles.logoOto}>
        <img src={logoOto} alt="OTO" width={112} height={70} />
      </Link>
      <img
        src={logoPrefeitura}
        alt="Prefeitura de Olímpia"
        width={196}
        height={63}
        className={styles.logoPrefeitura}
      />
      <button
        id={`${idMenu}-botao`}
        type="button"
        className={styles.botaoMenu}
        aria-expanded={menuAberto}
        aria-controls={idMenu}
        onClick={() => setMenuAberto(!menuAberto)}
      >
        {menuAberto ? <IconeFechar tamanho={20} /> : <IconeMenu tamanho={20} />}
        Menu
      </button>
      <div id={idMenu} className={styles.navegacao} data-aberto={menuAberto}>
        <NavMenu />
      </div>
      <UserMenu />
    </header>
  )
}
