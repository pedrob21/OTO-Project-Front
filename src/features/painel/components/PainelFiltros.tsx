import { useQuery } from '@tanstack/react-query'
import { buscarReferencias } from '@/api/referencias'
import { IconeDownload, IconeSetaBaixoLarga } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { Select } from '@/components/ui/Select'
import { opcoesCampanha, opcoesComparacao, opcoesTipo } from '../filtros'
import { useCampanhasPublicadas } from '../hooks/useCampanhasPublicadas'
import { usePainelFiltros } from '../hooks/usePainelFiltros'
import styles from './PainelFiltros.module.css'

export function PainelFiltros() {
  const publicadas = useCampanhasPublicadas()
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })

  const campanhas = publicadas.data ?? []
  const campanhaOpcoes = opcoesCampanha(campanhas)
  const tipoOpcoes = opcoesTipo(referencias.data?.tiposHospedagem ?? [])
  const { campanha, comparar, tipo, definir } = usePainelFiltros({
    campanha: campanhaOpcoes,
    comparar: opcoesComparacao(campanhas[0]),
    tipo: tipoOpcoes,
  })
  const selecionada = campanhas.find((item) => String(item.campanhaId) === campanha)

  const falha = [publicadas, referencias].find((consulta) => consulta.isError)
  if (falha) {
    return (
      <ErroApi
        mensagem="Não foi possível carregar os filtros."
        detalhe={falha.error?.message}
        aoTentarNovamente={() => void Promise.all([publicadas.refetch(), referencias.refetch()])}
      />
    )
  }
  if (publicadas.isPending || referencias.isPending) {
    return <Carregando texto="Carregando os filtros" />
  }

  return (
    <div className={styles.filtros}>
      <Select
        className={styles.campanha}
        rotulo="Campanha"
        valor={campanha}
        opcoes={campanhaOpcoes}
        aoMudar={(valor) => definir('campanha', valor)}
      />
      <Select
        className={styles.comparar}
        rotulo="Comparar com"
        valor={comparar}
        opcoes={opcoesComparacao(selecionada)}
        aoMudar={(valor) => definir('comparar', valor)}
      />
      <Select
        className={styles.tipo}
        rotulo="Tipo de hospedagem"
        valor={tipo}
        opcoes={tipoOpcoes}
        aoMudar={(valor) => definir('tipo', valor)}
      />
      <Button
        variante="amarela"
        className={styles.exportar}
        iconeEsquerda={<IconeDownload tamanho={23} className={styles.iconeDownload} />}
        iconeDireita={<IconeSetaBaixoLarga tamanho={32} />}
      >
        Exportar
      </Button>
    </div>
  )
}
