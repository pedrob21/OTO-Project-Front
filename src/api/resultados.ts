import type { Esquemas, Modalidade } from '@/types/dominio'
import { nomeDoArquivo, salvarArquivo } from '@/lib/download'
import { requisicao, requisicaoArquivo } from './client'

type FiltroPublicadas = {
  modalidade?: Modalidade
  tipoPeriodo?: 'MENSAL' | 'FERIADO'
  ano?: number
}

export function listarPublicadas(filtro: FiltroPublicadas = {}, signal?: AbortSignal) {
  return requisicao<Esquemas['CampanhaPublicadaResponse'][]>('/api/campanhas/publicadas', {
    parametros: filtro,
    signal,
  })
}

export function buscarResultado(campanhaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['ResultadoResponse']>(`/api/campanhas/${campanhaId}/resultado`, {
    signal,
  })
}

export async function baixarResultadoCsv(campanhaId: number, signal?: AbortSignal) {
  const { blob, contentDisposition } = await requisicaoArquivo(
    `/api/campanhas/${campanhaId}/resultado.csv`,
    { signal },
  )
  salvarArquivo(blob, nomeDoArquivo(contentDisposition, `resultado-campanha-${campanhaId}.csv`))
}
