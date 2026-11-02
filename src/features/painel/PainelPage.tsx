import { useAuth } from '@/features/auth/AuthContext'
import { DesempenhoPorTipoCard } from './components/DesempenhoPorTipoCard'
import { ExpectativaRealizadoCard } from './components/ExpectativaRealizadoCard'
import { FaixasOcupacaoCard } from './components/FaixasOcupacaoCard'
import { FluxoTuristasCard } from './components/FluxoTuristasCard'
import { IndicadoresResumo } from './components/IndicadoresResumo'
import { OcupacaoMensalCard } from './components/OcupacaoMensalCard'
import { PendenciasParceiroCard } from './components/PendenciasParceiroCard'
import { PesquisasParceirosCard } from './components/PesquisasParceirosCard'
import { PainelFiltros } from './components/PainelFiltros'
import { TaxaOcupacaoDestaque } from './components/TaxaOcupacaoDestaque'
import {
  acompanhamento,
  acompanhamentosRecentes,
  comparativo,
  feriadosExpectativa,
  feriadosRealizado,
  hojeDoDesign,
  parametrosVigentes,
  pendenciasParceiro,
  referencias,
  resultado,
  rhcVigente,
  rodadaAberta,
  rodadasRecentes,
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

      {perfil === 'ADMIN' && (
        <div className={styles.pesquisas}>
          <PesquisasParceirosCard
            rodadaAberta={rodadaAberta}
            acompanhamento={acompanhamento}
            rodadas={rodadasRecentes}
            acompanhamentos={acompanhamentosRecentes}
            tipos={referencias.tiposHospedagem ?? []}
            hoje={hojeDoDesign}
          />
        </div>
      )}

      {perfil === 'PARCEIRO' && (
        <div className={styles.pesquisas}>
          <PendenciasParceiroCard pendencias={pendenciasParceiro} hoje={hojeDoDesign} />
        </div>
      )}
    </>
  )
}
