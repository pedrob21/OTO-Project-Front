import { useState, type ReactNode } from 'react'
import styles from './Cadastros.module.css'
import { CampoDoFormulario } from './CampoDoFormulario'
import { errosDosCampos, type DefCampo, type FormDeCampos } from './campos'
import { errosVisiveis, type ErrosDoFormulario, type FalhaDaApi } from './falhaDaApi'
import { Formulario } from './Formulario'

type FormularioDeCamposProps = {
  campos: DefCampo[]
  inicial: FormDeCampos
  /** regras entre campos, além das de cada campo */
  validar?: (form: FormDeCampos) => ErrosDoFormulario
  rotuloEnviar: string
  enviando: boolean
  falha: FalhaDaApi | null
  aoEnviar: (form: FormDeCampos) => void
  aoCancelar: () => void
  /** conteúdo depois dos campos, como uma explicação */
  children?: ReactNode
}

/** Formulário só de campos de texto, em grade. */
export function FormularioDeCampos({
  campos,
  inicial,
  validar,
  rotuloEnviar,
  enviando,
  falha,
  aoEnviar,
  aoCancelar,
  children,
}: FormularioDeCamposProps) {
  const [form, setForm] = useState(inicial)
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const daTela = (atual: FormDeCampos) => ({
    ...errosDosCampos(campos, atual),
    ...validar?.(atual),
  })
  const erros = errosVisiveis(daTela(form), tentouEnviar, falha)

  function enviar() {
    setTentouEnviar(true)
    if (Object.keys(daTela(form)).length === 0) aoEnviar(form)
  }

  return (
    <Formulario
      aoEnviar={enviar}
      aoCancelar={aoCancelar}
      enviando={enviando}
      rotuloEnviar={rotuloEnviar}
      falha={falha?.mensagem}
    >
      <div className={styles.grade}>
        {campos.map((campo) => (
          <CampoDoFormulario
            key={campo.nome}
            campo={campo}
            valor={form[campo.nome] ?? ''}
            erro={erros[campo.nome]}
            aoMudar={(valor) => setForm((atual) => ({ ...atual, [campo.nome]: valor }))}
          />
        ))}
      </div>
      {children}
    </Formulario>
  )
}
