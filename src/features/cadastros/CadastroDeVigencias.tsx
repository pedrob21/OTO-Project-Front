import { useQuery, type QueryKey } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import { formatarData } from '@/lib/formatos'
import styles from './Cadastros.module.css'
import { formDosCampos, pedidoDosCampos, type DefCampo, type FormDeCampos } from './campos'
import { Confirmacao } from '@/components/ui/Confirmacao'
import type { ErrosDoFormulario, RegraDoCampo } from './falhaDaApi'
import { FormularioDeCampos } from './FormularioDeCampos'
import { SituacaoDaVigencia } from './SituacaoDaVigencia'
import { useMutacaoCadastro } from './useMutacaoCadastro'
import { ordenarPorVigencia, situacaoDaVigencia } from './vigencias'

type Vigencia = { id?: number; vigenteDesde?: string }

type CadastroDeVigenciasProps<T extends Vigencia, TPedido> = {
  /** título do cartão e legenda da tabela */
  titulo: string
  subtitulo?: string
  /** "Parâmetros" → "Parâmetros a partir de 01/01/2027 incluídos." */
  nome: { texto: string; feminino?: boolean; plural?: boolean }
  chave: QueryKey
  listar: (signal: AbortSignal) => Promise<T[]>
  criar: (pedido: TPedido) => Promise<T>
  alterar: (id: number, pedido: TPedido) => Promise<T>
  excluir: (id: number) => Promise<void>
  campos: DefCampo[]
  validar?: (form: FormDeCampos) => ErrosDoFormulario
  regras?: RegraDoCampo[]
  /** colunas entre "Vigente desde" e "Situação" */
  colunas: ColunaTabela<T>[]
  hoje: string
  /** explicação no diálogo de correção, como a regra da publicação */
  avisoDaCorrecao: string
  vazio: { titulo: string; descricao?: string }
}

type Edicao<T> = { tipo: 'nova' } | { tipo: 'corrigir'; item: T } | { tipo: 'excluir'; item: T }

/** Lista de vigências (a partir de uma data), com inclusão, correção e exclusão. */
export function CadastroDeVigencias<T extends Vigencia, TPedido>({
  titulo,
  subtitulo,
  nome,
  chave,
  listar,
  criar,
  alterar,
  excluir,
  campos,
  validar,
  regras,
  colunas,
  hoje,
  avisoDaCorrecao,
  vazio,
}: CadastroDeVigenciasProps<T, TPedido>) {
  const [edicao, setEdicao] = useState<Edicao<T> | null>(null)
  const [aviso, setAviso] = useState('')
  const lista = useQuery({ queryKey: chave, queryFn: ({ signal }) => listar(signal) })

  const fechar = () => setEdicao(null)
  const terminacao = `${nome.feminino ? 'a' : 'o'}${nome.plural ? 's' : ''}`
  const descrever = (item: { vigenteDesde?: string }, acao: string) =>
    `${nome.texto} a partir de ${formatarData(item.vigenteDesde)} ${acao}${terminacao}.`

  const salvar = useMutacaoCadastro({
    acao: (form: FormDeCampos) => {
      const pedido = pedidoDosCampos(campos, form) as TPedido
      return edicao?.tipo === 'corrigir' ? alterar(edicao.item.id ?? 0, pedido) : criar(pedido)
    },
    invalidar: [chave],
    regras,
    aoConcluir: (salvo) => {
      setAviso(descrever(salvo, edicao?.tipo === 'nova' ? 'incluíd' : 'corrigid'))
      fechar()
    },
  })

  const exclusao = useMutacaoCadastro({
    acao: (item: T) => excluir(item.id ?? 0),
    invalidar: [chave],
    aoConcluir: (_, item) => {
      setAviso(descrever(item, 'excluíd'))
      fechar()
    },
  })

  function abrir(nova: Edicao<T>) {
    salvar.reset()
    exclusao.reset()
    setAviso('')
    setEdicao(nova)
  }

  const todas: ColunaTabela<T>[] = [
    { titulo: 'Vigente desde', celula: (linha) => formatarData(linha.vigenteDesde) },
    ...colunas,
    {
      titulo: 'Situação',
      celula: (linha) => (
        <SituacaoDaVigencia situacao={situacaoDaVigencia(linha, lista.data ?? [], hoje)} />
      ),
    },
  ]

  return (
    <>
      <p role="status" className={styles.aviso}>
        {aviso}
      </p>

      <Card
        titulo={titulo}
        subtitulo={subtitulo}
        acao={<Button onClick={() => abrir({ tipo: 'nova' })}>Nova vigência</Button>}
      >
        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <ErroApi
            mensagem="Não foi possível carregar as vigências."
            detalhe={lista.error.message}
            aoTentarNovamente={() => void lista.refetch()}
          />
        ) : (
          <Tabela
            legenda={titulo}
            colunas={todas}
            linhas={ordenarPorVigencia(lista.data)}
            chave={(linha) => linha.id ?? 0}
            vazio={vazio}
            acoes={(linha) => (
              <>
                <Button
                  variante="secundaria"
                  aria-label={`Corrigir a vigência de ${formatarData(linha.vigenteDesde)}`}
                  onClick={() => abrir({ tipo: 'corrigir', item: linha })}
                >
                  Corrigir
                </Button>
                <Button
                  variante="secundaria"
                  aria-label={`Excluir a vigência de ${formatarData(linha.vigenteDesde)}`}
                  onClick={() => abrir({ tipo: 'excluir', item: linha })}
                >
                  Excluir
                </Button>
              </>
            )}
          />
        )}
      </Card>

      {(edicao?.tipo === 'nova' || edicao?.tipo === 'corrigir') && (
        <Dialogo
          titulo={
            edicao.tipo === 'nova'
              ? `Nova vigência: ${nome.texto}`
              : `Corrigir a vigência de ${formatarData(edicao.item.vigenteDesde)}`
          }
          descricao={
            edicao.tipo === 'nova'
              ? 'As vigências anteriores continuam valendo para os períodos delas.'
              : avisoDaCorrecao
          }
          largura="larga"
          aoFechar={fechar}
        >
          <FormularioDeCampos
            campos={campos}
            inicial={formDosCampos(campos, edicao.tipo === 'corrigir' ? edicao.item : {}, {
              vigenteDesde: hoje,
            })}
            validar={validar}
            rotuloEnviar={edicao.tipo === 'nova' ? 'Incluir vigência' : 'Salvar correção'}
            enviando={salvar.isPending}
            falha={salvar.falha}
            aoEnviar={(form) => salvar.mutate(form)}
            aoCancelar={fechar}
          />
        </Dialogo>
      )}

      {edicao?.tipo === 'excluir' && (
        <Confirmacao
          titulo="Excluir vigência"
          mensagem={`Excluir a vigência a partir de ${formatarData(edicao.item.vigenteDesde)}? Não dá para desfazer.`}
          rotuloConfirmar="Excluir"
          enviando={exclusao.isPending}
          falha={exclusao.falha?.mensagem}
          aoConfirmar={() => exclusao.mutate(edicao.item)}
          aoCancelar={fechar}
        />
      )}
    </>
  )
}
