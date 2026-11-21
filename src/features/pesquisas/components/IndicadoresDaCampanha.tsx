import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import {
  formatarInteiro,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPercentual,
} from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import styles from './IndicadoresDaCampanha.module.css'

function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string
  valor: string
  detalhe?: ReactNode
}) {
  return (
    <div className={styles.indicador}>
      <dt className={styles.rotulo}>{rotulo}</dt>
      <dd className={styles.valor}>{valor}</dd>
      {detalhe && <dd className={styles.detalhe}>{detalhe}</dd>}
    </div>
  )
}

/** Os indicadores de uma campanha, calculados (prévia) ou publicados. Sem valor, "—". */
export function IndicadoresDaCampanha({ resultado }: { resultado: Esquemas['ResultadoResponse'] }) {
  return (
    <dl className={styles.indicadores}>
      <Indicador
        rotulo="Taxa de ocupação"
        valor={formatarPercentual(resultado.taxaOcupacao, 2)}
        detalhe={
          resultado.faixa?.nome && (
            <Badge variante="faixa">Faixa {resultado.faixa.nome.toLowerCase()}</Badge>
          )
        }
      />
      <Indicador
        rotulo="Fluxo total de turistas"
        valor={formatarInteiro(resultado.fluxoTotal)}
        detalhe={`${formatarInteiro(resultado.fluxoMedioDiario)} por dia`}
      />
      <Indicador
        rotulo="Hospedados em meios de hospedagem"
        valor={formatarInteiro(resultado.fluxoMh)}
      />
      <Indicador rotulo="Hospedagem caseira (RHC)" valor={formatarInteiro(resultado.fluxoRhc)} />
      <Indicador rotulo="Day use" valor={formatarInteiro(resultado.fluxoDayUse)} />
      <Indicador rotulo="Diária média" valor={formatarMoeda(resultado.diariaMedia)} />
      <Indicador
        rotulo="Receita em hospedagem"
        valor={formatarMoedaCompacta(resultado.receitaHospedagem)}
      />
      <Indicador
        rotulo="Receita fora da hospedagem"
        valor={formatarMoedaCompacta(resultado.receitaSemHospedagem)}
        detalhe="Ingressos e gastos dos turistas na cidade"
      />
      <Indicador
        rotulo="Meios de hospedagem respondentes"
        valor={formatarPercentual(resultado.percentualMhRespondentes, 2)}
        detalhe={`${formatarInteiro(resultado.qtdMhRespondentes)} de ${formatarInteiro(resultado.qtdMh)}`}
      />
      <Indicador
        rotulo="Leitos respondentes"
        valor={formatarPercentual(resultado.percentualLeitosRespondentes, 2)}
        detalhe={`${formatarInteiro(resultado.leitosRespondentes)} de ${formatarInteiro(resultado.leitosTotal)} leitos`}
      />
    </dl>
  )
}
