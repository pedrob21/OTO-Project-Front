import type { ReactNode } from 'react'
import { EstadoVazio } from './EstadoVazio'
import styles from './Tabela.module.css'

export type ColunaTabela<T> = {
  titulo: string
  celula: (linha: T) => ReactNode
  /** alinha à direita, com algarismos de mesma largura */
  numerica?: boolean
}

type TabelaProps<T> = {
  /** vira o caption, só para leitores de tela */
  legenda: string
  /** a primeira coluna identifica a linha e vira cabeçalho dela */
  colunas: ColunaTabela<T>[]
  linhas: T[]
  chave: (linha: T) => string | number
  vazio: { titulo: string; descricao?: string }
  acoes?: (linha: T) => ReactNode
}

export function Tabela<T>({ legenda, colunas, linhas, chave, vazio, acoes }: TabelaProps<T>) {
  if (linhas.length === 0) return <EstadoVazio titulo={vazio.titulo} descricao={vazio.descricao} />

  const classe = (coluna: ColunaTabela<T>) => (coluna.numerica ? styles.numero : undefined)

  return (
    <div className={styles.rolagem}>
      <table className={styles.tabela}>
        <caption className={styles.oculto}>{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.titulo} scope="col" className={classe(coluna)}>
                {coluna.titulo}
              </th>
            ))}
            {acoes && (
              <th scope="col" className={styles.acoes}>
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={chave(linha)}>
              {colunas.map((coluna, indice) =>
                indice === 0 ? (
                  <th key={coluna.titulo} scope="row" className={classe(coluna)}>
                    {coluna.celula(linha)}
                  </th>
                ) : (
                  <td key={coluna.titulo} className={classe(coluna)}>
                    {coluna.celula(linha)}
                  </td>
                ),
              )}
              {acoes && (
                <td className={styles.acoes}>
                  <div className={styles.botoes}>{acoes(linha)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
