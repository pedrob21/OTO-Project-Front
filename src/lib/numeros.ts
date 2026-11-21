const COM_MILHAR = /^\d{1,3}(\.\d{3})+,\d{1,2}$/
const SIMPLES = /^\d+([.,]\d{1,2})?$/

/**
 * "80,5" e "80.5" → 80.5. null para vazio, texto, sinal e mais de duas casas decimais.
 * O ponto de milhar só vale com vírgula decimal: "1.234,5" → 1234.5, mas "1.234" é recusado.
 */
export function lerDecimal(texto: string): number | null {
  const limpo = texto.trim()
  if (COM_MILHAR.test(limpo)) {
    return Number(limpo.replaceAll('.', '').replace(',', '.'))
  }
  if (SIMPLES.test(limpo)) return Number(limpo.replace(',', '.'))
  return null
}
