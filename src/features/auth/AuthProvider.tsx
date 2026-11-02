import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buscarUsuarioLogado, entrar as chamarLogin } from '@/api/auth'
import { definirAoExpirarSessao } from '@/api/client'
import { lerToken, limparSessao, salvarSessao } from '@/api/sessao'
import { AuthContext, type Auth } from './AuthContext'

const CHAVE_USUARIO = ['usuario-logado']

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [temSessao, setTemSessao] = useState(() => lerToken() !== null)
  const [sessaoExpirou, setSessaoExpirou] = useState(false)

  const consulta = useQuery({
    queryKey: CHAVE_USUARIO,
    queryFn: ({ signal }) => buscarUsuarioLogado(signal),
    enabled: temSessao,
  })

  // Limpa o cache junto: respostas de um usuário não podem aparecer para o próximo.
  const encerrar = useCallback(() => {
    limparSessao()
    queryClient.clear()
    setTemSessao(false)
  }, [queryClient])

  useEffect(() => {
    definirAoExpirarSessao(() => {
      encerrar()
      setSessaoExpirou(true)
    })
    return () => definirAoExpirarSessao(null)
  }, [encerrar])

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const { token, expiraEm, usuario } = await chamarLogin({ email, senha })
      if (!token || !expiraEm) throw new Error('Resposta de login sem token.')
      salvarSessao({ token, expiraEm })
      queryClient.setQueryData(CHAVE_USUARIO, usuario)
      setSessaoExpirou(false)
      setTemSessao(true)
    },
    [queryClient],
  )

  const sair = useCallback(() => {
    encerrar()
    setSessaoExpirou(false)
  }, [encerrar])

  const { data: usuario, isError, refetch } = consulta

  const auth = useMemo<Auth>(() => {
    let estado: Auth['estado'] = 'carregando'
    if (!temSessao) estado = 'anonimo'
    else if (usuario) estado = 'autenticado'
    else if (isError) estado = 'erro'

    return {
      estado,
      usuario: temSessao ? (usuario ?? null) : null,
      sessaoExpirou,
      entrar,
      sair,
      tentarNovamente: () => void refetch(),
    }
  }, [temSessao, usuario, isError, sessaoExpirou, entrar, sair, refetch])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
