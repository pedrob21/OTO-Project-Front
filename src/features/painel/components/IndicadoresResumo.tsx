import { BarraProgresso } from '@/components/ui/BarraProgresso'
import { VariacaoBadge } from '@/components/ui/VariacaoBadge'
import { KpiCard } from '@/components/KpiCard'
import {
  formatarCompacto,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPercentual,
} from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { referenciaDaComparacao, textoDoPeriodoCurto } from '../periodo'
import styles from './IndicadoresResumo.module.css'

type IndicadoresResumoProps = {
  resultado: Esquemas['ResultadoResponse']
  /** a variação da receita não existe na API (decisão D3): sem ela, o cartão não mostra variação */
  comparativo?: Esquemas['Comparativo'] & { variacaoReceitaPercentual?: number }
}

export function IndicadoresResumo({ resultado, comparativo }: IndicadoresResumoProps) {
  const { campanha } = resultado
  const referencia = referenciaDaComparacao(campanha, comparativo)

  return (
    <>
      <KpiCard
        rotulo="Turistas estimados"
        valor={formatarCompacto(resultado.fluxoTotal)}
        descricao={`${formatarCompacto(resultado.fluxoMedioDiario)} por dia ${textoDoPeriodoCurto(campanha)}`}
        rodape={
          <VariacaoBadge
            valor={comparativo?.variacaoFluxoPercentual}
            unidade="percentual"
            referencia={referencia}
          />
        }
      />
      <KpiCard
        rotulo="Diária média"
        valor={formatarMoeda(resultado.diariaMedia)}
        descricao="Ponderada · apto. standard, 2 adultos e 1 criança"
        rodape={
          <VariacaoBadge
            valor={comparativo?.variacaoDiariaPercentual}
            unidade="percentual"
            referencia={referencia}
          />
        }
      />
      <KpiCard
        rotulo="Receita em hospedagem"
        valor={formatarMoedaCompacta(resultado.receitaHospedagem)}
        descricao="Estimada para hotéis, resorts e pousadas"
        rodape={
          <VariacaoBadge
            valor={comparativo?.variacaoReceitaPercentual}
            unidade="percentual"
            referencia={referencia}
          />
        }
      />
      <KpiCard
        rotulo="Taxa de resposta"
        valor={formatarPercentual(resultado.percentualMhRespondentes)}
        descricao={`${resultado.qtdMhRespondentes ?? 0} de ${resultado.qtdMh ?? 0} meios de hospedagem`}
        rodape={
          <div className={styles.leitos}>
            <BarraProgresso
              valor={resultado.percentualLeitosRespondentes}
              rotulo="Leitos representados"
            />
            <p className={styles.textoLeitos}>
              <strong>{formatarPercentual(resultado.percentualLeitosRespondentes)}</strong> dos
              leitos representados
            </p>
          </div>
        }
      />
    </>
  )
}
