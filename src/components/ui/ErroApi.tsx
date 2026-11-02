import { Button } from './Button'
import styles from './Estados.module.css'

type ErroApiProps = {
  /** o que não pôde ser feito, como "Não foi possível carregar a taxa de ocupação." */
  mensagem: string
  /** detalhe vindo da API (campo `detail` do Problem Details) */
  detalhe?: string
  aoTentarNovamente?: () => void
}

export function ErroApi({ mensagem, detalhe, aoTentarNovamente }: ErroApiProps) {
  return (
    <div role="alert" className={styles.estado}>
      <p className={styles.titulo}>{mensagem}</p>
      {detalhe && <p>{detalhe}</p>}
      {aoTentarNovamente && (
        <div className={styles.acao}>
          <Button variante="secundaria" onClick={aoTentarNovamente}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}
