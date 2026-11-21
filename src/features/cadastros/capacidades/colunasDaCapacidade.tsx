import type { ColunaTabela } from '@/components/ui/Tabela'
import { formatarData, formatarDecimal, formatarInteiro } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { SituacaoDaVigencia } from '../SituacaoDaVigencia'
import { situacaoDaVigencia } from '../vigencias'

type Capacidade = Esquemas['CapacidadeResponse']

export function colunasDaCapacidade(lista: Capacidade[], hoje: string): ColunaTabela<Capacidade>[] {
  return [
    { titulo: 'Vigente desde', celula: (linha) => formatarData(linha.vigenteDesde) },
    { titulo: 'UH', celula: (linha) => formatarInteiro(linha.qtdUh), numerica: true },
    { titulo: 'UH PCD', celula: (linha) => formatarInteiro(linha.qtdUhPcd), numerica: true },
    { titulo: 'Leitos', celula: (linha) => formatarInteiro(linha.qtdLeitos), numerica: true },
    {
      titulo: 'Pessoas por UH',
      celula: (linha) => formatarInteiro(linha.maxLeitosPorUh),
      numerica: true,
    },
    {
      titulo: 'Leitos úteis',
      celula: (linha) => formatarDecimal(linha.leitosUteis, 1),
      numerica: true,
    },
    {
      titulo: 'Situação',
      celula: (linha) => <SituacaoDaVigencia situacao={situacaoDaVigencia(linha, lista, hoje)} />,
    },
  ]
}
