import type { Esquemas } from '@/types/dominio'
import { corDaFaixa, faixasDaRegua, posicaoNaRegua } from '../faixas'
import styles from './FaixaRegua.module.css'

type FaixaReguaProps = {
  faixas: Esquemas['FaixaRef'][]
  taxa: number | null | undefined
  /** faixa da taxa, como a API informou */
  faixaAtual: string | undefined
}

export function FaixaRegua({ faixas, taxa, faixaAtual }: FaixaReguaProps) {
  return (
    <div className={styles.regua}>
      <ul className={styles.faixas}>
        {faixasDaRegua(faixas).map(({ codigo, nome, inicio, fim, intervalo }) => (
          <li
            key={codigo}
            className={styles.faixa}
            style={{ flexGrow: fim - inicio }}
            aria-current={codigo === faixaAtual ? 'true' : undefined}
          >
            <span className={styles.barra} style={{ background: corDaFaixa(codigo) }} />
            <span className={styles.nome}>{nome}</span>
            <span className={styles.intervalo}>{intervalo}</span>
          </li>
        ))}
      </ul>
      {taxa !== null && taxa !== undefined && (
        <span
          className={styles.marcador}
          style={{ left: `${posicaoNaRegua(taxa)}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
