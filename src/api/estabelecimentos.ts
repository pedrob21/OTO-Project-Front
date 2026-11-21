import type { Esquemas } from '@/types/dominio'
import { requisicao } from './client'

type FiltroEstabelecimentos = { tipo?: string; ativo?: boolean }

/** O PARCEIRO só recebe os seus. UH e leitos são os da capacidade vigente hoje. */
export function listarEstabelecimentos(filtro: FiltroEstabelecimentos = {}, signal?: AbortSignal) {
  return requisicao<Esquemas['EstabelecimentoResumo'][]>('/api/estabelecimentos', {
    parametros: filtro,
    signal,
  })
}
