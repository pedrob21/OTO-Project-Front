import { IconeCheck, IconeRelogio } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { BarraProgresso } from '@/components/ui/BarraProgresso'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { formatarData, formatarInteiro, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import {
  campanhaDeReferencia,
  rodadasRecentesPublicadas,
  textoDasFaltantes,
  textoDoPrazo,
} from '../pesquisas'
import styles from './PesquisasParceirosCard.module.css'

type PesquisasParceirosCardProps = {
  rodadaAberta: Esquemas['RodadaResponse'] | undefined
  acompanhamento: Esquemas['AcompanhamentoResponse'] | undefined
  rodadas: Esquemas['RodadaResponse'][]
  acompanhamentos: Esquemas['AcompanhamentoResponse'][]
  tipos: Esquemas['TipoHospedagemRef'][]
  /** "2026-10-05" */
  hoje: string
}

const EM_CONSTRUCAO = 'Em construção'

function respostas(campanha: Esquemas['AcompanhamentoCampanha'] | undefined): string {
  return `${formatarInteiro(campanha?.qtdRespondentes)} de ${formatarInteiro(campanha?.qtdMh)}`
}

function Progresso({
  rotulo,
  valor,
  percentual,
}: {
  rotulo: string
  valor: string
  percentual: number
}) {
  return (
    <div className={styles.progresso}>
      <span className={styles.rotuloProgresso}>{rotulo}</span>
      <span className={styles.valorProgresso}>{valor}</span>
      <div className={styles.barra}>
        <BarraProgresso valor={percentual} rotulo={rotulo} />
      </div>
    </div>
  )
}

function RodadaAberta({
  rodada,
  acompanhamento,
  tipos,
  hoje,
}: Pick<PesquisasParceirosCardProps, 'acompanhamento' | 'tipos' | 'hoje'> & {
  rodada: Esquemas['RodadaResponse']
}) {
  const campanha = campanhaDeReferencia(acompanhamento)
  const { qtdMh = 0, qtdRespondentes = 0 } = campanha ?? {}

  return (
    <div className={styles.aberta}>
      <div className={styles.situacao}>
        <Badge variante="aberta" icone={<IconeRelogio tamanho={14} />}>
          Aberta
        </Badge>
        <span className={styles.codigoAberta}>Rodada {rodada.codigo}</span>
      </div>
      <h3 className={styles.tituloAberta}>{rodada.titulo}</h3>
      <p className={styles.prazo}>{textoDoPrazo(rodada.prazoResposta, hoje)}</p>

      {campanha && (
        <>
          <Progresso
            rotulo="Meios de hospedagem que responderam"
            valor={respostas(campanha)}
            percentual={qtdMh > 0 ? (qtdRespondentes / qtdMh) * 100 : 0}
          />
          <Progresso
            rotulo="Leitos representados"
            valor={formatarPercentual(campanha.percentualLeitosRespondentes)}
            percentual={campanha.percentualLeitosRespondentes ?? 0}
          />
          <p className={styles.faltantes}>{textoDasFaltantes(campanha, tipos)}</p>
        </>
      )}

      <div className={styles.acoes}>
        <Button variante="secundaria" disabled title={EM_CONSTRUCAO}>
          Ver pendências
        </Button>
        <Button className={styles.botaoLancar} disabled title={EM_CONSTRUCAO}>
          Lançar resposta
        </Button>
      </div>
    </div>
  )
}

export function PesquisasParceirosCard({
  rodadaAberta,
  acompanhamento,
  rodadas,
  acompanhamentos,
  tipos,
  hoje,
}: PesquisasParceirosCardProps) {
  const recentes = rodadasRecentesPublicadas(rodadas, acompanhamentos)

  return (
    <Card
      className={styles.cartao}
      titulo="Pesquisas com os parceiros"
      subtitulo="Respostas dos meios de hospedagem às rodadas de taxa de ocupação"
      acao={
        <Button className={styles.botaoTopo} variante="secundaria" disabled title={EM_CONSTRUCAO}>
          Acompanhamento completo
        </Button>
      }
    >
      <div className={styles.colunas}>
        {rodadaAberta ? (
          <RodadaAberta
            rodada={rodadaAberta}
            acompanhamento={acompanhamento}
            tipos={tipos}
            hoje={hoje}
          />
        ) : (
          <div className={styles.aberta}>
            <EstadoVazio
              titulo="Nenhuma rodada aberta agora"
              descricao="A próxima rodada aparece aqui quando for aberta."
            />
          </div>
        )}

        <div>
          <h3 className={styles.tituloRecentes}>Rodadas recentes</h3>
          {recentes.length === 0 ? (
            <EstadoVazio titulo="Ainda não há rodadas publicadas" />
          ) : (
            <ul>
              {recentes.map(({ id, codigo, titulo, publicadaEm, campanha }) => (
                <li key={id} className={styles.linha}>
                  <span className={styles.codigo}>{codigo}</span>
                  <span className={styles.textos}>
                    <span className={styles.tituloLinha}>{titulo}</span>
                    <span className={styles.detalheLinha}>
                      Publicada em {formatarData(publicadaEm)}
                    </span>
                  </span>
                  <Badge variante="publicada" icone={<IconeCheck tamanho={14} />}>
                    Publicada
                  </Badge>
                  <span className={styles.respostas}>
                    <span className={styles.quantidade}>{respostas(campanha)}</span>
                    <span className={styles.detalheLinha}>respostas</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}
