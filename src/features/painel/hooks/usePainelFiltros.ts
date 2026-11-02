import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { OpcaoSelect } from '@/components/ui/Select'

export type NomeFiltro = 'campanha' | 'comparar' | 'tipo'

/**
 * Filtros guardados na URL, para o link do painel poder ser compartilhado.
 * Valor ausente ou que não existe mais nas opções cai na primeira opção.
 */
export function usePainelFiltros(opcoes: Record<NomeFiltro, OpcaoSelect[]>) {
  const [busca, setBusca] = useSearchParams()

  function valorDe(nome: NomeFiltro): string {
    const naUrl = busca.get(nome)
    const existe = opcoes[nome].some((opcao) => opcao.valor === naUrl)
    return (existe ? naUrl : opcoes[nome][0]?.valor) ?? ''
  }

  // replace: trocar filtro não deve encher o botão Voltar do navegador
  const definir = useCallback(
    (nome: NomeFiltro, valor: string) => {
      setBusca(
        (atual) => {
          const nova = new URLSearchParams(atual)
          nova.set(nome, valor)
          return nova
        },
        { replace: true },
      )
    },
    [setBusca],
  )

  return {
    campanha: valorDe('campanha'),
    comparar: valorDe('comparar'),
    tipo: valorDe('tipo'),
    definir,
  }
}
