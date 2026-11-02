import { Badge } from '@/components/ui/Badge'
import { VariacaoBadge } from '@/components/ui/VariacaoBadge'
import { formatarMesAno, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { partesDoPeriodo, textoDoPeriodo } from '../periodo'
import { FaixaRegua } from './FaixaRegua'
import styles from './TaxaOcupacaoDestaque.module.css'

type TaxaOcupacaoDestaqueProps = {
  resultado: Esquemas['ResultadoResponse']
  faixas: Esquemas['FaixaRef'][]
  comparativo?: Esquemas['Comparativo']
}

export function TaxaOcupacaoDestaque({
  resultado,
  faixas,
  comparativo,
}: TaxaOcupacaoDestaqueProps) {
  const { campanha, taxaOcupacao, faixa, qtdMhRespondentes } = resultado
  const periodo = textoDoPeriodo(campanha)
  const mes = partesDoPeriodo(campanha?.periodoInicio)?.mes
  const referencia = mes && comparativo?.ano ? formatarMesAno(mes, comparativo.ano) : undefined

  return (
    <section className={styles.destaque}>
      <div className={styles.taxa}>
        <h2 className={styles.titulo}>
          Taxa de ocupação hoteleira{periodo ? ` em ${periodo}` : ''}
        </h2>
        <div className={styles.valores}>
          <p className={styles.numero}>{formatarPercentual(taxaOcupacao)}</p>
          <div className={styles.situacao}>
            {faixa?.nome && <Badge variante="faixa">Faixa {faixa.nome.toLowerCase()}</Badge>}
            <span className={styles.variacao}>
              <VariacaoBadge
                valor={comparativo?.diferencaTaxaPontos}
                unidade="pontos"
                referencia={referencia}
              />
            </span>
          </div>
        </div>
        <p className={styles.nota}>
          Média ponderada pelas UH dos {qtdMhRespondentes} meios de hospedagem que responderam.
        </p>
      </div>

      <div className={styles.faixas}>
        <h3 className={styles.tituloFaixas}>Faixas de classificação</h3>
        <FaixaRegua faixas={faixas} taxa={taxaOcupacao} faixaAtual={faixa?.codigo} />
      </div>
    </section>
  )
}
