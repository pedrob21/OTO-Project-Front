import { Card } from '@/components/ui/Card'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import type { Esquemas } from '@/types/dominio'
import { corDaFaixa, faixasDaRegua, notaDeConcentracao } from '../faixas'
import { textoDoPeriodo } from '../periodo'
import styles from './FaixasOcupacaoCard.module.css'

// A maior barra ocupa 85% da largura: o restante fica para o número ao lado.
const LARGURA_MAXIMA = 85

export function FaixasOcupacaoCard({ resultado }: { resultado: Esquemas['ResultadoResponse'] }) {
  const distribuicao = resultado.distribuicaoFaixas ?? []
  const quantidades = new Map(distribuicao.map(({ codigo, qtdMh }) => [codigo, qtdMh ?? 0]))
  const maior = Math.max(...quantidades.values(), 0)
  const periodo = textoDoPeriodo(resultado.campanha)
  const nota = notaDeConcentracao(resultado.porTipo ?? [])

  return (
    <Card
      className={styles.cartao}
      titulo="Faixas de ocupação"
      subtitulo={`Meios de hospedagem por faixa${periodo ? ` em ${periodo}` : ''}`}
    >
      {distribuicao.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há respostas para distribuir"
          descricao="As faixas aparecem aqui depois da publicação da campanha."
        />
      ) : (
        <ul className={styles.lista}>
          {faixasDaRegua(distribuicao)
            .reverse()
            .map(({ codigo, nome, intervalo }) => {
              const quantidade = quantidades.get(codigo) ?? 0
              return (
                <li key={codigo} className={styles.faixa}>
                  <span className={styles.textos}>
                    <span className={styles.nome}>{nome}</span>
                    <span className={styles.intervalo}>{intervalo}</span>
                  </span>
                  <span className={styles.valores}>
                    <span
                      className={styles.barra}
                      style={{
                        width: `${maior > 0 ? (quantidade / maior) * LARGURA_MAXIMA : 0}%`,
                        background: corDaFaixa(codigo),
                      }}
                    />
                    <span className={styles.quantidade}>{quantidade}</span>
                  </span>
                </li>
              )
            })}
        </ul>
      )}

      {nota && <p className={styles.nota}>{nota}</p>}
    </Card>
  )
}
