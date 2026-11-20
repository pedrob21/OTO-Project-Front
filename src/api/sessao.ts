// Sessão do login. Fica no sessionStorage: some ao fechar a aba e não é compartilhada com outras.

const CHAVE = 'oto.sessao'

export type Sessao = { token: string; expiraEm: string }

// Vale quando o navegador bloqueia o armazenamento: a sessão dura até recarregar a página.
let emMemoria: Sessao | null = null

function valida(sessao: unknown): sessao is Sessao {
  if (typeof sessao !== 'object' || sessao === null) return false
  const { token, expiraEm } = sessao as Partial<Sessao>
  return typeof token === 'string' && token !== '' && typeof expiraEm === 'string'
}

function ler(): Sessao | null {
  if (emMemoria) return emMemoria
  try {
    const salva: unknown = JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null')
    return valida(salva) ? salva : null
  } catch {
    return null
  }
}

export function salvarSessao(sessao: Sessao): void {
  emMemoria = sessao
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(sessao))
  } catch {
    // armazenamento bloqueado: segue só em memória
  }
}

export function limparSessao(): void {
  emMemoria = null
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    // armazenamento bloqueado: não há o que apagar
  }
}

/** Token da sessão, ou null se não há sessão ou ela já venceu. */
export function lerToken(): string | null {
  const sessao = ler()
  if (!sessao) return null
  if (!(new Date(sessao.expiraEm).getTime() > Date.now())) {
    limparSessao()
    return null
  }
  return sessao.token
}
