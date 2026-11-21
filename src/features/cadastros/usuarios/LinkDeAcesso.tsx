import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { formatarDataHora } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import styles from '../Cadastros.module.css'
import { enderecoDoLink } from './usuarios'

type LinkDeAcessoProps = {
  link: Esquemas['LinkAcesso']
  nome: string | undefined
  aoConcluir: () => void
}

export function LinkDeAcesso({ link, nome, aoConcluir }: LinkDeAcessoProps) {
  const [copia, setCopia] = useState<'copiado' | 'falhou' | null>(null)
  const endereco = enderecoDoLink(link.token ?? '')

  // Sem HTTPS, o navegador não oferece a área de transferência.
  async function copiar() {
    try {
      await navigator.clipboard.writeText(endereco)
      setCopia('copiado')
    } catch {
      setCopia('falhou')
    }
  }

  return (
    <div className={styles.formulario}>
      <p>
        {link.tipo === 'CONVITE'
          ? `Envie este link para ${nome} definir a senha do primeiro acesso. O sistema não manda e-mail.`
          : `Envie este link para ${nome} definir uma nova senha. O sistema não manda e-mail.`}
      </p>
      <CampoTexto
        rotulo="Link de acesso"
        value={endereco}
        readOnly
        onFocus={(evento) => evento.target.select()}
        ajuda={`Vale até ${formatarDataHora(link.expiraEm)} e só pode ser usado uma vez.`}
      />
      <p role="status" className={copia === 'falhou' ? styles.erroCampo : styles.aviso}>
        {copia === 'copiado' && 'Link copiado.'}
        {copia === 'falhou' && 'Não foi possível copiar. Selecione o link e copie com Ctrl+C.'}
      </p>
      <div className={styles.acoesFormulario}>
        <Button onClick={() => void copiar()}>Copiar link</Button>
        <Button variante="secundaria" onClick={aoConcluir}>
          Concluir
        </Button>
      </div>
    </div>
  )
}
