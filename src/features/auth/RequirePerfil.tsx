import { Navigate, Outlet, useLocation } from 'react-router'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import type { Perfil } from '@/types/dominio'
import { useAuth } from './AuthContext'

type RequirePerfilProps = {
  /** sem a lista, basta estar logado */
  perfis?: Perfil[]
}

/** Só organiza a navegação: quem barra de verdade é a API, com 401 e 403. */
export function RequirePerfil({ perfis }: RequirePerfilProps) {
  const { estado, usuario, tentarNovamente } = useAuth()
  const location = useLocation()

  if (estado === 'carregando') return <Carregando />
  if (estado === 'erro') {
    return (
      <ErroApi
        mensagem="Não foi possível carregar seus dados de acesso."
        aoTentarNovamente={tentarNovamente}
      />
    )
  }
  if (estado === 'anonimo') return <Navigate to="/login" replace state={{ de: location }} />

  if (perfis && !perfis.some((perfil) => perfil === usuario?.perfil)) {
    return (
      <EstadoVazio
        titulo="Sem permissão para esta página"
        descricao="Se precisar deste acesso, fale com a equipe do OTO."
      />
    )
  }

  return <Outlet />
}
