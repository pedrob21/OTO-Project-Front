import { useSearchParams } from 'react-router'
import { opcoesCampanha } from '../filtros'
import { useCampanhasPublicadas } from './useCampanhasPublicadas'
import { valorDoFiltro } from './usePainelFiltros'

/** A campanha da URL, ou a primeira da lista (a mais recente) quando falta ou não existe mais. */
export function useCampanhaSelecionada() {
  const publicadas = useCampanhasPublicadas()
  const [busca] = useSearchParams()
  const lista = publicadas.data ?? []
  const id = valorDoFiltro(busca, 'campanha', opcoesCampanha(lista))

  return lista.find((item) => String(item.campanhaId) === id)
}
