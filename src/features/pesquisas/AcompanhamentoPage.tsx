import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { buscarReferencias } from '@/api/referencias'
import { buscarAcompanhamento, buscarRodada } from '@/api/rodadas'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { hojeLocal, textoDoPrazo } from '@/lib/datas'
import { formatarData, formatarInteiro, formatarPercentual } from '@/lib/formatos'
import type { Esquemas, StatusRodada } from '@/types/dominio'
import styles from './AcompanhamentoPage.module.css'
import comum from './comum.module.css'
import { AcoesDaRodada } from './components/AcoesDaRodada'
import { ProgressoComMinimo } from './components/ProgressoComMinimo'
import { SituacaoRodada } from './components/SituacaoRodada'
import { situacaoDaRodada, taxaPorEstabelecimentos } from './rodadas'

const SUBTITULOS: Record<StatusRodada, string> = {
  RASCUNHO: 'Em rascunho: os parceiros ainda não podem responder.',
  ABERTA: 'Recebendo respostas. Prorrogue o prazo ou encerre quando terminar.',
  ENCERRADA: 'Fechada para os parceiros. As campanhas já podem ser publicadas.',
}

type AcompanhamentoPageProps = {
  /** "2026-11-16". Fixa a data nos testes. */
  hoje?: string
}

function quantos(quantidade: number, singular: string, plural: string): string {
  return `${formatarInteiro(quantidade)} ${quantidade === 1 ? singular : plural}`
}

function Situacao({ estabelecimento }: { estabelecimento: Esquemas['SituacaoEstabelecimento'] }) {
  const { respondeu, versao, enviadoEm, semCapacidade } = estabelecimento
  return (
    <>
      {respondeu ? (
        <span className={styles.respondeu}>Respondeu</span>
      ) : (
        <span className={styles.pendente}>Pendente</span>
      )}
      {respondeu && (
        <span className={comum.secundario}>
          versão {versao} · {formatarData(enviadoEm)}
        </span>
      )}
      {semCapacidade && (
        <span className={comum.secundario}>Sem leitos cadastrados: fica fora do cálculo</span>
      )}
    </>
  )
}

function Contato({ estabelecimento }: { estabelecimento: Esquemas['SituacaoEstabelecimento'] }) {
  const { contatoNome, telefonePesquisas, emailPesquisas, aceitaPesquisas } = estabelecimento
  const linhas = [contatoNome, telefonePesquisas, emailPesquisas].filter(Boolean)
  return (
    <>
      {linhas.length === 0
        ? '—'
        : linhas.map((linha) => (
            <span key={linha} className={styles.linhaContato}>
              {linha}
            </span>
          ))}
      {aceitaPesquisas === false && (
        <span className={comum.secundario}>Não aceita receber pesquisas</span>
      )}
    </>
  )
}

