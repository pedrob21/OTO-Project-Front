import { CampoTexto } from '@/components/ui/CampoTexto'
import styles from './Cadastros.module.css'
import type { DefCampo } from './campos'

const TIPOS_DO_NAVEGADOR: Partial<Record<NonNullable<DefCampo['tipo']>, string>> = {
  data: 'date',
  hora: 'time',
  email: 'email',
}

type CampoDoFormularioProps = {
  campo: DefCampo
  valor: string
  erro?: string
  aoMudar: (valor: string) => void
}

/** Números ficam em campo de texto: o `type="number"` recusa a vírgula em vários navegadores. */
export function CampoDoFormulario({ campo, valor, erro, aoMudar }: CampoDoFormularioProps) {
  const { tipo = 'texto' } = campo
  const numerico = tipo === 'inteiro' || tipo === 'decimal'

  return (
    <CampoTexto
      rotulo={campo.rotulo}
      type={TIPOS_DO_NAVEGADOR[tipo] ?? 'text'}
      inputMode={tipo === 'inteiro' ? 'numeric' : tipo === 'decimal' ? 'decimal' : undefined}
      maxLength={numerico || tipo === 'cnpj' ? undefined : campo.maximo}
      required={campo.obrigatorio}
      value={valor}
      ajuda={campo.ajuda}
      erro={erro}
      onChange={(evento) => aoMudar(evento.target.value)}
      className={campo.largo ? styles.largo : undefined}
    />
  )
}
