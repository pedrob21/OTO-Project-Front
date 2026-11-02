import { area, line } from 'd3-shape'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatarMes, formatarMesCurto, formatarPercentual } from '@/lib/formatos'
import styles from './GraficoLinhasMensal.module.css'
import { useLargura } from './useLargura'

export type SerieMensal = {
  /** nome na legenda e na leitura, como "2026" */
  nome: string
  /** 12 valores, de janeiro a dezembro; null = sem dado */
  valores: (number | null)[]
  /** cor do traço, como uma variável CSS */
  cor: string
}

type GraficoLinhasMensalProps = {
  /** a primeira série é a principal: leva a área e o rótulo no último ponto */
  series: SerieMensal[]
  rotulo: string
}

const ALTURA = 275
const LARGURA_INICIAL = 747
const INICIO_GRADE = 48
const PRIMEIRO_MES = 77.5
const FOLGA_DIREITA = 29
const TOPO = 14.25
const BASE = 248.5
const MARCAS_Y = [0, 25, 50, 75, 100]
const MESES = Array.from({ length: 12 }, (_, indice) => indice)
const LARGURA_LEITURA = 150

function posicaoY(valor: number): number {
  return BASE - (valor / 100) * (BASE - TOPO)
}

function temValor(valor: number | null | undefined): valor is number {
  return valor !== null && valor !== undefined
}

export function GraficoLinhasMensal({ series, rotulo }: GraficoLinhasMensalProps) {
  const { ref, largura } = useLargura<HTMLDivElement>(LARGURA_INICIAL)
  const [mesAtivo, setMesAtivo] = useState<number | null>(null)

  const passo = (largura - FOLGA_DIREITA - PRIMEIRO_MES) / 11
  const posicaoX = (mes: number) => PRIMEIRO_MES + mes * passo

  const desenharLinha = line<number | null>()
    .defined(temValor)
    .x((_, mes) => posicaoX(mes))
    .y((valor) => posicaoY(valor ?? 0))
  const desenharArea = area<number | null>()
    .defined(temValor)
    .x((_, mes) => posicaoX(mes))
    .y0(BASE)
    .y1((valor) => posicaoY(valor ?? 0))

  const principal = series[0]
  const ultimoMes = principal ? principal.valores.findLastIndex(temValor) : -1
  const ultimoValor = principal?.valores[ultimoMes]

  function aoMoverPonteiro(evento: PointerEvent<HTMLDivElement>) {
    const x = evento.clientX - evento.currentTarget.getBoundingClientRect().left
    setMesAtivo(Math.min(Math.max(Math.round((x - PRIMEIRO_MES) / passo), 0), 11))
  }

  function aoTeclar(evento: KeyboardEvent) {
    const atual = mesAtivo ?? Math.max(ultimoMes, 0)
    if (evento.key === 'ArrowRight') setMesAtivo(Math.min(atual + 1, 11))
    else if (evento.key === 'ArrowLeft') setMesAtivo(Math.max(atual - 1, 0))
    else if (evento.key === 'Escape') setMesAtivo(null)
    else return
    evento.preventDefault()
  }

  const leituraNaEsquerda = mesAtivo !== null && posicaoX(mesAtivo) + 12 + LARGURA_LEITURA > largura
  const rotuloNaEsquerda = posicaoX(ultimoMes) + 90 > largura

  return (
    <div
      ref={ref}
      className={styles.grafico}
      role="group"
      aria-label={`${rotulo}. Use as setas para percorrer os meses.`}
      tabIndex={0}
      onPointerMove={aoMoverPonteiro}
      onPointerLeave={() => setMesAtivo(null)}
      onFocus={(evento) => {
        if (evento.currentTarget.matches(':focus-visible')) setMesAtivo(Math.max(ultimoMes, 0))
      }}
      onBlur={() => setMesAtivo(null)}
      onKeyDown={aoTeclar}
    >
      <svg width={largura} height={ALTURA} aria-hidden="true" className={styles.desenho}>
        {principal && (
          <path className={styles.area} d={desenharArea(principal.valores) ?? undefined} />
        )}

        {MARCAS_Y.map((marca) => (
          <g key={marca}>
            <line
              className={marca === 0 ? styles.base : styles.grade}
              x1={INICIO_GRADE}
              x2={largura}
              y1={posicaoY(marca)}
              y2={posicaoY(marca)}
            />
            <text className={styles.marcaY} x={36} y={posicaoY(marca) + 3} textAnchor="end">
              {marca}%
            </text>
          </g>
        ))}

        {MESES.map((mes) => (
          <text
            key={mes}
            className={styles.marcaX}
            x={posicaoX(mes)}
            y={ALTURA - 6.5}
            textAnchor="middle"
          >
            {formatarMesCurto(mes + 1)}
          </text>
        ))}

        {[...series].reverse().map((serie) => (
          <path
            key={serie.nome}
            className={styles.linha}
            d={desenharLinha(serie.valores) ?? undefined}
            stroke={serie.cor}
          />
        ))}

        {principal && temValor(ultimoValor) && (
          <g>
            <circle
              cx={posicaoX(ultimoMes)}
              cy={posicaoY(ultimoValor)}
              r={5}
              fill={principal.cor}
            />
            <text
              className={styles.rotuloPonto}
              x={posicaoX(ultimoMes) + (rotuloNaEsquerda ? -11 : 11)}
              y={posicaoY(ultimoValor) - 10}
              textAnchor={rotuloNaEsquerda ? 'end' : 'start'}
            >
              <tspan className={styles.rotuloValor}>{formatarPercentual(ultimoValor)}</tspan>{' '}
              <tspan>{formatarMesCurto(ultimoMes + 1).toLowerCase()}.</tspan>
            </text>
          </g>
        )}

        {mesAtivo !== null && (
          <g>
            <line
              className={styles.guia}
              x1={posicaoX(mesAtivo)}
              x2={posicaoX(mesAtivo)}
              y1={TOPO}
              y2={BASE}
            />
            {series.map((serie) => {
              const valor = serie.valores[mesAtivo]
              return (
                temValor(valor) && (
                  <circle
                    key={serie.nome}
                    className={styles.pontoAtivo}
                    cx={posicaoX(mesAtivo)}
                    cy={posicaoY(valor)}
                    r={4}
                    fill={serie.cor}
                  />
                )
              )
            })}
          </g>
        )}
      </svg>

      {mesAtivo !== null && (
        <div
          role="status"
          className={styles.leitura}
          style={{
            width: LARGURA_LEITURA,
            left: leituraNaEsquerda
              ? posicaoX(mesAtivo) - 12 - LARGURA_LEITURA
              : posicaoX(mesAtivo) + 12,
          }}
        >
          <p className={styles.leituraMes}>{formatarMes(mesAtivo + 1)}</p>
          <ul>
            {series.map((serie) => (
              <li key={serie.nome} className={styles.leituraLinha}>
                <span className={styles.leituraTraco} style={{ background: serie.cor }} />
                <strong>{formatarPercentual(serie.valores[mesAtivo])}</strong>
                <span className={styles.leituraNome}>{serie.nome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
