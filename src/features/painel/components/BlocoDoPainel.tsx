import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'

type BlocoDoPainelProps = {
  titulo: string
  /** o que não pôde ser carregado, como "Não foi possível carregar a taxa de ocupação." */
  mensagemDeErro: string
  consultas: UseQueryResult[]
  className?: string
  children: ReactNode
}

/** Dá a cada bloco o seu carregando e o seu erro: a falha de um não derruba os outros. */
export function BlocoDoPainel({
  titulo,
  mensagemDeErro,
  consultas,
  className,
  children,
}: BlocoDoPainelProps) {
  const falha = consultas.find((consulta) => consulta.isError)
  const carregando = consultas.some((consulta) => consulta.isPending)

  if (!falha && !carregando) return <>{children}</>

  return (
    <Card titulo={titulo} className={className}>
      {falha ? (
        <ErroApi
          mensagem={mensagemDeErro}
          detalhe={falha.error?.message}
          aoTentarNovamente={() => void falha.refetch()}
        />
      ) : (
        <Carregando />
      )}
    </Card>
  )
}
