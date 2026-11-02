import { Card } from '@/components/ui/Card'
import { PainelFiltros } from './components/PainelFiltros'
import { TaxaOcupacaoDestaque } from './components/TaxaOcupacaoDestaque'
import { comparativo, referencias, resultado } from './fixtures'
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

      {/* Reservas com a altura do design: cada uma é substituída nas tasks T08 a T14. */}

      <div className={styles.indicadores}>
        <Card className={styles.reservaKpi} />
        <Card className={styles.reservaKpi} />
        <Card className={styles.reservaKpi} />
        <Card className={styles.reservaKpi} />
      </div>

      <div className={styles.linhaMensal}>
        <Card className={styles.reservaMensal} titulo="Taxa de ocupação mensal" />
        <Card className={styles.reservaMensal} titulo="Faixas de ocupação" />
      </div>

      <div className={styles.linhaFluxo}>
        <Card className={styles.reservaFluxo} titulo="Fluxo estimado de turistas" />
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
