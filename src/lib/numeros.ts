/**
 * Número digitado no padrão pt-BR ou com ponto: "80,5" e "80.5" → 80.5. Sem separador de
 * milhar. null quando o texto não é número ou tem mais casas decimais que o permitido.
 */
export function lerDecimal(texto: string, casas = 2): number | null {
  const partes = texto.trim().match(/^(-?\d+)(?:[.,](\d+))?$/)
  if (!partes) return null
  const decimais = partes[2] ?? ''
  if (decimais.length > casas) return null
  return Number(decimais ? `${partes[1]}.${decimais}` : partes[1])
}

/** Número que vai para um campo de texto: 80.5 → "80,5". */
export function textoDoNumero(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor).replace('.', ',')
}
