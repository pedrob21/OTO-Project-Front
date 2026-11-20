import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primaria' | 'secundaria' | 'amarela'
  iconeEsquerda?: ReactNode
  iconeDireita?: ReactNode
}

export function Button({
  variante = 'primaria',
  iconeEsquerda,
  iconeDireita,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [styles.botao, styles[variante], className].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {iconeEsquerda}
      <span>{children}</span>
      {iconeDireita}
    </button>
  )
}
