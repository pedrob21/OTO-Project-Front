import type { DefCampo, FormDeCampos } from '../campos'
import type { ErrosDoFormulario, RegraDoCampo } from '../falhaDaApi'

// Limites iguais aos da API (CapacidadeRequest).
export const CAMPOS_CAPACIDADE: DefCampo[] = [
  { nome: 'vigenteDesde', rotulo: 'Vigente desde', tipo: 'data', obrigatorio: true },
  { nome: 'qtdUh', rotulo: 'UH', tipo: 'inteiro', obrigatorio: true, minimo: 1 },
  { nome: 'qtdUhPcd', rotulo: 'UH PCD', tipo: 'inteiro', obrigatorio: true, minimo: 0 },
  { nome: 'qtdLeitos', rotulo: 'Leitos', tipo: 'inteiro', obrigatorio: true, minimo: 1 },
  {
    nome: 'maxLeitosPorUh',
    rotulo: 'Máximo de pessoas por UH',
    tipo: 'inteiro',
    obrigatorio: true,
    minimo: 1,
    maximo: 30,
  },
]

export const REGRAS_CAPACIDADE: RegraDoCampo[] = [
  { campo: 'vigenteDesde', padrao: /a partir desta data/ },
  { campo: 'qtdUhPcd', padrao: /UH PCD/ },
]

/** A API recusa UH PCD acima do total de UH. */
export function errosDaCapacidade(
  form: FormDeCampos | Record<string, unknown>,
  prefixo = '',
): ErrosDoFormulario {
  const uh = Number(form[`${prefixo}qtdUh`])
  const pcd = Number(form[`${prefixo}qtdUhPcd`])
  return pcd > uh ? { [`${prefixo}qtdUhPcd`]: 'As UH PCD não podem passar o total de UH.' } : {}
}
