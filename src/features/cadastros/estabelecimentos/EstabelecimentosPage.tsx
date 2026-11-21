import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import {
  alterarEstabelecimento,
  buscarEstabelecimento,
  criarEstabelecimento,
  inativarEstabelecimento,
  listarEstabelecimentos,
  reativarEstabelecimento,
} from '@/api/estabelecimentos'
import { buscarReferencias } from '@/api/referencias'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import botoes from '@/components/ui/Button.module.css'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import { hojeLocal } from '@/lib/datas'
import { formatarInteiro } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import styles from '../Cadastros.module.css'
import type { FalhaDaApi } from '../falhaDaApi'
import { useMutacaoCadastro } from '../useMutacaoCadastro'
import { EstabelecimentoFormulario } from './EstabelecimentoFormulario'
import {
  pedidoDeAlteracao,
  pedidoDeCriacao,
  REGRAS_ESTABELECIMENTO,
  type FormEstabelecimento,
} from './estabelecimentos'

const CHAVE = ['estabelecimentos']

type Resumo = Esquemas['EstabelecimentoResumo']
type Edicao = { tipo: 'novo' } | { tipo: 'editar'; resumo: Resumo }

type FormularioProps = {
  tipos: Esquemas['TipoRef'][]
  hoje: string
  enviando: boolean
  falha: FalhaDaApi | null
  aoEnviar: (form: FormEstabelecimento) => void
  aoCancelar: () => void
}

/** A lista só traz o resumo: a edição busca o cadastro completo. */
function EdicaoCarregada({ id, ...props }: FormularioProps & { id: number }) {
  const detalhe = useQuery({
    queryKey: [...CHAVE, id],
    queryFn: ({ signal }) => buscarEstabelecimento(id, signal),
  })

  if (detalhe.isPending) return <Carregando texto="Carregando o cadastro" />
  if (detalhe.isError) {
    return (
      <ErroApi
        mensagem="Não foi possível carregar o cadastro."
        detalhe={detalhe.error.message}
        aoTentarNovamente={() => void detalhe.refetch()}
      />
    )
  }
  return <EstabelecimentoFormulario estabelecimento={detalhe.data} {...props} />
}

type EstabelecimentosPageProps = {
  /** "2026-11-16". Fixa a data nos testes. */
  hoje?: string
}

