import { Link } from 'react-router'
import logoOto from '@/assets/logo-oto.png'
import logoPrefeitura from '@/assets/logo-prefeitura-olimpia.png'
import styles from './Header.module.css'
import { NavMenu } from './NavMenu'
import { UserMenu } from './UserMenu'

export function Header() {
  return (
    <header className={styles.cabecalho}>
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
      <NavMenu />
      <UserMenu />
    </header>
  )
}
