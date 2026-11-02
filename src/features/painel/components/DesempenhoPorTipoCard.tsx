import { Card } from '@/components/ui/Card'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import {
  capitalizar,
  formatarInteiro,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPercentual,
} from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { linhasDeDesempenho, notaDosForaDaReceita, totalDoDesempenho } from '../desempenho'
import { textoDoPeriodo } from '../periodo'
import styles from './DesempenhoPorTipoCard.module.css'

type DesempenhoPorTipoCardProps = {
  resultado: Esquemas['ResultadoResponse']
  tipos: Esquemas['TipoRef'][]
}

function estabelecimentos(quantidade: number | undefined): string {
  return `${formatarInteiro(quantidade)} ${quantidade === 1 ? 'estabelecimento' : 'estabelecimentos'}`
}

function Tipo({ nome, qtdMh }: { nome: string | undefined; qtdMh: number | undefined }) {
  return (
    <th scope="row" className={styles.celulaTipo}>
      <span className={styles.nome}>{nome}</span>
      <span className={styles.estabelecimentos}>{estabelecimentos(qtdMh)}</span>
    </th>
  )
}

function Taxa({ valor, total = false }: { valor: number | null | undefined; total?: boolean }) {
  const preenchido = Math.min(Math.max(valor ?? 0, 0), 100)

  return (
    <td className={styles.celulaTaxa}>
      <span className={styles.taxa}>
        <span className={styles.trilha} aria-hidden="true">
          <span
            className={total ? styles.preenchidoTotal : styles.preenchido}
            style={{ width: `${preenchido}%` }}
          />
        </span>
        <span className={styles.percentual}>{formatarPercentual(valor)}</span>
      </span>
    </td>
  )
}

export function DesempenhoPorTipoCard({ resultado, tipos }: DesempenhoPorTipoCardProps) {
  const porTipo = resultado.porTipo ?? []
  const linhas = linhasDeDesempenho(porTipo, tipos)
  const total = totalDoDesempenho(linhas, resultado)
  const nota = notaDosForaDaReceita(porTipo, tipos)
  const periodo = capitalizar(textoDoPeriodo(resultado.campanha))
  const temOculto = linhas.some((linha) => linha.omitido)

  return (
    <Card
      className={styles.cartao}
      titulo="Desempenho por tipo de hospedagem"
      subtitulo={`${periodo ? `${periodo} · ` : ''}diária de 1 apartamento standard para 2 adultos e 1 criança de até 12 anos`}
    >
      {linhas.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há resultados por tipo neste período"
          descricao="A tabela aparece aqui depois da publicação."
        />
      ) : (
        <>
          <table className={styles.tabela}>
            <caption className={styles.oculto}>Desempenho por tipo de hospedagem</caption>
            <colgroup>
              <col className={styles.colunaTipo} />
              <col className={styles.colunaUh} />
              <col className={styles.colunaTaxa} />
              <col className={styles.colunaDiaria} />
              <col className={styles.colunaRevpar} />
              <col className={styles.colunaReceita} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={styles.tituloTipo}>
                  Tipo
                </th>
                <th scope="col" className={styles.numero}>
                  UH
                </th>
                <th scope="col" className={styles.tituloTaxa}>
                  Taxa de ocupação
                </th>
                <th scope="col" className={styles.tituloDiaria}>
                  Diária média
                </th>
                <th scope="col" className={styles.numero}>
                  RevPAR
                </th>
                <th scope="col" className={styles.tituloReceita}>
                  Receita estimada
                </th>
              </tr>
            </thead>

            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.tipoHospedagemCodigo}>
                  <Tipo nome={linha.nome} qtdMh={linha.qtdMh} />
                  <td className={styles.numero}>{formatarInteiro(linha.qtdUh)}</td>
                  {linha.omitido ? (
                    <td colSpan={4} className={styles.celulaOculta}>
                      Valores ocultos para preservar o sigilo: poucos estabelecimentos responderam.
                    </td>
                  ) : (
                    <>
                      <Taxa valor={linha.taxaOcupacao} />
                      <td className={styles.celulaDiaria}>{formatarMoeda(linha.diariaMedia)}</td>
                      <td className={styles.numero}>{formatarMoeda(linha.revpar)}</td>
                      <td className={styles.celulaReceita}>
                        {formatarMoedaCompacta(linha.receitaEstimada)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <Tipo nome="Total" qtdMh={total.qtdMh} />
                <td className={styles.numero}>{formatarInteiro(total.qtdUh)}</td>
                <Taxa valor={total.taxaOcupacao} total />
                <td className={styles.celulaDiaria}>{formatarMoeda(total.diariaMedia)}</td>
                <td className={styles.numero}>{formatarMoeda(total.revpar)}</td>
                <td className={styles.celulaReceita}>
                  {formatarMoedaCompacta(total.receitaEstimada)}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className={styles.nota}>
            RevPAR é a diária média multiplicada pela taxa de ocupação.
            {nota && ` ${nota}`}
            {temOculto && ' A taxa do total não aparece porque há tipo oculto por sigilo.'}
          </p>
        </>
      )}
    </Card>
  )
}
