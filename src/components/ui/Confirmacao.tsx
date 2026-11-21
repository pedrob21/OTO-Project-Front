import { Button } from './Button'
import styles from './Confirmacao.module.css'
import { Dialogo } from './Dialogo'

type ConfirmacaoProps = {
  titulo: string
  mensagem: string
  rotuloConfirmar: string
  /** texto do botão enquanto a ação roda */
  rotuloEnviando?: string
  enviando: boolean
  /** erro da API, como o registro em uso */
  falha?: string
  aoConfirmar: () => void
  aoCancelar: () => void
}

/** O foco começa em Cancelar, a opção que não muda nada. */
export function Confirmacao({
  titulo,
  mensagem,
  rotuloConfirmar,
  rotuloEnviando = 'Excluindo…',
  enviando,
  falha,
  aoConfirmar,
  aoCancelar,
}: ConfirmacaoProps) {
  return (
    <Dialogo titulo={titulo} descricao={mensagem} aoFechar={aoCancelar}>
      <div className={styles.corpo}>
        {falha && (
          <p role="alert" className={styles.falha}>
            {falha}
          </p>
        )}
        <div className={styles.acoes}>
          <Button variante="secundaria" onClick={aoCancelar}>
            Cancelar
          </Button>
          <Button onClick={aoConfirmar} disabled={enviando}>
            {enviando ? rotuloEnviando : rotuloConfirmar}
          </Button>
        </div>
      </div>
    </Dialogo>
  )
}
