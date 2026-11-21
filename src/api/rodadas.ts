import type { Esquemas, StatusRodada } from '@/types/dominio'
import { requisicao } from './client'

/** Só ADMIN. */
export function listarRodadas(status?: StatusRodada, signal?: AbortSignal) {
  return requisicao<Esquemas['RodadaResponse'][]>('/api/rodadas', {
    parametros: { status },
    signal,
  })
}

/** Só ADMIN. */
export function buscarRodada(rodadaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['RodadaResponse']>(`/api/rodadas/${rodadaId}`, { signal })
}

/** Só ADMIN. */
export function buscarAcompanhamento(rodadaId: number, signal?: AbortSignal) {
  return requisicao<Esquemas['AcompanhamentoResponse']>(`/api/rodadas/${rodadaId}/acompanhamento`, {
    signal,
  })
}

/** Só ADMIN. A pesquisa nasce em rascunho. */
export function criarRodada(dados: Esquemas['RodadaRequest']) {
  return requisicao<Esquemas['RodadaResponse']>('/api/rodadas', { metodo: 'POST', corpo: dados })
}

/** Só ADMIN, e só com a pesquisa em rascunho. */
export function incluirCampanha(rodadaId: number, dados: Esquemas['DadosCampanha']) {
  return requisicao<Esquemas['CampanhaResponse']>(`/api/rodadas/${rodadaId}/campanhas`, {
    metodo: 'POST',
    corpo: dados,
  })
}

/** Só ADMIN. Sem `dataAbertura`, a pesquisa abre hoje. */
export function abrirRodada(rodadaId: number, dados: Esquemas['AberturaRequest']) {
  return requisicao<Esquemas['RodadaResponse']>(`/api/rodadas/${rodadaId}/abrir`, {
    metodo: 'POST',
    corpo: dados,
  })
}

/** Só ADMIN, e só com a pesquisa aberta. */
export function prorrogarRodada(rodadaId: number, dados: Esquemas['PrazoRequest']) {
  return requisicao<Esquemas['RodadaResponse']>(`/api/rodadas/${rodadaId}/prorrogar`, {
    metodo: 'POST',
    corpo: dados,
  })
}

/** Só ADMIN, e só com a pesquisa aberta. */
export function encerrarRodada(rodadaId: number) {
  return requisicao<Esquemas['RodadaResponse']>(`/api/rodadas/${rodadaId}/encerrar`, {
    metodo: 'POST',
  })
}

/** Só ADMIN, com a pesquisa encerrada e nenhuma campanha publicada. */
export function reabrirRodada(rodadaId: number, dados: Esquemas['PrazoRequest']) {
  return requisicao<Esquemas['RodadaResponse']>(`/api/rodadas/${rodadaId}/reabrir`, {
    metodo: 'POST',
    corpo: dados,
  })
}
