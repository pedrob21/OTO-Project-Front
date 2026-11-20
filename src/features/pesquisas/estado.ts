import { type CampanhaRascunho, novaCampanha } from './campanhas'

export type EstadoPesquisa = {
  /** `null`: vale o código sugerido */
  codigo: string | null
  titulo: string
  prazo: string
  campanhas: CampanhaRascunho[]
  proximaChave: number
  /** campanha que deve receber o foco depois de adicionada */
  adicionada: number | null
}

export type AcaoPesquisa =
  | { tipo: 'pesquisa'; campo: 'codigo' | 'titulo' | 'prazo'; valor: string }
  | { tipo: 'adicionar'; hoje: string }
  | { tipo: 'remover'; chave: number }
  | { tipo: 'campanha'; chave: number; mudancas: Partial<Omit<CampanhaRascunho, 'chave'>> }
  | { tipo: 'reiniciar'; hoje: string }

export function estadoInicial(hoje: string): EstadoPesquisa {
  return {
    codigo: null,
    titulo: '',
    prazo: '',
    campanhas: [novaCampanha(1, hoje)],
    proximaChave: 2,
    adicionada: null,
  }
}

/** Só a campanha alterada muda de referência: as outras não renderizam de novo. */
export function reduzirPesquisa(estado: EstadoPesquisa, acao: AcaoPesquisa): EstadoPesquisa {
  switch (acao.tipo) {
    case 'pesquisa':
      return { ...estado, [acao.campo]: acao.valor }
    case 'adicionar':
      return {
        ...estado,
        campanhas: [
          ...estado.campanhas,
          novaCampanha(estado.proximaChave, acao.hoje, estado.campanhas.length === 0),
        ],
        proximaChave: estado.proximaChave + 1,
        adicionada: estado.proximaChave,
      }
    case 'remover':
      return {
        ...estado,
        campanhas: estado.campanhas.filter((campanha) => campanha.chave !== acao.chave),
      }
    case 'campanha':
      return {
        ...estado,
        campanhas: estado.campanhas.map((campanha) =>
          campanha.chave === acao.chave ? { ...campanha, ...acao.mudancas } : campanha,
        ),
      }
    case 'reiniciar':
      return estadoInicial(acao.hoje)
  }
}
