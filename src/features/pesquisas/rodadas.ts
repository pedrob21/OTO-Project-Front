import { ultimaPublicacao } from '@/features/painel/pesquisas'
import type { Esquemas, StatusRodada } from '@/types/dominio'

export type Situacao = {
  variante: 'rascunho' | 'aberta' | 'encerrada' | 'publicada'
  rotulo: string
  /** "1 de 2 campanhas", quando só parte das campanhas foi publicada */
  detalhe?: string
}

const SITUACOES: Record<StatusRodada, Situacao> = {
  RASCUNHO: { variante: 'rascunho', rotulo: 'Rascunho' },
  ABERTA: { variante: 'aberta', rotulo: 'Aberta' },
  ENCERRADA: { variante: 'encerrada', rotulo: 'Encerrada' },
}

export const OPCOES_DE_SITUACAO: { valor: StatusRodada | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'RASCUNHO', rotulo: 'Rascunho' },
  { valor: 'ABERTA', rotulo: 'Abertas' },
  { valor: 'ENCERRADA', rotulo: 'Encerradas' },
]

export function lerStatus(texto: string | null): StatusRodada | undefined {
  return texto === 'RASCUNHO' || texto === 'ABERTA' || texto === 'ENCERRADA' ? texto : undefined
}

/** A API só tem rascunho, aberta e encerrada; "publicada" vem das campanhas, como no painel. */
export function situacaoDaRodada(rodada: Esquemas['RodadaResponse']): Situacao {
  const campanhas = rodada.campanhas ?? []
  if (ultimaPublicacao(rodada)) {
    const publicadas = campanhas.filter((campanha) => campanha.publicadaEm).length
    return {
      variante: 'publicada',
      rotulo: 'Publicada',
      detalhe:
        publicadas < campanhas.length
          ? `${publicadas} de ${campanhas.length} campanhas`
          : undefined,
    }
  }
  return SITUACOES[rodada.status ?? 'RASCUNHO']
}
