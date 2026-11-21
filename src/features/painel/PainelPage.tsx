import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { buscarReferencias } from '@/api/referencias'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { useAuth } from '@/features/auth/AuthContext'
import { BlocoDoPainel } from './components/BlocoDoPainel'
import { DesempenhoPorTipoCard } from './components/DesempenhoPorTipoCard'
import { ExpectativaRealizadoCard } from './components/ExpectativaRealizadoCard'
import { FaixasOcupacaoCard } from './components/FaixasOcupacaoCard'
import { FluxoTuristasCard } from './components/FluxoTuristasCard'
import { IndicadoresResumo } from './components/IndicadoresResumo'
import { OcupacaoMensalCard } from './components/OcupacaoMensalCard'
import { PesquisasDoPainel } from './components/PesquisasDoPainel'
import { PainelFiltros } from './components/PainelFiltros'
import { TaxaOcupacaoDestaque } from './components/TaxaOcupacaoDestaque'
import {
  comparativo,
  feriadosExpectativa,
  feriadosRealizado,
  parametrosVigentes,
  rhcVigente,
  serieMensal,
} from './fixtures'
import { useCampanhaSelecionada } from './hooks/useCampanhaSelecionada'
import { useCampanhasPublicadas } from './hooks/useCampanhasPublicadas'
import { useResultadoDoPainel } from './hooks/useResultadoDoPainel'
import styles from './PainelPage.module.css'
import { partesDoPeriodo } from './periodo'

export function PainelPage() {
  const perfil = useAuth().usuario?.perfil
  const publicadas = useCampanhasPublicadas()
  const semCampanhas = publicadas.data?.length === 0
  const selecionada = useCampanhaSelecionada()
  const resultado = useResultadoDoPainel(selecionada?.campanhaId)
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })
  const dados = resultado.data
  const tipos = referencias.data?.tiposHospedagem ?? []
  const base = [publicadas, resultado]

  return (
    <>
      <div className={styles.titulos}>
        <p className={styles.sobrelinha}>Estância Turística de Olímpia · SP</p>
        <h1 className={styles.titulo}>Painel de indicadores do turismo</h1>
      </div>

      {semCampanhas ? (
        <EstadoVazio
          titulo="Nenhuma campanha publicada ainda"
          descricao="Os indicadores aparecem aqui quando a primeira campanha for publicada."
        />
      ) : (
        <>
          <PainelFiltros />

          <div className={styles.destaque}>
            <BlocoDoPainel
              titulo="Taxa de ocupação hoteleira"
              mensagemDeErro="Não foi possível carregar a taxa de ocupação."
              consultas={[...base, referencias]}
            >
              {dados && (
                <TaxaOcupacaoDestaque
                  resultado={dados}
                  faixas={referencias.data?.faixasOcupacao ?? []}
                  comparativo={comparativo}
                />
              )}
            </BlocoDoPainel>
            <p className={styles.metodologia}>
              <Link to="/metodologia">
                Como calculamos a taxa de ocupação e o fluxo de turistas
              </Link>
            </p>
          </div>

          <div className={styles.indicadores}>
            <BlocoDoPainel
              titulo="Indicadores"
              mensagemDeErro="Não foi possível carregar os indicadores."
              consultas={base}
              className={styles.larguraTotal}
            >
              {dados && <IndicadoresResumo resultado={dados} comparativo={comparativo} />}
            </BlocoDoPainel>
          </div>

          <div className={styles.linhaMensal}>
            <OcupacaoMensalCard serie={serieMensal} />
            <BlocoDoPainel
              titulo="Faixas de ocupação"
              mensagemDeErro="Não foi possível carregar as faixas de ocupação."
              consultas={base}
            >
              {dados && <FaixasOcupacaoCard resultado={dados} />}
            </BlocoDoPainel>
          </div>

          <div className={styles.linhaFluxo}>
            <BlocoDoPainel
              titulo="Fluxo estimado de turistas"
              mensagemDeErro="Não foi possível carregar o fluxo de turistas."
              consultas={base}
            >
              {dados && (
                <FluxoTuristasCard
                  resultado={dados}
                  rhc={rhcVigente}
                  parametros={parametrosVigentes}
                />
              )}
            </BlocoDoPainel>
            <ExpectativaRealizadoCard
              expectativa={feriadosExpectativa}
              realizado={feriadosRealizado}
              ano={partesDoPeriodo(selecionada?.periodoInicio)?.ano}
            />
          </div>

          <div className={styles.desempenho}>
            <BlocoDoPainel
              titulo="Desempenho por tipo de hospedagem"
              mensagemDeErro="Não foi possível carregar o desempenho por tipo."
              consultas={[...base, referencias]}
            >
              {dados && <DesempenhoPorTipoCard resultado={dados} tipos={tipos} />}
            </BlocoDoPainel>
          </div>
        </>
      )}

      {(perfil === 'ADMIN' || perfil === 'PARCEIRO') && (
        <div className={styles.pesquisas}>
          <PesquisasDoPainel perfil={perfil} />
        </div>
      )}
    </>
  )
}
