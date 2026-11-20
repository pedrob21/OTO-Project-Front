import { diasAte, diasDoPeriodo } from '@/lib/datas'
import {
  type CampanhaRascunho,
  type Feriado,
  diariasDaCampanha,
  diasDaCampanha,
  nomeDaCampanha,
  periodoDaCampanha,
} from './campanhas'

/** Campo → mensagem. Campos de campanha: "chave.campo", como "3.diarias". */
export type Erros = Record<string, string>

export type DadosPesquisa = {
  codigo: string
  titulo: string
  prazo: string
  campanhas: CampanhaRascunho[]
}

// Limites iguais aos da API (RodadaRequest e DadosCampanha).
const MAXIMO = { codigo: 20, titulo: 200, nome: 150, diarias: 366 }

/** Id do campo na página, para o resumo de erros levar até ele. */
export function idDoCampo(campo: string): string {
  return `campo-${campo.replace('.', '-')}`
}

function texto(valor: string, obrigatorio: string, maximo: number): string | undefined {
  if (!valor.trim()) return obrigatorio
  if (valor.trim().length > maximo) return `Use até ${maximo} caracteres.`
  return undefined
}

/** Erros que dependem só da própria campanha. */
export function errosDaCampanha(campanha: CampanhaRascunho, feriados: Feriado[]): Erros {
  const erros: Erros = {}
  const anotar = (campo: string, mensagem: string | undefined) => {
    if (mensagem) erros[campo] = mensagem
  }

  if (campanha.tipoPeriodo === 'MENSAL') {
    anotar('mes', periodoDaCampanha(campanha) ? undefined : 'Escolha o mês.')
  } else {
    anotar('feriado', campanha.feriadoCodigo ? undefined : 'Escolha o feriado.')
    anotar('inicio', campanha.inicio ? undefined : 'Informe o primeiro dia.')
    if (!campanha.fim) anotar('fim', 'Informe o último dia.')
    else if (campanha.inicio && (diasDoPeriodo(campanha.inicio, campanha.fim) ?? 0) < 1) {
      anotar('fim', 'O último dia não pode ser antes do primeiro.')
    }
  }

  const diarias = diariasDaCampanha(campanha).trim()
  const dias = diasDaCampanha(campanha)
  const limite = Math.min(dias ?? MAXIMO.diarias, MAXIMO.diarias)
  if (!diarias) anotar('diarias', 'Informe as diárias.')
  else if (!/^\d+$/.test(diarias)) anotar('diarias', 'Use um número inteiro.')
  else if (Number(diarias) < 1) anotar('diarias', 'Use pelo menos 1 diária.')
  else if (Number(diarias) > limite) {
    anotar('diarias', dias ? `Use até ${dias}: o período tem ${dias} dias.` : `Use até ${limite}.`)
  }

  anotar('nome', texto(nomeDaCampanha(campanha, feriados), 'Informe o nome.', MAXIMO.nome))
  return erros
}

/** A API recusa duas campanhas da mesma modalidade no mesmo período. */
function chaveDoPeriodo(campanha: CampanhaRascunho): string | null {
  const periodo = periodoDaCampanha(campanha)
  if (!periodo) return null
  const feriado = campanha.tipoPeriodo === 'FERIADO' ? campanha.feriadoCodigo : ''
  return [campanha.modalidade, campanha.tipoPeriodo, periodo.inicio, feriado].join('|')
}

/** Chaves das campanhas que repetem uma anterior do formulário. */
export function campanhasRepetidas(campanhas: CampanhaRascunho[]): Set<number> {
  const vistas = new Set<string>()
  const repetidas = new Set<number>()
  for (const campanha of campanhas) {
    const chave = chaveDoPeriodo(campanha)
    if (chave === null) continue
    if (vistas.has(chave)) repetidas.add(campanha.chave)
    vistas.add(chave)
  }
  return repetidas
}

export const MENSAGEM_REPETIDA = 'Já há uma campanha desta modalidade para este período.'

/** Todos os erros, na ordem em que os campos aparecem na página. */
export function errosDaPesquisa(dados: DadosPesquisa, feriados: Feriado[], hoje: string): Erros {
  const erros: Erros = {}
  const codigo = texto(dados.codigo, 'Informe o código da pesquisa.', MAXIMO.codigo)
  const titulo = texto(dados.titulo, 'Informe o título da pesquisa.', MAXIMO.titulo)
  if (codigo) erros.codigo = codigo
  if (titulo) erros.titulo = titulo

  if (dados.campanhas.length === 0) erros.campanhas = 'Inclua ao menos uma campanha.'
  const repetidas = campanhasRepetidas(dados.campanhas)
  for (const campanha of dados.campanhas) {
    const daCampanha = errosDaCampanha(campanha, feriados)
    const campoDoPeriodo = campanha.tipoPeriodo === 'MENSAL' ? 'mes' : 'inicio'
    if (repetidas.has(campanha.chave) && !daCampanha[campoDoPeriodo]) {
      daCampanha[campoDoPeriodo] = MENSAGEM_REPETIDA
    }
    for (const [campo, mensagem] of Object.entries(daCampanha)) {
      erros[`${campanha.chave}.${campo}`] = mensagem
    }
  }

  if (!dados.prazo) erros.prazo = 'Informe o prazo de resposta.'
  else if ((diasAte(dados.prazo, hoje) ?? -1) < 0)
    erros.prazo = 'O prazo não pode ser antes de hoje.'
  return erros
}
