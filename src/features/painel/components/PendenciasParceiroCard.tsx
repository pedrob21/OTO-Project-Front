import type { ReactNode } from 'react'
import { IconeCheck, IconeRelogio } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import type { Esquemas } from '@/types/dominio'
import { textoDoLimite } from '@/features/pesquisas/respostas'
import styles from './PesquisasParceirosCard.module.css'

type PendenciasParceiroCardProps = {
  pendencias: Esquemas['PendenciaResponse'][]
  /** "2026-10-05" */
  hoje: string
  /** ação no topo do cartão, como levar à tela de responder */
  acao?: ReactNode
}

export function PendenciasParceiroCard({ pendencias, hoje, acao }: PendenciasParceiroCardProps) {
  const ordenadas = pendencias.toSorted((a, b) => Number(a.respondida) - Number(b.respondida))

  return (
    <Card
      titulo="Pesquisas com os parceiros"
      subtitulo="Pesquisas abertas para os seus estabelecimentos"
      acao={ordenadas.length > 0 ? acao : undefined}
    >
      {ordenadas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma pesquisa aberta agora"
          descricao="A próxima pesquisa aparece aqui quando for aberta."
        />
      ) : (
        <ul className={styles.pendencias}>
          {ordenadas.map((pendencia) => (
            <li
              key={`${pendencia.campanhaId}-${pendencia.estabelecimentoId}`}
              className={styles.linhaPendencia}
            >
              <span className={styles.codigo}>{pendencia.rodadaCodigo}</span>
              <span className={styles.textos}>
                <span className={styles.tituloLinha}>{pendencia.campanhaNome}</span>
                <span className={styles.detalheLinha}>
                  {pendencia.nomeFantasia} · {textoDoLimite(pendencia, hoje)}
                </span>
              </span>
              {pendencia.respondida ? (
                <Badge variante="publicada" icone={<IconeCheck tamanho={14} />}>
                  Respondida
                </Badge>
              ) : pendencia.aceitaResposta === false ? (
                <Badge variante="inativa">Sem resposta</Badge>
              ) : (
                <Badge variante="aberta" icone={<IconeRelogio tamanho={14} />}>
                  Pendente
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
