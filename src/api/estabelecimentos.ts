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

export function buscarEstabelecimento(id: number, signal?: AbortSignal) {
  return requisicao<Esquemas['EstabelecimentoResponse']>(`/api/estabelecimentos/${id}`, {
    signal,
  })
}

/** Só ADMIN. Já com a capacidade inicial. */
export function criarEstabelecimento(dados: Esquemas['CriacaoRequest']) {
  return requisicao<Esquemas['EstabelecimentoResponse']>('/api/estabelecimentos', {
    metodo: 'POST',
    corpo: dados,
  })
}

/** O bloco `secretaria` só vale quando quem altera é o ADMIN. */
export function alterarEstabelecimento(id: number, dados: Esquemas['AtualizacaoRequest']) {
  return requisicao<Esquemas['EstabelecimentoResponse']>(`/api/estabelecimentos/${id}`, {
    metodo: 'PUT',
    corpo: dados,
  })
}

/** Só ADMIN. Não há exclusão: o inativo sai das pesquisas e dos cálculos. */
export function inativarEstabelecimento(id: number) {
  return requisicao<void>(`/api/estabelecimentos/${id}/inativar`, { metodo: 'POST' })
}

export function reativarEstabelecimento(id: number) {
  return requisicao<void>(`/api/estabelecimentos/${id}/reativar`, { metodo: 'POST' })
}
