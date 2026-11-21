import type { Esquemas, Indicador, Modalidade } from '@/types/dominio'
import { requisicao } from './client'
import { ErroRequisicao } from './erros'

export type FiltroHistorico = {
  indicador?: Indicador
  modalidade?: Modalidade
  ano?: number
  /** código do tipo de hospedagem */
  tipo?: string
}

export function listarHistorico(filtro: FiltroHistorico = {}, signal?: AbortSignal) {
  return requisicao<Esquemas['HistoricoResponse'][]>('/api/historico', {
    parametros: filtro,
    signal,
  })
}

/** Só ADMIN. Substitui o valor que já existir para a mesma combinação. */
export function gravarHistorico(dados: Esquemas['HistoricoRequest']) {
  return requisicao<Esquemas['HistoricoResponse']>('/api/historico', {
    metodo: 'POST',
    corpo: dados,
  })
}

/** Só ADMIN. A nova combinação não pode ser a de outro valor. */
export function alterarHistorico(id: number, dados: Esquemas['HistoricoRequest']) {
  return requisicao<Esquemas['HistoricoResponse']>(`/api/historico/${id}`, {
    metodo: 'PUT',
    corpo: dados,
  })
}

export function excluirHistorico(id: number) {
  return requisicao<void>(`/api/historico/${id}`, { metodo: 'DELETE' })
}

function temErrosDeLinha(corpo: unknown): corpo is Esquemas['ImportacaoResponse'] {
  return Array.isArray((corpo as Esquemas['ImportacaoResponse'] | null)?.erros)
}

/**
 * Só ADMIN. Tudo ou nada: com erro em qualquer linha, nada é gravado e a API responde 422 com a
 * lista. Essa resposta volta como resultado, com `erros`; as outras falhas viram exceção.
 */
export async function importarHistorico(arquivo: File, fonte: string) {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  formulario.append('fonte', fonte)
  try {
    return await requisicao<Esquemas['ImportacaoResponse']>('/api/historico/importacao', {
      metodo: 'POST',
      corpo: formulario,
    })
  } catch (erro) {
    if (erro instanceof ErroRequisicao && erro.status === 422 && temErrosDeLinha(erro.corpo)) {
      return erro.corpo
    }
    throw erro
  }
}
