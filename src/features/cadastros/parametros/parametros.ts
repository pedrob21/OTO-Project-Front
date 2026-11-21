import type { DefCampo, FormDeCampos } from '../campos'
import type { ErrosDoFormulario, RegraDoCampo } from '../falhaDaApi'

// Limites iguais aos da API (ParametroRequest).
export const CAMPOS_PARAMETROS: DefCampo[] = [
  { nome: 'vigenteDesde', rotulo: 'Vigente desde', tipo: 'data', obrigatorio: true },
  {
    nome: 'percentualDayUse',
    rotulo: 'Índice de day use (%)',
    tipo: 'decimal',
    obrigatorio: true,
    minimo: 0,
    maximo: 99.99,
    ajuda: 'Parcela do fluxo que não pernoita.',
  },
  {
    nome: 'diasPermanenciaMedia',
    rotulo: 'Permanência média (dias)',
    tipo: 'inteiro',
    obrigatorio: true,
    minimo: 1,
    maximo: 60,
  },
  {
    nome: 'diasEmParques',
    rotulo: 'Dias de ingresso em parques',
    tipo: 'inteiro',
    obrigatorio: true,
    minimo: 0,
    maximo: 60,
  },
  {
    nome: 'gastoMedioDiario',
    rotulo: 'Gasto médio diário (R$)',
    tipo: 'decimal',
    obrigatorio: true,
    minimo: 0,
    maximo: 99_999_999.99,
  },
  {
    nome: 'gastoMedioIngresso',
    rotulo: 'Valor médio do ingresso (R$)',
    tipo: 'decimal',
    obrigatorio: true,
    minimo: 0,
    maximo: 99_999_999.99,
  },
  {
    nome: 'percentualMinimoLeitosPublicacao',
    rotulo: 'Mínimo de leitos para publicar (%)',
    tipo: 'decimal',
    obrigatorio: true,
    minimo: 0,
    maximo: 100,
    ajuda: 'Percentual de leitos respondentes exigido na publicação.',
  },
  { nome: 'fonte', rotulo: 'Fonte', obrigatorio: true, maximo: 300, largo: true },
]

export const REGRAS_PARAMETROS: RegraDoCampo[] = [
  { campo: 'vigenteDesde', padrao: /a partir desta data/ },
  { campo: 'diasEmParques', padrao: /dias em parques/i },
]

/** A API recusa mais dias em parques que a permanência média. */
export function errosDosParametros(form: FormDeCampos): ErrosDoFormulario {
  return Number(form.diasEmParques) > Number(form.diasPermanenciaMedia)
    ? { diasEmParques: 'Os dias em parques não podem passar a permanência média.' }
    : {}
}
