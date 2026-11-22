import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import logoOto from '@/assets/logo-oto.png'
import logoPrefeitura from '@/assets/logo-prefeitura-olimpia.png'
import { ErroRequisicao } from '@/api/erros'
import { buscarReferencias } from '@/api/referencias'
import { buscarResultado } from '@/api/resultados'
import { BaixarCsvButton } from '@/components/BaixarCsvButton'
import { IconeImpressora } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { useAuth } from '@/features/auth/AuthContext'
import { DesempenhoPorTipoCard } from '@/features/painel/components/DesempenhoPorTipoCard'
import comum from '@/features/pesquisas/comum.module.css'
import { IndicadoresDaCampanha } from '@/features/pesquisas/components/IndicadoresDaCampanha'
import { rotuloDaModalidade, rotuloDoTipoDePeriodo } from '@/features/relatorios/relatorios'
import { formatarData, formatarDataHora } from '@/lib/formatos'
import { gerarPdf } from './impressao'
import styles from './ResultadoCampanhaPage.module.css'

/** FE-08: resultado publicado. Para quem não é ADMIN, a API oculta os tipos com poucas respostas. */
export function ResultadoCampanhaPage() {
  const campanhaId = Number(useParams().campanhaId)
  const { usuario } = useAuth()
  const [abertoEm] = useState(() => new Date().toISOString())

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
  // A API responde 422 para campanha que existe mas ainda não foi publicada, e 404 para campanha inexistente.
  const status = resultado.error instanceof ErroRequisicao ? resultado.error.status : undefined
  const naoPublicada = status === 422
  const naoEncontrada = status === 404

  return (
    <div className={styles.pagina}>
      {campanha && (
        <div className={styles.cabecalhoImpressao}>
          <div className={styles.logos}>
            <img src={logoOto} alt="OTO" width={90} height={56} />
            <img src={logoPrefeitura} alt="Prefeitura de Olímpia" width={157} height={50} />
          </div>
          <p>
            Observatório de Turismo de Olímpia
            <br />
            Relatório de resultado · {rotuloDaModalidade(campanha.modalidade)} ·{' '}
            {rotuloDoTipoDePeriodo(campanha.tipoPeriodo)}
          </p>
        </div>
      )}
      <div className={`${comum.titulos} ${comum.topo}`}>
        <div>
          {usuario?.perfil === 'ADMIN' && campanha?.rodadaId !== undefined && (
            <Link
              to={`/pesquisas/${campanha.rodadaId}`}
              className={`${comum.voltar} ${styles.naoImprimir}`}
            >
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
            <Button
              iconeEsquerda={<IconeImpressora tamanho={16} />}
              onClick={() => gerarPdf(campanha?.nome)}
            >
              Gerar relatório (PDF)
            </Button>
            <BaixarCsvButton campanhaId={campanhaId} />
          </div>
        )}
      </div>

      {resultado.isPending && <Carregando texto="Carregando o resultado" />}
      {naoPublicada && (
        <EstadoVazio
          titulo="Esta campanha ainda não tem resultado publicado"
          descricao={
            usuario?.perfil === 'ADMIN'
              ? 'Para ver a simulação com as respostas atuais, abra a prévia da campanha no acompanhamento da pesquisa.'
              : 'O resultado aparece aqui depois que a equipe do OTO publicar a campanha.'
          }
          acao={
            usuario?.perfil === 'ADMIN' ? (
              <Link to="/pesquisas" className={comum.botaoLinkSecundario}>
                Ir para as pesquisas
              </Link>
            ) : undefined
          }
        />
      )}
      {naoEncontrada && (
        <EstadoVazio
          titulo="Campanha não encontrada"
          descricao="Confira o endereço ou escolha a campanha nos relatórios."
          acao={
            <Link to="/relatorios" className={comum.botaoLinkSecundario}>
              Ver relatórios
            </Link>
          }
        />
      )}
      {resultado.isError && !naoPublicada && !naoEncontrada && (
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
          <section className={styles.notaMetodologica} aria-labelledby="nota-metodologica">
            <h2 id="nota-metodologica">Nota metodológica</h2>
            <p>
              A taxa de ocupação é a média ponderada pelas unidades habitacionais (UH) dos meios de
              hospedagem que responderam à pesquisa; os que não responderam recebem a taxa média. O
              fluxo de turistas é medido em pernoites (leitos úteis ocupados por noite) e soma os
              hospedados em meios de hospedagem, a hospedagem caseira (RHC) e o day use, estimado
              por um índice sobre o público hospedado.
            </p>
            <p>
              O resultado só é publicado quando os respondentes atingem o mínimo de leitos definido
              nos parâmetros de cálculo. Os tipos de hospedagem com poucos respondentes têm os
              valores ocultos para preservar o sigilo dos estabelecimentos.
            </p>
            <p className={styles.naoImprimir}>
              <Link to="/metodologia" className={comum.link}>
                Ler a metodologia completa
              </Link>
            </p>
            <p className={styles.emissao}>
              Gerado em {formatarDataHora(abertoEm)} a partir do resultado publicado no sistema do
              OTO.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
