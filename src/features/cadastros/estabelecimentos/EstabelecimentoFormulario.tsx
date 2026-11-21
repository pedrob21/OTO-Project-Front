import { useState } from 'react'
import { Select } from '@/components/ui/Select'
import type { Esquemas } from '@/types/dominio'
import styles from '../Cadastros.module.css'
import { CampoDoFormulario } from '../CampoDoFormulario'
import type { DefCampo } from '../campos'
import { errosVisiveis, type FalhaDaApi } from '../falhaDaApi'
import { Formulario } from '../Formulario'
import {
  CAMPOS_CAPACIDADE,
  CAMPOS_SECRETARIA,
  errosDoEstabelecimento,
  EXIGENCIAS_CADASTUR,
  formDoEstabelecimento,
  GRUPOS_DADOS,
  SITUACOES,
  type FormEstabelecimento,
} from './estabelecimentos'

type EstabelecimentoFormularioProps = {
  estabelecimento?: Esquemas['EstabelecimentoResponse']
  tipos: Esquemas['TipoRef'][]
  hoje: string
  enviando: boolean
  falha: FalhaDaApi | null
  aoEnviar: (form: FormEstabelecimento) => void
  aoCancelar: () => void
}

export function EstabelecimentoFormulario({
  estabelecimento,
  tipos,
  hoje,
  enviando,
  falha,
  aoEnviar,
  aoCancelar,
}: EstabelecimentoFormularioProps) {
  const [form, setForm] = useState(() => formDoEstabelecimento(estabelecimento, hoje))
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const novo = estabelecimento === undefined
  const erros = errosVisiveis(errosDoEstabelecimento(form, novo), tentouEnviar, falha)

  const mudar = (nome: string, valor: string | boolean) =>
    setForm((atual) => ({ ...atual, [nome]: valor }))

  const campo = (def: DefCampo) => (
    <CampoDoFormulario
      key={def.nome}
      campo={def}
      valor={String(form[def.nome] ?? '')}
      erro={erros[def.nome]}
      aoMudar={(valor) => mudar(def.nome, valor)}
    />
  )

  const marcacao = (nome: string, rotulo: string) => (
    <label className={styles.marcacao}>
      <input
        type="checkbox"
        checked={form[nome] === true}
        onChange={(evento) => mudar(nome, evento.target.checked)}
      />
      {rotulo}
    </label>
  )

  function enviar() {
    setTentouEnviar(true)
    if (Object.keys(errosDoEstabelecimento(form, novo)).length === 0) aoEnviar(form)
  }

  const { cadastrais, endereco, contato, cadastur, funcionamento } = GRUPOS_DADOS

  return (
    <Formulario
      aoEnviar={enviar}
      aoCancelar={aoCancelar}
      enviando={enviando}
      rotuloEnviar={novo ? 'Cadastrar estabelecimento' : 'Salvar'}
      falha={falha?.mensagem}
    >
      {[cadastrais, endereco, contato].map((grupo) => (
        <fieldset key={grupo.titulo} className={styles.grupo}>
          <legend className={styles.legenda}>{grupo.titulo}</legend>
          <div className={styles.grade}>{grupo.campos.map(campo)}</div>
        </fieldset>
      ))}

      <fieldset className={styles.grupo}>
        <legend className={styles.legenda}>{cadastur.titulo}</legend>
        <div className={styles.grade}>
          <Select
            rotulo="Exigência do Cadastur"
            variante="campo"
            valor={String(form['dados.cadasturExigencia'])}
            opcoes={EXIGENCIAS_CADASTUR}
            aoMudar={(valor) => mudar('dados.cadasturExigencia', valor)}
          />
          {cadastur.campos.map(campo)}
          <div className={styles.largo}>{marcacao('dados.possuiCadastur', 'Possui Cadastur')}</div>
        </div>
      </fieldset>

      <fieldset className={styles.grupo}>
        <legend className={styles.legenda}>{funcionamento.titulo}</legend>
        <div className={styles.grade}>
          <Select
            rotulo="Funciona 24 horas"
            variante="campo"
            valor={String(form['dados.funcionamento24h'])}
            opcoes={[
              { valor: '', rotulo: 'Não informado' },
              { valor: 'SIM', rotulo: 'Sim' },
              { valor: 'NAO', rotulo: 'Não' },
            ]}
            aoMudar={(valor) => mudar('dados.funcionamento24h', valor)}
          />
          {funcionamento.campos.map(campo)}
        </div>
      </fieldset>

      <fieldset className={styles.grupo}>
        <legend className={styles.legenda}>Dados da Secretaria</legend>
        <p className={styles.ajuda}>
          Só a equipe do OTO vê e altera. Estabelecimento irregular fica fora das pesquisas e dos
          cálculos.
        </p>
        <div className={styles.grade}>
          <div>
            <Select
              rotulo="Tipo de hospedagem"
              variante="campo"
              valor={String(form['secretaria.tipoHospedagemCodigo'])}
              opcoes={[
                { valor: '', rotulo: 'Escolha o tipo' },
                ...tipos.map(({ codigo = '', nome = '' }) => ({ valor: codigo, rotulo: nome })),
              ]}
              aoMudar={(valor) => mudar('secretaria.tipoHospedagemCodigo', valor)}
              required
              aria-invalid={erros['secretaria.tipoHospedagemCodigo'] ? true : undefined}
              aria-describedby={
                erros['secretaria.tipoHospedagemCodigo'] ? 'erro-tipo-hospedagem' : undefined
              }
            />
            {erros['secretaria.tipoHospedagemCodigo'] && (
              <p id="erro-tipo-hospedagem" className={styles.erroCampo}>
                {erros['secretaria.tipoHospedagemCodigo']}
              </p>
            )}
          </div>
          <Select
            rotulo="Situação"
            variante="campo"
            valor={String(form['secretaria.situacao'])}
            opcoes={SITUACOES}
            aoMudar={(valor) => mudar('secretaria.situacao', valor)}
          />
          {CAMPOS_SECRETARIA.map(campo)}
          <div className={styles.largo}>
            {marcacao('secretaria.aceitaPesquisas', 'Aceita participar das pesquisas')}
          </div>
        </div>
      </fieldset>

      {novo && (
        <fieldset className={styles.grupo}>
          <legend className={styles.legenda}>Capacidade inicial</legend>
          <p className={styles.ajuda}>
            Depois do cadastro, mudanças de UH e leitos entram como nova vigência, em Capacidades.
          </p>
          <div className={styles.grade}>{CAMPOS_CAPACIDADE.map(campo)}</div>
        </fieldset>
      )}
    </Formulario>
  )
}
