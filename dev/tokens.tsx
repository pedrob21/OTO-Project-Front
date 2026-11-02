// Página só de desenvolvimento (fora do build): compara os tokens com a tela exportada.
import { createRoot } from 'react-dom/client'
import type { CSSProperties, ReactNode } from 'react'
import {
  IconeAlta,
  IconeBaixa,
  IconeCheck,
  IconeDownload,
  IconeRelogio,
  IconeSeta,
  IconeSetaBaixo,
} from '@/components/icons'
import logoOto from '@/assets/logo-oto.png'
import logoPrefeitura from '@/assets/logo-prefeitura-olimpia.png'
import selo from '@/assets/selo-observatorio.png'
import '@/styles/global.css'
import { Recorte, type Area } from './Recorte'

type Amostra = {
  nome: string
  tipo: string
  cor: string
  texto: ReactNode
  fundo?: string
  letras?: string
  recorte: Area
}

const AMOSTRAS: Amostra[] = [
  {
    nome: 'titulo-pagina',
    tipo: '--tipo-titulo-pagina',
    cor: '--cor-texto-titulo',
    texto: (
      <>
        Painel de indicadores
        <br />
        do turismo
      </>
    ),
    recorte: [80, 192, 560, 104],
  },
  {
    nome: 'sobrelinha',
    tipo: '--tipo-sobrelinha',
    cor: '--cor-texto-sobrelinha',
    texto: 'ESTÂNCIA TURÍSTICA DE OLÍMPIA · SP',
    recorte: [80, 164, 260, 20],
  },
  {
    nome: 'rotulo-campo',
    tipo: '--tipo-rotulo-campo',
    cor: '--cor-texto-sobrelinha',
    texto: 'COMPARAR COM',
    recorte: [552, 318, 120, 18],
  },
  {
    nome: 'select',
    tipo: '--tipo-select',
    cor: '--cor-texto-amarelo',
    letras: 'var(--espacamento-letras-select)',
    fundo: '--cor-amarelo',
    texto: 'Agosto de 2026 • consolidada (015/26)',
    recorte: [106, 354, 350, 28],
  },
  {
    nome: 'rotulo',
    tipo: '--tipo-rotulo',
    cor: '--cor-texto-rotulo',
    fundo: '--cor-destaque',
    texto: 'Taxa de ocupação hoteleira em agosto de 2026',
    recorte: [107, 446, 330, 20],
  },
  {
    nome: 'numero-destaque',
    tipo: '--tipo-numero-destaque',
    cor: '--cor-texto-forte',
    fundo: '--cor-destaque',
    texto: '62,8%',
    recorte: [107, 472, 200, 64],
  },
  {
    nome: 'numero-kpi',
    tipo: '--tipo-numero-kpi',
    cor: '--cor-texto-forte',
    fundo: '--cor-superficie',
    texto: '496,7 mil',
    recorte: [102, 650, 150, 38],
  },
  {
    nome: 'rotulo-kpi',
    tipo: '--tipo-rotulo-kpi',
    cor: '--cor-texto-rotulo',
    fundo: '--cor-superficie',
    texto: 'Turistas estimados',
    recorte: [102, 627, 140, 20],
  },
  {
    nome: 'corpo',
    tipo: '--tipo-corpo',
    cor: '--cor-texto-suave',
    fundo: '--cor-destaque',
    texto: 'Média ponderada pelas UH dos 58 meios de hospedagem que responderam.',
    recorte: [108, 546, 470, 20],
  },
  {
    nome: 'titulo-card',
    tipo: '--tipo-titulo-card',
    cor: '--cor-texto-forte',
    fundo: '--cor-superficie',
    texto: 'Taxa de ocupação mensal',
    recorte: [104, 826, 260, 28],
  },
  {
    nome: 'subtitulo',
    tipo: '--tipo-subtitulo',
    cor: '--cor-texto',
    fundo: '--cor-superficie',
    texto: 'Consolidado mensal dos meios de hospedagem regulares, 2024 a 2026',
    recorte: [104, 859, 460, 22],
  },
  {
    nome: 'numero-fluxo',
    tipo: '--tipo-numero-fluxo',
    cor: '--cor-texto-forte',
    fundo: '--cor-superficie',
    texto: '496,7 mil',
    recorte: [104, 1370, 160, 42],
  },
  {
    nome: 'menu',
    tipo: '--tipo-menu',
    cor: '--cor-texto-titulo',
    texto: 'Pesquisas',
    recorte: [574, 78, 76, 20],
  },
  {
    nome: 'nome',
    tipo: '--tipo-nome',
    cor: '--cor-texto-forte',
    fundo: '--cor-superficie',
    texto: 'Resort',
    recorte: [116, 1914, 60, 20],
  },
  {
    nome: 'titulo-rodada',
    tipo: '--tipo-titulo-rodada',
    cor: '--cor-texto-forte',
    fundo: '--cor-superficie-suave',
    texto: 'Consolidada de setembro e expectativa da Semana do Saco Cheio',
    recorte: [125, 2372, 540, 24],
  },
  {
    nome: 'botao',
    tipo: '--tipo-botao',
    cor: '--cor-primaria-texto',
    fundo: '--cor-primaria',
    texto: 'Lançar resposta',
    recorte: [286, 2584, 112, 18],
  },
  {
    nome: 'corpo-forte',
    tipo: '--tipo-corpo-forte',
    cor: '--cor-texto-forte',
    fundo: '--cor-fundo-rodape',
    texto: 'Observatório de Turismo de Olímpia',
    recorte: [79, 2754, 230, 20],
  },
  {
    nome: 'minimo',
    tipo: '--tipo-minimo',
    cor: '--cor-texto',
    fundo: '--cor-destaque',
    texto: '21 a 40%',
    recorte: [826, 536, 56, 16],
  },
]

