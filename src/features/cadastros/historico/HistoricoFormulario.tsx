import { useId, useState } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import type { Esquemas } from '@/types/dominio'
import styles from '../Cadastros.module.css'
import { CampoDoFormulario } from '../CampoDoFormulario'
import { errosVisiveis, type FalhaDaApi } from '../falhaDaApi'
import { Formulario } from '../Formulario'
import {
  CAMPO_ANO,
  CAMPO_FONTE,
  CAMPO_OBSERVACAO,
  campoDoValor,
  errosDoHistorico,
  formDoHistorico,
  INDICADORES,
  MESES,
  MODALIDADES,
  type FormHistorico,
} from './historico'

type HistoricoFormularioProps = {
  item?: Esquemas['HistoricoResponse']
  referencias: Esquemas['Referencias'] | undefined
  enviando: boolean
  falha: FalhaDaApi | null
  aoEnviar: (form: FormHistorico) => void
  aoCancelar: () => void
}

export function HistoricoFormulario({
  item,
  referencias,
  enviando,
  falha,
  aoEnviar,
  aoCancelar,
}: HistoricoFormularioProps) {
  const [form, setForm] = useState(() => formDoHistorico(item))
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const id = useId()
  const erros = errosVisiveis(errosDoHistorico(form), tentouEnviar, falha)

  function mudar<C extends keyof FormHistorico>(campo: C, valor: FormHistorico[C]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function enviar() {
    setTentouEnviar(true)
    if (Object.keys(errosDoHistorico(form)).length === 0) aoEnviar(form)
  }

  const selecao = (
    campo: 'mes' | 'feriadoCodigo',
    rotulo: string,
    opcoes: { valor: string; rotulo: string }[],
  ) => (
    <div>
      <Select
        rotulo={rotulo}
        variante="campo"
        valor={form[campo]}
        opcoes={[{ valor: '', rotulo: 'Escolha' }, ...opcoes]}
        aoMudar={(valor) => mudar(campo, valor)}
        aria-invalid={erros[campo] ? true : undefined}
        aria-describedby={erros[campo] ? `${id}-${campo}` : undefined}
      />
      {erros[campo] && (
        <p id={`${id}-${campo}`} className={styles.erroCampo}>
          {erros[campo]}
        </p>
      )}
    </div>
  )

  const texto = (campo: typeof CAMPO_ANO, nome: 'ano' | 'valor' | 'observacao' | 'fonte') => (
    <CampoDoFormulario
      campo={campo}
      valor={form[nome]}
      erro={erros[nome]}
      aoMudar={(valor) => mudar(nome, valor)}
    />
  )

  return (
    <Formulario
      aoEnviar={enviar}
      aoCancelar={aoCancelar}
      enviando={enviando}
      rotuloEnviar={item ? 'Salvar correção' : 'Gravar valor'}
      falha={falha?.mensagem}
    >
      <div className={styles.grade}>
        <Select
          rotulo="Indicador"
          variante="campo"
          valor={form.indicador}
          opcoes={INDICADORES}
          aoMudar={(valor) => mudar('indicador', valor as FormHistorico['indicador'])}
        />
        <Select
          rotulo="Modalidade"
          variante="campo"
          valor={form.modalidade}
          opcoes={MODALIDADES}
          aoMudar={(valor) => mudar('modalidade', valor as FormHistorico['modalidade'])}
        />
        <Select
          rotulo="Tipo de hospedagem"
          variante="campo"
          valor={form.tipoHospedagemCodigo}
          opcoes={[
            { valor: '', rotulo: 'Geral da cidade' },
            ...(referencias?.tiposHospedagem ?? []).map(({ codigo = '', nome = '' }) => ({
              valor: codigo,
              rotulo: nome,
            })),
          ]}
          aoMudar={(valor) => mudar('tipoHospedagemCodigo', valor)}
        />
      </div>
      <div className={styles.grade}>
        <SegmentedControl
          rotulo="Período"
          rotuloVisivel
          valor={form.periodo}
          opcoes={[
            { valor: 'MES', rotulo: 'Mensal' },
            { valor: 'FERIADO', rotulo: 'Feriado ou evento' },
          ]}
          aoMudar={(valor) => mudar('periodo', valor)}
        />
        {form.periodo === 'MES'
          ? selecao('mes', 'Mês', MESES)
          : selecao(
              'feriadoCodigo',
              'Feriado',
              (referencias?.feriados ?? []).map(({ codigo = '', nome = '' }) => ({
                valor: codigo,
                rotulo: nome,
              })),
            )}
        {texto(CAMPO_ANO, 'ano')}
        {texto(campoDoValor(form.indicador), 'valor')}
        {texto(CAMPO_OBSERVACAO, 'observacao')}
        {texto(CAMPO_FONTE, 'fonte')}
      </div>
    </Formulario>
  )
}
