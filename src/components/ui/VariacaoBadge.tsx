import { IconeAlta, IconeBaixa } from '@/components/icons'
import { formatarVariacaoPercentual, formatarVariacaoPontos } from '@/lib/formatos'
import styles from './VariacaoBadge.module.css'

type VariacaoBadgeProps = {
  /** null quando não há com o que comparar: o componente não mostra nada */
  valor: number | null | undefined
  unidade: 'pontos' | 'percentual'
  /** período comparado, como "ago./2025" */
  referencia?: string
}

export function VariacaoBadge({ valor, unidade, referencia }: VariacaoBadgeProps) {
  if (valor === null || valor === undefined) return null

  const texto =
    unidade === 'pontos' ? formatarVariacaoPontos(valor) : formatarVariacaoPercentual(valor)
  // segue o texto arredondado: "0,0%" é neutro
  const neutro = !/^[+−]/.test(texto)
  const positivo = valor > 0
  const tom = neutro ? styles.neutro : positivo ? styles.positivo : styles.negativo

  return (
    <span className={styles.variacao}>
      <span className={`${styles.valor} ${tom}`}>
        {!neutro &&
          (positivo ? (
            <IconeAlta tamanho={14} strokeWidth={2.5} />
          ) : (
            <IconeBaixa tamanho={14} strokeWidth={2.5} />
          ))}
        {texto}
      </span>
      {referencia && <span className={styles.referencia}>vs {referencia}</span>}
    </span>
  )
}
