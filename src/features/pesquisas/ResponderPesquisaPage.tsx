import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { buscarReferencias } from '@/api/referencias'
import { listarMinhasRespostas, listarPendencias } from '@/api/respostas'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { useAuth } from '@/features/auth/AuthContext'
import { hojeLocal } from '@/lib/datas'
import { formatarDecimal } from '@/lib/formatos'
import { RespostaEstabelecimento } from './components/RespostaEstabelecimento'
import styles from './ResponderPesquisaPage.module.css'
import { ausente, campanhasParaResponder, resumoDasPendencias } from './respostas'

type ResponderPesquisaPageProps = {
  /** "2026-11-20". Fixa a data nos testes. */
  hoje?: string
}

function RespostasEncerradas({ abertas }: { abertas: Set<number | undefined> }) {
  const minhas = useQuery({
    queryKey: ['respostas', 'minhas'],
    queryFn: ({ signal }) => listarMinhasRespostas(signal),
  })
  const encerradas = (minhas.data ?? []).filter((resposta) => !abertas.has(resposta.campanhaId))
  if (encerradas.length === 0) return null

  return (
    <Card
      titulo="Respostas de pesquisas encerradas"
      subtitulo="Compare a sua ocupação com a da cidade depois que o OTO publica o resultado."
    >
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th scope="col">Campanha</th>
            <th scope="col">Estabelecimento</th>
            <th scope="col" className={styles.numero}>
              Sua taxa
            </th>
            <th scope="col" className={styles.numero}>
              Taxa da cidade
            </th>
          </tr>
        </thead>
        <tbody>
          {encerradas.map((resposta) => (
            <tr key={resposta.respostaId}>
              <td>{resposta.campanhaNome}</td>
              <td>{resposta.nomeFantasia}</td>
              <td className={styles.numero}>{formatarDecimal(resposta.taxaOcupacao)}%</td>
              <td className={styles.numero}>
                {ausente(resposta.taxaOcupacaoCidade) ? (
                  <span className={styles.semValor}>Ainda não publicada</span>
                ) : (
                  `${formatarDecimal(resposta.taxaOcupacaoCidade)}%`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export function ResponderPesquisaPage({ hoje: hojeFixo }: ResponderPesquisaPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())
  const usuarioId = useAuth().usuario?.id
  const pendencias = useQuery({
    queryKey: ['pendencias'],
    queryFn: ({ signal }) => listarPendencias(signal),
  })
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })

  const campanhas = useMemo(
    () => campanhasParaResponder(pendencias.data ?? [], hoje),
    [pendencias.data, hoje],
  )
  const abertas = useMemo(
    () => new Set((pendencias.data ?? []).map((pendencia) => pendencia.campanhaId)),
    [pendencias.data],
  )
  const faixas = referencias.data?.faixasOcupacao ?? []

  return (
    <>
      <div className={styles.titulos}>
        <p className={styles.sobrelinha}>Pesquisa de ocupação</p>
        <h1 className={styles.titulo}>Responder pesquisa</h1>
        <p className={styles.introducao}>
          Informe a taxa de ocupação de cada estabelecimento no período pedido. A diária média é
          opcional e ajuda a calcular a receita da cidade.
        </p>
      </div>

      {pendencias.isPending ? (
        <Carregando texto="Carregando as pesquisas abertas" />
      ) : pendencias.isError ? (
        <Card>
          <ErroApi
            mensagem="Não foi possível carregar as pesquisas abertas."
            detalhe={pendencias.error.message}
            aoTentarNovamente={() => void pendencias.refetch()}
          />
        </Card>
      ) : campanhas.length === 0 ? (
        <Card>
          <EstadoVazio
            titulo="Nenhuma pesquisa aberta agora"
            descricao="Quando o OTO abrir uma pesquisa para os seus estabelecimentos, ela aparece aqui."
          />
        </Card>
      ) : (
        <div className={styles.campanhas}>
          <p role="status" className={styles.resumo}>
            {resumoDasPendencias(pendencias.data)}
          </p>
          {campanhas.map((campanha) => (
            <Card
              key={campanha.campanhaId}
              titulo={campanha.nome}
              subtitulo={`Pesquisa ${campanha.rodadaCodigo ?? ''}, período de ${campanha.periodo}. ${campanha.prazo}.`}
            >
              {campanha.prazoVencido && (
                <p className={styles.avisoPrazo}>
                  O prazo terminou, mas a pesquisa ainda aceita respostas até o OTO encerrá-la.
                </p>
              )}
              <ul className={styles.estabelecimentos}>
                {campanha.estabelecimentos.map((pendencia) => (
                  <RespostaEstabelecimento
                    key={pendencia.estabelecimentoId}
                    pendencia={pendencia}
                    faixas={faixas}
                    usuarioId={usuarioId}
                  />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <div className={styles.encerradas}>
        <RespostasEncerradas abertas={abertas} />
      </div>
    </>
  )
}
