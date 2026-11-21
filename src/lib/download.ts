/**
 * Lê o nome do Content-Disposition, com preferência para `filename*` (UTF-8).
 * Sem cabeçalho ou sem nome, devolve o `padrao`.
 */
export function nomeDoArquivo(contentDisposition: string | null, padrao: string): string {
  const codificado = contentDisposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1]
  if (codificado) {
    try {
      return decodeURIComponent(codificado.trim())
    } catch {
      // segue para o filename simples
    }
  }
  const simples = contentDisposition?.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)
  const nome = (simples?.[1] ?? simples?.[2])?.trim()
  return nome || padrao
}

export function salvarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
