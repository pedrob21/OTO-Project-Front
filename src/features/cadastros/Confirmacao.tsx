import { Button } from '@/components/ui/Button'
import { Dialogo } from '@/components/ui/Dialogo'
import styles from './Cadastros.module.css'

type ConfirmacaoProps = {
  titulo: string
  mensagem: string
  rotuloConfirmar: string
  enviando: boolean
  /** erro da API, como o registro em uso */
  falha?: string
  aoConfirmar: () => void
  aoCancelar: () => void
}

/** O foco começa em Cancelar, a opção que não apaga nada. */
export function Confirmacao({
  titulo,
  mensagem,
  rotuloConfirmar,
  enviando,
  falha,
  aoConfirmar,
  aoCancelar,
}: ConfirmacaoProps) {
  return (
    <Dialogo titulo={titulo} descricao={mensagem} aoFechar={aoCancelar}>
      <div className={styles.formulario}>
        {falha && (
          <p role="alert" className={styles.falha}>
            {falha}
          </p>
        )}
        <div className={styles.acoesFormulario}>
          <Button variante="secundaria" onClick={aoCancelar}>
            Cancelar
          </Button>
          <Button onClick={aoConfirmar} disabled={enviando}>
            {enviando ? 'Excluindo…' : rotuloConfirmar}
          </Button>
        </div>
      </div>
    </Dialogo>
  )
}
