import type { RecursoReferencia } from '@/api/referencias'
import type { ColunaTabela } from '@/components/ui/Tabela'
import { formatarInteiro, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import type { DefCampo } from '../campos'
import type { RegraDoCampo } from '../falhaDaApi'

/** Tipo de hospedagem, feriado ou faixa: o que cada aba lista. */
export type Referencia = {
  codigo?: string
  nome?: string
  ordem?: number
  calculaReceita?: boolean
  percentualMinimo?: number
}

export type DefAba = {
  recurso: RecursoReferencia
  rotulo: string
  /** "Tipo de hospedagem Chalé criado." */
  singular: string
  feminino?: boolean
  novo: string
  itens: (referencias: Esquemas['Referencias']) => Referencia[]
  /** além do código e do nome */
  campos: DefCampo[]
  tamanhoDoCodigo: number
  tamanhoDoNome: number
  colunas: ColunaTabela<Referencia>[]
  vazio: string
  /** campos que não mudam neste item */
  bloqueados?: (item: Referencia) => string[]
}

const ORDEM: DefCampo = {
  nome: 'ordem',
  rotulo: 'Ordem',
  tipo: 'inteiro',
  minimo: 1,
  maximo: 9999,
  ajuda: 'Posição nas listas. Sem ordem, o novo vai para o fim.',
}

const COLUNA_ORDEM: ColunaTabela<Referencia> = {
  titulo: 'Ordem',
  celula: (item) => formatarInteiro(item.ordem),
  numerica: true,
}

const porOrdem = (a: Referencia, b: Referencia) => (a.ordem ?? 0) - (b.ordem ?? 0)

// Limites iguais aos da API (TipoRequest, FeriadoRequest e FaixaRequest).
export const ABAS: DefAba[] = [
  {
    recurso: 'tipos-hospedagem',
    rotulo: 'Tipos de hospedagem',
    singular: 'Tipo de hospedagem',
    novo: 'Novo tipo de hospedagem',
    itens: (referencias) => (referencias.tiposHospedagem ?? []).toSorted(porOrdem),
    campos: [
      ORDEM,
      {
        nome: 'calculaReceita',
        rotulo: 'Entra na diária média, no RevPAR e na receita estimada',
        tipo: 'marcacao',
      },
    ],
    tamanhoDoCodigo: 20,
    tamanhoDoNome: 60,
    colunas: [
      COLUNA_ORDEM,
      { titulo: 'Na receita', celula: (item) => (item.calculaReceita ? 'Sim' : 'Não') },
    ],
    vazio: 'Nenhum tipo de hospedagem cadastrado',
  },
  {
    recurso: 'feriados',
    rotulo: 'Feriados e eventos',
    singular: 'Feriado ou evento',
    novo: 'Novo feriado ou evento',
    itens: (referencias) => (referencias.feriados ?? []).toSorted(porOrdem),
    campos: [ORDEM],
    tamanhoDoCodigo: 40,
    tamanhoDoNome: 100,
    colunas: [COLUNA_ORDEM],
    vazio: 'Nenhum feriado ou evento cadastrado',
  },
  {
    recurso: 'faixas',
    rotulo: 'Faixas de ocupação',
    singular: 'Faixa de ocupação',
    feminino: true,
    novo: 'Nova faixa de ocupação',
    itens: (referencias) =>
      (referencias.faixasOcupacao ?? []).toSorted(
        (a, b) => (a.percentualMinimo ?? 0) - (b.percentualMinimo ?? 0),
      ),
    campos: [
      {
        nome: 'percentualMinimo',
        rotulo: 'A partir de (%)',
        tipo: 'decimal',
        obrigatorio: true,
        minimo: 0,
        maximo: 100,
        ajuda: 'Uma taxa fica na faixa de maior percentual que não passa dela.',
      },
    ],
    tamanhoDoCodigo: 20,
    tamanhoDoNome: 40,
    colunas: [
      {
        titulo: 'A partir de',
        celula: (item) => formatarPercentual(item.percentualMinimo, 2),
        numerica: true,
      },
    ],
    vazio: 'Nenhuma faixa de ocupação cadastrada',
    bloqueados: (item) => (item.percentualMinimo === 0 ? ['percentualMinimo'] : []),
  },
]

export const REGRAS_REFERENCIA: RegraDoCampo[] = [
  { campo: 'codigo', padrao: /código/i },
  { campo: 'percentualMinimo', padrao: /já começa em|começa em 0%/ },
]

/** Código e nome primeiro; na edição o código não muda. */
export function camposDaAba(aba: DefAba, item?: Referencia): DefCampo[] {
  const bloqueados = item ? (aba.bloqueados?.(item) ?? []) : []
  return [
    {
      nome: 'codigo',
      rotulo: 'Código',
      tipo: 'codigo',
      maximo: aba.tamanhoDoCodigo,
      desativado: item !== undefined,
      ajuda: item
        ? 'O código não muda: é a referência usada no resto do sistema.'
        : 'Opcional. Sem código, ele é gerado do nome, como AREA_DE_LAZER.',
    },
    { nome: 'nome', rotulo: 'Nome', obrigatorio: true, maximo: aba.tamanhoDoNome },
    ...aba.campos.map((campo) =>
      bloqueados.includes(campo.nome)
        ? { ...campo, desativado: true, ajuda: 'A primeira faixa começa sempre em 0%.' }
        : campo,
    ),
  ]
}
