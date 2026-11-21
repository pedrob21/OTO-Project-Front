import { Link } from 'react-router'
import { useAuth } from '@/features/auth/AuthContext'
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
  referencias,
  resultado,
  rhcVigente,
  serieMensal,
} from './fixtures'
import styles from './PainelPage.module.css'
import { partesDoPeriodo } from './periodo'

export function PainelPage() {
  const perfil = useAuth().usuario?.perfil

  return (
    <>
      <div className={styles.titulos}>
        <p className={styles.sobrelinha}>Estância Turística de Olímpia · SP</p>
        <h1 className={styles.titulo}>Painel de indicadores do turismo</h1>
      </div>

      <PainelFiltros />

      <div className={styles.destaque}>
        <TaxaOcupacaoDestaque
          resultado={resultado}
          faixas={referencias.faixasOcupacao ?? []}
          comparativo={comparativo}
        />
        <p className={styles.metodologia}>
          <Link to="/metodologia">Como calculamos a taxa de ocupação e o fluxo de turistas</Link>
        </p>
      </div>

      <div className={styles.indicadores}>
        <IndicadoresResumo resultado={resultado} comparativo={comparativo} />
      </div>

      <div className={styles.linhaMensal}>
        <OcupacaoMensalCard serie={serieMensal} />
        <FaixasOcupacaoCard resultado={resultado} />
      </div>

      <div className={styles.linhaFluxo}>
        <FluxoTuristasCard resultado={resultado} rhc={rhcVigente} parametros={parametrosVigentes} />
        <ExpectativaRealizadoCard
          expectativa={feriadosExpectativa}
          realizado={feriadosRealizado}
          ano={partesDoPeriodo(resultado.campanha?.periodoInicio)?.ano}
        />
      </div>

      <div className={styles.desempenho}>
        <DesempenhoPorTipoCard resultado={resultado} tipos={referencias.tiposHospedagem ?? []} />
      </div>

      {(perfil === 'ADMIN' || perfil === 'PARCEIRO') && (
        <div className={styles.pesquisas}>
          <PesquisasDoPainel perfil={perfil} />
        </div>
      )}
    </>
  )
}
