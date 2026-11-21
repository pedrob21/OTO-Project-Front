import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ErroRequisicao } from '@/api/erros'
import { buscarReferencias } from '@/api/referencias'
import { buscarResultado } from '@/api/resultados'
import { BaixarCsvButton } from '@/components/BaixarCsvButton'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { useAuth } from '@/features/auth/AuthContext'
import { DesempenhoPorTipoCard } from '@/features/painel/components/DesempenhoPorTipoCard'
import comum from '@/features/pesquisas/comum.module.css'
import { IndicadoresDaCampanha } from '@/features/pesquisas/components/IndicadoresDaCampanha'
import { formatarData } from '@/lib/formatos'
import styles from './ResultadoCampanhaPage.module.css'

/** FE-08: resultado publicado. Para quem não é ADMIN, a API oculta os tipos com poucas respostas. */
export function ResultadoCampanhaPage() {
  const campanhaId = Number(useParams().campanhaId)
  const { usuario } = useAuth()

  const resultado = useQuery({
    queryKey: ['campanhas', campanhaId, 'resultado'],
    queryFn: ({ signal }) => buscarResultado(campanhaId, signal),
  })
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })

  const campanha = resultado.data?.campanha
  const naoPublicada = resultado.error instanceof ErroRequisicao && resultado.error.status === 404

  return (
    <>
      <div className={`${comum.titulos} ${comum.topo}`}>
        <div>
          {usuario?.perfil === 'ADMIN' && campanha?.rodadaId !== undefined && (
            <Link to={`/pesquisas/${campanha.rodadaId}`} className={comum.voltar}>
              Voltar ao acompanhamento
            </Link>
          )}
          <p className={comum.sobrelinha}>Resultado publicado</p>
          <h1 className={comum.titulo}>{campanha?.nome ?? 'Resultado da campanha'}</h1>
          {campanha && (
            <p className={comum.introducao}>
              {formatarData(campanha.periodoInicio)} a {formatarData(campanha.periodoFim)} ·
              publicado em {formatarData(campanha.publicadaEm)}
            </p>
          )}
        </div>
        {resultado.data && (
          <div className={styles.acoes}>
            <BaixarCsvButton campanhaId={campanhaId} />
          </div>
        )}
      </div>

      {resultado.isPending && <Carregando texto="Carregando o resultado" />}
      {naoPublicada && (
        <EstadoVazio
          titulo="Esta campanha ainda não tem resultado publicado"
          descricao="O resultado aparece aqui depois que a equipe do OTO publicar a campanha."
        />
      )}
      {resultado.isError && !naoPublicada && (
        <ErroApi
          mensagem="Não foi possível carregar o resultado."
          detalhe={resultado.error.message}
          aoTentarNovamente={() => void resultado.refetch()}
        />
      )}
      {resultado.data && (
        <div className={comum.pilha}>
          <Card titulo="Indicadores">
            <IndicadoresDaCampanha resultado={resultado.data} />
          </Card>
          <DesempenhoPorTipoCard
            resultado={resultado.data}
            tipos={referencias.data?.tiposHospedagem ?? []}
          />
        </div>
      )}
    </>
  )
}
