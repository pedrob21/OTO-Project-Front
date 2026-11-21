import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listarRodadas } from '@/api/rodadas'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { Tabela } from '@/components/ui/Tabela'
import { Select } from '@/components/ui/Select'
import { hojeLocal, textoDosDias } from '@/lib/datas'
import { formatarData } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import comum from './comum.module.css'
import { SituacaoRodada } from './components/SituacaoRodada'
import styles from './RodadasPage.module.css'
import { lerStatus, OPCOES_DE_SITUACAO, situacaoDaRodada } from './rodadas'

type RodadasPageProps = {
  /** "2026-11-16". Fixa a data nos testes. */
  hoje?: string
}

function Prazo({ rodada, hoje }: { rodada: Esquemas['RodadaResponse']; hoje: string }) {
  const dias = rodada.status === 'ABERTA' ? textoDosDias(rodada.prazoResposta, hoje) : null
  return (
    <>
      {formatarData(rodada.prazoResposta)}
      {dias && <span className={comum.secundario}>{dias}</span>}
    </>
  )
}

function Campanhas({ campanhas = [] }: { campanhas: Esquemas['RodadaResponse']['campanhas'] }) {
  if (campanhas.length === 0) return <span className={comum.secundario}>Sem campanhas</span>
  return (
    <ul className={styles.campanhas}>
      {campanhas.map((campanha) => (
        <li key={campanha.id}>
          {campanha.publicada ? (
            <Link
              to={`/resultados/${campanha.id}`}
              className={comum.link}
              aria-label={`Resultado de ${campanha.nome}`}
            >
              {campanha.nome}
            </Link>
          ) : (
            campanha.nome
          )}
          <span className={comum.secundario}>
            {formatarData(campanha.periodoInicio)} a {formatarData(campanha.periodoFim)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function RodadasPage({ hoje: hojeFixo }: RodadasPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())
  const [busca, setBusca] = useSearchParams()
  const status = lerStatus(busca.get('situacao'))

  const rodadas = useQuery({
    queryKey: status ? ['rodadas', { status }] : ['rodadas'],
    queryFn: ({ signal }) => listarRodadas(status, signal),
  })

  function filtrar(valor: string) {
    setBusca(valor ? { situacao: valor } : {}, { replace: true })
  }

  const filtro = OPCOES_DE_SITUACAO.find((opcao) => opcao.valor === (status ?? ''))

  return (
    <>
      <div className={`${comum.titulos} ${comum.topo}`}>
        <div>
          <p className={comum.sobrelinha}>Pesquisas com os parceiros</p>
          <h1 className={comum.titulo}>Pesquisas</h1>
          <p className={comum.introducao}>
            Rodadas enviadas aos meios de hospedagem, com o andamento e a publicação de cada
            campanha.
          </p>
        </div>
        <Link to="/pesquisas/nova" className={comum.botaoLink}>
          Nova pesquisa
        </Link>
      </div>

      <Card
        titulo="Rodadas"
        acao={
          <Select
            className={styles.filtro}
            variante="campo"
            rotulo="Situação"
            valor={status ?? ''}
            opcoes={OPCOES_DE_SITUACAO}
            aoMudar={filtrar}
          />
        }
      >
        {rodadas.isPending && <Carregando texto="Carregando as pesquisas" />}
        {rodadas.isError && (
          <ErroApi
            mensagem="Não foi possível carregar as pesquisas."
            detalhe={rodadas.error.message}
            aoTentarNovamente={() => void rodadas.refetch()}
          />
        )}
        {rodadas.data?.length === 0 && (
          <EstadoVazio
            titulo={
              status
                ? `Nenhuma pesquisa na situação "${filtro?.rotulo.toLowerCase()}"`
                : 'Nenhuma pesquisa criada ainda'
            }
            descricao="As pesquisas aparecem aqui depois de criadas."
            acao={
              status ? undefined : (
                <Link to="/pesquisas/nova" className={comum.botaoLink}>
                  Criar pesquisa
                </Link>
              )
            }
          />
        )}
        {rodadas.data && rodadas.data.length > 0 && (
          <Tabela
            legenda="Pesquisas"
            linhas={rodadas.data}
            chave={(rodada) => rodada.id ?? 0}
            vazio={{ titulo: 'Nenhuma pesquisa criada ainda' }}
            colunas={[
              { titulo: 'Código', celula: (rodada) => rodada.codigo },
              {
                titulo: 'Título',
                celula: (rodada) => (
                  <Link to={`/pesquisas/${rodada.id}`} className={comum.link}>
                    {rodada.titulo}
                  </Link>
                ),
              },
              {
                titulo: 'Campanhas',
                celula: (rodada) => <Campanhas campanhas={rodada.campanhas} />,
              },
              { titulo: 'Prazo', celula: (rodada) => <Prazo rodada={rodada} hoje={hoje} /> },
              {
                titulo: 'Situação',
                celula: (rodada) => <SituacaoRodada situacao={situacaoDaRodada(rodada)} />,
              },
            ]}
          />
        )}
      </Card>
    </>
  )
}
