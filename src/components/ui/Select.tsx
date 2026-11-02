import { useId, type SelectHTMLAttributes } from 'react'
import { IconeSetaBaixo } from '@/components/icons'
import styles from './Select.module.css'

export type OpcaoSelect = { valor: string; rotulo: string }

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange' | 'children'
> & {
  rotulo: string
  valor: string
  opcoes: OpcaoSelect[]
  aoMudar: (valor: string) => void
}

/** Select nativo: teclado, leitor de tela e celular funcionam sem código extra. */
export function Select({ rotulo, valor, opcoes, aoMudar, className, id, ...props }: SelectProps) {
  const idGerado = useId()
  const idSelect = id ?? idGerado

  return (
    <div className={className ? `${styles.campo} ${className}` : styles.campo}>
      <label htmlFor={idSelect} className={styles.rotulo}>
        {rotulo}
      </label>
      <div className={styles.controle}>
        <select
          id={idSelect}
          className={styles.select}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          {...props}
        >
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
        <IconeSetaBaixo tamanho={40} strokeWidth={1.8} className={styles.seta} />
      </div>
    </div>
  )
}
