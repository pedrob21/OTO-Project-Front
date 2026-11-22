import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useId, useRef, useState, type RefObject } from 'react'
import { listarDiariasInformadas, salvarDiariasInformadas } from '@/api/resultados'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { Confirmacao } from '@/components/ui/Confirmacao'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import { Formulario } from '@/features/cadastros/Formulario'
import type { FalhaDaApi } from '@/features/cadastros/falhaDaApi'
import { useMutacaoCadastro } from '@/features/cadastros/useMutacaoCadastro'
import { capitalizar, formatarDataHora } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import comum from '../comum.module.css'
import {
  GERAL,
  fonteAtual,
  linhasDeDiarias,
  pedidoDeDiarias,
  ultimaAlteracao,
  validarDiaria,
  type LinhaDiaria,
} from '../diarias'
import { lerNumero, paraCampo, textoDaDiaria } from '../respostas'
import styles from './DiariasInformadas.module.css'

type Edicao = { tipo: 'informar' | 'remover'; linha: LinhaDiaria }
type Informadas = Esquemas['DiariaInformadaResponse'][]

type DiariasInformadasProps = Readonly<{
  campanhaId: number
  publicada: boolean
  resultado: Esquemas['ResultadoResponse'] | undefined
  tipos: Esquemas['TipoRef'][]
}>

const COLUNAS: ColunaTabela<LinhaDiaria>[] = [
  {
    titulo: 'Recorte',
    celula: (linha) => (linha.codigo === GERAL ? 'Geral (todos os tipos)' : linha.nome),
  },
  {
    titulo: 'Diária informada',
    numerica: true,
    celula: (linha) =>
      linha.informada === null ? 'Não informada' : textoDaDiaria(linha.informada),
  },
  {
    titulo: 'Usada na prévia',
    numerica: true,
    celula: (linha) => (
      <>
        {textoDaDiaria(linha.naPrevia)}
        {linha.naPrevia !== null && (
          <span className={comum.secundario}>
            {linha.informada === null ? 'média das respostas' : 'informada pela equipe'}
          </span>
        )}
      </>
    ),
  },
]

function rotuloDaAcao(linha: LinhaDiaria) {
  return linha.informada === null ? 'Informar' : 'Corrigir'
}

function notaDaLista(informadas: Informadas) {
  if (informadas.length === 0) {
    return 'Nenhuma diária informada. O cálculo usa a média das respostas.'
  }
  const fonte = fonteAtual(informadas)
  const origem = fonte ? `Fonte: ${fonte}. ` : ''
  return `${origem}Última alteração em ${formatarDataHora(ultimaAlteracao(informadas))}.`
}

function ajudaDaDiaria(linha: LinhaDiaria) {
  if (linha.informada === null && linha.naPrevia !== null) {
    return `Média das respostas na prévia: ${textoDaDiaria(linha.naPrevia)}.`
  }
  return 'Use vírgula ou ponto, com até duas casas, como 410,50.'
}

type AcoesDaLinhaProps = Readonly<{
  linha: LinhaDiaria
  id: string
  aoAbrir: (tipo: Edicao['tipo'], linha: LinhaDiaria) => void
}>

function AcoesDaLinha({ linha, id, aoAbrir }: AcoesDaLinhaProps) {
  const rotulo = rotuloDaAcao(linha)
  return (
    <>
      <Button
        id={id}
        variante="secundaria"
        aria-haspopup="dialog"
        aria-label={`${rotulo} ${linha.rotulo}`}
        onClick={() => aoAbrir('informar', linha)}
      >
        {rotulo}
      </Button>
      {linha.informada !== null && (
        <Button
          variante="secundaria"
          aria-haspopup="dialog"
          aria-label={`Remover ${linha.rotulo}`}
          onClick={() => aoAbrir('remover', linha)}
        >
          Remover
        </Button>
      )}
    </>
  )
}

type ListaDeDiariasProps = Readonly<{
  consulta: UseQueryResult<Informadas>
  linhas: (informadas: Informadas) => LinhaDiaria[]
  publicada: boolean
  idPrincipal: (linha: LinhaDiaria) => string
  aoAbrir: (tipo: Edicao['tipo'], linha: LinhaDiaria) => void
}>

function ListaDeDiarias({
  consulta,
  linhas,
  publicada,
  idPrincipal,
  aoAbrir,
}: ListaDeDiariasProps) {
  if (consulta.isError) {
    return (
      <ErroApi
        mensagem="Não foi possível carregar as diárias informadas."
        detalhe={consulta.error.message}
        aoTentarNovamente={() => void consulta.refetch()}
      />
    )
  }
  if (consulta.isPending) return <Carregando texto="Carregando as diárias informadas" />

  return (
    <>
      <p className={styles.nota}>{notaDaLista(consulta.data)}</p>
      <Tabela
        legenda="Diárias informadas pela equipe"
        colunas={COLUNAS}
        linhas={linhas(consulta.data)}
        chave={(linha) => linha.codigo || 'geral'}
        vazio={{ titulo: 'Nenhum tipo de hospedagem cadastrado' }}
        acoes={
          publicada
            ? undefined
            : (linha) => <AcoesDaLinha linha={linha} id={idPrincipal(linha)} aoAbrir={aoAbrir} />
        }
      />
    </>
  )
}

