/**
 * Próximo código do ano no padrão "NNN/AA", a partir das pesquisas existentes:
 * com 017/26 cadastrada, sugere 018/26. É só uma sugestão: o campo continua editável.
 */
export function sugerirCodigo(rodadas: { codigo?: string }[], hoje: string): string {
  const ano = hoje.slice(2, 4)
  const maior = rodadas.reduce((atual, { codigo }) => {
    const partes = codigo?.trim().match(/^(\d+)\/(\d{2})$/)
    return partes && partes[2] === ano ? Math.max(atual, Number(partes[1])) : atual
  }, 0)
  return `${String(maior + 1).padStart(3, '0')}/${ano}`
}
