import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { alterarEstabelecimento, buscarEstabelecimento } from '@/api/estabelecimentos'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { formatarData, formatarInteiro } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import type { DefCampo } from '@/features/cadastros/campos'
import { EstabelecimentoFormulario } from '@/features/cadastros/estabelecimentos/EstabelecimentoFormulario'
import {
  CAMPOS_SECRETARIA,
  EXIGENCIAS_CADASTUR,
  GRUPOS_DADOS,
  pedidoDeAlteracao,
  REGRAS_ESTABELECIMENTO,
  type FormEstabelecimento,
} from '@/features/cadastros/estabelecimentos/estabelecimentos'
import { useMutacaoCadastro } from '@/features/cadastros/useMutacaoCadastro'
import { CapacidadeDoEstabelecimento } from './CapacidadeDoEstabelecimento'
import { CHAVE_ESTABELECIMENTOS } from './chaves'
import cadastros from '@/features/cadastros/Cadastros.module.css'
import styles from './MeuEstabelecimentoCard.module.css'

type Item = { rotulo: string; valor: string }

const NAO_INFORMADO = '—'

function sim(valor: boolean | undefined) {
  return valor === undefined ? NAO_INFORMADO : valor ? 'Sim' : 'Não'
}

function valorDoCampo(campo: DefCampo, bruto: unknown): string {
  if (bruto === undefined || bruto === null || bruto === '') return NAO_INFORMADO
  if (campo.tipo === 'data') return formatarData(String(bruto))
  if (campo.tipo === 'hora') return String(bruto).slice(0, 5)
  if (campo.tipo === 'inteiro') return formatarInteiro(Number(bruto))
  return String(bruto)
}

function itensDoGrupo(campos: DefCampo[], dados: Record<string, unknown>): Item[] {
  return campos.map((campo) => ({
    rotulo: campo.rotulo,
    valor: valorDoCampo(campo, dados[campo.nome.slice(campo.nome.indexOf('.') + 1)]),
  }))
}

function Lista({ titulo, itens }: { titulo: string; itens: Item[] }) {
  return (
    <section className={styles.grupo} aria-label={titulo}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <dl className={styles.lista}>
        {itens.map((item) => (
          <div key={item.rotulo} className={styles.item}>
            <dt>{item.rotulo}</dt>
            <dd>{item.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function DadosEmLeitura({
  estabelecimento,
  nomeDoTipo,
}: {
  estabelecimento: Esquemas['EstabelecimentoResponse']
  nomeDoTipo: (codigo: string | undefined) => string
}) {
  const dados: Record<string, unknown> = estabelecimento.dados ?? {}
  const secretaria: Esquemas['DadosSecretaria'] | undefined = estabelecimento.secretaria
  const { cadastrais, endereco, contato, cadastur, funcionamento } = GRUPOS_DADOS
  const exigencia = EXIGENCIAS_CADASTUR.find((opcao) => opcao.valor === dados.cadasturExigencia)

  return (
    <div className={styles.grupos}>
      <Lista titulo={cadastrais.titulo} itens={itensDoGrupo(cadastrais.campos, dados)} />
      <Lista titulo={endereco.titulo} itens={itensDoGrupo(endereco.campos, dados)} />
      <Lista titulo={contato.titulo} itens={itensDoGrupo(contato.campos, dados)} />
      <Lista
        titulo={cadastur.titulo}
        itens={[
          {
            rotulo: 'Exigência do Cadastur',
            valor: exigencia?.valor ? exigencia.rotulo : NAO_INFORMADO,
          },
          { rotulo: 'Possui Cadastur', valor: sim(dados.possuiCadastur as boolean | undefined) },
          ...itensDoGrupo(cadastur.campos, dados),
        ]}
      />
      <Lista
        titulo={funcionamento.titulo}
        itens={[
          {
            rotulo: 'Funciona 24 horas',
            valor: sim(dados.funcionamento24h as boolean | undefined),
          },
          ...itensDoGrupo(funcionamento.campos, dados),
        ]}
      />
      <Lista
        titulo="Dados da Secretaria"
        itens={[
          { rotulo: 'Tipo de hospedagem', valor: nomeDoTipo(secretaria?.tipoHospedagemCodigo) },
          {
            rotulo: 'Situação',
            valor: secretaria?.situacao === 'IRREGULAR' ? 'Irregular' : 'Regular',
          },
          { rotulo: 'Aceita participar das pesquisas', valor: sim(secretaria?.aceitaPesquisas) },
          ...itensDoGrupo(CAMPOS_SECRETARIA, { ...secretaria }),
        ]}
      />
      <p className={styles.ajuda}>
        Os dados da Secretaria só a equipe do OTO altera. Para corrigir algum deles, fale com o OTO.
      </p>
    </div>
  )
}

type MeuEstabelecimentoCardProps = {
  resumo: Esquemas['EstabelecimentoResumo']
  nomeDoTipo: (codigo: string | undefined) => string
  hoje: string
}

export function MeuEstabelecimentoCard({ resumo, nomeDoTipo, hoje }: MeuEstabelecimentoCardProps) {
  const id = resumo.id ?? 0
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState('')
  const detalhe = useQuery({
    queryKey: [...CHAVE_ESTABELECIMENTOS, id],
    queryFn: ({ signal }) => buscarEstabelecimento(id, signal),
  })

  const salvar = useMutacaoCadastro({
    acao: (form: FormEstabelecimento) => alterarEstabelecimento(id, pedidoDeAlteracao(form, true)),
    invalidar: [CHAVE_ESTABELECIMENTOS],
    regras: REGRAS_ESTABELECIMENTO,
    aoConcluir: () => {
      setAviso('Dados atualizados.')
      setEditando(false)
    },
  })

  function abrir() {
    salvar.reset()
    setAviso('')
    setEditando(true)
  }

  return (
    <Card
      titulo={resumo.nomeFantasia}
      subtitulo={nomeDoTipo(resumo.tipoHospedagemCodigo)}
      acao={
        <span className={styles.acoes}>
          {!resumo.ativo && <Badge variante="inativa">Inativo</Badge>}
          <Button
            variante="secundaria"
            aria-label={`Editar dados de ${resumo.nomeFantasia}`}
            disabled={!detalhe.data}
            onClick={abrir}
          >
            Editar dados
          </Button>
        </span>
      }
    >
      <p role="status" className={cadastros.aviso}>
        {aviso}
      </p>
      {detalhe.isPending ? (
        <Carregando texto="Carregando o cadastro" />
      ) : detalhe.isError ? (
        <ErroApi
          mensagem="Não foi possível carregar o cadastro."
          detalhe={detalhe.error.message}
          aoTentarNovamente={() => void detalhe.refetch()}
        />
      ) : (
        <div className={styles.grupos}>
          <DadosEmLeitura estabelecimento={detalhe.data} nomeDoTipo={nomeDoTipo} />
          <CapacidadeDoEstabelecimento id={id} nome={resumo.nomeFantasia} hoje={hoje} />
        </div>
      )}

      {editando && detalhe.data && (
        <Dialogo
          titulo={`Editar dados de ${resumo.nomeFantasia}`}
          descricao="Os dados da Secretaria e a capacidade não entram aqui."
          largura="larga"
          aoFechar={() => setEditando(false)}
        >
          <EstabelecimentoFormulario
            estabelecimento={detalhe.data}
            somenteDados
            hoje={hoje}
            enviando={salvar.isPending}
            falha={salvar.falha}
            aoEnviar={(form) => salvar.mutate(form)}
            aoCancelar={() => setEditando(false)}
          />
        </Dialogo>
      )}
    </Card>
  )
}