export function EstabelecimentosPage({ hoje: hojeFixo }: EstabelecimentosPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')
  const estabelecimentos = useQuery({
    queryKey: CHAVE,
    queryFn: ({ signal }) => listarEstabelecimentos({}, signal),
  })
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })
  const tipos = referencias.data?.tiposHospedagem ?? []
  const nomeDoTipo = (codigo: string | undefined) =>
    tipos.find((tipo) => tipo.codigo === codigo)?.nome ?? codigo ?? '—'

  const fechar = () => setEdicao(null)

  const salvar = useMutacaoCadastro({
    acao: (form: FormEstabelecimento) =>
      edicao?.tipo === 'editar' && edicao.resumo.id !== undefined
        ? alterarEstabelecimento(edicao.resumo.id, pedidoDeAlteracao(form))
        : criarEstabelecimento(pedidoDeCriacao(form)),
    invalidar: [CHAVE],
    regras: REGRAS_ESTABELECIMENTO,
    aoConcluir: (salvo) => {
      setAviso(
        `Estabelecimento ${salvo.dados?.nomeFantasia} ${edicao?.tipo === 'novo' ? 'cadastrado' : 'alterado'}.`,
      )
      fechar()
    },
  })

  const situacao = useMutacaoCadastro({
    acao: ({ resumo, ativo }: { resumo: Resumo; ativo: boolean }) =>
      ativo ? reativarEstabelecimento(resumo.id ?? 0) : inativarEstabelecimento(resumo.id ?? 0),
    invalidar: [CHAVE],
    aoConcluir: (_, { resumo, ativo }) =>
      setAviso(`Estabelecimento ${resumo.nomeFantasia} ${ativo ? 'reativado' : 'inativado'}.`),
  })

  function limpar() {
    salvar.reset()
    situacao.reset()
    setAviso('')
  }

  const colunas: ColunaTabela<Resumo>[] = [
    { titulo: 'Nome fantasia', celula: (linha) => linha.nomeFantasia },
    { titulo: 'Tipo', celula: (linha) => nomeDoTipo(linha.tipoHospedagemCodigo) },
    { titulo: 'UH', celula: (linha) => formatarInteiro(linha.qtdUh), numerica: true },
    { titulo: 'Leitos', celula: (linha) => formatarInteiro(linha.qtdLeitos), numerica: true },
    {
      titulo: 'Situação',
      celula: (linha) => (
        <span className={styles.situacoes}>
          {linha.situacao === 'IRREGULAR' ? (
            <Badge variante="aberta">Irregular</Badge>
          ) : (
            <Badge variante="publicada">Regular</Badge>
          )}
          {!linha.ativo && <Badge variante="inativa">Inativo</Badge>}
        </span>
      ),
    },
  ]

  const propsDoFormulario = {
    tipos,
    hoje,
    enviando: salvar.isPending,
    falha: salvar.falha,
    aoEnviar: (form: FormEstabelecimento) => salvar.mutate(form),
    aoCancelar: fechar,
  }

  return (
    <>
      <CabecalhoCadastro
        titulo="Estabelecimentos"
        introducao="Meios de hospedagem do inventário. Estabelecimento inativo ou irregular fica fora das pesquisas e dos cálculos; não há exclusão, para o histórico não se perder."
      />

      <p role="status" className={styles.aviso}>
        {aviso}
      </p>
      {situacao.isError && (
        <div className={styles.falhaDaPagina}>
          <ErroApi
            mensagem={`Não foi possível ${situacao.variables.ativo ? 'reativar' : 'inativar'} ${situacao.variables.resumo.nomeFantasia}.`}
            detalhe={situacao.falha?.mensagem}
          />
        </div>
      )}
      {referencias.isError && (
        <div className={styles.falhaDaPagina}>
          <ErroApi
            mensagem="Não foi possível carregar os tipos de hospedagem."
            aoTentarNovamente={() => void referencias.refetch()}
          />
        </div>
      )}

      <Card
        titulo="Meios de hospedagem"
        acao={
          <Button
            onClick={() => {
              limpar()
              setEdicao({ tipo: 'novo' })
            }}
          >
            Novo estabelecimento
          </Button>
        }
      >
        {estabelecimentos.isPending ? (
          <Carregando texto="Carregando estabelecimentos" />
        ) : estabelecimentos.isError ? (
          <ErroApi
            mensagem="Não foi possível carregar os estabelecimentos."
            detalhe={estabelecimentos.error.message}
            aoTentarNovamente={() => void estabelecimentos.refetch()}
          />
        ) : (
          <Tabela
            legenda="Meios de hospedagem"
            colunas={colunas}
            linhas={estabelecimentos.data}
            chave={(linha) => linha.id ?? 0}
            vazio={{
              titulo: 'Nenhum estabelecimento cadastrado',
              descricao: 'Cadastre o primeiro em "Novo estabelecimento".',
            }}
            acoes={(linha) => (
              <>
                <Button
                  variante="secundaria"
                  aria-label={`Editar ${linha.nomeFantasia}`}
                  onClick={() => {
                    limpar()
                    setEdicao({ tipo: 'editar', resumo: linha })
                  }}
                >
                  Editar
                </Button>
                <Link
                  to={`/cadastros/estabelecimentos/${linha.id}/capacidades`}
                  className={`${botoes.botao} ${botoes.secundaria}`}
                  aria-label={`Capacidades de ${linha.nomeFantasia}`}
                >
                  Capacidades
                </Link>
                <Button
                  variante="secundaria"
                  aria-label={`${linha.ativo ? 'Inativar' : 'Reativar'} ${linha.nomeFantasia}`}
                  disabled={situacao.isPending}
                  onClick={() => {
                    limpar()
                    situacao.mutate({ resumo: linha, ativo: !linha.ativo })
                  }}
                >
                  {linha.ativo ? 'Inativar' : 'Reativar'}
                </Button>
              </>
            )}
          />
        )}
      </Card>

      {edicao && (
        <Dialogo
          titulo={
            edicao.tipo === 'novo' ? 'Novo estabelecimento' : `Editar ${edicao.resumo.nomeFantasia}`
          }
          descricao={
            edicao.tipo === 'novo'
              ? 'Só o nome fantasia é obrigatório nos dados cadastrais.'
              : undefined
          }
          largura="larga"
          aoFechar={fechar}
        >
          {edicao.tipo === 'novo' ? (
            <EstabelecimentoFormulario {...propsDoFormulario} />
          ) : (
            <EdicaoCarregada id={edicao.resumo.id ?? 0} {...propsDoFormulario} />
          )}
        </Dialogo>
      )}
    </>
  )
}
