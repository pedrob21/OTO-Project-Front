import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { trocarMinhaSenha } from '@/api/auth'
import { ErroRequisicao } from '@/api/erros'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { CamposNovaSenha } from './CamposNovaSenha'
import styles from './MinhaSenhaPage.module.css'
import { validarNovaSenha, type ErrosNovaSenha } from './senha'

export function MinhaSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [errosLocais, setErrosLocais] = useState<ErrosNovaSenha & { senhaAtual?: string }>({})

  const troca = useMutation({
    mutationFn: () => trocarMinhaSenha({ senhaAtual, novaSenha }),
    onSuccess: () => {
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
    },
  })

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    troca.reset()
    const erros = {
      ...(senhaAtual ? {} : { senhaAtual: 'Informe a senha atual.' }),
      ...validarNovaSenha(novaSenha, confirmacao),
    }
    setErrosLocais(erros)
    if (Object.keys(erros).length === 0) troca.mutate()
  }

  const erro = troca.error instanceof ErroRequisicao ? troca.error : null
  const camposComErro = Object.keys(erro?.campos ?? {}).length > 0
  const mensagem = troca.error && !camposComErro ? troca.error.message : null

  return (
    <>
      <div className={styles.titulos}>
        <p className={styles.sobrelinha}>Minha conta</p>
        <h1 className={styles.titulo}>Trocar senha</h1>
      </div>

      <Card>
        <form className={styles.formulario} onSubmit={enviar} noValidate>
          {troca.isSuccess && (
            <p role="status" className={styles.sucesso}>
              Senha alterada com sucesso.
            </p>
          )}
          {mensagem && (
            <p role="alert" className={styles.erro}>
              {mensagem}
            </p>
          )}

          <CampoTexto
            rotulo="Senha atual"
            type="password"
            name="senhaAtual"
            autoComplete="current-password"
            required
            value={senhaAtual}
            erro={errosLocais.senhaAtual ?? erro?.campos.senhaAtual}
            onChange={(evento) => setSenhaAtual(evento.target.value)}
          />
          <CamposNovaSenha
            novaSenha={novaSenha}
            confirmacao={confirmacao}
            erros={{ novaSenha: erro?.campos.novaSenha, ...errosLocais }}
            aoMudarNovaSenha={setNovaSenha}
            aoMudarConfirmacao={setConfirmacao}
          />

          <Button type="submit" disabled={troca.isPending}>
            {troca.isPending ? 'Salvando…' : 'Trocar senha'}
          </Button>
        </form>
      </Card>
    </>
  )
}
