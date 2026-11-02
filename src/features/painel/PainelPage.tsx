import { useAuth } from '@/features/auth/AuthContext'

// Provisório até a T06.
export function PainelPage() {
  const { usuario } = useAuth()

  return (
    <>
      <h1 style={{ font: 'var(--tipo-titulo-pagina)' }}>Painel de indicadores do turismo</h1>
      <p>Entrou como {usuario?.nome}</p>
    </>
  )
}
