import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { definirSenha } from '@/api/auth'
import { ErroRequisicao } from '@/api/erros'
import logoOto from '@/assets/logo-oto.png'
import logoPrefeitura from '@/assets/logo-prefeitura-olimpia.png'
import { Button } from '@/components/ui/Button'
import { ErroApi } from '@/components/ui/ErroApi'
import { CamposNovaSenha } from './CamposNovaSenha'
import styles from './LoginPage.module.css'
import { validarNovaSenha, type ErrosNovaSenha } from './senha'

export function DefinirSenhaPage() {
  const token = useSearchParams()[0].get('token')
  const navigate = useNavigate()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [errosLocais, setErrosLocais] = useState<ErrosNovaSenha>({})

  const definir = useMutation({
    mutationFn: (tokenDoLink: string) => definirSenha({ token: tokenDoLink, novaSenha }),
    onSuccess: () => navigate('/login', { replace: true, state: { senhaDefinida: true } }),
  })

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const erros = validarNovaSenha(novaSenha, confirmacao)
    setErrosLocais(erros)
    if (token && Object.keys(erros).length === 0) definir.mutate(token)
  }

  const erro = definir.error instanceof ErroRequisicao ? definir.error : null
  const camposComErro = Object.keys(erro?.campos ?? {}).length > 0
  const mensagem = definir.error && !camposComErro ? definir.error.message : null

  return (
    <main className={styles.pagina}>
      <div className={styles.logos}>
        <img src={logoOto} alt="OTO" width={96} />
        <img src={logoPrefeitura} alt="Prefeitura de Olímpia" width={148} />
      </div>

      {token ? (
        <form className={styles.formulario} onSubmit={enviar} noValidate>
          <h1 className={styles.titulo}>Definir senha</h1>

          {mensagem && (
            <p role="alert" className={styles.erro}>
              {mensagem}
            </p>
          )}

          <CamposNovaSenha
            novaSenha={novaSenha}
            confirmacao={confirmacao}
            erros={{ novaSenha: erro?.campos.novaSenha, ...errosLocais }}
            aoMudarNovaSenha={setNovaSenha}
            aoMudarConfirmacao={setConfirmacao}
          />

          <Button type="submit" disabled={definir.isPending}>
            {definir.isPending ? 'Salvando…' : 'Definir senha'}
          </Button>
        </form>
      ) : (
        <div className={styles.formulario}>
          <h1 className={styles.titulo}>Definir senha</h1>
          <ErroApi
            mensagem="Link inválido."
            detalhe="O endereço não traz o código de acesso. Peça um novo link à equipe do OTO."
          />
          <Link to="/login">Ir para o login</Link>
        </div>
      )}
    </main>
  )
}
