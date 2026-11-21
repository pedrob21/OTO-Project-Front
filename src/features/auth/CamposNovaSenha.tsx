import { CampoTexto } from '@/components/ui/CampoTexto'
import { SENHA_MINIMA, type ErrosNovaSenha } from './senha'

type CamposNovaSenhaProps = {
  novaSenha: string
  confirmacao: string
  erros: ErrosNovaSenha
  aoMudarNovaSenha: (valor: string) => void
  aoMudarConfirmacao: (valor: string) => void
}

export function CamposNovaSenha({
  novaSenha,
  confirmacao,
  erros,
  aoMudarNovaSenha,
  aoMudarConfirmacao,
}: CamposNovaSenhaProps) {
  return (
    <>
      <CampoTexto
        rotulo="Nova senha"
        type="password"
        name="novaSenha"
        autoComplete="new-password"
        required
        ajuda={`Use pelo menos ${SENHA_MINIMA} caracteres.`}
        value={novaSenha}
        erro={erros.novaSenha}
        onChange={(evento) => aoMudarNovaSenha(evento.target.value)}
      />
      <CampoTexto
        rotulo="Confirmar senha"
        type="password"
        name="confirmacao"
        autoComplete="new-password"
        required
        value={confirmacao}
        erro={erros.confirmacao}
        onChange={(evento) => aoMudarConfirmacao(evento.target.value)}
      />
    </>
  )
}