const CORES = [
  'fundo',
  'fundo-rodape',
  'superficie',
  'superficie-suave',
  'superficie-total',
  'destaque',
  'chip-usuario',
  'avatar',
  'borda',
  'borda-destaque',
  'trilha',
  'trilha-forte',
  'texto-titulo',
  'texto-forte',
  'texto',
  'texto-rotulo',
  'texto-suave',
  'texto-sobrelinha',
  'amarelo',
  'texto-amarelo',
  'primaria',
  'menu-ativo',
  'serie-atual',
  'serie-anterior',
  'serie-antiga',
  'serie-area',
  'fluxo-rhc',
  'fluxo-day-use',
  'expectativa',
  'realizado',
  'faixa-ruim',
  'faixa-regular',
  'faixa-boa',
  'faixa-otima',
  'faixa-excelente',
  'positivo',
  'negativo',
  'publicada-fundo',
  'aberta-fundo',
  'aberta-texto',
]

const secao: CSSProperties = { padding: 32, display: 'grid', gap: 12 }

function Tokens() {
  return (
    <>
      <section style={secao}>
        <h1 style={{ font: 'var(--tipo-titulo-card)' }}>
          Tipografia: referência acima, tokens abaixo
        </h1>
        {AMOSTRAS.map((amostra) => (
          <div
            key={amostra.nome}
            style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}
          >
            <code>{amostra.nome}</code>
            <div style={{ display: 'grid', gap: 2 }}>
              <Recorte area={amostra.recorte} />
              <div
                style={{
                  font: `var(${amostra.tipo})`,
                  color: `var(${amostra.cor})`,
                  background: amostra.fundo ? `var(${amostra.fundo})` : undefined,
                  letterSpacing: amostra.letras,
                  width: 'fit-content',
                  whiteSpace: 'nowrap',
                }}
              >
                {amostra.texto}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section style={secao}>
        <h2 style={{ font: 'var(--tipo-titulo-card)' }}>Cores</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
          {CORES.map((cor) => (
            <div key={cor}>
              <div
                style={{
                  height: 44,
                  background: `var(--cor-${cor})`,
                  border: 'var(--borda-card)',
                  borderRadius: 8,
                }}
              />
              <code style={{ fontSize: 11 }}>{cor}</code>
            </div>
          ))}
        </div>
      </section>

      <section style={secao}>
        <h2 style={{ font: 'var(--tipo-titulo-card)' }}>
          Raios: referência à esquerda, tokens à direita
        </h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Recorte area={[70, 335, 80, 62]} />
          <div
            style={{
              width: 72,
              height: 46,
              background: 'var(--cor-amarelo)',
              borderRadius: 'var(--raio-controle)',
            }}
          />
          <Recorte area={[72, 597, 80, 62]} />
          <div
            style={{
              width: 72,
              height: 46,
              background: 'var(--cor-superficie)',
              border: 'var(--borda-card)',
              borderRadius: 'var(--raio-card)',
            }}
          />
          <Recorte area={[1178, 58, 80, 50]} />
          <div
            style={{
              width: 72,
              height: 42,
              background: 'var(--cor-chip-usuario)',
              borderRadius: 'var(--raio-chip)',
            }}
          />
        </div>
      </section>

      <section style={secao}>
        <h2 style={{ font: 'var(--tipo-titulo-card)' }}>Logos e ícones</h2>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <img src={logoOto} alt="OTO" width={112} />
          <img src={logoPrefeitura} alt="Prefeitura de Olímpia" width={198} />
          <img src={selo} alt="Selo do Observatório" width={106} />
          <IconeSetaBaixo tamanho={24} />
          <IconeDownload tamanho={24} />
          <IconeAlta tamanho={24} />
          <IconeBaixa tamanho={24} />
          <IconeSeta tamanho={24} />
          <IconeRelogio tamanho={24} />
          <IconeCheck tamanho={24} />
        </div>
      </section>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Tokens />)
