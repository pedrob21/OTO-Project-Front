import { useState } from 'react'
import { GraficoLinhasMensal } from '@/components/charts/GraficoLinhasMensal'
import { Card } from '@/components/ui/Card'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatarMes, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { seriesDeOcupacao, textoDosAnos } from '../ocupacaoMensal'
import styles from './OcupacaoMensalCard.module.css'

type Visao = 'grafico' | 'tabela'

const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: 'grafico', rotulo: 'Gráfico' },
  { valor: 'tabela', rotulo: 'Tabela' },
]
const MESES = Array.from({ length: 12 }, (_, indice) => indice)

export function OcupacaoMensalCard({ serie }: { serie: Esquemas['SerieMensalResponse'] }) {
  const [visao, setVisao] = useState<Visao>('grafico')
  const series = seriesDeOcupacao(serie)
  const anos = textoDosAnos(series)

  return (
    <Card
      className={styles.cartao}
      titulo="Taxa de ocupação mensal"
      subtitulo={`Consolidado mensal dos meios de hospedagem regulares${anos ? `, ${anos}` : ''}`}
      acao={
        <SegmentedControl
          rotulo="Visualização da taxa de ocupação mensal"
          valor={visao}
          opcoes={VISOES}
          aoMudar={setVisao}
        />
      }
    >
      {series.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há taxas mensais publicadas"
          descricao="O gráfico aparece aqui depois da primeira publicação."
        />
      ) : visao === 'grafico' ? (
        <>
          <ul className={styles.legenda}>
            {series.map(({ nome, cor }, indice) => (
              <li key={nome} className={indice === 0 ? styles.itemPrincipal : styles.item}>
                <span className={styles.traco} style={{ background: cor }} />
                {nome}
              </li>
            ))}
          </ul>
          <GraficoLinhasMensal series={series} rotulo={`Taxa de ocupação mensal, ${anos}`} />
        </>
      ) : (
        <table className={styles.tabela}>
          <caption className={styles.legendaTabela}>Taxa de ocupação por mês, {anos}</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              {series.map(({ nome }) => (
                <th key={nome} scope="col">
                  {nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MESES.map((mes) => (
              <tr key={mes}>
                <th scope="row">{formatarMes(mes + 1)}</th>
                {series.map(({ nome, valores }) => (
                  <td key={nome}>{formatarPercentual(valores[mes])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className={styles.fonte}>
        Fonte: pesquisas consolidadas mensais com os meios de hospedagem.
      </p>
    </Card>
  )
}
