import { QueryClient } from '@tanstack/react-query'
import { ErroRequisicao } from '@/api/erros'

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        // erro do pedido (4xx) não melhora tentando de novo
        retry: (tentativas, erro) => {
          const definitivo =
            erro instanceof ErroRequisicao && erro.status >= 400 && erro.status < 500
          return !definitivo && tentativas < 2
        },
      },
    },
  })
}
