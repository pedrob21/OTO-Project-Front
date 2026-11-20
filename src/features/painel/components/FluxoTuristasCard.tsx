import { Card } from '@/components/ui/Card'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { capitalizar, formatarCompacto, formatarInteiro, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { textoDoPeriodo } from '../periodo'
import styles from './FluxoTuristasCard.module.css'

type FluxoTuristasCardProps = {
  resultado: Esquemas['ResultadoResponse']
  /** o PARCEIRO não tem acesso: sem isso, a origem fica sem o detalhe (decisão D7) */
  rhc?: Esquemas['RhcResponse']
  parametros?: Esquemas['ParametroResponse']
}

export function FluxoTuristasCard({ resultado, rhc, parametros }: FluxoTuristasCardProps) {
  const { campanha, fluxoTotal, fluxoMedioDiario } = resultado
  const total = fluxoTotal ?? 0
  const periodo = capitalizar(textoDoPeriodo(campanha))
  const subtitulo = [periodo, campanha?.qtdDiarias && `${campanha.qtdDiarias} diárias`]
    .filter(Boolean)
    .join(' · ')

  const origens = [
    {
      nome: 'Meios de hospedagem',
      detalhe: resultado.qtdMh ? `${resultado.qtdMh} estabelecimentos regulares` : undefined,
      valor: resultado.fluxoMh ?? 0,
      cor: 'var(--cor-fluxo-hospedagem)',
    },
    {
      nome: 'Hospedagem caseira (RHC)',
      detalhe: rhc
        ? `${formatarInteiro(rhc.qtdRegistros)} registros e ${formatarInteiro(rhc.qtdLeitos)} leitos`
        : undefined,
      valor: resultado.fluxoRhc ?? 0,
      cor: 'var(--cor-fluxo-rhc)',
    },
    {
      nome: 'Day use',
      detalhe: 'Visitantes que não pernoitam',
      valor: resultado.fluxoDayUse ?? 0,
      cor: 'var(--cor-fluxo-day-use)',
    },
  ].map((origem) => ({
    ...origem,
    parte: total > 0 ? formatarPercentual((origem.valor / total) * 100) : '—',
  }))

  return (
    <Card className={styles.cartao} titulo="Fluxo estimado de turistas" subtitulo={subtitulo}>
      {total === 0 ? (
        <EstadoVazio
          titulo="Ainda não há fluxo estimado para este período"
          descricao="A estimativa aparece aqui depois da publicação da campanha."
        />
      ) : (
        <>
          <p className={styles.total}>
            <strong className={styles.numero}>{formatarCompacto(total)}</strong> turistas no período
            {fluxoMedioDiario ? `, ${formatarCompacto(fluxoMedioDiario)} por dia` : ''}
          </p>

          <div
            className={styles.barra}
            role="img"
            aria-label={origens.map(({ nome, parte }) => `${nome}: ${parte}`).join(', ')}
          >
            {origens
              .filter(({ valor }) => valor > 0)
              .map(({ nome, valor, cor }) => (
                <span
                  key={nome}
                  className={styles.segmento}
                  title={nome}
                  style={{ flexGrow: valor, background: cor }}
                />
              ))}
          </div>

          <ul className={styles.origens}>
            {origens.map(({ nome, detalhe, valor, cor, parte }) => (
              <li key={nome} className={styles.origem}>
                <span className={styles.quadrado} style={{ background: cor }} />
                <span className={styles.textos}>
                  <span className={styles.nome}>{nome}</span>
                  {detalhe && <span className={styles.detalhe}>{detalhe}</span>}
                </span>
                <span className={styles.valor}>{formatarCompacto(valor)}</span>
                <span className={styles.parte}>{parte}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {parametros?.percentualDayUse !== undefined && (
        <p className={styles.nota}>
          Day use estimado em {formatarPercentual(parametros.percentualDayUse, 2)} do total
          {parametros.fonte ? `, conforme a ${parametros.fonte}` : ''}.
        </p>
      )}
    </Card>
  )
}
