import { Card } from '@/components/ui/Card'
import { FaixasOcupacaoCard } from './components/FaixasOcupacaoCard'
import { FluxoTuristasCard } from './components/FluxoTuristasCard'
import { IndicadoresResumo } from './components/IndicadoresResumo'
import { OcupacaoMensalCard } from './components/OcupacaoMensalCard'
import { PainelFiltros } from './components/PainelFiltros'
import { TaxaOcupacaoDestaque } from './components/TaxaOcupacaoDestaque'
import {
  comparativo,
  parametrosVigentes,
  referencias,
  resultado,
  rhcVigente,
  serieMensal,
} from './fixtures'
import styles from './PainelPage.module.css'

export function PainelPage() {
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
      </div>

      <div className={styles.indicadores}>
        <IndicadoresResumo resultado={resultado} comparativo={comparativo} />
      </div>

      {/* Reservas com a altura do design: cada uma é substituída nas tasks T12 a T14. */}

      <div className={styles.linhaMensal}>
        <OcupacaoMensalCard serie={serieMensal} />
        <FaixasOcupacaoCard resultado={resultado} />
      </div>

      <div className={styles.linhaFluxo}>
        <FluxoTuristasCard resultado={resultado} rhc={rhcVigente} parametros={parametrosVigentes} />
        <Card className={styles.reservaFluxo} titulo="Expectativa × realizado" />
      </div>

      <div className={styles.desempenho}>
        <Card className={styles.reservaDesempenho} titulo="Desempenho por tipo de hospedagem" />
      </div>

      <div className={styles.pesquisas}>
        <Card className={styles.reservaPesquisas} titulo="Pesquisas com os parceiros" />
      </div>
    </>
  )
}
