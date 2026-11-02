type ProblemDetail = {
  status?: number
  title?: string
  detail?: string
  campos?: Record<string, string>
}

const MENSAGEM_PADRAO = 'O servidor não conseguiu atender ao pedido. Tente novamente.'

/** Erro de uma chamada à API, a partir do Problem Details (RFC 9457). status 0 = sem conexão. */
export class ErroRequisicao extends Error {
  readonly status: number
  readonly campos: Record<string, string>

  constructor(status: number, mensagem: string, campos: Record<string, string> = {}) {
    super(mensagem)
    this.name = 'ErroRequisicao'
    this.status = status
    this.campos = campos
  }

  static semConexao(): ErroRequisicao {
    return new ErroRequisicao(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.')
  }

  /** O corpo pode vir vazio ou não ser JSON (o 401 sem token, por exemplo, não tem corpo). */
  static async daResposta(resposta: Response): Promise<ErroRequisicao> {
    let corpo: ProblemDetail = {}
    try {
      corpo = (await resposta.json()) as ProblemDetail
    } catch {
      // segue com a mensagem padrão
    }
    return new ErroRequisicao(
      resposta.status,
      corpo.detail ?? corpo.title ?? MENSAGEM_PADRAO,
      corpo.campos,
    )
  }
}
