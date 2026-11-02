import { useId } from 'react'
import styles from './SegmentedControl.module.css'

type OpcaoSegmento<T extends string> = { valor: T; rotulo: string }

type SegmentedControlProps<T extends string> = {
  rotulo: string
  valor: T
  opcoes: OpcaoSegmento<T>[]
  aoMudar: (valor: T) => void
}

/** Rádios nativos: as setas do teclado trocam a opção sem código extra. */
export function SegmentedControl<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: SegmentedControlProps<T>) {
  const nome = useId()

  return (
    <fieldset className={styles.grupo}>
      <legend className={styles.legenda}>{rotulo}</legend>
      {opcoes.map((opcao) => (
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
      ))}
    </fieldset>
  )
}
