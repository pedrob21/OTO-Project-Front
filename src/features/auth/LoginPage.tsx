import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, type Location } from 'react-router'
import { ErroRequisicao } from '@/api/erros'
import logoOto from '@/assets/logo-oto.png'
import logoPrefeitura from '@/assets/logo-prefeitura-olimpia.png'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Carregando } from '@/components/ui/Carregando'
import { useAuth } from './AuthContext'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { estado, entrar, sessaoExpirou } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const login = useMutation({
    mutationFn: () => entrar(email, senha),
  })

  if (estado === 'carregando') return <Carregando />
  if (estado === 'autenticado') {
    const destino = (location.state as { de?: Location } | null)?.de
    return <Navigate to={destino ?? '/'} replace />
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    login.mutate()
  }

  const erro = login.error instanceof ErroRequisicao ? login.error : null
  const camposComErro = Object.keys(erro?.campos ?? {}).length > 0
  // com erro por campo, a mensagem geral ("Corrija os campos") não acrescenta nada
  const mensagem = login.error && !camposComErro ? login.error.message : null

  return (
    <main className={styles.pagina}>
      <div className={styles.logos}>
        <img src={logoOto} alt="OTO" width={96} />
        <img src={logoPrefeitura} alt="Prefeitura de Olímpia" width={148} />
      </div>

      <form className={styles.formulario} onSubmit={enviar} noValidate>
        <h1 className={styles.titulo}>Entrar no painel</h1>

        {sessaoExpirou && !login.isError && (
          <p role="status" className={styles.aviso}>
            Sua sessão expirou. Entre novamente para continuar.
          </p>
        )}
        {mensagem && (
          <p role="alert" className={styles.erro}>
            {mensagem}
          </p>
        )}

        <CampoTexto
          rotulo="E-mail"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          erro={erro?.campos.email}
          onChange={(evento) => setEmail(evento.target.value)}
        />
        <CampoTexto
          rotulo="Senha"
          type="password"
          name="senha"
          autoComplete="current-password"
          required
          value={senha}
          erro={erro?.campos.senha}
          onChange={(evento) => setSenha(evento.target.value)}
        />

        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>

        <p className={styles.ajuda}>Esqueceu a senha? Peça um novo link à equipe do OTO.</p>
      </form>
    </main>
  )
}
