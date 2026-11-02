// Página só de desenvolvimento (fora do build): compara os componentes com a tela exportada.
import { useState, type CSSProperties, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { IconeCheck, IconeDownload, IconeRelogio, IconeSetaBaixoLarga } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { VariacaoBadge } from '@/components/ui/VariacaoBadge'
import '@/styles/global.css'
import { Recorte, type Area } from './Recorte'

const linha: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }
const rotulo: CSSProperties = { width: 130, flex: 'none', fontFamily: 'monospace', fontSize: 12 }
const fundoBanner: CSSProperties = { background: 'var(--cor-destaque)', padding: 8 }

function Comparacao({ nome, area, children }: { nome: string; area: Area; children: ReactNode }) {
  return (
    <div style={linha}>
      <code style={rotulo}>{nome}</code>
      <Recorte area={area} />
      {children}
    </div>
  )
}

const CAMPANHAS = [
  { valor: '015', rotulo: 'Agosto de 2026 • consolidada (015/26)' },
  { valor: '013', rotulo: 'Julho de 2026 • consolidada (013/26)' },
]

function Componentes() {
  const [campanha, setCampanha] = useState('015')
  const [visao, setVisao] = useState<'grafico' | 'tabela'>('grafico')

  return (
    <main style={{ padding: 32, display: 'grid', gap: 20, maxWidth: 1280 }}>
      <h1 style={{ font: 'var(--tipo-titulo-card)' }}>
        Referência à esquerda, componente à direita
      </h1>

      <Comparacao nome="Select" area={[70, 316, 450, 78]}>
        <div style={{ width: 436 }}>
          <Select rotulo="Campanha" valor={campanha} opcoes={CAMPANHAS} aoMudar={setCampanha} />
        </div>
      </Comparacao>
      <Comparacao nome="Select desativado" area={[0, 0, 0, 0]}>
        <div style={{ width: 436 }}>
          <Select rotulo="Campanha" valor="015" opcoes={CAMPANHAS} aoMudar={() => {}} disabled />
        </div>
      </Comparacao>
      <Comparacao nome="Exportar" area={[1150, 338, 214, 56]}>
        <Button
          variante="amarela"
          style={{ width: 201 }}
          iconeEsquerda={<IconeDownload tamanho={24} style={{ color: 'var(--cor-primaria)' }} />}
          iconeDireita={<IconeSetaBaixoLarga tamanho={32} />}
        >
          Exportar
        </Button>
      </Comparacao>
      <Comparacao nome="Gráfico/Tabela" area={[684, 820, 176, 60]}>
        <SegmentedControl
          rotulo="Visualização"
          valor={visao}
          aoMudar={setVisao}
          opcoes={[
            { valor: 'grafico', rotulo: 'Gráfico' },
            { valor: 'tabela', rotulo: 'Tabela' },
          ]}
        />
      </Comparacao>
      <Comparacao nome="Botões" area={[120, 2565, 300, 55]}>
        <Button variante="secundaria">Ver pendências</Button>
        <Button>Lançar resposta</Button>
        <Button disabled>Desativado</Button>
      </Comparacao>
      <Comparacao nome="Aberta" area={[122, 2329, 200, 34]}>
        <Badge variante="aberta" icone={<IconeRelogio tamanho={14} />}>
          Aberta
        </Badge>
      </Comparacao>
      <Comparacao nome="Publicada" area={[1140, 2350, 110, 34]}>
        <Badge variante="publicada" icone={<IconeCheck tamanho={14} />}>
          Publicada
        </Badge>
      </Comparacao>
      <Comparacao nome="Faixa e variação" area={[300, 478, 170, 58]}>
        <div style={{ ...fundoBanner, display: 'grid', gap: 6, justifyItems: 'start' }}>
          <Badge variante="faixa">Faixa ótima</Badge>
          <VariacaoBadge valor={4.1} unidade="pontos" referencia="ago./2025" />
        </div>
      </Comparacao>
      <Comparacao nome="Variação KPI" area={[100, 742, 170, 20]}>
        <VariacaoBadge valor={6.1} unidade="percentual" referencia="ago./2025" />
        <VariacaoBadge valor={-2.5} unidade="percentual" referencia="ago./2025" />
        <VariacaoBadge valor={0} unidade="percentual" referencia="ago./2025" />
      </Comparacao>
      <Comparacao nome="Card" area={[80, 801, 800, 130]}>
        <div style={{ width: 400 }}>
          <Card
            titulo="Taxa de ocupação mensal"
            subtitulo="Consolidado mensal dos meios de hospedagem"
          />
        </div>
      </Comparacao>

      <h2 style={{ font: 'var(--tipo-titulo-card)' }}>
        Estados dos blocos (sem referência no design)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card titulo="Carregando">
          <Carregando />
        </Card>
        <Card titulo="Vazio">
          <EstadoVazio
            titulo="Nenhuma campanha publicada"
            descricao="Os indicadores aparecem aqui depois da primeira publicação."
          />
        </Card>
        <Card titulo="Erro">
          <ErroApi
            mensagem="Não foi possível carregar a taxa de ocupação."
            aoTentarNovamente={() => {}}
          />
        </Card>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Componentes />)
