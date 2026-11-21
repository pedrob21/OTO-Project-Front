import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { OpcaoSelect } from '@/components/ui/Select'

export type NomeFiltro = 'campanha' | 'comparar' | 'tipo'

/** Valor ausente ou que não existe mais nas opções cai na primeira opção. */
export function valorDoFiltro(
  busca: URLSearchParams,
  nome: NomeFiltro,
  opcoes: OpcaoSelect[],
): string {
  const naUrl = busca.get(nome)
  const existe = opcoes.some((opcao) => opcao.valor === naUrl)
  return (existe ? naUrl : opcoes[0]?.valor) ?? ''
}

/**
 * Filtros guardados na URL, para o link do painel poder ser compartilhado.
 * Valor ausente ou que não existe mais nas opções cai na primeira opção.
 */
export function usePainelFiltros(opcoes: Record<NomeFiltro, OpcaoSelect[]>) {
  const [busca, setBusca] = useSearchParams()

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
    campanha: valorDoFiltro(busca, 'campanha', opcoes.campanha),
    comparar: valorDoFiltro(busca, 'comparar', opcoes.comparar),
    tipo: valorDoFiltro(busca, 'tipo', opcoes.tipo),
    definir,
  }
}
