import type { Esquemas } from '@/types/dominio'
import { errosDaResposta, lerNumero, paraRespostaRequest } from './respostas'

export type CamposResposta = { taxaOcupacao: string; diariaMedia: string }
export type ErrosResposta = Partial<Record<keyof CamposResposta, string>>

/** A diária vai até 8 dígitos inteiros na API (`@Digits(integer = 8)`). */
const DIARIA_MAXIMA = 100_000_000

/** As regras de `errosDaResposta`, da tela do parceiro, com os nomes de campo do `RespostaRequest`. */
export function validarResposta(campos: CamposResposta): {
  erros: ErrosResposta
  dados?: Esquemas['RespostaRequest']
} {
  const { taxa, diaria } = errosDaResposta(campos.taxaOcupacao, campos.diariaMedia)
  const erros: ErrosResposta = {}
  if (taxa) erros.taxaOcupacao = taxa
  if (diaria) erros.diariaMedia = diaria
  else if ((lerNumero(campos.diariaMedia) ?? 0) >= DIARIA_MAXIMA) {
    erros.diariaMedia = 'A diária média passa do limite aceito.'
  }

  if (Object.keys(erros).length > 0) return { erros }
  return { erros, dados: paraRespostaRequest(campos.taxaOcupacao, campos.diariaMedia) }
}
