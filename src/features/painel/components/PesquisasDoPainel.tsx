import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { buscarReferencias } from '@/api/referencias'
import { listarPendencias } from '@/api/respostas'
import { buscarAcompanhamento, listarRodadas } from '@/api/rodadas'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { hojeLocal } from '@/lib/datas'
import type { Perfil } from '@/types/dominio'
import { idsRecentesPublicadas, rodadaAbertaAtual } from '../pesquisas'
import { PendenciasParceiroCard } from './PendenciasParceiroCard'
import { PesquisasParceirosCard } from './PesquisasParceirosCard'

const TITULO = 'Pesquisas com os parceiros'

function Estado({
  carregando,
  erro,
  aoTentarNovamente,
}: {
  carregando: boolean
  erro: Error | null
  aoTentarNovamente: () => void
}) {
  return (
    <Card titulo={TITULO}>
      {carregando ? (
        <Carregando texto="Carregando as pesquisas" />
      ) : (
        <ErroApi
          mensagem="Não foi possível carregar as pesquisas."
          detalhe={erro?.message}
          aoTentarNovamente={aoTentarNovamente}
        />
      )}
    </Card>
  )
}

/** O ADMIN vê a rodada aberta e as recentes. Mesma chave da tela de criação: ela atualiza este cartão. */
function PesquisasDoAdmin() {
  const [hoje] = useState(hojeLocal)
  const navigate = useNavigate()
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })
  const rodadas = useQuery({
    queryKey: ['rodadas'],
    queryFn: ({ signal }) => listarRodadas(undefined, signal),
  })

  const aberta = useMemo(() => rodadaAbertaAtual(rodadas.data ?? []), [rodadas.data])
  const idsRecentes = useMemo(() => idsRecentesPublicadas(rodadas.data ?? []), [rodadas.data])
  const idAberta = aberta?.id

  const acompanhamento = useQuery({
    queryKey: ['rodadas', idAberta, 'acompanhamento'],
    queryFn: ({ signal }) => buscarAcompanhamento(idAberta ?? 0, signal),
    enabled: idAberta !== undefined,
  })
  const recentes = useQueries({
    queries: idsRecentes.map((id) => ({
      queryKey: ['rodadas', id, 'acompanhamento'],
      queryFn: ({ signal }: { signal: AbortSignal }) => buscarAcompanhamento(id, signal),
    })),
  })

  if (!rodadas.data) {
    return (
      <Estado
        carregando={rodadas.isPending}
        erro={rodadas.error}
        aoTentarNovamente={() => void rodadas.refetch()}
      />
    )
  }

  return (
    <PesquisasParceirosCard
      rodadaAberta={aberta}
      acompanhamento={acompanhamento.data}
      acompanhamentoIndisponivel={acompanhamento.isError}
      rodadas={rodadas.data}
      acompanhamentos={recentes.flatMap((consulta) => consulta.data ?? [])}
      tipos={referencias.data?.tiposHospedagem ?? []}
      hoje={hoje}
      acaoSemRodada={<Button onClick={() => navigate('/pesquisas/nova')}>Criar pesquisa</Button>}
    />
  )
}

/** O PARCEIRO não acessa as rodadas: vê as pesquisas abertas dos seus estabelecimentos. */
function PesquisasDoParceiro() {
  const [hoje] = useState(hojeLocal)
  const pendencias = useQuery({
    queryKey: ['pendencias'],
    queryFn: ({ signal }) => listarPendencias(signal),
  })

  if (!pendencias.data) {
    return (
      <Estado
        carregando={pendencias.isPending}
        erro={pendencias.error}
        aoTentarNovamente={() => void pendencias.refetch()}
      />
    )
  }
  return <PendenciasParceiroCard pendencias={pendencias.data} hoje={hoje} />
}

type PesquisasDoPainelProps = {
  perfil: Perfil | undefined
}

/** Busca os dados do cartão de pesquisas conforme o perfil. O VISUALIZADOR não vê o cartão. */
export function PesquisasDoPainel({ perfil }: PesquisasDoPainelProps) {
  if (perfil === 'ADMIN') return <PesquisasDoAdmin />
  if (perfil === 'PARCEIRO') return <PesquisasDoParceiro />
  return null
}
