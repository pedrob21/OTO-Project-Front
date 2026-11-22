import { useQuery } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
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

type DiariasInformadasProps = {
  campanhaId: number
  publicada: boolean
  resultado: Esquemas['ResultadoResponse'] | undefined
  tipos: Esquemas['TipoRef'][]
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

  const colunas: ColunaTabela<LinhaDiaria>[] = [
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

  const erroDaDiaria = tentouEnviar ? validarDiaria(diaria) : undefined
  const alteradaEm = ultimaAlteracao(informadas)
  const fonteDaLista = fonteAtual(informadas)

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
        {consulta.isError ? (
          <ErroApi
            mensagem="Não foi possível carregar as diárias informadas."
            detalhe={consulta.error.message}
            aoTentarNovamente={() => void consulta.refetch()}
          />
        ) : consulta.isPending ? (
          <Carregando texto="Carregando as diárias informadas" />
        ) : (
          <>
            <p className={styles.nota}>
              {informadas.length === 0
                ? 'Nenhuma diária informada. O cálculo usa a média das respostas.'
                : `${fonteDaLista ? `Fonte: ${fonteDaLista}. ` : ''}Última alteração em ${formatarDataHora(alteradaEm)}.`}
            </p>
            <Tabela
              legenda="Diárias informadas pela equipe"
              colunas={colunas}
              linhas={linhasDeDiarias(tipos, informadas, resultado)}
              chave={(linha) => linha.codigo || 'geral'}
              vazio={{ titulo: 'Nenhum tipo de hospedagem cadastrado' }}
              acoes={
                publicada
                  ? undefined
                  : (linha) => (
                      <>
                        <Button
                          id={idPrincipal(linha)}
                          variante="secundaria"
                          aria-haspopup="dialog"
                          aria-label={`${linha.informada === null ? 'Informar' : 'Corrigir'} ${linha.rotulo}`}
                          onClick={() => abrir('informar', linha)}
                        >
                          {linha.informada === null ? 'Informar' : 'Corrigir'}
                        </Button>
                        {linha.informada !== null && (
                          <Button
                            variante="secundaria"
                            aria-haspopup="dialog"
                            aria-label={`Remover ${linha.rotulo}`}
                            onClick={() => abrir('remover', linha)}
                          >
                            Remover
                          </Button>
                        )}
                      </>
                    )
              }
            />
          </>
        )}

        {aviso && (
          <p role="status" className={comum.sucesso}>
            {aviso}
          </p>
        )}
      </div>

      {!publicada && edicao?.tipo === 'informar' && (
        <Dialogo
          titulo={`${edicao.linha.informada === null ? 'Informar' : 'Corrigir'} ${edicao.linha.rotulo}`}
          descricao="Vale no cálculo no lugar da média das respostas até ser removida."
          aoFechar={fechar}
        >
          <Formulario
            aoEnviar={() => enviar(edicao.linha)}
            aoCancelar={fechar}
            enviando={salvar.isPending}
            rotuloEnviar="Salvar"
            falha={salvar.falha?.mensagem}
          >
            <CampoTexto
              ref={campo}
              rotulo="Diária média (R$)"
              inputMode="decimal"
              autoComplete="off"
              value={diaria}
              onChange={(evento) => setDiaria(evento.target.value)}
              erro={erroDaDiaria}
              ajuda={
                edicao.linha.informada === null && edicao.linha.naPrevia !== null
                  ? `Média das respostas na prévia: ${textoDaDiaria(edicao.linha.naPrevia)}.`
                  : 'Use vírgula ou ponto, com até duas casas, como 410,50.'
              }
            />
            <CampoTexto
              rotulo="Fonte (opcional)"
              maxLength={200}
              value={fonte}
              onChange={(evento) => setFonte(evento.target.value)}
              ajuda="Vale para todas as diárias informadas desta campanha."
            />
          </Formulario>
        </Dialogo>
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
