import { IconeDownload, IconeSetaBaixoLarga } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { campanhasPublicadas, referencias } from '../fixtures'
import { opcoesCampanha, opcoesComparacao, opcoesTipo } from '../filtros'
import { usePainelFiltros } from '../hooks/usePainelFiltros'
import styles from './PainelFiltros.module.css'

// Dados fixos até a integração com a API (T15). O Exportar só funciona a partir da T16.
const CAMPANHAS = opcoesCampanha(campanhasPublicadas)
const TIPOS = opcoesTipo(referencias.tiposHospedagem ?? [])

export function PainelFiltros() {
  const { campanha, comparar, tipo, definir } = usePainelFiltros({
    campanha: CAMPANHAS,
    comparar: opcoesComparacao(campanhasPublicadas[0]),
    tipo: TIPOS,
  })
  const selecionada = campanhasPublicadas.find((item) => String(item.campanhaId) === campanha)

  return (
    <div className={styles.filtros}>
      <Select
        className={styles.campanha}
        rotulo="Campanha"
        valor={campanha}
        opcoes={CAMPANHAS}
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
        opcoes={TIPOS}
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
