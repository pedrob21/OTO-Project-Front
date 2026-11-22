import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { buscarReferencias } from '@/api/referencias'
import { buscarPrevia, cancelarPublicacao, publicarCampanha } from '@/api/resultados'
import { CHAVE_PUBLICADAS } from '@/features/painel/hooks/useCampanhasPublicadas'
import { buscarRodada } from '@/api/rodadas'
import { Button } from '@/components/ui/Button'
import { Confirmacao } from '@/components/ui/Confirmacao'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { DesempenhoPorTipoCard } from '@/features/painel/components/DesempenhoPorTipoCard'
import { formatarData, formatarInteiro, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import comum from './comum.module.css'
import { DiariasInformadas } from './components/DiariasInformadas'
import { IndicadoresDaCampanha } from './components/IndicadoresDaCampanha'
import { ProgressoComMinimo } from './components/ProgressoComMinimo'
import styles from './PreviaPage.module.css'

const ID_IMPEDIMENTOS = 'impedimentos-publicacao'
const ID_CANCELAR = 'cancelar-publicacao'

type Acao = 'publicar' | 'cancelar'

function Publicacao({
  campanhaId,
  campanha,
  previa,
}: {
  campanhaId: number
  campanha: Esquemas['CampanhaResponse'] | undefined
  previa: Esquemas['PreviaResponse']
}) {
  const queryClient = useQueryClient()
  const [confirmando, setConfirmando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const acao = useMutation({
    mutationFn: async (tipo: Acao) => {
      if (tipo === 'publicar') await publicarCampanha(campanhaId)
      else await cancelarPublicacao(campanhaId)
    },
    onMutate: () => setMensagem(''),
    onSuccess: async (_, tipo) => {
      setMensagem(tipo === 'publicar' ? 'Campanha publicada.' : 'Publicação cancelada.')
      setConfirmando(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rodadas'] }),
        queryClient.invalidateQueries({ queryKey: ['campanhas', campanhaId] }),
        queryClient.invalidateQueries({ queryKey: CHAVE_PUBLICADAS }),
      ])
    },
  })

  function voltar() {
    setConfirmando(false)
    document.getElementById(ID_CANCELAR)?.focus()
  }

  const impedimentos = previa.impedimentos ?? []
  const avisos = previa.avisos ?? []
  const publicada = campanha?.publicada === true
  const bloqueada = impedimentos.length > 0 || previa.podePublicar === false

  return (
    <Card
      titulo="Publicação"
      subtitulo={
        publicada
          ? `Publicada em ${formatarData(campanha?.publicadaEm)}. O resultado já aparece no painel.`
          : 'O resultado só aparece no painel depois de publicado.'
      }
    >
      <div className={styles.publicacao}>
        <ProgressoComMinimo
          rotulo="Leitos respondentes"
          percentual={previa.percentualLeitosRespondentes}
          valor={`${formatarInteiro(previa.leitosRespondentes)} de ${formatarInteiro(previa.leitosTotal)} leitos (${formatarPercentual(previa.percentualLeitosRespondentes, 2)})`}
          minimo={previa.percentualMinimoPublicacao}
        />
        <p className={styles.respondentes}>
          {formatarInteiro(previa.qtdRespondentes)} de {formatarInteiro(previa.qtdMh)} meios de
          hospedagem responderam.
        </p>

        {!publicada && impedimentos.length > 0 && (
          <div id={ID_IMPEDIMENTOS} className={comum.alerta}>
            <strong>Ainda não é possível publicar:</strong>
            <ul className={comum.lista}>
              {impedimentos.map((impedimento) => (
                <li key={impedimento}>{impedimento}</li>
              ))}
            </ul>
          </div>
        )}

        {avisos.length > 0 && (
          <div className={styles.avisos}>
            <h3 className={styles.tituloAvisos}>Confira antes de publicar</h3>
            <ul className={comum.lista}>
              {avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={comum.acoes}>
          {publicada ? (
            <>
              <Link to={`/resultados/${campanhaId}`} className={comum.botaoLink}>
                Ver resultado publicado
              </Link>
              <Button
                id={ID_CANCELAR}
                variante="secundaria"
                disabled={acao.isPending}
                aria-haspopup="dialog"
                onClick={() => {
                  acao.reset()
                  setConfirmando(true)
                }}
              >
                Cancelar publicação
              </Button>
            </>
          ) : (
            <Button
              disabled={bloqueada || acao.isPending}
              aria-describedby={impedimentos.length > 0 ? ID_IMPEDIMENTOS : undefined}
              onClick={() => acao.mutate('publicar')}
            >
              {acao.isPending ? 'Publicando…' : 'Publicar'}
            </Button>
          )}
        </div>

        {publicada && confirmando && (
          <Confirmacao
            titulo={`Cancelar a publicação de ${campanha?.nome}?`}
            mensagem="O resultado sai do painel e dos relatórios. Depois, a pesquisa pode ser reaberta para correções e a campanha publicada de novo."
            rotuloConfirmar="Confirmar cancelamento"
            rotuloEnviando="Cancelando…"
            enviando={acao.isPending}
            falha={acao.error?.message}
            aoConfirmar={() => acao.mutate('cancelar')}
            aoCancelar={voltar}
          />
        )}

        {acao.isError && !confirmando && (
          <div role="alert" className={comum.alerta}>
            {acao.error.message}
          </div>
        )}
        <p role="status" className={comum.sucesso}>
          {mensagem}
        </p>
      </div>
    </Card>
  )
}

/** FE-07: o ADMIN confere a prévia e publica quando não há impedimentos. */
export function PreviaPage() {
  const parametros = useParams()
  const id = Number(parametros.id)
  const campanhaId = Number(parametros.campanhaId)

  const previa = useQuery({
    queryKey: ['campanhas', campanhaId, 'previa'],
    queryFn: ({ signal }) => buscarPrevia(campanhaId, signal),
  })
  const rodada = useQuery({
    queryKey: ['rodadas', id],
    queryFn: ({ signal }) => buscarRodada(id, signal),
  })
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })

  const campanha = rodada.data?.campanhas?.find((item) => item.id === campanhaId)
  const falha = [previa, rodada].find((consulta) => consulta.isError)
  const resultado = previa.data?.resultado

  return (
    <>
      <div className={comum.titulos}>
        <Link to={`/pesquisas/${id}`} className={comum.voltar}>
          Voltar ao acompanhamento
        </Link>
        <p className={comum.sobrelinha}>
          {rodada.data ? `Rodada ${rodada.data.codigo}` : 'Pesquisas com os parceiros'}
        </p>
        <h1 className={comum.titulo}>Prévia e publicação</h1>
        {campanha?.nome && <p className={comum.introducao}>{campanha.nome}</p>}
      </div>

      {falha ? (
        <ErroApi
          mensagem="Não foi possível carregar a prévia."
          detalhe={falha.error?.message}
          aoTentarNovamente={() => void falha.refetch()}
        />
      ) : !previa.data || rodada.isPending ? (
        <Carregando texto="Calculando a prévia" />
      ) : (
        <div className={comum.pilha}>
          <Publicacao campanhaId={campanhaId} campanha={campanha} previa={previa.data} />

          <Card
            titulo={campanha?.publicada ? 'Resultado' : 'Resultado com as respostas atuais'}
            subtitulo="Calculado como na publicação. Com a pesquisa aberta, os números ainda mudam."
          >
            {resultado ? (
              <IndicadoresDaCampanha resultado={resultado} />
            ) : (
              <EstadoVazio
                titulo="Ainda não há respostas para calcular"
                descricao="A prévia aparece quando o primeiro meio de hospedagem responder."
              />
            )}
          </Card>

          <DiariasInformadas
            campanhaId={campanhaId}
            publicada={campanha?.publicada === true}
            resultado={resultado}
            tipos={referencias.data?.tiposHospedagem ?? []}
          />

          {resultado && (
            <DesempenhoPorTipoCard
              resultado={resultado}
              tipos={referencias.data?.tiposHospedagem ?? []}
            />
          )}
        </div>
      )}
    </>
  )
}