type DialogoDeDiariaProps = Readonly<{
  linha: LinhaDiaria
  diaria: string
  fonte: string
  erro: string | undefined
  campo: RefObject<HTMLInputElement | null>
  enviando: boolean
  falha: FalhaDaApi | null
  aoMudarDiaria: (valor: string) => void
  aoMudarFonte: (valor: string) => void
  aoEnviar: () => void
  aoFechar: () => void
}>

function DialogoDeDiaria({
  linha,
  diaria,
  fonte,
  erro,
  campo,
  enviando,
  falha,
  aoMudarDiaria,
  aoMudarFonte,
  aoEnviar,
  aoFechar,
}: DialogoDeDiariaProps) {
  return (
    <Dialogo
      titulo={`${rotuloDaAcao(linha)} ${linha.rotulo}`}
      descricao="Vale no cálculo no lugar da média das respostas até ser removida."
      aoFechar={aoFechar}
    >
      <Formulario
        aoEnviar={aoEnviar}
        aoCancelar={aoFechar}
        enviando={enviando}
        rotuloEnviar="Salvar"
        falha={falha?.mensagem}
      >
        <CampoTexto
          ref={campo}
          rotulo="Diária média (R$)"
          inputMode="decimal"
          autoComplete="off"
          value={diaria}
          onChange={(evento) => aoMudarDiaria(evento.target.value)}
          erro={erro}
          ajuda={ajudaDaDiaria(linha)}
        />
        <CampoTexto
          rotulo="Fonte (opcional)"
          maxLength={200}
          value={fonte}
          onChange={(evento) => aoMudarFonte(evento.target.value)}
          ajuda="Vale para todas as diárias informadas desta campanha."
        />
      </Formulario>
    </Dialogo>
  )
}

/** RF-18 a RF-21: a diária digitada pela equipe substitui a média das respostas no cálculo. */
export function DiariasInformadas({
  campanhaId,
  publicada,
  resultado,
  tipos,
}: DiariasInformadasProps) {
  const prefixo = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')
  const [diaria, setDiaria] = useState('')
  const [fonte, setFonte] = useState('')
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const chave = ['campanhas', campanhaId, 'diarias']
  const consulta = useQuery({
    queryKey: chave,
    queryFn: ({ signal }) => listarDiariasInformadas(campanhaId, signal),
  })
  const informadas = consulta.data ?? []

  const idPrincipal = (linha: LinhaDiaria) => `${prefixo}-${linha.codigo || 'geral'}`
  const fechar = () => setEdicao(null)

  const salvar = useMutacaoCadastro({
    acao: ({ linha, valor }: { linha: LinhaDiaria; valor: number | null }) =>
      salvarDiariasInformadas(campanhaId, pedidoDeDiarias(informadas, linha.codigo, valor, fonte)),
    invalidar: [chave, ['campanhas', campanhaId, 'previa']],
    aoConcluir: (_, { linha, valor }) => {
      setAviso(
        valor === null
          ? `${capitalizar(linha.rotulo)} removida. O cálculo volta a usar a média das respostas.`
          : `${capitalizar(linha.rotulo)} salva. A prévia já usa o novo valor.`,
      )
      fechar()
      document.getElementById(idPrincipal(linha))?.focus()
    },
  })

  function abrir(tipo: Edicao['tipo'], linha: LinhaDiaria) {
    salvar.reset()
    setAviso('')
    setDiaria(paraCampo(linha.informada))
    setFonte(fonteAtual(informadas))
    setTentouEnviar(false)
    setEdicao({ tipo, linha })
  }

  function enviar(linha: LinhaDiaria) {
    setTentouEnviar(true)
    if (validarDiaria(diaria)) {
      campo.current?.focus()
      return
    }
    salvar.mutate({ linha, valor: lerNumero(diaria) })
  }

  return (
    <Card
      titulo="Diárias informadas pela equipe"
      subtitulo={
        publicada
          ? 'A campanha já foi publicada. Cancele a publicação para mudar as diárias.'
          : 'A diária digitada substitui a média das respostas no cálculo da receita. Sem ela, vale a média das respostas ponderada pelos leitos.'
      }
    >
      <div className={styles.bloco}>
        <ListaDeDiarias
          consulta={consulta}
          linhas={(lista) => linhasDeDiarias(tipos, lista, resultado)}
          publicada={publicada}
          idPrincipal={idPrincipal}
          aoAbrir={abrir}
        />

        {aviso && <output className={comum.sucesso}>{aviso}</output>}
      </div>

      {!publicada && edicao?.tipo === 'informar' && (
        <DialogoDeDiaria
          linha={edicao.linha}
          diaria={diaria}
          fonte={fonte}
          erro={tentouEnviar ? validarDiaria(diaria) : undefined}
          campo={campo}
          enviando={salvar.isPending}
          falha={salvar.falha}
          aoMudarDiaria={setDiaria}
          aoMudarFonte={setFonte}
          aoEnviar={() => enviar(edicao.linha)}
          aoFechar={fechar}
        />
      )}

      {!publicada && edicao?.tipo === 'remover' && (
        <Confirmacao
          titulo={`Remover ${edicao.linha.rotulo}?`}
          mensagem="O cálculo volta a usar a média das respostas."
          rotuloConfirmar="Remover"
          rotuloEnviando="Removendo…"
          enviando={salvar.isPending}
          falha={salvar.falha?.mensagem}
          aoConfirmar={() => salvar.mutate({ linha: edicao.linha, valor: null })}
          aoCancelar={fechar}
        />
      )}
    </Card>
  )
}
