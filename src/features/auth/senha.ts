export const SENHA_MINIMA = 8
export const SENHA_MAXIMA = 72

export type ErrosNovaSenha = {
  novaSenha?: string
  confirmacao?: string
}

export function validarNovaSenha(novaSenha: string, confirmacao: string): ErrosNovaSenha {
  if (novaSenha.length < SENHA_MINIMA) {
    return { novaSenha: `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` }
  }
  if (novaSenha.length > SENHA_MAXIMA) {
    return { novaSenha: `A senha deve ter no máximo ${SENHA_MAXIMA} caracteres.` }
  }
  if (novaSenha !== confirmacao) return { confirmacao: 'As senhas não conferem.' }
  return {}
}
