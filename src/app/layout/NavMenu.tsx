import { NavLink } from 'react-router'
import { IconeSetaBaixo } from '@/components/icons'
import { useAuth } from '@/features/auth/AuthContext'
import { itensDoPerfil } from '@/lib/perfis'
import styles from './NavMenu.module.css'

export function NavMenu() {
  const { usuario } = useAuth()

  return (
    <nav aria-label="Principal">
      <ul className={styles.lista}>
        {itensDoPerfil(usuario?.perfil).map(({ rotulo, para, temSubmenu }) => (
          <li key={rotulo} title={para ? undefined : 'Em construção'}>
            {para ? (
              <NavLink to={para} end className={styles.link}>
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
