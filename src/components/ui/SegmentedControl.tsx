import { useId } from 'react'
import styles from './SegmentedControl.module.css'

type OpcaoSegmento<T extends string> = { valor: T; rotulo: string }

type SegmentedControlProps<T extends string> = {
  rotulo: string
  valor: T
  opcoes: OpcaoSegmento<T>[]
  aoMudar: (valor: T) => void
  /** mostra o rótulo acima das opções, como nos formulários */
  rotuloVisivel?: boolean
  desativado?: boolean
}

/** Rádios nativos: as setas do teclado trocam a opção sem código extra. */
export function SegmentedControl<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  rotuloVisivel = false,
  desativado = false,
}: SegmentedControlProps<T>) {
  const nome = useId()

  const botoes = opcoes.map((opcao) => (
    <label key={opcao.valor} className={styles.opcao}>
      <input
        type="radio"
        className={styles.radio}
        name={nome}
        value={opcao.valor}
        checked={opcao.valor === valor}
        onChange={() => aoMudar(opcao.valor)}
      />
      <span className={styles.texto}>{opcao.rotulo}</span>
    </label>
  ))

  if (!rotuloVisivel) {
    return (
      <fieldset className={styles.grupo} disabled={desativado}>
        <legend className={styles.legenda}>{rotulo}</legend>
        {botoes}
      </fieldset>
    )
  }

  return (
    <fieldset className={styles.comRotulo} disabled={desativado}>
      <legend className={styles.legendaVisivel}>{rotulo}</legend>
      <div className={styles.grupo}>{botoes}</div>
    </fieldset>
  )
}
