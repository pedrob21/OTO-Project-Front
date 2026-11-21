import type { DefCampo } from '../campos'
import type { RegraDoCampo } from '../falhaDaApi'

// Limites iguais aos da API (RhcRequest).
export const CAMPOS_RHC: DefCampo[] = [
  { nome: 'vigenteDesde', rotulo: 'Vigente desde', tipo: 'data', obrigatorio: true },
  {
    nome: 'qtdRegistros',
    rotulo: 'Imóveis registrados',
    tipo: 'inteiro',
    obrigatorio: true,
    minimo: 0,
  },
  { nome: 'qtdUh', rotulo: 'UH', tipo: 'inteiro', obrigatorio: true, minimo: 0 },
  { nome: 'qtdLeitos', rotulo: 'Leitos', tipo: 'inteiro', obrigatorio: true, minimo: 0 },
  {
    nome: 'maxLeitosPorUh',
    rotulo: 'Máximo de pessoas por UH',
    tipo: 'inteiro',
    obrigatorio: true,
    minimo: 1,
    maximo: 30,
  },
]

export const REGRAS_RHC: RegraDoCampo[] = [{ campo: 'vigenteDesde', padrao: /a partir desta data/ }]