function Campanha({
  campanha,
  tipos,
  rotaDaPrevia,
  rotaDaResposta,
}: {
  campanha: Esquemas['AcompanhamentoCampanha']
  tipos: Esquemas['TipoRef'][]
  rotaDaPrevia: string
  /** sem ela, a API não aceita resposta (rascunho ou campanha publicada) */
  rotaDaResposta?: (estabelecimentoId: number | undefined) => string
}) {
  const { qtdMh, qtdRespondentes = 0, estabelecimentos = [] } = campanha
  const porEstabelecimentos = taxaPorEstabelecimentos(campanha)
  const nomeDoTipo = (codigo: string | undefined) =>
    tipos.find((tipo) => tipo.codigo === codigo)?.nome ?? codigo ?? '—'

  return (
    <Card
      titulo={campanha.nome}
      subtitulo={`${quantos(qtdRespondentes, 'respondeu', 'responderam')} · ${quantos((qtdMh ?? 0) - qtdRespondentes, 'pendente', 'pendentes')}`}
      acao={
        <Link
          to={rotaDaPrevia}
          className={comum.botaoLinkSecundario}
          aria-label={`Prévia e publicação de ${campanha.nome}`}
        >
          Prévia e publicação
        </Link>
      }
    >
      <div className={styles.progressos}>
        <ProgressoComMinimo
          rotulo="Taxa de resposta por estabelecimentos"
          percentual={porEstabelecimentos}
          valor={`${formatarInteiro(qtdRespondentes)} de ${formatarInteiro(qtdMh)} (${formatarPercentual(porEstabelecimentos, 2)})`}
        />
        <ProgressoComMinimo
          rotulo="Taxa de resposta por leitos"
          percentual={campanha.percentualLeitosRespondentes}
          valor={`${formatarInteiro(campanha.leitosRespondentes)} de ${formatarInteiro(campanha.leitosTotal)} leitos (${formatarPercentual(campanha.percentualLeitosRespondentes, 2)})`}
          minimo={campanha.percentualMinimoPublicacao}
        />
      </div>

      {estabelecimentos.length === 0 ? (
        <EstadoVazio titulo="Nenhum meio de hospedagem participa desta campanha" />
      ) : (
        <table className={comum.tabela}>
          <caption className={comum.oculto}>Estabelecimentos de {campanha.nome}</caption>
          <thead>
            <tr>
              <th scope="col">Estabelecimento</th>
              <th scope="col">Tipo</th>
              <th scope="col" className={comum.numero}>
                Leitos
              </th>
              <th scope="col">Situação</th>
              <th scope="col">Contato</th>
              {rotaDaResposta && (
                <th scope="col">
                  <span className={comum.oculto}>Ação</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {estabelecimentos.map((estabelecimento) => (
              <tr key={estabelecimento.estabelecimentoId}>
                <th scope="row">{estabelecimento.nomeFantasia}</th>
                <td>{nomeDoTipo(estabelecimento.tipoHospedagemCodigo)}</td>
                <td className={comum.numero}>{formatarInteiro(estabelecimento.qtdLeitos)}</td>
                <td>
                  <Situacao estabelecimento={estabelecimento} />
                </td>
                <td>
                  <Contato estabelecimento={estabelecimento} />
                </td>
                {rotaDaResposta && (
                  <td>
                    <Link
                      to={rotaDaResposta(estabelecimento.estabelecimentoId)}
                      className={comum.link}
                      aria-label={`${estabelecimento.respondeu ? 'Editar resposta' : 'Lançar resposta'} de ${estabelecimento.nomeFantasia}`}
                    >
                      {estabelecimento.respondeu ? 'Editar resposta' : 'Lançar resposta'}
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export function AcompanhamentoPage({ hoje: hojeFixo }: AcompanhamentoPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())
  const id = Number(useParams().id)

  const rodada = useQuery({
    queryKey: ['rodadas', id],
    queryFn: ({ signal }) => buscarRodada(id, signal),
  })
  const acompanhamento = useQuery({
    queryKey: ['rodadas', id, 'acompanhamento'],
    queryFn: ({ signal }) => buscarAcompanhamento(id, signal),
  })
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })

  const voltar = (
    <Link to="/pesquisas" className={comum.voltar}>
      Todas as pesquisas
    </Link>
  )

  if (!rodada.data) {
    return (
      <>
        {voltar}
        {rodada.isPending ? (
          <Carregando texto="Carregando a pesquisa" />
        ) : (
          <ErroApi
            mensagem="Não foi possível carregar a pesquisa."
            detalhe={rodada.error?.message}
            aoTentarNovamente={() => void rodada.refetch()}
          />
        )}
      </>
    )
  }

  const { codigo, titulo, status, prazoResposta } = rodada.data
  const campanhas = acompanhamento.data?.campanhas ?? []

  return (
    <>
      <div className={comum.titulos}>
        {voltar}
        <p className={comum.sobrelinha}>Rodada {codigo}</p>
        <h1 className={comum.titulo}>{titulo}</h1>
        <div className={styles.situacao}>
          <SituacaoRodada situacao={situacaoDaRodada(rodada.data)} />
          <span className={styles.prazo}>
            {status === 'ABERTA'
              ? textoDoPrazo(prazoResposta, hoje)
              : `Prazo de resposta: ${formatarData(prazoResposta)}`}
          </span>
        </div>
      </div>

      <div className={comum.pilha}>
        <Card titulo="Andamento da pesquisa" subtitulo={SUBTITULOS[status ?? 'RASCUNHO']}>
          <AcoesDaRodada rodada={rodada.data} hoje={hoje} />
        </Card>

        {acompanhamento.isPending && <Carregando texto="Carregando as respostas" />}
        {acompanhamento.isError && (
          <ErroApi
            mensagem="Não foi possível carregar as respostas desta pesquisa."
            detalhe={acompanhamento.error.message}
            aoTentarNovamente={() => void acompanhamento.refetch()}
          />
        )}
        {acompanhamento.data && campanhas.length === 0 && (
          <EstadoVazio titulo="Esta pesquisa ainda não tem campanhas" />
        )}
        {campanhas.map((campanha) => (
          <Campanha
            key={campanha.campanhaId}
            campanha={campanha}
            tipos={referencias.data?.tiposHospedagem ?? []}
            rotaDaPrevia={`/pesquisas/${id}/campanhas/${campanha.campanhaId}/previa`}
            rotaDaResposta={
              status === 'RASCUNHO' ||
              rodada.data?.campanhas?.some(
                (item) => item.id === campanha.campanhaId && item.publicada,
              )
                ? undefined
                : (estabelecimentoId) =>
                    `/pesquisas/${id}/campanhas/${campanha.campanhaId}/respostas/${estabelecimentoId}`
            }
          />
        ))}
      </div>
    </>
  )
}
