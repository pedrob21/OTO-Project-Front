// Cópia local do download com token da branch feat/senha-csv-metodologia (blob no client.ts e
// `baixarResultadoCsv` em src/api/resultados.ts). Veja docs/CONFLITOS.md.
import { ErroRequisicao } from '@/api/erros'
import { lerToken } from '@/api/sessao'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

/** Nome do arquivo no Content-Disposition, em `filename*=UTF-8''...` ou `filename="..."`. */
export function nomeDoArquivo(disposicao: string | null, padrao: string): string {
  const codificado = disposicao?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (codificado) return decodeURIComponent(codificado)
  return disposicao?.match(/filename="?([^";]+)"?/i)?.[1] ?? padrao
}

/** Baixa o resultado.csv com o token da sessão (um link comum não manda o token). Devolve o nome. */
export async function baixarCsvDoResultado(campanhaId: number): Promise<string> {
  const token = lerToken()
  let resposta: Response
  try {
    resposta = await fetch(`${API_URL}/api/campanhas/${campanhaId}/resultado.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw ErroRequisicao.semConexao()
  }
  if (!resposta.ok) throw await ErroRequisicao.daResposta(resposta)

  const nome = nomeDoArquivo(
    resposta.headers.get('Content-Disposition'),
    `resultado-campanha-${campanhaId}.csv`,
  )
  const url = URL.createObjectURL(await resposta.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return nome
}
