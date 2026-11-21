import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

/** Só PARCEIRO. */
export function listarPendencias(signal?: AbortSignal) {
  return requisicao<Esquemas['PendenciaResponse'][]>('/api/respostas/pendencias', { signal })
}

/** ADMIN e PARCEIRO (só os seus estabelecimentos). Envia ou corrige: vale o último envio. */
export function enviarResposta(
  campanhaId: number,
  estabelecimentoId: number,
  dados: Esquemas['RespostaRequest'],
) {
  return requisicao<Esquemas['RespostaResponse']>(
    `/api/campanhas/${campanhaId}/respostas/${estabelecimentoId}`,
    { metodo: 'PUT', corpo: dados },
  )
}

/** Só PARCEIRO. Inclui a taxa da cidade quando a campanha já foi publicada. */
export function listarMinhasRespostas(signal?: AbortSignal) {
  return requisicao<Esquemas['MinhaRespostaResponse'][]>('/api/respostas/minhas', { signal })
}

/** Só ADMIN. Dado individual de cada estabelecimento. */
export function listarRespostasDaCampanha(campanhaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['RespostaResponse'][]>(`/api/campanhas/${campanhaId}/respostas`, {
    signal,
  })
}

/** ADMIN e o PARCEIRO dono do estabelecimento. Da versão mais nova para a mais antiga. */
export function buscarHistoricoDaResposta(respostaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['HistoricoRespostaResponse'][]>(
    `/api/respostas/${respostaId}/historico`,
    { signal },
  )
}
