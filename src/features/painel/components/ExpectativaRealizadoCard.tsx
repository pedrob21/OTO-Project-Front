import { IconeSeta } from '@/components/icons'
import { Card } from '@/components/ui/Card'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { formatarPercentual, formatarVariacaoPontos } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { dominioDeFeriados, linhasDeFeriados, posicaoNoDominio } from '../feriados'
import styles from './ExpectativaRealizadoCard.module.css'

type ExpectativaRealizadoCardProps = {
  expectativa: Esquemas['FeriadoSerie'][]
  realizado: Esquemas['FeriadoSerie'][]
  ano: number | undefined
}

function tomDaDiferenca(diferenca: number): string | undefined {
  if (Math.round(diferenca) > 0) return styles.positivo
  if (Math.round(diferenca) < 0) return styles.negativo
  return styles.neutro
}

export function ExpectativaRealizadoCard({
  expectativa,
  realizado,
  ano,
}: ExpectativaRealizadoCardProps) {
  const linhas = ano ? linhasDeFeriados(expectativa, realizado, ano) : []
  const dominio = dominioDeFeriados(linhas)
  const posicao = (valor: number) => `${posicaoNoDominio(valor, dominio)}%`

  return (
    <Card
      className={styles.cartao}
      titulo="Expectativa × realizado"
      subtitulo={`Taxa de ocupação nos feriados${ano ? ` de ${ano}` : ''}: previsão dos meios de hospedagem antes da data e resultado apurado depois`}
    >
      {linhas.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há feriados publicados neste ano"
          descricao="A comparação aparece aqui depois da primeira publicação."
        />
      ) : (
        <>
          <ul className={styles.legenda}>
            <li className={styles.itemLegenda}>
              <span className={`${styles.ponto} ${styles.pontoExpectativa} ${styles.naLegenda}`} />
              Expectativa
            </li>
            <li className={styles.itemLegenda}>
              <span className={`${styles.ponto} ${styles.pontoRealizado} ${styles.naLegenda}`} />
              Realizado
            </li>
          </ul>

          <div className={styles.grafico}>
            <div className={styles.linhaEixo} aria-hidden="true">
              <div className={styles.eixo}>
                {dominio.marcas.map((marca) => (
                  <span key={marca} className={styles.marca} style={{ left: posicao(marca) }}>
                    {marca}%
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.camadaGrade} aria-hidden="true">
              {dominio.marcas.map((marca) => (
                <span key={marca} className={styles.grade} style={{ left: posicao(marca) }} />
              ))}
            </div>

            <ul>
              {linhas.map(({ codigo, nome, expectativa: esperada, realizado: real, diferenca }) => (
                <li key={codigo} className={styles.linha}>
                  <span className={styles.nome}>{nome}</span>

                  <span className={styles.pontos} aria-hidden="true">
                    {esperada !== null && real !== null && (
                      <span
                        className={styles.conexao}
                        style={{
                          left: posicao(Math.min(esperada, real)),
                          right: `${100 - posicaoNoDominio(Math.max(esperada, real), dominio)}%`,
                        }}
                      />
                    )}
                    {esperada !== null && (
                      <span
                        className={`${styles.ponto} ${styles.pontoExpectativa}`}
                        style={{ left: posicao(esperada) }}
                      />
                    )}
                    {real !== null && (
                      <span
                        className={`${styles.ponto} ${styles.pontoRealizado}`}
                        style={{ left: posicao(real) }}
                      />
                    )}
                  </span>

                  <span className={styles.oculto}>
                    Expectativa {formatarPercentual(esperada, 0)}, realizado{' '}
                    {formatarPercentual(real, 0)}
                  </span>
                  <span className={styles.valores} aria-hidden="true">
                    <span className={styles.taxas}>
                      {formatarPercentual(esperada, 0)}
                      <IconeSeta tamanho={12} strokeWidth={2.5} />
                      {formatarPercentual(real, 0)}
                    </span>
                    {diferenca !== null && (
                      <span className={`${styles.diferenca} ${tomDaDiferenca(diferenca)}`}>
                        {formatarVariacaoPontos(diferenca, 0)}
                      </span>
                    )}
                  </span>
                  {diferenca !== null && (
                    <span className={styles.oculto}>
                      , diferença de {formatarVariacaoPontos(diferenca, 0)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Card>
  )
}
