import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'

// Provisório até a T05 e a T06: confirma o login e permite sair.
export function PainelPage() {
  const { usuario, sair } = useAuth()

  return (
    <main style={{ display: 'grid', justifyItems: 'start', gap: 16, padding: 32 }}>
      <h1 style={{ font: 'var(--tipo-titulo-pagina)' }}>Painel de indicadores do turismo</h1>
      <p>Entrou como {usuario?.nome}</p>
      <Button variante="secundaria" onClick={sair}>
        Sair
      </Button>
    </main>
  )
}
